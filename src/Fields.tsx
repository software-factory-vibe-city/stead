import { useEffect, useId, useState } from "react";
import { ChevronDown, Info, MapPin } from "lucide-react";
import type { Assumptions } from "./model";
import { downPayment, limits } from "./model";
import { money } from "./format";

type Setter = <K extends keyof Assumptions>(
  key: K,
  value: Assumptions[K],
) => void;
interface Props {
  a: Assumptions;
  set: Setter;
  invalid: (id: string, bad: boolean) => void;
}
function Field({
  label,
  value,
  onChange,
  prefix,
  suffix,
  min = 0,
  max = 100000000,
  step = "any",
  help,
  invalid,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number | "any";
  help?: string;
  invalid: Props["invalid"];
}) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  const bad =
    draft.trim() === "" ||
    !Number.isFinite(Number(draft)) ||
    Number(draft) < min ||
    Number(draft) > max ||
    (step === 1 && !Number.isInteger(Number(draft)));
  useEffect(() => {
    setDraft(String(value));
  }, [value]);
  useEffect(() => {
    invalid(id, bad);
    return () => invalid(id, false);
  }, [bad, id, invalid]);
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {help && (
          <span className="help-tip" role="img" tabIndex={0} aria-label={help}>
            <Info size={12} />
            <span role="tooltip">{help}</span>
          </span>
        )}
      </label>
      <div className={`input-shell ${bad ? "invalid" : ""}`}>
        {prefix && <span>{prefix}</span>}
        <input
          id={id}
          aria-label={label}
          type="number"
          inputMode="decimal"
          value={draft}
          min={min}
          max={max}
          step={step}
          aria-invalid={bad}
          aria-describedby={bad ? `${id}-error` : undefined}
          onChange={(e) => {
            const s = e.target.value;
            setDraft(s);
            const n = Number(s);
            if (
              s !== "" &&
              Number.isFinite(n) &&
              n >= min &&
              n <= max &&
              (step !== 1 || Number.isInteger(n))
            )
              onChange(n);
          }}
        />
        {suffix && <span>{suffix}</span>}
      </div>
      {bad && (
        <small className="field-error" id={`${id}-error`}>
          {step === 1 ? "Whole number" : "Value"} between {min.toLocaleString()}{" "}
          and {max.toLocaleString()}.
        </small>
      )}
    </div>
  );
}
function Section({
  n,
  title,
  children,
  open = false,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
  open?: boolean;
}) {
  return (
    <details className="input-section" open={open}>
      <summary>
        <span className="section-number">{n}</span>
        {title}
        <ChevronDown size={16} />
      </summary>
      <div className="section-fields">{children}</div>
    </details>
  );
}
export default function Fields({ a, set, invalid }: Props) {
  const [location, setLocation] = useState("");
  const [lookup, setLookup] = useState(false);
  useEffect(() => {
    setLocation("");
    if (!/^\d{5}$/.test(a.zip)) return;
    const abort = new AbortController();
    const timer = setTimeout(async () => {
      setLookup(true);
      try {
        const r = await fetch(`https://api.zippopotam.us/us/${a.zip}`, {
          signal: AbortSignal.any([abort.signal, AbortSignal.timeout(6000)]),
        });
        if (!r.ok) throw new Error("ZIP not found");
        const data = await r.json();
        const place = data.places?.[0];
        setLocation(
          place
            ? `${place["place name"]}, ${place["state abbreviation"]}`
            : "Location unavailable",
        );
      } catch {
        if (!abort.signal.aborted)
          setLocation("Location unavailable · you can still model");
      } finally {
        if (!abort.signal.aborted) setLookup(false);
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      abort.abort();
      setLookup(false);
    };
  }, [a.zip]);
  const f = (
    key: keyof Assumptions,
    label: string,
    opts: Partial<React.ComponentProps<typeof Field>> = {},
  ) => (
    <Field
      key={key}
      label={label}
      value={a[key] as number}
      onChange={(n) => set(key, n)}
      invalid={invalid}
      min={limits[key]?.[0]}
      max={limits[key]?.[1]}
      {...opts}
    />
  );
  return (
    <aside className="assumptions panel" aria-label="Property assumptions">
      <div className="assumptions-heading">
        <div>
          <span className="eyebrow">THE INPUTS</span>
          <h2>Your property</h2>
        </div>
        <span className="live-pill">
          <i />
          Live model
        </span>
      </div>
      <div className="property-fields">
        <label className="text-field">
          Property name
          <input
            maxLength={100}
            value={a.name}
            onChange={(e) => set("name", e.target.value)}
            onBlur={() => {
              if (!a.name.trim()) set("name", "Untitled property");
            }}
          />
        </label>
        <div className="field-grid">
          {f("price", "Purchase price", { prefix: "$" })}
          <label className="text-field">
            US ZIP code
            <div className="input-shell">
              <MapPin size={14} />
              <input
                aria-label="US ZIP code"
                value={a.zip}
                maxLength={5}
                inputMode="numeric"
                onChange={(e) => set("zip", e.target.value.replace(/\D/g, ""))}
              />
            </div>
          </label>
        </div>
        <div className="location-line">
          <MapPin size={12} />
          <span>
            {lookup
              ? "Looking up location…"
              : location || "Enter a 5-digit ZIP for location"}
          </span>
        </div>
        <p className="micro-note">
          ZIP identifies location only. All financial inputs are your estimates.
        </p>
        <span className="field-label">Rental strategy</span>
        <div className="segmented strategy" aria-label="Rental strategy">
          <button
            className={a.strategy === "long" ? "active" : ""}
            aria-pressed={a.strategy === "long"}
            onClick={() => set("strategy", "long")}
          >
            Long-term<span>Monthly lease</span>
          </button>
          <button
            className={a.strategy === "short" ? "active" : ""}
            aria-pressed={a.strategy === "short"}
            onClick={() => set("strategy", "short")}
          >
            Short-term<span>Nightly stays</span>
          </button>
        </div>
      </div>
      <Section n="01" title="Financing" open>
        <div className="down-label">
          <span>Down payment</span>
          <div className="mini-toggle" aria-label="Down payment format">
            {(["percent", "fixed"] as const).map((mode) => (
              <button
                key={mode}
                className={a.downMode === mode ? "active" : ""}
                aria-pressed={a.downMode === mode}
                onClick={() => {
                  const n = downPayment(a);
                  set("downMode", mode);
                  set("down", mode === "percent" ? (n / a.price) * 100 : n);
                }}
              >
                {mode === "percent" ? "%" : "$"}
              </button>
            ))}
          </div>
        </div>
        {f("down", "Down payment amount", {
          prefix: a.downMode === "fixed" ? "$" : undefined,
          suffix: a.downMode === "percent" ? "%" : undefined,
          max: a.downMode === "percent" ? 100 : a.price,
        })}
        <p className="input-caption">
          {money(downPayment(a))} down <span>·</span>{" "}
          {money(a.price - downPayment(a))} loan
        </p>
        <div className="field-grid">
          {f("interest", "Interest rate", {
            suffix: "%",
            help: "Annual fixed note rate, not APR. Enter a lender quote; this is not a live rate.",
          })}
          <label className="text-field">
            Loan term
            <div className="select-shell">
              <select
                aria-label="Loan term"
                value={a.term}
                onChange={(e) => set("term", Number(e.target.value))}
              >
                {Array.from(new Set([10, 15, 20, 25, 30, 40, a.term]))
                  .sort((x, y) => x - y)
                  .map((t) => (
                    <option key={t} value={t}>
                      {t} years
                    </option>
                  ))}
              </select>
              <ChevronDown size={14} />
            </div>
          </label>
        </div>
        {f("mortgageInsurance", "Mortgage insurance", {
          prefix: "$",
          suffix: "/ mo",
          help: "Enter quoted monthly premium, if required. Held fixed until payoff; automatic cancellation is not assumed.",
        })}
        <div className="field-grid">
          {f("closing", "Closing costs", {
            suffix: "%",
            help: "Upfront costs as a share of price. Include points and fees; exclude your down payment.",
          })}
          {f("rehab", "Initial repairs", { prefix: "$" })}
        </div>
        {a.downMode === "percent" && a.down < 20 && (
          <p className="inline-warning">
            Under 20% down: verify investor-loan eligibility and any mortgage
            insurance with your lender.
          </p>
        )}
      </Section>
      <Section n="02" title="Rental income" open>
        {a.strategy === "long" ? (
          <>
            {f("rent", "Monthly rent", { prefix: "$", suffix: "/ mo" })}
            <div className="field-grid">
              {f("vacancy", "Vacancy & loss", {
                suffix: "%",
                help: "Allowance for empty periods and uncollected rent. Applied before management fees.",
              })}
              {f("management", "Management", {
                suffix: "%",
                help: "Percentage of collected rent. Set to 0 if self-managing; your time is not valued in the model.",
              })}
            </div>
          </>
        ) : (
          <>
            <div className="field-grid">
              {f("nightly", "Nightly rate", { prefix: "$" })}
              {f("occupancy", "Occupancy", {
                suffix: "%",
                help: "Share of available nights booked, after blocked nights. Flat annual average; seasonality is not simulated.",
              })}
            </div>
            <div className="field-grid">
              {f("blocked", "Blocked nights", { step: 1, suffix: "/ yr" })}
              {f("stay", "Average stay", { suffix: "nights" })}
            </div>
            <div className="field-grid">
              {f("cleaningFee", "Guest cleaning fee", {
                prefix: "$",
                help: "Revenue per stay. Platform fees apply to this fee too.",
              })}
              {f("cleaningCost", "Cleaning cost", {
                prefix: "$",
                help: "Your actual cost per turnover, separate from the fee charged to guests.",
              })}
            </div>
            <div className="field-grid">
              {f("platform", "Platform fee", {
                suffix: "%",
                help: "Applied to room and cleaning revenue. Default 15.5% is an illustrative Airbnb host-only fee; verify your contract.",
              })}
              {f("shortManagement", "STR management", {
                suffix: "%",
                help: "Applied to room revenue only. Enter an effective rate if your manager charges on a different basis.",
              })}
            </div>
            {f("furnishing", "Initial furnishing & setup", { prefix: "$" })}
            <div className="field-grid">
              {f("lodgingTax", "Host-paid lodging tax", {
                suffix: "%",
                help: "Only tax you absorb, on room plus cleaning revenue. Guest-collected/remitted taxes are excluded from both revenue and cost.",
              })}
              {f("license", "Permits & licenses", {
                prefix: "$",
                suffix: "/ yr",
              })}
            </div>
            <p className="inline-warning">
              Verify local permits, night caps, HOA rules, lodging taxes, and
              STR-specific insurance before buying. Blocked nights earn no
              income.
            </p>
          </>
        )}
      </Section>
      <Section n="03" title="Operating costs & upkeep" open>
        <div className="field-grid">
          {f("tax", "Property taxes", {
            prefix: "$",
            suffix: "/ yr",
            help: "Enter the expected post-purchase tax bill, not a ZIP average. Reassessment rules vary.",
          })}
          {f("insurance", "Property insurance", {
            prefix: "$",
            suffix: "/ yr",
            help: "Use a landlord or STR-specific quote including applicable flood/wind cover; ordinary homeowners coverage may not suffice.",
          })}
        </div>
        <div className="field-grid">
          {f("maintenance", "Routine maintenance", {
            prefix: "$",
            suffix: "/ mo",
            help: "Smoothed monthly budget for recurring fixes, separate from major replacements.",
          })}
          {f("capex", "Major-repair budget", {
            prefix: "$",
            suffix: "/ mo",
            help: "Monthly set-aside for roof, HVAC, etc. Treated as spent each year. Deducted after NOI; not counted as an accumulating cash asset.",
          })}
        </div>
        <div className="field-grid">
          {f("hoa", "HOA & other costs", { prefix: "$", suffix: "/ mo" })}
          {f(
            a.strategy === "short" ? "shortUtilities" : "utilities",
            "Owner-paid utilities",
            { prefix: "$", suffix: "/ mo" },
          )}
        </div>
      </Section>
      <Section n="04" title="Growth & exit assumptions">
        <div className="field-grid">
          {f("appreciation", "Home appreciation", { suffix: "% / yr" })}
          {f("rentGrowth", "Income growth", { suffix: "% / yr" })}
        </div>
        <div className="field-grid">
          {f("expenseGrowth", "Expense growth", {
            suffix: "% / yr",
            help: "Applies to fixed operating costs, cleaning costs, and major-repair budget. Mortgage stays fixed; percentage fees follow revenue.",
          })}
          {f("selling", "Selling costs", {
            suffix: "%",
            help: "Share of future sale price, including agent fees and seller closing costs. Excludes capital gains taxes.",
          })}
        </div>
        <p className="micro-note">
          Growth assumptions are nominal, not inflation-adjusted. No automatic
          increase in value from initial repairs is assumed.
        </p>
      </Section>
      <div className="sidebar-foot">
        <Info size={13} />
        <span>
          Illustrative inputs. Replace with property-specific quotes and
          verified rent comparables.
        </span>
      </div>
    </aside>
  );
}
