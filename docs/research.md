# Research & modelling decisions

Reviewed October 16, 2026. Sources were web-searched and their content inspected before implementation. Dates describe review, not a promise that platform fees or laws remain unchanged.

## 1. Financing is not operating performance

The [CFPB amortization explanation](https://www.consumerfinance.gov/ask-cfpb/how-does-paying-down-a-mortgage-work-en-1943/) distinguishes a fixed payment from its changing principal/interest split. Its [payment explanation](https://www.consumerfinance.gov/ask-cfpb/on-a-mortgage-whats-the-difference-between-my-principal-and-interest-payment-and-my-total-monthly-payment-en-1941/) distinguishes P&I from taxes, insurance and mortgage insurance.

**Implemented:** actual monthly declining-balance amortization, unrounded internal calculations, zero-rate branch, fixed or percentage down, loan payoff after term. Taxes and insurance enter operating costs exactly once, not both escrow and expenses. A separate PITI+MI summary explains the broader ownership payment. Rate is the note rate, not APR. Closing costs and points are initial cash outlays. Mortgage insurance is a user-entered fixed premium through payoff: no guessed investment-loan eligibility/cancellation rules.

## 2. Spendable cash, equity and return answer different questions

[Rental-property cash flow analysis](https://empoweredinvestor.com/cash-flow-analysis-real-estate/) separates effective gross income, NOI, financing and cash-on-cash. The research also found conflicting practitioner conventions on replacement reserves in NOI; for consistency we use **NOI before CapEx**, disclosed throughout. [Fannie Mae's DSCR definition](https://mfguide.fanniemae.com/node/1766) uses an underwritten cash-flow convention, illustrating why a simple consumer metric is not a lender-approval result.

**Implemented:** collected income − operating costs = NOI. NOI − debt − mortgage insurance − major-repair budget = available cash. Cap rate = NOI / price; cash-on-cash = first-year available cash / initial invested cash. DSCR is explicitly indicative NOI/debt service. Appreciation and principal paydown create equity, not rental cash flow. Selling costs and payoff reduce equity to net sale proceeds. Initial closing costs and setup reduce total profit. Funded negative annual cash flows increase ROI's capital denominator. No probabilistic risk score or “good investment” verdict is inferred from arbitrary thresholds.

**Accounting choice:** routine fixes are operating expenses; major replacements are a separate smoothed budget below NOI, assumed consumed annually. We do not deduct it from distributions and also invent an unspent reserve asset. Actual lump-sum repairs and liquidity risks remain a diligence task. No automatic 1% maintenance or rent rule is presented as accurate local data.

## 3. Short-term rentals are a different operating business

[Airbnb's fee documentation](https://www.airbnb.com/help/article/1857) and [single-fee transition explanation](https://www.airbnb.com/resources/hosting-homes/a/simplifying-service-fees-on-airbnb-771) explain host-only versus split fees and fees on cleaning charges. At review, Airbnb describes 15.5% for most single-fee hosts, with exceptions. A hard-coded universal 3% assumption would materially overstate returns.

**Implemented:** editable 15.5% illustrative platform fee, applied to room + cleaning receipts. STR revenue is available nights × occupancy × average nightly rate. Blocked nights do not also incur vacancy. Cleaning fees are revenue; actual turns × cleaning cost is an expense. Expected turns = booked nights / average stay. Management is a separate effective room-revenue rate, explicitly documented. Furnishing is an initial STR-only investment. STR utilities, management, and revenue assumptions are retained independently when switching strategies. Fixed operating costs are shared between the two models for the same property.

[Responsible US hosting](https://www.airbnb.com/help/article/1376) and [local regulation guidance](https://www.airbnb.com/help/article/3305) make clear that insurance, permissions, permits and restrictions are property-specific. “Short-term” is an operational model, not a universal legal or tax definition based on a guessed number of days. Airbnb protection is not a substitute for appropriate property insurance. Guest-collected/remitted lodging taxes are excluded from both income and costs; only host-absorbed taxes are modelled as an expense. Tax is applied to room and cleaning receipts; local tax bases may differ, requiring an effective input and professional verification.

## 4. Tax precision would require facts not supplied here

[IRS Publication 527](https://www.irs.gov/publications/p527) treats repairs, improvements, depreciation, passive activity and personal-use rules differently. A ZIP and price cannot determine a taxpayer's after-tax return.

**Implemented:** explicitly pre-income-tax outputs, no made-up tax benefit or depreciation uplift. Personal-use allocation, depreciation recapture, capital gains, passive losses and entity tax effects are excluded. Users are pointed to an accountant rather than given false precision.

## 5. Honest uncertainty and usable defaults

ZIP codes cannot determine actual property-tax assessment, insurability, legal STR use, or achievable rent. City/state comes from Zippopotam.us only; example financial assumptions never silently become “local estimates.” Property quotes and comparables must replace them.

Stress bars combine rate ±X%, occupancy ±Y **percentage points**, and fixed operating/CapEx cost ∓Z%. Percentage fees follow revenue. Occupancy is clipped to [0,100]; mortgage and appreciation assumptions remain fixed. The range spans all three outcomes, with the base as a dot and negative cash flow shaded red. These are **deterministic bounds**, not confidence intervals, simulated distributions, or probabilities. This avoids a fabricated “chance of loss” without a calibrated data set.

Monthly slices are annual averages because seasonal demand and expense schedules are not available. The UI says so explicitly. Annual tables and JSON exports preserve inspectability. Mobile feedback keeps cash flow visible while assumptions are edited. All major definitions are available in context and in the methodology panel.
