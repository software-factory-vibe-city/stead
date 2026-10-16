export type Strategy = "long" | "short";
export interface Assumptions {
  name: string;
  zip: string;
  strategy: Strategy;
  price: number;
  downMode: "percent" | "fixed";
  down: number;
  interest: number;
  term: number;
  closing: number;
  rehab: number;
  furnishing: number;
  rent: number;
  vacancy: number;
  management: number;
  nightly: number;
  occupancy: number;
  blocked: number;
  stay: number;
  cleaningFee: number;
  cleaningCost: number;
  platform: number;
  shortManagement: number;
  lodgingTax: number;
  license: number;
  tax: number;
  insurance: number;
  maintenance: number;
  capex: number;
  hoa: number;
  utilities: number;
  shortUtilities: number;
  mortgageInsurance: number;
  appreciation: number;
  rentGrowth: number;
  expenseGrowth: number;
  selling: number;
  horizon: number;
  rentStress: number;
  occupancyStress: number;
  costStress: number;
}
export const defaults: Assumptions = {
  name: "My first rental",
  zip: "28205",
  strategy: "long",
  price: 325000,
  downMode: "percent",
  down: 20,
  interest: 6.5,
  term: 30,
  closing: 3,
  rehab: 5000,
  furnishing: 12000,
  rent: 3200,
  vacancy: 5,
  management: 8,
  nightly: 195,
  occupancy: 65,
  blocked: 14,
  stay: 3,
  cleaningFee: 100,
  cleaningCost: 110,
  platform: 15.5,
  shortManagement: 20,
  lodgingTax: 0,
  license: 300,
  tax: 3250,
  insurance: 1560,
  maintenance: 150,
  capex: 125,
  hoa: 0,
  utilities: 0,
  shortUtilities: 350,
  mortgageInsurance: 0,
  appreciation: 3,
  rentGrowth: 2.5,
  expenseGrowth: 2.5,
  selling: 6,
  horizon: 10,
  rentStress: 10,
  occupancyStress: 10,
  costStress: 15,
};

export const limits: Partial<Record<keyof Assumptions, [number, number]>> = {
  price: [1, 100000000],
  down: [0, 100000000],
  interest: [0, 30],
  term: [1, 40],
  closing: [0, 20],
  rehab: [0, 100000000],
  furnishing: [0, 10000000],
  rent: [0, 1000000],
  vacancy: [0, 100],
  management: [0, 100],
  nightly: [0, 100000],
  occupancy: [0, 100],
  blocked: [0, 365],
  stay: [1, 365],
  cleaningFee: [0, 100000],
  cleaningCost: [0, 100000],
  platform: [0, 100],
  shortManagement: [0, 100],
  lodgingTax: [0, 100],
  license: [0, 1000000],
  tax: [0, 10000000],
  insurance: [0, 1000000],
  maintenance: [0, 1000000],
  capex: [0, 1000000],
  hoa: [0, 1000000],
  utilities: [0, 1000000],
  shortUtilities: [0, 1000000],
  mortgageInsurance: [0, 100000],
  appreciation: [-30, 30],
  rentGrowth: [-30, 30],
  expenseGrowth: [-30, 30],
  selling: [0, 30],
  horizon: [1, 40],
  rentStress: [0, 50],
  occupancyStress: [0, 50],
  costStress: [0, 100],
};

/** Strict boundary for persisted/imported data; never trust localStorage or uploaded JSON. */
export function parseAssumptions(value: unknown): Assumptions {
  if (!value || typeof value !== "object")
    throw new Error("Invalid property file.");
  const a = value as Record<string, unknown>;
  for (const key of Object.keys(defaults) as (keyof Assumptions)[]) {
    if (typeof a[key] !== typeof defaults[key])
      throw new Error(`Missing or invalid ${key}.`);
  }
  for (const [key, range] of Object.entries(limits)) {
    const n = a[key] as number;
    if (!Number.isFinite(n) || n < range[0] || n > range[1])
      throw new Error(`Invalid ${key}.`);
  }
  if (
    !["long", "short"].includes(a.strategy as string) ||
    !["percent", "fixed"].includes(a.downMode as string)
  )
    throw new Error("Invalid rental or financing type.");
  if (
    !/^\d{0,5}$/.test(a.zip as string) ||
    !(a.name as string).trim() ||
    (a.name as string).length > 100
  )
    throw new Error("Invalid property details.");
  if (![a.term, a.horizon, a.blocked].every((n) => Number.isInteger(n)))
    throw new Error("Years and blocked nights must be whole numbers.");
  if (
    (a.downMode === "percent" && (a.down as number) > 100) ||
    (a.downMode === "fixed" && (a.down as number) > (a.price as number))
  )
    throw new Error("Down payment exceeds purchase price.");
  return Object.fromEntries(
    Object.keys(defaults).map((key) => [key, a[key]]),
  ) as unknown as Assumptions;
}

export function downPayment(a: Assumptions) {
  return Math.min(
    a.price,
    a.downMode === "percent" ? (a.price * a.down) / 100 : a.down,
  );
}
export function payment(principal: number, annualRate: number, years: number) {
  if (principal <= 0) return 0;
  const r = annualRate / 1200;
  return r === 0
    ? principal / (years * 12)
    : (principal * r) / -Math.expm1(-years * 12 * Math.log1p(r));
}
export interface LoanMonth {
  month: number;
  principal: number;
  interest: number;
  payment: number;
  balance: number;
}
export function amortize(a: Assumptions): LoanMonth[] {
  let balance = a.price - downPayment(a);
  const pmt = payment(balance, a.interest, a.term);
  return Array.from({ length: a.term * 12 }, (_, i) => {
    const interest = (balance * a.interest) / 1200;
    const principal = Math.min(balance, Math.max(0, pmt - interest));
    const paid = principal + interest;
    balance = Math.max(0, balance - principal);
    if (balance < 1e-7) balance = 0;
    return { month: i + 1, principal, interest, payment: paid, balance };
  });
}
export type Stress = "downside" | "base" | "upside";
export interface Year {
  year: number;
  room: number;
  cleaningRevenue: number;
  revenue: number;
  management: number;
  platform: number;
  cleaning: number;
  lodgingTax: number;
  tax: number;
  insurance: number;
  maintenance: number;
  hoa: number;
  utilities: number;
  license: number;
  operating: number;
  noi: number;
  capex: number;
  debt: number;
  mortgageInsurance: number;
  interest: number;
  principal: number;
  balance: number;
  cashflow: number;
  value: number;
  equity: number;
  cumulative: number;
  saleNet: number;
  profit: number;
  roi: number | null;
  capital: number;
  distributions: number;
}
export function initialCash(a: Assumptions) {
  return (
    downPayment(a) +
    (a.price * a.closing) / 100 +
    a.rehab +
    (a.strategy === "short" ? a.furnishing : 0)
  );
}
export function project(a: Assumptions, stress: Stress = "base"): Year[] {
  const loan = amortize(a);
  const direction = stress === "downside" ? -1 : stress === "upside" ? 1 : 0;
  const priceFactor = 1 + (direction * a.rentStress) / 100;
  const expenseFactor = 1 - (direction * a.costStress) / 100;
  const occupied =
    Math.min(
      100,
      Math.max(
        0,
        (a.strategy === "long" ? 100 - a.vacancy : a.occupancy) +
          direction * a.occupancyStress,
      ),
    ) / 100;
  let cumulative = 0,
    capital = initialCash(a),
    distributions = 0;
  return Array.from({ length: a.horizon }, (_, i) => {
    const growth = (1 + a.rentGrowth / 100) ** i;
    const costs = (1 + a.expenseGrowth / 100) ** i * expenseFactor;
    const short = a.strategy === "short";
    const nights = (365 - a.blocked) * occupied;
    const stays = short ? nights / a.stay : 0;
    const room =
      (short ? a.nightly * nights : a.rent * 12 * occupied) *
      growth *
      priceFactor;
    const cleaningRevenue = stays * a.cleaningFee * growth;
    const revenue = room + cleaningRevenue;
    const management =
      (room * (short ? a.shortManagement : a.management)) / 100;
    const platform = short ? (revenue * a.platform) / 100 : 0;
    const cleaning = stays * a.cleaningCost * costs;
    const lodgingTax = short ? (revenue * a.lodgingTax) / 100 : 0;
    const tax = a.tax * costs,
      insurance = a.insurance * costs;
    const maintenance = a.maintenance * 12 * costs,
      hoa = a.hoa * 12 * costs;
    const utilities = (short ? a.shortUtilities : a.utilities) * 12 * costs;
    const license = short ? a.license * costs : 0;
    const operating =
      management +
      platform +
      cleaning +
      lodgingTax +
      tax +
      insurance +
      maintenance +
      hoa +
      utilities +
      license;
    const noi = revenue - operating;
    const capex = a.capex * 12 * costs;
    const months = loan.slice(i * 12, (i + 1) * 12);
    const debt = months.reduce((sum, m) => sum + m.payment, 0);
    const interest = months.reduce((sum, m) => sum + m.interest, 0);
    const principal = months.reduce((sum, m) => sum + m.principal, 0);
    // Explicit fixed premium: no guessed eligibility/cancellation rule for investment loans.
    const mortgageInsurance =
      debt > 0 ? a.mortgageInsurance * months.length : 0;
    const cashflow = noi - capex - debt - mortgageInsurance;
    cumulative += cashflow;
    capital += Math.max(0, -cashflow);
    distributions += Math.max(0, cashflow);
    const balance = months.at(-1)?.balance ?? 0;
    const value = a.price * (1 + a.appreciation / 100) ** (i + 1);
    const equity = value - balance;
    const saleNet = value * (1 - a.selling / 100) - balance;
    const profit = distributions + saleNet - capital;
    return {
      year: i + 1,
      room,
      cleaningRevenue,
      revenue,
      management,
      platform,
      cleaning,
      lodgingTax,
      tax,
      insurance,
      maintenance,
      hoa,
      utilities,
      license,
      operating,
      noi,
      capex,
      debt,
      mortgageInsurance,
      interest,
      principal,
      balance,
      cashflow,
      value,
      equity,
      cumulative,
      saleNet,
      profit,
      roi: capital > 0 ? (profit / capital) * 100 : null,
      capital,
      distributions,
    };
  });
}
export function metrics(a: Assumptions) {
  const years = project(a),
    first = years[0],
    cash = initialCash(a);
  // Solve the same cash-flow function, including proportional fees and cleaning turns.
  // Negative contribution margin or unreachable occupancy -> no feasible break-even.
  const trial = (n: number) =>
    project({
      ...a,
      ...(a.strategy === "long" ? { rent: n } : { occupancy: n }),
      horizon: 1,
    })[0].cashflow;
  const zero = trial(0),
    one = trial(1),
    slope = one - zero;
  const candidate = zero >= 0 ? 0 : slope > 0 ? -zero / slope : null;
  const breakEven =
    candidate !== null && (a.strategy === "long" || candidate <= 100)
      ? candidate
      : null;
  return {
    years,
    first,
    cash,
    loan: a.price - downPayment(a),
    monthlyPayment: payment(a.price - downPayment(a), a.interest, a.term),
    coc: cash > 0 ? (first.cashflow / cash) * 100 : null,
    capRate: (first.noi / a.price) * 100,
    dscr:
      first.debt + first.mortgageInsurance > 0
        ? first.noi / (first.debt + first.mortgageInsurance)
        : null,
    breakEven,
  };
}
