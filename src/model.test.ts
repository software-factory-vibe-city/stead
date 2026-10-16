import { describe, expect, it } from "vitest";
import {
  amortize,
  defaults,
  downPayment,
  initialCash,
  metrics,
  parseAssumptions,
  payment,
  project,
} from "./model";

describe("rental financial model", () => {
  it("matches a standard 30-year mortgage and reconciles every payment", () => {
    expect(payment(300000, 6, 30)).toBeCloseTo(1798.651575, 5);
    const loan = amortize({
      ...defaults,
      price: 375000,
      down: 20,
      interest: 6,
    });
    expect(loan).toHaveLength(360);
    expect(loan[0].interest).toBe(1500);
    expect(loan[0].principal).toBeCloseTo(298.651575, 5);
    expect(loan.at(-1)?.balance).toBe(0);
    expect(loan.reduce((s, m) => s + m.principal, 0)).toBeCloseTo(300000, 5);
    loan.forEach((m, i) => {
      expect(m.principal + m.interest).toBeCloseTo(m.payment, 8);
      expect(
        (i === 0 ? 300000 : loan[i - 1].balance) - m.principal,
      ).toBeCloseTo(m.balance, 6);
    });
  });
  it("supports a zero-rate mortgage and all-cash purchase without NaN or phantom debt", () => {
    expect(payment(120000, 0, 10)).toBe(1000);
    const a = {
      ...defaults,
      interest: 0,
      term: 10,
      horizon: 15,
      downMode: "fixed" as const,
      down: 205000,
    };
    const years = project(a);
    expect(years[9].balance).toBe(0);
    expect(years[10].debt).toBe(0);
    expect(years[0].interest).toBe(0);
    const cash = { ...a, down: a.price, mortgageInsurance: 100 };
    expect(metrics(cash).dscr).toBeNull();
    expect(project(cash)[0].mortgageInsurance).toBe(0);
    expect(project(cash)[0].debt).toBe(0);
  });
  it("treats percent and fixed down payments equivalently", () => {
    const fixed = { ...defaults, downMode: "fixed" as const, down: 65000 };
    expect(downPayment(fixed)).toBe(downPayment(defaults));
    expect(project(fixed)).toEqual(project(defaults));
  });
  it("reconciles long-term income, NOI, debt and CapEx without double counting escrow", () => {
    const a = {
      ...defaults,
      price: 200000,
      rent: 2000,
      vacancy: 5,
      management: 8,
      tax: 2400,
      insurance: 1200,
      maintenance: 150,
      hoa: 50,
      utilities: 0,
      capex: 100,
      mortgageInsurance: 25,
    };
    const m = metrics(a),
      y = m.first;
    expect(y.revenue).toBe(22800);
    expect(y.management).toBe(1824);
    expect(y.operating).toBe(7824);
    expect(y.noi).toBe(14976);
    expect(y.capex).toBe(1200);
    expect(y.cashflow).toBeCloseTo(14976 - y.debt - 300 - 1200, 8);
    expect(m.capRate).toBeCloseTo(7.488);
    expect(m.coc).toBeCloseTo((y.cashflow / initialCash(a)) * 100);
  });
  it("models STR turns, cleaning revenue/cost, fee bases, occupancy and furnishings separately", () => {
    const a = {
      ...defaults,
      strategy: "short" as const,
      blocked: 65,
      occupancy: 50,
      nightly: 200,
      stay: 3,
      cleaningFee: 60,
      cleaningCost: 75,
      platform: 15.5,
      shortManagement: 20,
      lodgingTax: 5,
    };
    const y = project(a)[0];
    expect(y.room).toBe(30000); // 150 booked nights
    expect(y.cleaningRevenue).toBe(3000); // 50 turns
    expect(y.cleaning).toBe(3750);
    expect(y.platform).toBe(5115); // fee includes cleaning revenue
    expect(y.management).toBe(6000); // management excludes cleaning revenue
    expect(y.lodgingTax).toBe(1650);
    expect(initialCash(a) - initialCash({ ...a, strategy: "long" })).toBe(
      a.furnishing,
    );
    const empty = project({ ...a, occupancy: 0 })[0];
    expect(empty.revenue).toBe(0);
    expect(empty.cleaning).toBe(0);
    expect(empty.platform).toBe(0);
    expect(empty.cashflow).toBeLessThan(0);
  });
  it("uses year-one quotes, grows costs and income from year two and stops financing at payoff", () => {
    const a = {
      ...defaults,
      term: 1,
      horizon: 3,
      rentGrowth: 10,
      expenseGrowth: 5,
      appreciation: 3,
      mortgageInsurance: 100,
    };
    const [one, two] = project(a);
    expect(one.revenue).toBe(defaults.rent * 12 * 0.95);
    expect(two.revenue).toBeCloseTo(one.revenue * 1.1);
    expect(two.tax).toBeCloseTo(one.tax * 1.05);
    expect(two.capex).toBeCloseTo(one.capex * 1.05);
    expect(two.management).toBeCloseTo(one.management * 1.1);
    expect(two.debt).toBe(0);
    expect(two.mortgageInsurance).toBe(0);
    expect(two.balance).toBe(0);
    expect(one.value).toBeCloseTo(a.price * 1.03);
  });
  it("reconciles sale-adjusted profit and funded negative cash flow with no duplicated reserve asset", () => {
    const a = {
      ...defaults,
      rent: 500,
      appreciation: -3,
      horizon: 5,
      selling: 6,
    };
    const years = project(a),
      last = years.at(-1)!;
    const cash = initialCash(a);
    expect(last.saleNet).toBeCloseTo(last.value * 0.94 - last.balance);
    expect(last.capital).toBeCloseTo(
      cash + years.reduce((sum, y) => sum + Math.max(0, -y.cashflow), 0),
    );
    expect(last.profit).toBeCloseTo(last.cumulative + last.saleNet - cash);
    expect(last.roi).toBeCloseTo((last.profit / last.capital) * 100);
    const noChange = {
      ...defaults,
      down: 100,
      rent: 0,
      tax: 0,
      insurance: 0,
      maintenance: 0,
      capex: 0,
      closing: 0,
      rehab: 0,
      appreciation: 0,
      selling: 0,
      horizon: 1,
    };
    expect(project(noChange)[0].roi).toBe(0);
  });
  it("solves break-even using exactly the same cost accounting for both strategies", () => {
    const ltr = metrics(defaults).breakEven!;
    expect(project({ ...defaults, rent: ltr })[0].cashflow).toBeCloseTo(0, 5);
    const a = { ...defaults, strategy: "short" as const };
    const str = metrics(a).breakEven!;
    expect(str).toBeGreaterThan(0);
    expect(str).toBeLessThanOrEqual(100);
    expect(project({ ...a, occupancy: str })[0].cashflow).toBeCloseTo(0, 5);
    expect(metrics({ ...defaults, vacancy: 100 }).breakEven).toBeNull();
    expect(metrics({ ...a, nightly: 0, cleaningFee: 0 }).breakEven).toBeNull();
    expect(metrics({ ...a, nightly: 1 }).breakEven).toBeNull();
  });
  it("applies explicit stress assumptions, clips occupancy and leaves financing unchanged", () => {
    const base = project(defaults)[0],
      down = project(defaults, "downside")[0],
      up = project(defaults, "upside")[0];
    expect(down.room).toBeCloseTo(defaults.rent * 0.9 * 12 * 0.85);
    expect(up.room).toBeCloseTo(defaults.rent * 1.1 * 12); // occupancy clips to 100%
    expect(down.tax).toBeCloseTo(base.tax * 1.15);
    expect(down.debt).toBe(base.debt);
    expect(down.cashflow).toBeLessThan(base.cashflow);
    expect(up.cashflow).toBeGreaterThan(base.cashflow);
    expect(
      project(
        { ...defaults, rentStress: 0, occupancyStress: 0, costStress: 0 },
        "downside",
      ),
    ).toEqual(
      project({
        ...defaults,
        rentStress: 0,
        occupancyStress: 0,
        costStress: 0,
      }),
    );
  });
  it("rejects malformed imports, extreme values and impossible down payments", () => {
    expect(parseAssumptions(JSON.parse(JSON.stringify(defaults)))).toEqual(
      defaults,
    );
    for (const bad of [
      null,
      {},
      { ...defaults, rent: "3000" },
      { ...defaults, stay: 0 },
      { ...defaults, price: Infinity },
      { ...defaults, down: 101 },
      { ...defaults, term: 2.5 },
      { ...defaults, horizon: 10000 },
      { ...defaults, strategy: "hotel" },
      { ...defaults, downMode: "fixed", down: defaults.price + 1 },
    ])
      expect(() => parseAssumptions(bad)).toThrow();
    expect(
      parseAssumptions({ ...defaults, unexpected: true }),
    ).not.toHaveProperty("unexpected");
  });
});
