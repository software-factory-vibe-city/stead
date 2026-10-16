import { ExternalLink, BookOpen, ShieldCheck, Calculator } from "lucide-react";
export const sources = [
  {
    title: "How mortgage amortization works",
    publisher: "Consumer Financial Protection Bureau",
    url: "https://www.consumerfinance.gov/ask-cfpb/how-does-paying-down-a-mortgage-work-en-1943/",
    description: "Fixed payments, declining interest, and principal paydown.",
  },
  {
    title: "Principal & interest vs. the total payment",
    publisher: "Consumer Financial Protection Bureau",
    url: "https://www.consumerfinance.gov/ask-cfpb/on-a-mortgage-whats-the-difference-between-my-principal-and-interest-payment-and-my-total-monthly-payment-en-1941/",
    description:
      "Why insurance, property taxes, and mortgage insurance must be budgeted separately.",
  },
  {
    title: "Rental property cash flow & return metrics",
    publisher: "Empowered Investor",
    url: "https://empoweredinvestor.com/cash-flow-analysis-real-estate/",
    description:
      "Operating income, cap rate, and cash-on-cash return; CapEx excluded from standard NOI.",
  },
  {
    title: "Airbnb service fees",
    publisher: "Airbnb Help Center",
    url: "https://www.airbnb.com/help/article/1857",
    description:
      "Host fees apply to nightly charges and host-added fees, including cleaning. Fee structures can change.",
  },
  {
    title: "Responsible hosting in the United States",
    publisher: "Airbnb Help Center",
    url: "https://www.airbnb.com/help/article/1376",
    description:
      "Permits, restrictions, taxes, and insurance requirements are local and property-specific.",
  },
  {
    title: "Publication 527: Residential Rental Property",
    publisher: "Internal Revenue Service",
    url: "https://www.irs.gov/publications/p527",
    description:
      "Tax treatment, repairs vs. improvements, depreciation, and personal-use rules. Tax returns are outside this model.",
  },
  {
    title: "Debt service coverage ratio",
    publisher: "Fannie Mae Multifamily Guide",
    url: "https://mfguide.fanniemae.com/node/1766",
    description:
      "Lender underwriting definitions vary. Our displayed NOI/debt-service ratio is indicative, not a qualification result.",
  },
];
export default function Methodology() {
  return (
    <div className="methodology">
      <div className="method-intro">
        <BookOpen size={26} />
        <p>
          Understand the math.
          <br />
          <strong>Know what’s an assumption.</strong>
        </p>
      </div>
      <p>
        Stead models one US rental property with a fully amortizing, fixed-rate
        loan. All results are nominal USD and before income taxes. Default
        values are an illustrative scenario—not market quotes or a
        recommendation.
      </p>
      <h3>
        <Calculator size={17} /> How the numbers work
      </h3>
      <dl>
        <dt>Financing</dt>
        <dd>
          Loan = purchase price − down payment. Monthly principal & interest = L
          × r / [1 − (1 + r)<sup>−n</sup>], where r is annual interest / 12 and
          n is the number of payments. At 0% interest, payment = L / n. Interest
          uses the remaining balance; principal reduces that balance. Display
          rounding is not applied to internal calculations.
        </dd>
        <dt>Long-term income</dt>
        <dd>
          Monthly rent × 12 × (1 − vacancy & collection loss). Management is
          charged on collected rent. No separate nightly or cleaning income is
          included.
        </dd>
        <dt>Short-term income</dt>
        <dd>
          Booked nights = (365 − blocked nights) × occupancy. Room revenue =
          booked nights × nightly rate. Turnovers = booked nights / average stay
          (an expected value, so fractional stays are possible). Cleaning fees
          are added to revenue; actual cleaning costs are a separate expense.
          Platform fees and host-paid lodging tax apply to room + cleaning
          revenue; management applies to room revenue only.
        </dd>
        <dt>NOI & cap rate</dt>
        <dd>
          Net operating income = collected income − operating expenses. It
          excludes loan payments, mortgage insurance, major-repair/CapEx budget,
          depreciation, and income tax. Cap rate = first-year NOI / purchase
          price. Industry and lender reserve conventions differ; this definition
          is used consistently here.
        </dd>
        <dt>Available cash flow</dt>
        <dd>
          NOI − principal & interest − mortgage insurance − major-repair budget.
          Routine maintenance and the major-repair budget are separate. The
          major-repair set-aside is assumed spent each year, not accumulated as
          an asset. Monthly values are annual averages, not calendar-month
          forecasts.
        </dd>
        <dt>Cash invested & cash-on-cash</dt>
        <dd>
          Initial cash = down payment + closing costs + initial repairs + STR
          furnishings (only for short-term). First-year cash-on-cash =
          first-year available cash flow / initial cash. Working capital,
          prepaid escrow, and liquidity reserves are not automatically added;
          plan for these separately.
        </dd>
        <dt>Growth & total ROI</dt>
        <dd>
          Year 1 uses your inputs; income and operating costs grow from year 2
          at their respective rates. Value compounds from purchase. Loan
          payments remain fixed until payoff. Exit proceeds = home value −
          selling costs − remaining loan. Total profit = cumulative available
          cash flow + exit proceeds − initial cash. Total ROI divides that
          profit by initial cash plus any negative annual cash flow funded along
          the way. This is cumulative, sale-assumed ROI, not annualized or IRR.
          Initial repairs do not automatically increase home value.
        </dd>
        <dt>Break-even & debt coverage</dt>
        <dd>
          Break-even solves for zero first-year available cash flow, including
          all costs and proportional fees. LTR shows required monthly asking
          rent at your vacancy rate; STR shows required occupancy at your
          nightly rate. “Not feasible” means no solution with positive
          contribution margin or occupancy would exceed 100%. Indicative DSCR =
          NOI / (principal & interest + mortgage insurance); it is not a lender
          underwriting decision.
        </dd>
        <dt>Stress ranges</dt>
        <dd>
          Downside reduces rent/rate, reduces occupancy by percentage points,
          and increases fixed operating costs and CapEx. Upside reverses those
          changes; occupancy is clipped to 0–100%. Percentage fees follow
          revenue. Appreciation, growth rates, and the existing loan are
          unchanged. Bars span the lowest/highest of the three scenarios; dots
          show base. These are chosen stress cases, not probabilities,
          confidence intervals, or a forecast.
        </dd>
      </dl>
      <h3>
        <ShieldCheck size={17} /> What this model does not promise
      </h3>
      <p>
        No live rent, interest-rate, insurance, tax, valuation, or legal data is
        supplied. ZIP uses Zippopotam.us for city/state only and does not change
        assumptions. Actual tax reassessment, flood/wind coverage, leasing fees,
        utilities, seasonality, tenant default, disasters, rent restrictions,
        special assessments, refinancing, and uneven capital expenses need
        separate diligence. Monthly averages can hide seasonal cash shortfalls.
        Tax effects—including depreciation, passive losses, capital gains, and
        recapture—are excluded. Personal-use tax allocation is not calculated
        for blocked STR nights.
      </p>
      <p>
        Mortgage insurance is an explicit monthly amount held until payoff;
        eligibility and cancellation are not inferred. Rates and occupancy are
        not guaranteed. Confirm the property’s legal use, lending terms,
        insurance coverage, and cash reserves with qualified local
        professionals.
      </p>
      <h3>Research & primary sources</h3>
      <p className="muted">
        Reviewed October 16, 2026. External content and platform fees may
        change.
      </p>
      <div className="sources-list">
        {sources.map((s) => (
          <a href={s.url} key={s.url} target="_blank" rel="noreferrer">
            <div>
              <span>{s.publisher}</span>
              <strong>
                {s.title}
                <ExternalLink size={13} />
              </strong>
              <p>{s.description}</p>
            </div>
          </a>
        ))}
      </div>
      <h3>Privacy & storage</h3>
      <p>
        Your draft and saved scenarios stay in this browser’s local storage. No
        account, analytics, or financial-data server is used. ZIP codes are sent
        to Zippopotam.us solely for location lookup. Clearing browser data
        removes saved work; export JSON to keep a portable backup.
      </p>
    </div>
  );
}
