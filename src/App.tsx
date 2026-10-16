import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Copy,
  FileJson,
  FileSpreadsheet,
  House,
  Leaf,
  MapPin,
  Plus,
  Printer,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import Fields from "./Fields";
import { FlowBars, LoanChart, RiskChart, WealthChart } from "./Charts";
import Methodology from "./Methodology";
import type { Assumptions, Year } from "./model";
import {
  amortize,
  defaults,
  downPayment,
  initialCash,
  metrics,
  parseAssumptions,
  project,
} from "./model";
import { download, money, percent } from "./format";

const DRAFT_KEY = "stead:draft:v1",
  SAVED_KEY = "stead:saved:v1";
type Tab = "overview" | "projections" | "mortgage" | "risk";
type Modal = "methodology" | "save" | "saved" | "export" | null;
interface Saved {
  id: string;
  date: string;
  assumptions: Assumptions;
}
function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? parseAssumptions(JSON.parse(raw)) : { ...defaults };
  } catch {
    return { ...defaults };
  }
}
function loadSaved(): Saved[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 50).flatMap((item) => {
      try {
        if (typeof item.id !== "string" || typeof item.date !== "string")
          return [];
        return [
          {
            id: item.id,
            date: item.date,
            assumptions: parseAssumptions(item.assumptions),
          },
        ];
      } catch {
        return [];
      }
    });
  } catch {
    return [];
  }
}
function Dialog({
  title,
  children,
  close,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  close: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = ref.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? "dialog wide" : "dialog"}
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      aria-labelledby="dialog-title"
    >
      <div className="dialog-header">
        <h2 id="dialog-title">{title}</h2>
        <button
          className="icon-button"
          onClick={close}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      </div>
      <div className="dialog-body">{children}</div>
    </dialog>
  );
}
function Stat({
  label,
  value,
  detail,
  icon,
  positive,
  help,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  positive?: boolean;
  help: string;
}) {
  return (
    <div
      className={`stat panel ${positive !== undefined ? (positive ? "primary" : "negative") : ""}`}
    >
      <div className="stat-top">
        <span>{label}</span>
        <span role="img" title={help} aria-label={help} tabIndex={0}>
          <CircleHelp size={13} />
        </span>
      </div>
      <strong>{value}</strong>
      <div className="stat-bottom">
        {icon}
        <span>{detail}</span>
      </div>
    </div>
  );
}
function Legend({ items }: { items: [string, string][] }) {
  return (
    <div className="legend">
      {items.map(([name, color]) => (
        <span key={name}>
          <i style={{ background: color }} />
          {name}
        </span>
      ))}
    </div>
  );
}
function Breakdown({
  a,
  y,
  yearly,
}: {
  a: Assumptions;
  y: Year;
  yearly: boolean;
}) {
  const d = yearly ? 1 : 12;
  const rows: [string, number][] = [
    ["Property taxes", y.tax],
    ["Property insurance", y.insurance],
    ["Routine maintenance", y.maintenance],
    ["Property management", y.management],
    ["HOA & other costs", y.hoa],
    ["Owner-paid utilities", y.utilities],
    ...(a.strategy === "short"
      ? ([
          ["Platform fees", y.platform],
          ["Cleaning & turnovers", y.cleaning],
          ["Host-paid lodging tax", y.lodgingTax],
          ["Permits & licenses", y.license],
        ] as [string, number][])
      : []),
  ];
  return (
    <section className="panel breakdown">
      <div className="card-heading">
        <div>
          <span className="eyebrow">FOLLOW THE MONEY</span>
          <h2>Income & expenses</h2>
        </div>
        <span className="unit-label">{yearly ? "Annual" : "Monthly avg."}</span>
      </div>
      <FlowBars first={y} divisor={d} />
      <div className="ledger">
        <div className="ledger-row strong">
          <span>
            {a.strategy === "long" ? "Scheduled rent" : "Booked room revenue"}
          </span>
          <span>
            {money((a.strategy === "long" ? a.rent * 12 : y.room) / d)}
          </span>
        </div>
        {a.strategy === "short" ? (
          <div className="ledger-row">
            <span>Guest cleaning fees</span>
            <span>{money(y.cleaningRevenue / d)}</span>
          </div>
        ) : (
          <div className="ledger-row subtle">
            <span>Vacancy & loss ({a.vacancy}%)</span>
            <span>−{money((a.rent * 12 * a.vacancy) / 100 / d)}</span>
          </div>
        )}
        <div className="ledger-row subtotal">
          <span>Collected income</span>
          <span>{money(y.revenue / d)}</span>
        </div>
        <details className="expense-details">
          <summary>
            <span>
              <ChevronDown size={13} /> Operating expenses
            </span>
            <span>−{money(y.operating / d)}</span>
          </summary>
          <div>
            {rows.map(([label, amount]) => (
              <div className="ledger-row" key={label}>
                <span>{label}</span>
                <span>{money(amount / d)}</span>
              </div>
            ))}
          </div>
        </details>
        <div className="ledger-row subtotal">
          <span>
            Net operating income{" "}
            <abbr title="Before financing and major-repair budget">NOI</abbr>
          </span>
          <span>{money(y.noi / d)}</span>
        </div>
        <div className="ledger-row">
          <span>
            Mortgage <small>principal + interest</small>
          </span>
          <span>−{money(y.debt / d)}</span>
        </div>
        {y.mortgageInsurance > 0 && (
          <div className="ledger-row">
            <span>Mortgage insurance</span>
            <span>−{money(y.mortgageInsurance / d)}</span>
          </div>
        )}
        <div className="ledger-row">
          <span>Major-repair budget</span>
          <span>−{money(y.capex / d)}</span>
        </div>
        <div className={`ledger-row final ${y.cashflow < 0 ? "loss" : ""}`}>
          <span>Available cash flow</span>
          <strong>{money(y.cashflow / d)}</strong>
        </div>
      </div>
      <p className="card-footnote">
        Before income taxes. Major-repair budget is treated as spent, not
        accumulated savings.
      </p>
    </section>
  );
}
function ProjectionTable({ years }: { years: Year[] }) {
  return (
    <div
      className="table-scroll"
      tabIndex={0}
      aria-label="Annual projection table"
    >
      <table>
        <caption>
          Annual projections · sale assumed at each year-end · USD
        </caption>
        <thead>
          <tr>
            {[
              "Year",
              "Income",
              "Operating costs",
              "Debt + MI",
              "Major repairs",
              "Cash flow",
              "Home value",
              "Loan balance",
              "Net sale proceeds",
              "Total ROI",
            ].map((v) => (
              <th key={v} scope="col">
                {v}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {years.map((y) => (
            <tr key={y.year}>
              <th scope="row">{y.year}</th>
              <td>{money(y.revenue)}</td>
              <td>{money(y.operating)}</td>
              <td>{money(y.debt + y.mortgageInsurance)}</td>
              <td>{money(y.capex)}</td>
              <td className={y.cashflow < 0 ? "text-red" : "text-green"}>
                {money(y.cashflow)}
              </td>
              <td>{money(y.value)}</td>
              <td>{money(y.balance)}</td>
              <td>{money(y.saleNet)}</td>
              <td>{percent(y.roi)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const [a, setA] = useState<Assumptions>(loadDraft);
  const [saved, setSaved] = useState<Saved[]>(loadSaved);
  const [tab, setTab] = useState<Tab>("overview");
  const [modal, setModal] = useState<Modal>(null);
  const [yearly, setYearly] = useState(false);
  const [view, setView] = useState<"wealth" | "cashflow" | "roi">("wealth");
  const [saveName, setSaveName] = useState("");
  const [toast, setToast] = useState("");
  const [storageError, setStorageError] = useState(false);
  const [badFields, setBadFields] = useState<Record<string, boolean>>({});
  const [formKey, setFormKey] = useState(0);
  const [mobileInputs, setMobileInputs] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const invalid = useCallback(
    (id: string, bad: boolean) =>
      setBadFields((prev) => {
        if (!!prev[id] === bad) return prev;
        const next = { ...prev };
        if (bad) next[id] = true;
        else delete next[id];
        return next;
      }),
    [],
  );
  const hasInvalid = Object.values(badFields).some(Boolean);
  const set = useCallback(
    <K extends keyof Assumptions>(key: K, value: Assumptions[K]) => {
      setA((prev) => {
        const next = { ...prev, [key]: value };
        if (key === "price" && next.downMode === "fixed")
          next.down = Math.min(next.down, next.price);
        return next;
      });
    },
    [],
  );
  useEffect(() => {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ ...a, name: a.name.trim() || "Untitled property" }),
      );
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [a]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  const m = useMemo(() => metrics(a), [a]);
  const down = useMemo(() => project(a, "downside"), [a]);
  const up = useMemo(() => project(a, "upside"), [a]);
  const last = m.years.at(-1)!;
  const d = yearly ? 1 : 12;
  function persistSaved(next: Saved[]) {
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      setSaved(next);
      return true;
    } catch {
      setToast(
        "Browser storage is full or unavailable. Export a JSON backup instead.",
      );
      return false;
    }
  }
  function openSave() {
    setSaveName(a.name);
    setModal("save");
  }
  function load(a: Assumptions) {
    setA({ ...a });
    setFormKey((v) => v + 1);
    setBadFields({});
    setModal(null);
    setToast("Scenario loaded. Your working draft has been updated.");
  }
  function exportCsv() {
    const header = [
      "Year",
      "Revenue USD",
      "Operating costs USD",
      "NOI USD",
      "Principal USD",
      "Interest USD",
      "Mortgage insurance USD",
      "Major repair budget USD",
      "Cash flow USD",
      "Value USD",
      "Loan balance USD",
      "Net sale proceeds USD",
      "Total profit USD",
      "Capital contributed USD",
      "Total ROI percent",
    ];
    const rows = m.years.map((y) =>
      [
        y.year,
        y.revenue,
        y.operating,
        y.noi,
        y.principal,
        y.interest,
        y.mortgageInsurance,
        y.capex,
        y.cashflow,
        y.value,
        y.balance,
        y.saleNet,
        y.profit,
        y.capital,
        y.roi,
      ]
        .map((v) =>
          v === null
            ? ""
            : typeof v === "number"
              ? String(Math.round(v * 100) / 100)
              : v,
        )
        .join(","),
    );
    download(
      "stead-projections.csv",
      [header.join(","), ...rows].join("\r\n"),
      "text/csv;charset=utf-8",
    );
    setToast(
      "Projection CSV exported. Export JSON too to retain all assumptions.",
    );
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 100000)
        throw new Error(
          "File is too large. Choose a Stead JSON export under 100 KB.",
        );
      const data = JSON.parse(await file.text());
      if (data.version !== 1)
        throw new Error(
          "Unsupported file version. Choose a Stead JSON export.",
        );
      const imported = parseAssumptions(data.assumptions);
      load(imported);
      setToast("Property imported successfully.");
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Could not import file.");
    }
    if (importRef.current) importRef.current.value = "";
  }
  const title = {
    overview: "The big picture",
    projections: "A longer view",
    mortgage: "Know your financing",
    risk: "Make room for the unexpected",
  }[tab];
  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <a
            className="brand"
            href="#"
            aria-label="Stead home"
            onClick={(e) => {
              e.preventDefault();
              setTab("overview");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <span className="brand-mark">
              <House size={21} strokeWidth={1.6} />
              <span />
            </span>
            stead<span className="brand-dot">.</span>
          </a>
          <span className="brand-divider" />
          <span className="product-label">PROPERTY MODELLER</span>
          <nav>
            <button
              className="header-link"
              onClick={() => setModal("methodology")}
            >
              <BookOpen size={16} />
              <span>Methodology</span>
            </button>
            <button className="header-link" onClick={() => setModal("saved")}>
              <Bookmark size={16} />
              <span>Saved scenarios</span>
              {saved.length > 0 && <b>{saved.length}</b>}
            </button>
            <span
              className="avatar"
              role="img"
              aria-label="Private local workspace"
            >
              S
            </span>
          </nav>
        </div>
      </header>
      <main className="workspace">
        <div className="workspace-heading">
          <div>
            <div className="eyebrow">
              <span className="tiny-line" /> LESS GUESSWORK. MORE CLARITY.
            </div>
            <h1>A place for smarter investments.</h1>
            <p>
              Look beyond the listing. Understand what a rental could really
              return.
            </p>
          </div>
          <button
            className="button dark"
            onClick={openSave}
            disabled={hasInvalid}
          >
            <Plus size={16} />
            Save scenario
          </button>
        </div>
        {(storageError || hasInvalid) && (
          <div className="notice warning" role="status">
            {hasInvalid
              ? "Check the highlighted inputs. Results reflect the last valid values; saving and export are paused."
              : "Browser storage is unavailable. Your changes will not persist. Export a JSON backup."}
          </div>
        )}
        <div className="workspace-grid">
          <div
            className={`sidebar ${mobileInputs ? "mobile-open" : ""}`}
            id="property-inputs"
          >
            <Fields key={formKey} a={a} set={set} invalid={invalid} />
            <button
              className="mobile-edit-button button"
              onClick={() => setMobileInputs((v) => !v)}
              aria-expanded={mobileInputs}
              aria-controls="property-inputs"
            >
              <SlidersHorizontal size={14} />
              {mobileInputs
                ? "Hide detailed assumptions"
                : "Edit all assumptions"}
              <ChevronDown size={14} />
            </button>
            <button
              className="reset-button"
              onClick={() => {
                if (
                  window.confirm(
                    "Replace the current draft with the example? Saved scenarios will not be changed.",
                  )
                )
                  load({ ...defaults });
              }}
            >
              <RotateCcw size={12} />
              Reset to example
            </button>
          </div>
          <div className="results" id="property-results">
            <section className="property-banner">
              <div className="property-symbol">
                <House size={25} strokeWidth={1.3} />
                <Leaf size={15} />
              </div>
              <div className="property-title">
                <div>
                  <h2>{a.name || "Untitled property"}</h2>
                  <span className="example-badge">YOUR ESTIMATES</span>
                </div>
                <p>
                  <MapPin size={12} />
                  {a.zip.length === 5 ? `ZIP ${a.zip}` : "Location not set"}
                  <span>·</span>
                  {a.strategy === "long"
                    ? "Long-term rental"
                    : "Short-term rental"}
                  <span>·</span>
                  {money(a.price)}
                </p>
              </div>
              <button
                className="button export-button"
                aria-label="Export"
                onClick={() => setModal("export")}
                disabled={hasInvalid}
              >
                <ArrowDownToLine size={14} />
                <span>Export</span>
              </button>
            </section>
            <div className="analysis-toolbar">
              <div className="tabs" role="tablist" aria-label="Analysis views">
                {(
                  [
                    ["overview", "Overview"],
                    ["projections", "Projections"],
                    ["mortgage", "Mortgage"],
                    ["risk", "Risk & sensitivity"],
                  ] as [Tab, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    id={`tab-${key}`}
                    role="tab"
                    aria-selected={tab === key}
                    aria-controls="analysis-panel"
                    tabIndex={tab === key ? 0 : -1}
                    onKeyDown={(e) => {
                      const keys: Tab[] = [
                        "overview",
                        "projections",
                        "mortgage",
                        "risk",
                      ];
                      if (
                        e.key === "ArrowRight" ||
                        e.key === "ArrowLeft" ||
                        e.key === "Home" ||
                        e.key === "End"
                      ) {
                        e.preventDefault();
                        const i =
                          e.key === "Home"
                            ? 0
                            : e.key === "End"
                              ? 3
                              : (keys.indexOf(tab) +
                                  (e.key === "ArrowRight" ? 1 : 3)) %
                                4;
                        setTab(keys[i]);
                        document.getElementById(`tab-${keys[i]}`)?.focus();
                      }
                    }}
                    onClick={() => setTab(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="horizon-select">
                <select
                  aria-label="Investment horizon"
                  value={a.horizon}
                  onChange={(e) => set("horizon", Number(e.target.value))}
                >
                  {[...new Set([1, 3, 5, 10, 15, 20, 30, 40, a.horizon])]
                    .sort((x, y) => x - y)
                    .map((n) => (
                      <option key={n} value={n}>
                        {n}-year hold
                      </option>
                    ))}
                </select>
                <ChevronDown size={13} />
              </label>
            </div>
            <div
              role="tabpanel"
              id="analysis-panel"
              aria-labelledby={`tab-${tab}`}
            >
              <div className="results-heading">
                <div>
                  <h2>{title}</h2>
                  <p>
                    {tab === "overview"
                      ? "Year 1 estimates · Before income taxes"
                      : tab === "projections"
                        ? "Compounding assumptions, not guaranteed outcomes."
                        : tab === "mortgage"
                          ? "Fixed-rate, fully amortizing · No refinancing assumed"
                          : "Test your assumptions before they test you."}
                  </p>
                </div>
                {(tab === "overview" || tab === "risk") && (
                  <div
                    className="segmented period"
                    aria-label="Cash flow period"
                  >
                    <button
                      className={!yearly ? "active" : ""}
                      aria-pressed={!yearly}
                      onClick={() => setYearly(false)}
                    >
                      Monthly
                    </button>
                    <button
                      className={yearly ? "active" : ""}
                      aria-pressed={yearly}
                      onClick={() => setYearly(true)}
                    >
                      Yearly
                    </button>
                  </div>
                )}
              </div>
              {tab === "overview" && (
                <>
                  <div className="stats-grid">
                    <Stat
                      label={`${yearly ? "Annual" : "Monthly"} cash flow`}
                      value={money(m.first.cashflow / d)}
                      detail="After costs & repair budget"
                      positive={m.first.cashflow >= 0}
                      icon={<TrendingUp size={13} />}
                      help="First-year income less operating expenses, mortgage payments, mortgage insurance and major-repair budget."
                    />
                    <Stat
                      label="Cash-on-cash return"
                      value={percent(m.coc)}
                      detail="Year 1 · on initial cash"
                      icon={<ArrowUpRight size={13} />}
                      help="First-year available cash flow divided by all initial cash invested. Does not include appreciation."
                    />
                    <Stat
                      label="Cap rate"
                      value={percent(m.capRate)}
                      detail="Before financing & CapEx"
                      icon={<House size={13} />}
                      help="First-year net operating income divided by purchase price. Excludes debt service and major-repair budget."
                    />
                    <Stat
                      label="Initial cash needed"
                      value={money(m.cash)}
                      detail="Down + closing + setup"
                      icon={<Wallet size={13} />}
                      help="Down payment, closing costs, initial repairs, and STR furnishing. Working capital and prepaid escrow are additional."
                    />
                  </div>
                  <section className="panel wealth-card">
                    <div className="card-heading">
                      <div>
                        <span className="eyebrow">THE LONG GAME</span>
                        <h2>Your equity, over time</h2>
                        <p>
                          A {a.horizon}-year view of value and loan paydown.
                        </p>
                      </div>
                      <div className="equity-value">
                        <span>Year {a.horizon} projected equity</span>
                        <strong>
                          {money(last.equity)}
                          <ArrowUpRight size={19} />
                        </strong>
                      </div>
                    </div>
                    <WealthChart years={m.years} />
                    <div className="chart-footer">
                      <Legend
                        items={[
                          ["Property value", "#3d7359"],
                          ["Equity", "#b39a60"],
                          ["Loan balance", "#a5afaa"],
                        ]}
                      />
                      <button
                        className="text-button"
                        onClick={() => setTab("projections")}
                      >
                        Explore projections
                        <ArrowRight size={13} />
                      </button>
                    </div>
                    <p className="chart-note">
                      {percent(a.appreciation)} annual appreciation assumed ·
                      Equity excludes selling costs and income taxes.
                    </p>
                  </section>
                  <div className="two-columns">
                    <Breakdown a={a} y={m.first} yearly={yearly} />
                    <div className="right-stack">
                      <section className="panel risk-preview">
                        <div className="card-heading">
                          <div>
                            <span className="eyebrow">A REALITY CHECK</span>
                            <h2>What if things change?</h2>
                          </div>
                          <span className="icon-chip">
                            <SlidersHorizontal size={17} />
                          </span>
                        </div>
                        <p>
                          Less rent. More vacancy. Higher costs.
                          <br />
                          See how resilient your cash flow could be.
                        </p>
                        <RiskChart a={a} small yearly={yearly} />
                        <div className="risk-values">
                          <div>
                            <span>Downside</span>
                            <strong
                              className={down[0].cashflow < 0 ? "text-red" : ""}
                            >
                              {money(down[0].cashflow / d)}
                            </strong>
                          </div>
                          <div>
                            <span>Base case</span>
                            <strong>{money(m.first.cashflow / d)}</strong>
                          </div>
                          <div>
                            <span>Upside</span>
                            <strong>{money(up[0].cashflow / d)}</strong>
                          </div>
                        </div>
                        <p className="micro-note">
                          {yearly ? "Annual" : "Monthly average"} · Stress
                          cases, not probabilities.
                        </p>
                        <button
                          className="text-button"
                          onClick={() => setTab("risk")}
                        >
                          Explore risk & sensitivity
                          <ArrowRight size={14} />
                        </button>
                      </section>
                      <section className="insight-card">
                        <span className="insight-icon">
                          <Sparkles size={18} />
                        </span>
                        <div>
                          <span className="eyebrow">YOUR BREAK-EVEN POINT</span>
                          <h3>
                            {m.breakEven === null
                              ? "No feasible break-even"
                              : a.strategy === "long"
                                ? `${money(m.breakEven)} / month`
                                : `${percent(m.breakEven)} occupancy`}
                          </h3>
                          <p>
                            {a.strategy === "long"
                              ? `Asking rent needed to cover all modelled costs at ${a.vacancy}% vacancy.`
                              : "Booked share of available nights needed to cover all modelled costs."}
                          </p>
                        </div>
                      </section>
                    </div>
                  </div>
                  <section className="panel cash-needed">
                    <div className="card-heading">
                      <div>
                        <span className="eyebrow">BEFORE YOU GET THE KEYS</span>
                        <h2>Where your initial cash goes</h2>
                      </div>
                      <span className="total-cash">{money(m.cash)}</span>
                    </div>
                    <div className="cash-parts">
                      <div>
                        <span>Down payment</span>
                        <strong>{money(downPayment(a))}</strong>
                      </div>
                      <span>+</span>
                      <div>
                        <span>Closing costs</span>
                        <strong>{money((a.price * a.closing) / 100)}</strong>
                      </div>
                      <span>+</span>
                      <div>
                        <span>Initial repairs</span>
                        <strong>{money(a.rehab)}</strong>
                      </div>
                      {a.strategy === "short" && (
                        <>
                          <span>+</span>
                          <div>
                            <span>Furnishing</span>
                            <strong>{money(a.furnishing)}</strong>
                          </div>
                        </>
                      )}
                    </div>
                    <p className="card-footnote">
                      Keep additional cash for working capital, prepaid escrow,
                      and unexpected costs. Not included above.
                    </p>
                  </section>
                </>
              )}
              {tab === "projections" && (
                <>
                  <div className="stats-grid three">
                    <Stat
                      label={`Year ${a.horizon} net sale proceeds`}
                      value={money(last.saleNet)}
                      detail={`After ${a.selling}% selling costs & debt`}
                      icon={<House size={13} />}
                      help="Projected home value minus selling costs and loan payoff; before income taxes."
                    />
                    <Stat
                      label={`${a.horizon}-year total profit`}
                      value={money(last.profit)}
                      detail="Cash flows + net sale − initial cash"
                      positive={last.profit >= 0}
                      icon={<TrendingUp size={13} />}
                      help="Cumulative cash flow plus net sale proceeds minus initial cash. Repair budgets are assumed spent annually."
                    />
                    <Stat
                      label="Total return on invested cash"
                      value={percent(last.roi)}
                      detail="Cumulative · sale assumed"
                      icon={<ArrowUpRight size={13} />}
                      help="Profit divided by initial cash plus funded negative annual cash flows. Not annualized, not IRR."
                    />
                  </div>
                  <section className="panel wealth-card">
                    <div className="card-heading">
                      <div>
                        <span className="eyebrow">YOUR HOLDING PERIOD</span>
                        <h2>
                          {view === "wealth"
                            ? "Value & equity"
                            : view === "cashflow"
                              ? "Cash flow over time"
                              : "Return, including a sale"}
                        </h2>
                      </div>
                      <div className="segmented chart-toggle">
                        {(["wealth", "cashflow", "roi"] as const).map((v) => (
                          <button
                            key={v}
                            className={view === v ? "active" : ""}
                            aria-pressed={view === v}
                            onClick={() => setView(v)}
                          >
                            {v === "wealth"
                              ? "Value"
                              : v === "cashflow"
                                ? "Cash flow"
                                : "ROI"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <WealthChart years={m.years} view={view} />
                    <Legend
                      items={
                        view === "wealth"
                          ? [
                              ["Property value", "#3d7359"],
                              ["Equity", "#b39a60"],
                              ["Loan balance", "#a5afaa"],
                            ]
                          : view === "cashflow"
                            ? [
                                ["Annual cash flow", "#3d7359"],
                                ["Cumulative cash flow", "#b39a60"],
                              ]
                            : [
                                [
                                  "Cumulative total ROI, assuming sale",
                                  "#3d7359",
                                ],
                              ]
                      }
                    />
                  </section>
                  <div className="assumption-strip">
                    <span>
                      <strong>{percent(a.appreciation)}</strong> home
                      appreciation
                    </span>
                    <span>
                      <strong>{percent(a.rentGrowth)}</strong> income growth
                    </span>
                    <span>
                      <strong>{percent(a.expenseGrowth)}</strong> cost growth
                    </span>
                    <span>
                      <strong>{percent(a.selling)}</strong> sale costs
                    </span>
                  </div>
                  <section className="panel data-card">
                    <div className="card-heading">
                      <h2>The year-by-year details</h2>
                      <button
                        className="text-button"
                        onClick={exportCsv}
                        disabled={hasInvalid}
                      >
                        <ArrowDownToLine size={14} />
                        CSV
                      </button>
                    </div>
                    <ProjectionTable years={m.years} />
                    <p className="card-footnote">
                      Annual averages; no seasonality. Total ROI includes sale
                      costs, loan payoff and funded cash deficits; excludes all
                      income taxes.
                    </p>
                  </section>
                </>
              )}
              {tab === "mortgage" && <Mortgage a={a} />}
              {tab === "risk" && (
                <>
                  <div className="notice">
                    <ShieldCheck size={19} />
                    <div>
                      <strong>Scenarios, not a crystal ball.</strong>
                      <p>
                        These ranges are deterministic stress tests—not error
                        probabilities or statistical confidence intervals. Red
                        shading marks negative cash flow.
                      </p>
                    </div>
                  </div>
                  <section className="panel stress-controls">
                    <div className="card-heading">
                      <div>
                        <span className="eyebrow">CHOOSE YOUR STRESS TEST</span>
                        <h2>How far should we push?</h2>
                      </div>
                    </div>
                    <div className="slider-grid">
                      {(
                        [
                          ["rentStress", "Rent / nightly rate", "%"],
                          ["occupancyStress", "Occupancy", "pp"],
                          ["costStress", "Fixed costs & repair budget", "%"],
                        ] as const
                      ).map(([key, label, unit]) => (
                        <label key={key}>
                          <span>
                            {label}
                            <strong>
                              ±{a[key]}
                              {unit}
                            </strong>
                          </span>
                          <input
                            type="range"
                            min={0}
                            max={key === "costStress" ? 100 : 50}
                            step={1}
                            value={a[key]}
                            onChange={(e) => set(key, Number(e.target.value))}
                          />
                          <small>
                            {key === "occupancyStress"
                              ? "Percentage points, clipped to 0–100%"
                              : key === "rentStress"
                                ? "Rate change; growth assumptions unchanged"
                                : "Percentage fees still follow revenue"}
                          </small>
                        </label>
                      ))}
                    </div>
                  </section>
                  <section className="panel">
                    <div className="card-heading">
                      <div>
                        <span className="eyebrow">
                          THE RANGE OF POSSIBILITIES
                        </span>
                        <h2>
                          {yearly ? "Annual" : "Monthly average"} cash flow
                          under stress
                        </h2>
                        <p>
                          Ranges span all three cases. The green dot is your
                          base case.
                        </p>
                      </div>
                    </div>
                    <RiskChart a={a} yearly={yearly} />
                    <Legend
                      items={[
                        ["Negative cash flow", "#e7b7a5"],
                        ["Stress range", "#99aa95"],
                        ["Base case", "#2e614b"],
                      ]}
                    />
                  </section>
                  <section className="panel data-card">
                    <div className="card-heading">
                      <h2>Year 1, three ways</h2>
                      <span className="unit-label">
                        {yearly ? "Annual" : "Monthly average"} cash flow
                      </span>
                    </div>
                    <div className="scenario-grid">
                      {(["downside", "base", "upside"] as const).map((s, i) => {
                        const y = [down[0], m.first, up[0]][i];
                        const direction = i - 1;
                        const occ = Math.max(
                          0,
                          Math.min(
                            100,
                            (a.strategy === "long"
                              ? 100 - a.vacancy
                              : a.occupancy) +
                              direction * a.occupancyStress,
                          ),
                        );
                        return (
                          <div className={`scenario-case ${s}`} key={s}>
                            <span className="eyebrow">
                              {s === "base" ? "BASE CASE" : s.toUpperCase()}
                            </span>
                            <strong
                              className={
                                y.cashflow < 0 ? "text-red" : "text-green"
                              }
                            >
                              {money(y.cashflow / d)}
                            </strong>
                            <ul>
                              <li>
                                Rent / rate{" "}
                                <b>
                                  {direction === 0
                                    ? "unchanged"
                                    : `${direction > 0 ? "+" : "−"}${a.rentStress}%`}
                                </b>
                              </li>
                              <li>
                                Occupancy <b>{percent(occ)}</b>
                              </li>
                              <li>
                                Fixed costs{" "}
                                <b>
                                  {direction === 0
                                    ? "unchanged"
                                    : `${direction < 0 ? "+" : "−"}${a.costStress}%`}
                                </b>
                              </li>
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                  <div className="two-columns">
                    <section className="insight-card">
                      <ShieldCheck size={23} />
                      <div>
                        <span className="eyebrow">DOWNSIDE CASH BUFFER</span>
                        <h3>
                          {money(Math.max(0, -down[0].cashflow) / 2)} for six
                          months
                        </h3>
                        <p>
                          Illustrative buffer for six months of the downside
                          average cash-flow shortfall. Not a sufficient
                          emergency reserve for disasters or major repairs.
                        </p>
                      </div>
                    </section>
                    <section className="insight-card">
                      <Wallet size={23} />
                      <div>
                        <span className="eyebrow">
                          INDICATIVE DEBT COVERAGE
                        </span>
                        <h3>
                          {m.dscr === null
                            ? "No debt service"
                            : `${m.dscr.toFixed(2)}× NOI / debt service`}
                        </h3>
                        <p>
                          {m.dscr === null
                            ? "This property is modelled without a mortgage."
                            : "Below 1× means operations alone do not cover debt service, even before major repairs. Lender definitions vary."}
                        </p>
                      </div>
                    </section>
                  </div>
                </>
              )}
            </div>
            <footer className="results-footer">
              <span>
                <ShieldCheck size={14} />
                Your numbers stay in your browser.
              </span>
              <button onClick={() => setModal("methodology")}>
                Assumptions, sources & limitations
                <ArrowUpRight size={12} />
              </button>
            </footer>
            <p className="disclaimer">
              A planning tool, not investment, lending, tax, or legal advice.
              Estimates are only as reliable as your inputs. Verify
              property-specific costs, rental demand, and local regulations
              independently.
            </p>
          </div>
        </div>
        <div className="page-footer">
          <a className="brand small" href="#" aria-label="Back to top">
            stead.
          </a>
          <span>Rental property, clearly.</span>
          <span>Built for a considered decision.</span>
        </div>
      </main>
      {modal === "methodology" && (
        <Dialog
          title="The method behind the model"
          close={() => setModal(null)}
          wide
        >
          <Methodology />
        </Dialog>
      )}
      {modal === "save" && (
        <Dialog title="Save a scenario" close={() => setModal(null)}>
          <p className="muted">
            Keep this set of assumptions to revisit or compare later. Stored
            only in this browser.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!saveName.trim()) return;
              if (saved.length >= 50) {
                setToast(
                  "You have 50 saved scenarios. Remove one or export a backup first.",
                );
                return;
              }
              const item: Saved = {
                id: crypto.randomUUID(),
                date: new Date().toISOString(),
                assumptions: { ...a, name: saveName.trim() },
              };
              if (persistSaved([item, ...saved])) {
                setA(item.assumptions);
                setModal(null);
                setToast("Scenario saved in this browser.");
              }
            }}
          >
            <label className="text-field">
              Scenario name
              <input
                autoFocus
                required
                maxLength={100}
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="e.g. Charlotte · 20% down"
              />
            </label>
            <div className="save-summary">
              <span>
                {a.strategy === "long"
                  ? "Long-term rental"
                  : "Short-term rental"}{" "}
                · {money(a.price)}
              </span>
              <strong>{money(m.first.cashflow / 12)} / mo</strong>
            </div>
            <div className="dialog-actions">
              <button
                type="button"
                className="button"
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button
                className="button dark"
                type="submit"
                disabled={!saveName.trim() || hasInvalid}
              >
                <Bookmark size={15} />
                Save scenario
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {modal === "saved" && (
        <Dialog title="Your saved scenarios" close={() => setModal(null)} wide>
          <div className="saved-intro">
            <p className="muted">
              Compare year 1 estimates. Loading a scenario replaces your current
              draft.
            </p>
            <button
              className="button"
              onClick={() => importRef.current?.click()}
            >
              <Plus size={14} />
              Import JSON
            </button>
          </div>
          {saved.length === 0 ? (
            <div className="empty-state">
              <Bookmark size={35} strokeWidth={1} />
              <h3>A little perspective goes a long way.</h3>
              <p>
                Save your first scenario, then explore a different price, rate,
                or rental strategy.
              </p>
              <button className="button dark" onClick={openSave}>
                Save current scenario
              </button>
            </div>
          ) : (
            <div className="table-scroll saved-table">
              <table>
                <caption>
                  Saved scenarios · first-year cash flow after repair budget
                </caption>
                <thead>
                  <tr>
                    <th>Property / scenario</th>
                    <th>Price</th>
                    <th>Cash flow / mo</th>
                    <th>Cash-on-cash</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {saved.map((s) => {
                    const sm = metrics(s.assumptions);
                    return (
                      <tr key={s.id}>
                        <th scope="row">
                          <strong>{s.assumptions.name}</strong>
                          <small>
                            {s.assumptions.strategy === "long"
                              ? "Long-term"
                              : "Short-term"}{" "}
                            · ZIP {s.assumptions.zip || "—"} ·{" "}
                            {new Date(s.date).toLocaleDateString()}
                          </small>
                        </th>
                        <td>{money(s.assumptions.price)}</td>
                        <td
                          className={
                            sm.first.cashflow < 0 ? "text-red" : "text-green"
                          }
                        >
                          {money(sm.first.cashflow / 12)}
                        </td>
                        <td>{percent(sm.coc)}</td>
                        <td>
                          <div className="table-actions">
                            <button
                              className="button"
                              onClick={() => load(s.assumptions)}
                            >
                              Load
                            </button>
                            <button
                              className="icon-button"
                              aria-label={`Delete ${s.assumptions.name}`}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Delete “${s.assumptions.name}”?`,
                                  )
                                ) {
                                  if (
                                    persistSaved(
                                      saved.filter((v) => v.id !== s.id),
                                    )
                                  )
                                    setToast("Scenario removed.");
                                }
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="card-footnote">
            Export JSON backups before clearing browser data. Saved scenarios
            are not synced across devices.
          </p>
        </Dialog>
      )}
      {modal === "export" && (
        <Dialog
          title="Take your analysis with you"
          close={() => setModal(null)}
        >
          <p className="muted">
            A clear record of your assumptions and projected results.
          </p>
          <div className="export-options">
            <button
              onClick={() => {
                download(
                  "stead-property.json",
                  JSON.stringify(
                    {
                      version: 1,
                      exportedAt: new Date().toISOString(),
                      assumptions: a,
                    },
                    null,
                    2,
                  ),
                  "application/json",
                );
                setToast(
                  "Property JSON exported. Re-import it from Saved scenarios.",
                );
              }}
            >
              <FileJson size={24} />
              <span>
                <strong>Property file</strong>
                <small>JSON · All assumptions · Re-importable backup</small>
              </span>
              <ArrowDownToLine size={17} />
            </button>
            <button onClick={exportCsv}>
              <FileSpreadsheet size={24} />
              <span>
                <strong>Year-by-year projections</strong>
                <small>CSV · Open in Excel or Google Sheets</small>
              </span>
              <ArrowDownToLine size={17} />
            </button>
            <button
              onClick={() => {
                setModal(null);
                setTimeout(() => window.print(), 100);
              }}
            >
              <Printer size={24} />
              <span>
                <strong>Print current analysis</strong>
                <small>Print this view or save it as a PDF</small>
              </span>
              <ArrowUpRight size={17} />
            </button>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `${a.name}\n${a.strategy === "long" ? "Long-term" : "Short-term"} rental · ZIP ${a.zip}\nPrice: ${money(a.price)}\nInitial cash: ${money(initialCash(a))}\nYear 1 cash flow: ${money(m.first.cashflow / 12)}/month\nCash-on-cash: ${percent(m.coc)}\nCap rate: ${percent(m.capRate)}\nIllustrative, pre-tax estimates, not advice. Model assumes a fixed-rate loan and includes a major-repair budget. Verify all inputs independently.`,
                  );
                  setToast("Summary copied to clipboard.");
                } catch {
                  setToast(
                    "Clipboard access unavailable. Use JSON or CSV export instead.",
                  );
                }
              }}
            >
              <Copy size={24} />
              <span>
                <strong>Copy a quick summary</strong>
                <small>Key first-year metrics, ready to paste</small>
              </span>
              <ArrowUpRight size={17} />
            </button>
          </div>
        </Dialog>
      )}
      <input
        className="visually-hidden"
        ref={importRef}
        type="file"
        accept=".json,application/json"
        onChange={(e) => importFile(e.target.files?.[0])}
        aria-label="Import property JSON"
        tabIndex={-1}
      />
      <div className="mobile-dock">
        <div>
          <span>Year 1 cash flow / mo</span>
          <strong className={m.first.cashflow < 0 ? "text-red" : ""}>
            {money(m.first.cashflow / 12)}
          </strong>
        </div>
        <button
          className="button dark"
          onClick={() => {
            const editing = !mobileInputs;
            setMobileInputs(editing);
            setTimeout(
              () =>
                document
                  .getElementById(
                    editing ? "property-inputs" : "property-results",
                  )
                  ?.scrollIntoView({ behavior: "smooth", block: "start" }),
              20,
            );
          }}
        >
          {mobileInputs ? (
            <>
              <ArrowRight size={15} />
              View analysis
            </>
          ) : (
            <>
              <SlidersHorizontal size={15} />
              Edit assumptions
            </>
          )}
        </button>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
          <button
            onClick={() => setToast("")}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </>
  );
}
function Mortgage({ a }: { a: Assumptions }) {
  const m = metrics(a),
    loan = amortize(a);
  const interest = loan.reduce((sum, l) => sum + l.interest, 0);
  const [monthly, setMonthly] = useState(false);
  const rows = Array.from(
    { length: monthly ? loan.length : a.term },
    (_, i) => {
      const ms = monthly ? [loan[i]] : loan.slice(i * 12, i * 12 + 12);
      return {
        n: i + 1,
        payment: ms.reduce((s, m) => s + m.payment, 0),
        principal: ms.reduce((s, m) => s + m.principal, 0),
        interest: ms.reduce((s, m) => s + m.interest, 0),
        balance: ms.at(-1)?.balance ?? 0,
      };
    },
  );
  return (
    <>
      <div className="stats-grid three">
        <Stat
          label="Principal & interest / month"
          value={money(m.monthlyPayment, 2)}
          detail={`${percent(a.interest)} fixed · ${a.term} years`}
          icon={<House size={13} />}
          help="The fixed mortgage payment only. Taxes, property insurance, mortgage insurance, and other costs are separate."
        />
        <Stat
          label="Lifetime interest"
          value={money(interest)}
          detail="Cost of borrowing, excluding fees"
          icon={<Wallet size={13} />}
          help="Sum of interest over the full loan term. Origination fees and closing costs are not included."
        />
        <Stat
          label="Total loan repayments"
          value={money(m.loan + interest)}
          detail={`${money(m.loan)} principal + interest`}
          icon={<ArrowUpRight size={13} />}
          help="Lifetime mortgage principal and interest; excludes taxes, all insurance, and operating costs."
        />
      </div>
      <section className="panel wealth-card">
        <div className="card-heading">
          <div>
            <span className="eyebrow">FROM INTEREST TO OWNERSHIP</span>
            <h2>Every payment builds a little more equity.</h2>
            <p>
              Annual principal & interest (left) · Remaining balance (right)
            </p>
          </div>
        </div>
        <LoanChart a={a} />
        <Legend
          items={[
            ["Principal", "#52836b"],
            ["Interest", "#d9c99c"],
            ["Loan balance", "#84948b"],
          ]}
        />
      </section>
      <section className="panel payment-details">
        <div className="card-heading">
          <div>
            <span className="eyebrow">DON’T STOP AT THE MORTGAGE</span>
            <h2>Your starting monthly ownership payment</h2>
          </div>
          <strong>
            {money(
              m.monthlyPayment +
                a.tax / 12 +
                a.insurance / 12 +
                (m.loan > 0 ? a.mortgageInsurance : 0),
              2,
            )}
          </strong>
        </div>
        <div className="cash-parts">
          <div>
            <span>Principal & interest</span>
            <strong>{money(m.monthlyPayment, 2)}</strong>
          </div>
          <div>
            <span>Property taxes</span>
            <strong>{money(a.tax / 12, 2)}</strong>
          </div>
          <div>
            <span>Property insurance</span>
            <strong>{money(a.insurance / 12, 2)}</strong>
          </div>
          <div>
            <span>Mortgage insurance</span>
            <strong>{money(m.loan > 0 ? a.mortgageInsurance : 0, 2)}</strong>
          </div>
        </div>
        <p className="card-footnote">
          PITI + mortgage insurance. HOA, upkeep, management, and owner-paid
          utilities are additional. Taxes and property insurance may increase.
        </p>
      </section>
      <section className="panel data-card">
        <div className="card-heading">
          <h2>Amortization schedule</h2>
          <div className="segmented period">
            <button
              className={!monthly ? "active" : ""}
              aria-pressed={!monthly}
              onClick={() => setMonthly(false)}
            >
              Yearly
            </button>
            <button
              className={monthly ? "active" : ""}
              aria-pressed={monthly}
              onClick={() => setMonthly(true)}
            >
              Monthly
            </button>
          </div>
        </div>
        <div className="table-scroll amortization-table" tabIndex={0}>
          <table>
            <caption>
              Full-term {monthly ? "monthly" : "annual"} mortgage schedule · USD
            </caption>
            <thead>
              <tr>
                <th>{monthly ? "Month" : "Year"}</th>
                <th>Payment (P&I)</th>
                <th>Principal</th>
                <th>Interest</th>
                <th>Remaining balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.n}>
                  <th scope="row">{row.n}</th>
                  <td>{money(row.payment, 2)}</td>
                  <td>{money(row.principal, 2)}</td>
                  <td>{money(row.interest, 2)}</td>
                  <td>{money(row.balance, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
