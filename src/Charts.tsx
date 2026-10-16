import { useId } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Assumptions, Year } from "./model";
import { amortize, project } from "./model";
import { compact, money, percent } from "./format";

const axis = { fontSize: 11, fill: "#87908a", fontFamily: "inherit" };
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: readonly {
    name?: string | number;
    value?: number | string;
    color?: string;
  }[];
  label?: unknown;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>Year {String(label)}</strong>
      {payload.map((p) => (
        <div key={p.name}>
          <i style={{ background: p.color }} />
          <span>{p.name}</span>
          <b>
            {p.name === "Total ROI"
              ? percent(Number(p.value))
              : money(Number(p.value))}
          </b>
        </div>
      ))}
    </div>
  );
}
export function WealthChart({
  years,
  view = "wealth",
}: {
  years: Year[];
  view?: "wealth" | "cashflow" | "roi";
}) {
  const id = useId().replace(/:/g, "");
  return (
    <div
      className="chart"
      role="img"
      aria-label={
        view === "wealth"
          ? "Projected property value, equity and remaining loan by year. Exact values are available in the projections table."
          : `Projected ${view} by year. Exact values are available in the projections table.`
      }
    >
      <ResponsiveContainer width="100%" height={265}>
        <AreaChart
          data={years}
          margin={{ top: 18, right: 15, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4b8467" stopOpacity={0.17} />
              <stop offset="100%" stopColor="#4b8467" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="#eaece5"
            strokeDasharray="3 5"
            vertical={false}
          />
          <XAxis
            dataKey="year"
            tick={axis}
            tickLine={false}
            axisLine={false}
            tickMargin={12}
            minTickGap={25}
            tickFormatter={(v) => `Yr ${v}`}
          />
          <YAxis
            tick={axis}
            tickLine={false}
            axisLine={false}
            width={60}
            tickFormatter={(v) =>
              view === "roi"
                ? `${compact(v)}%`
                : `${v < 0 ? "−" : ""}$${compact(Math.abs(v))}`
            }
          />
          <Tooltip content={<ChartTooltip />} />
          {view === "wealth" ? (
            <>
              <Area
                type="monotone"
                dataKey="value"
                name="Property value"
                dot={years.length === 1 ? { r: 4 } : false}
                stroke="#3d7359"
                strokeWidth={2.5}
                fill={`url(#fill-${id})`}
                animationDuration={350}
              />
              <Area
                type="monotone"
                dataKey="equity"
                name="Equity"
                dot={years.length === 1 ? { r: 4 } : false}
                stroke="#b39a60"
                strokeWidth={2}
                fill="none"
                animationDuration={350}
              />
              <Area
                type="monotone"
                dataKey="balance"
                name="Loan balance"
                dot={years.length === 1 ? { r: 4 } : false}
                stroke="#a5afaa"
                strokeDasharray="5 5"
                strokeWidth={1.7}
                fill="none"
                animationDuration={350}
              />
            </>
          ) : view === "cashflow" ? (
            <>
              <Area
                type="monotone"
                dataKey="cashflow"
                name="Annual cash flow"
                dot={years.length === 1 ? { r: 4 } : false}
                stroke="#3d7359"
                fill={`url(#fill-${id})`}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="cumulative"
                name="Cumulative cash flow"
                dot={years.length === 1 ? { r: 4 } : false}
                stroke="#b39a60"
                fill="none"
                strokeWidth={2}
              />
            </>
          ) : (
            <Area
              type="monotone"
              dataKey="roi"
              name="Total ROI"
              dot={years.length === 1 ? { r: 4 } : false}
              stroke="#3d7359"
              fill={`url(#fill-${id})`}
              strokeWidth={2}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export function LoanChart({ a }: { a: Assumptions }) {
  const loan = amortize(a);
  const annual = Array.from({ length: a.term }, (_, i) => {
    const months = loan.slice(i * 12, i * 12 + 12);
    return {
      year: i + 1,
      principal: months.reduce((sum, m) => sum + m.principal, 0),
      interest: months.reduce((sum, m) => sum + m.interest, 0),
      balance: months.at(-1)?.balance ?? 0,
    };
  });
  return (
    <div
      className="chart"
      role="img"
      aria-label="Annual mortgage payment split into principal and interest, with remaining balance on the right axis. Exact figures follow in the table."
    >
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart
          data={annual}
          margin={{ top: 15, right: 5, left: 0, bottom: 5 }}
        >
          <CartesianGrid
            stroke="#eaece5"
            vertical={false}
            strokeDasharray="3 5"
          />
          <XAxis
            dataKey="year"
            tick={axis}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `Yr ${v}`}
            minTickGap={20}
          />
          <YAxis
            yAxisId="payment"
            tick={axis}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${compact(v)}`}
            width={60}
          />
          <YAxis
            yAxisId="balance"
            orientation="right"
            tick={axis}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${compact(v)}`}
            width={60}
          />
          <Tooltip content={<ChartTooltip />} />
          <Bar
            yAxisId="payment"
            dataKey="principal"
            name="Principal"
            stackId="payment"
            fill="#52836b"
            maxBarSize={25}
          />
          <Bar
            yAxisId="payment"
            dataKey="interest"
            name="Interest"
            stackId="payment"
            fill="#d9c99c"
            radius={[3, 3, 0, 0]}
            maxBarSize={25}
          />
          <Line
            yAxisId="balance"
            dataKey="balance"
            name="Loan balance"
            stroke="#84948b"
            dot={false}
            strokeWidth={2}
            strokeDasharray="4 4"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
export function FlowBars({ first, divisor }: { first: Year; divisor: number }) {
  const data = [
    { name: "Income", amount: first.revenue / divisor, fill: "#74937d" },
    {
      name: "Operating costs",
      amount: first.operating / divisor,
      fill: "#d6c8a5",
    },
    {
      name: "Financing",
      amount: (first.debt + first.mortgageInsurance) / divisor,
      fill: "#aab5ae",
    },
    { name: "Major repairs", amount: first.capex / divisor, fill: "#d7dbd0" },
  ];
  return (
    <div className="flow-bars" aria-hidden="true">
      <ResponsiveContainer width="100%" height={110}>
        <BarChart
          accessibilityLayer={false}
          layout="vertical"
          data={data}
          margin={{ left: 0, right: 10, top: 0, bottom: 0 }}
          barSize={9}
        >
          <XAxis type="number" hide />
          <YAxis
            dataKey="name"
            type="category"
            tick={{ ...axis, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={95}
          />
          <Bar dataKey="amount" radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
export function RiskChart({
  a,
  small = false,
  yearly = false,
}: {
  a: Assumptions;
  small?: boolean;
  yearly?: boolean;
}) {
  const base = project(a),
    down = project(a, "downside"),
    up = project(a, "upside");
  const indices = small
    ? [0]
    : [
        ...new Set([
          0,
          Math.min(2, a.horizon - 1),
          Math.min(4, a.horizon - 1),
          a.horizon - 1,
        ]),
      ];
  const scale = yearly ? 1 : 12;
  const values = indices.flatMap((i) => [
    base[i].cashflow / scale,
    down[i].cashflow / scale,
    up[i].cashflow / scale,
  ]);
  const min = Math.min(0, ...values),
    max = Math.max(0, ...values);
  const pad = Math.max((max - min) * 0.15, 100);
  const lo = min - pad,
    hi = max + pad;
  const x = (v: number) => 82 + ((v - lo) / (hi - lo)) * 548;
  const h = indices.length * 57 + 42;
  return (
    <div className={`risk-chart ${small ? "small" : ""}`}>
      <svg
        viewBox={`0 0 660 ${h}`}
        role="img"
        aria-label="Cash flow stress ranges, not statistical confidence intervals. Red area indicates negative cash flow."
      >
        <rect
          x="82"
          y="5"
          width={x(0) - 82}
          height={h - 35}
          rx="4"
          fill="#fbefea"
        />
        <rect
          x={x(0)}
          y="5"
          width={630 - x(0)}
          height={h - 35}
          rx="4"
          fill="#f2f6ef"
        />
        <line
          x1={x(0)}
          x2={x(0)}
          y1="5"
          y2={h - 30}
          stroke="#c0c7bd"
          strokeDasharray="3 4"
        />
        {indices.map((i, j) => {
          const low =
              Math.min(down[i].cashflow, up[i].cashflow, base[i].cashflow) /
              scale,
            high =
              Math.max(down[i].cashflow, up[i].cashflow, base[i].cashflow) /
              scale;
          const y = 33 + j * 57;
          return (
            <g key={i}>
              <text x="5" y={y + 4} fill="#7c857e" fontSize="12">
                Year {i + 1}
              </text>
              <line
                x1={x(low)}
                x2={x(high)}
                y1={y}
                y2={y}
                stroke="#99aa95"
                strokeWidth="3"
              />
              <line
                x1={x(low)}
                x2={x(low)}
                y1={y - 9}
                y2={y + 9}
                stroke={low < 0 ? "#c6836e" : "#99aa95"}
                strokeWidth="2"
              />
              <line
                x1={x(high)}
                x2={x(high)}
                y1={y - 9}
                y2={y + 9}
                stroke="#99aa95"
                strokeWidth="2"
              />
              <circle
                cx={x(base[i].cashflow / scale)}
                cy={y}
                r="6"
                fill="#2e614b"
                stroke="white"
                strokeWidth="2"
              />
              <title>
                Year {i + 1}: low {money(low)}, base{" "}
                {money(base[i].cashflow / scale)}, high {money(high)}.
              </title>
            </g>
          );
        })}
        {[lo, 0, hi].map((v, i) => (
          <text
            key={i}
            x={x(v)}
            y={h - 8}
            textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"}
            fontSize="11"
            fill="#899188"
          >
            {money(v)}
          </text>
        ))}
      </svg>
    </div>
  );
}
