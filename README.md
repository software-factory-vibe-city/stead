# Stead — rental property, clearly.

A complete, local-first US investment-property modelling workspace, built with React, TypeScript, Vite, and Recharts. No API keys, accounts, or financial-data backend are required.

## Run

Node 24 LTS recommended (Vite requires Node 20.19+ or 22.12+).

```sh
npm ci
npm run dev             # http://localhost:5173
npm run build           # typecheck + production build in dist/
npm run preview         # serve the production build
npm test                # financial-engine integration tests
npm run test:e2e        # desktop + mobile browser workflows and axe checks
```

Browser tests use installed Google Chrome locally. In CI they use Playwright Chromium: `npx playwright install --with-deps chromium` and `CI=1 npm run test:e2e`.

## Included

- Price and US ZIP input; optional city/state lookup, with timeout and offline fallback.
- Percentage or fixed down payment, fixed-rate loan, zero-interest and cash purchases, and a full monthly/yearly amortization schedule.
- Separate long-term lease and short-term nightly models. STR includes available nights, occupancy, stay length, guest cleaning fees, cleaning costs, platform fees, management, furnishing, permits, and host-paid lodging tax.
- Property taxes, property insurance, mortgage insurance, HOA, utilities, maintenance, and a separate major-repair/CapEx budget.
- Monthly averages and annual cash flow, NOI, cap rate, cash-on-cash return, break-even rent/occupancy, and indicative debt coverage.
- Value, equity, cash flow, and cumulative sale-adjusted ROI projections; selling costs, loan payoff, and funded cash deficits are included.
- Editable deterministic stress scenarios with error-bar ranges and negative-cash-flow shading. **Not a probability model.**
- Autosaved working draft, named scenario comparison, JSON backup/import, CSV projections, clipboard summary, and print/PDF of the current analysis view.
- Responsive desktop/mobile UI, persistent mobile cash-flow feedback, keyboard tabs, native accessible dialogs, validation, self-hosted fonts, and source/methodology explanations.

## Accuracy & boundaries

All defaults are **illustrative**, not ZIP-based market estimates. ZIP never changes financial assumptions. Use verified rent comparables, a lender quote, post-purchase property taxes, and landlord/STR-specific insurance quotes. The optional external service is [Zippopotam.us](https://www.zippopotam.us/) and receives only the ZIP code.

Calculations are nominal USD, pre-income-tax, fixed-rate and fully amortizing. Monthly results are annual averages, not seasonal forecasts. No income-tax benefits, depreciation, capital gains, recapture, refinancing, automatic mortgage-insurance cancellation, or legal-eligibility decision is inferred. No personal-use tax allocation is made for blocked STR nights.

Standard NOI excludes financing and CapEx. Cash flow deducts the major-repair budget once, below NOI; that budget is assumed spent annually, **not** also accumulated as a cash asset. Total ROI assumes a sale and divides profit by initial cash plus funded negative annual cash flow. It is cumulative, not annualized or IRR. Cash-on-cash uses initial invested cash. Working capital and prepaid escrow are additional.

See the in-app **Methodology** panel for formulas, exclusions, and linked research, and [docs/research.md](docs/research.md) for implementation decisions.

## Storage & portability

The browser stores a single draft (`stead:draft:v1`) and up to 50 scenarios (`stead:saved:v1`). No analytics or remote financial storage. Import and stored-data boundaries are schema-validated; JSON files are versioned and limited to 100 KB. Browser storage can be cleared or unavailable: export JSON backups. CSV is a numeric projection report; export JSON too to retain assumptions. Shared-device users should clear site data when finished.

## Deploy

`npm run build`, then serve `dist/` on any HTTPS static host. `netlify.toml` and `public/_headers` supply Netlify build settings, security headers, and immutable asset caching. For other hosts, apply equivalent headers; allow `connect-src https://api.zippopotam.us`, self-hosted scripts/fonts, and inline SVG/CSS styles required by charts. No secret environment variables are needed. All other calculations work if ZIP lookup is blocked.

### GitHub Pages

The production site is published to the `gh-pages` branch. In GitHub **Settings → Pages**, select **Deploy from a branch**, choose **gh-pages**, and select **/ (root)**.

Expected URL: https://software-factory-vibe-city.github.io/stead/

To publish an updated build from your local source checkout:

```sh
npm ci
npm run deploy:pages
```

This builds the app and pushes only `dist/` to `origin/gh-pages`; source remains on `main`. Relative asset paths support the repository subdirectory, and `.nojekyll` disables Jekyll processing. Deployment uses your local Git credentials; no GitHub Actions token is required. GitHub Pages does not apply Netlify's `_headers` file.

## Structure

- `src/model.ts` — pure, typed financial engine and persistence/import validation
- `src/model.test.ts` — independent benchmarks, reconciliation invariants, and edge cases
- `src/App.tsx` — workspace, analysis views, persistence and export flows
- `src/Fields.tsx` — live validated assumptions and ZIP lookup
- `src/Charts.tsx` — financial and stress-range visualizations
- `src/Methodology.tsx` — user-facing formulas, limitations, and sources
- `tests/workspace.spec.ts` — real-browser desktop/mobile workflows

Fonts: DM Sans and Manrope, self-hosted under the SIL Open Font License; license files are in `public/fonts/`.
