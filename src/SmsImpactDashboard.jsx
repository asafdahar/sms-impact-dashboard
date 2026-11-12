import React, { useMemo, useState, createContext, useContext } from "react";
import {
  ResponsiveContainer, AreaChart, Area, ComposedChart, Bar, Line,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import {
  GripVertical, X, Plus, SlidersHorizontal, LayoutGrid, Check,
  ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight, RotateCcw,
  PhoneCall, TrendingUp, MessageSquare,
  DollarSign, Sparkles, Percent, Wallet, CalendarCheck, Timer, CalendarX, Zap, Send, Clock,
  Hourglass, Coins, BarChart3, PieChart, ArrowLeftRight,
} from "lucide-react";

/* ───────────────────────── Tokens ───────────────────────── */
const C = {
  ink: "#1E2433",
  navy: "#222B3D",
  blue: "#2F6FE4",
  blueSoft: "#8DB4F7",
  sky: "#6F9DF3",
  green: "#2E9E6B",
  amber: "#E0A030",
};
const PILLAR = {
  Financial: C.navy,
  Responsiveness: C.blue,
  Results: C.sky,
  Value: C.green,
};
const METRIC_ICON = {
  revenue: DollarSign, value: Sparkles, net: TrendingUp, roi: Percent, cost: Wallet,
  shiftsFilled: CalendarCheck, fillTime: Timer, lateCovered: PhoneCall, missedVisits: CalendarX,
  replyTime: Zap, unanswered: MessageSquare, delivered: Send,
  hoursSaved: Clock, overtime: Hourglass, costPerShift: Coins,
};

/* ───────────────────────── Assumptions ───────────────────────── */
const DEFAULTS = {
  shiftsFilled: 186, unfilledShare: 55, lateCovered: 42, wouldMiss: 70,
  shiftHrs: 4.5, billRate: 34, margin: 30,
  otShare: 30, wage: 19, otPrem: 50, textsAuto: 5200, minPerText: 1.4, coordCost: 28,
  platformFee: 2400, messages: 9800, perText: 0.011, setup: 6000,
};

const FIELD_GROUPS = [
  { title: "Results", fields: [
    { k: "shiftsFilled", label: "Open shifts filled by text, per month", min: 0, max: 500, step: 1 },
    { k: "unfilledShare", label: "…that would have gone unfilled", min: 0, max: 100, step: 1, suffix: "%" },
    { k: "lateCovered", label: "Late call-outs covered, per month", min: 0, max: 150, step: 1 },
    { k: "wouldMiss", label: "…that would have been missed visits", min: 0, max: 100, step: 1, suffix: "%" },
  ]},
  { title: "Revenue", fields: [
    { k: "shiftHrs", label: "Average shift length", min: 1, max: 12, step: 0.5, suffix: " h" },
    { k: "billRate", label: "Bill rate per hour", min: 15, max: 80, step: 1, prefix: "$" },
    { k: "margin", label: "Gross margin on revenue", min: 5, max: 60, step: 1, suffix: "%" },
  ]},
  { title: "Savings", fields: [
    { k: "otShare", label: "Filled shifts that would have been overtime", min: 0, max: 100, step: 1, suffix: "%" },
    { k: "wage", label: "Caregiver wage per hour", min: 12, max: 40, step: 0.5, prefix: "$" },
    { k: "otPrem", label: "Overtime premium", min: 0, max: 100, step: 5, suffix: "%" },
    { k: "textsAuto", label: "Texts handled without staff, per month", min: 0, max: 20000, step: 100 },
    { k: "minPerText", label: "Staff minutes saved per text", min: 0.5, max: 5, step: 0.1, suffix: " min" },
    { k: "coordCost", label: "Coordinator cost per hour", min: 15, max: 60, step: 1, prefix: "$" },
  ]},
  { title: "SMS cost", fields: [
    { k: "platformFee", label: "Platform fee, per month", min: 0, max: 10000, step: 50, prefix: "$" },
    { k: "messages", label: "Texts sent, per month", min: 0, max: 40000, step: 100 },
    { k: "perText", label: "Cost per text", min: 0, max: 0.05, step: 0.001, prefix: "$" },
    { k: "setup", label: "One-time setup", min: 0, max: 30000, step: 100, prefix: "$" },
  ]},
];

const SCENARIOS = { cautious: 0.7, expected: 1, stretch: 1.25 };

/* ───────────────────────── Formatters ───────────────────────── */
const money = (v, d = 0) => {
  const a = Math.abs(v), s = v < 0 ? "−" : "";
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e5) return `${s}$${Math.round(a / 1e3)}k`;
  return `${s}$${a.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`;
};
const money2 = (v) => money(v, 2);
const int = (v) => Math.round(v).toLocaleString("en-US");
const pct = (v) => `${v < 10 ? v.toFixed(1) : Math.round(v)}%`;
const hrs = (v) => `${Math.round(v).toLocaleString("en-US")} h`;
const mins = (v) => (v < 60 ? `${Math.round(v)} min` : `${(v / 60).toFixed(1)} h`);

/* ───────────────────────── Model ───────────────────────── */
function model(i, k) {
  const shifts = i.shiftsFilled * k;
  const unfilledAvoided = (shifts * i.unfilledShare) / 100;
  const revRecovered = unfilledAvoided * i.shiftHrs * i.billRate;
  const covered = i.lateCovered * k;
  const missedAvoided = (covered * i.wouldMiss) / 100;
  const revProtected = missedAvoided * i.shiftHrs * i.billRate;
  const mg = i.margin / 100;
  const marginRecovered = revRecovered * mg;
  const marginProtected = revProtected * mg;
  const otShifts = (shifts * i.otShare) / 100;
  const otAvoided = otShifts * i.shiftHrs * i.wage * (i.otPrem / 100);
  const hoursSaved = (i.textsAuto * k * i.minPerText) / 60;
  const laborSaved = hoursSaved * i.coordCost;
  const cost = i.platformFee + i.messages * i.perText;
  const revenue = revRecovered + revProtected;
  const value = marginRecovered + marginProtected + otAvoided + laborSaved;
  const net = value - cost;
  const roi = cost > 0 ? (net / cost) * 100 : 0;
  const payback = net > 0 ? i.setup / (net / 30) : Infinity;
  return {
    shifts, unfilledAvoided, covered, missedAvoided, otShifts, hoursSaved,
    marginRecovered, marginProtected, otAvoided, laborSaved,
    cost, revenue, value, net, roi, payback, costPerShift: shifts > 0 ? cost / shifts : 0,
  };
}

const RAW = Array.from({ length: 12 }, (_, i) => (i < 2 ? 0 : 1 / (1 + Math.exp(-(i - 4.5) / 1.5))));
const RAMP = RAW.map((v) => v / RAW[11]);
const MONTHS = ["Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
const seedOf = (id) => [...id].reduce((a, c) => a + c.charCodeAt(0), 0);
const wobble = (i, seed) => (i < 2 || i === 11 ? 1 : 1 + 0.07 * Math.sin(i * 1.9 + seed));

function series(id, base, value, scale = 1) {
  const seed = seedOf(id);
  return RAMP.map((p, i) => ({ m: MONTHS[i], v: (base + (value - base) * p * wobble(i, seed)) * scale }));
}

function buildMetrics(inp, k, mult) {
  const m = model(inp, k);
  const eff = (b, a) => b + (a - b) * Math.min(k, 1.15);
  const reply = eff(38, 6), unans = eff(22, 4), fill = eff(250, 11), cov = eff(48, 82), miss = eff(3.1, 1.2);
  const callouts = cov > 0 ? m.covered / (cov / 100) : 0;

  const D = (id, label, pillar, o) => {
    const value = o.raw * (o.add ? mult : 1);
    return {
      id, label, pillar, value, before: o.before ?? null, fmt: o.fmt, down: !!o.down, add: !!o.add, sub: o.sub,
      data: series(id, o.base ?? o.before ?? 0, value, 1),
    };
  };

  const list = [
    D("revenue", "Revenue recovered", "Financial", { raw: m.revenue, add: true, fmt: money,
      sub: `${int((m.unfilledAvoided + m.missedAvoided) * mult)} shifts and visits kept` }),
    D("value", "Total value created", "Financial", { raw: m.value, add: true, fmt: money, sub: "Margin, overtime and staff time" }),
    D("net", "Net impact", "Financial", { raw: m.net, add: true, fmt: money, sub: "Value created minus SMS cost" }),
    D("roi", "Return on investment", "Financial", { raw: m.roi, fmt: (v) => `${int(v)}%`, sub: `${(1 + m.roi / 100).toFixed(1)}× what SMS costs` }),
    D("cost", "SMS cost", "Financial", { raw: m.cost, add: true, fmt: money, down: true, sub: "Platform fee plus per-text charges" }),
    D("shiftsFilled", "Open shifts filled by text", "Results", { raw: m.shifts, add: true, fmt: int, sub: `Filled in ${mins(fill)} on average` }),
    D("fillTime", "Time to fill an open shift", "Results", { raw: fill, before: 250, fmt: mins, down: true, sub: "From posting to a caregiver saying yes" }),
    D("lateCovered", "Late call-outs covered", "Results", { raw: cov, before: 48, fmt: pct, sub: `${int(m.covered)} of ${int(callouts)} covered before the visit` }),
    D("missedVisits", "Missed visits", "Results", { raw: miss, before: 3.1, fmt: pct, down: true, sub: "Share of scheduled visits" }),
    D("replyTime", "Median reply time", "Responsiveness", { raw: reply, before: 38, fmt: mins, down: true, sub: "Caregiver and client texts" }),
    D("unanswered", "Unanswered texts", "Responsiveness", { raw: unans, before: 22, fmt: pct, down: true, sub: "Texts still waiting for a reply" }),
    D("delivered", "Texts delivered", "Responsiveness", { raw: 98.4, base: 94, fmt: pct, sub: "61% received a reply" }),
    D("hoursSaved", "Staff hours saved on texting", "Value", { raw: m.hoursSaved, add: true, fmt: hrs, sub: `About ${((m.hoursSaved * mult) / 40).toFixed(1)} coordinator-weeks` }),
    D("overtime", "Overtime avoided", "Value", { raw: m.otAvoided, add: true, fmt: money, sub: `${int(m.otShifts * mult)} shifts kept out of overtime` }),
    D("costPerShift", "Cost per filled shift", "Value", { raw: m.costPerShift, before: 28, fmt: money2, down: true, sub: "All-in SMS cost" }),
  ];
  return { m, list, byId: Object.fromEntries(list.map((x) => [x.id, x])) };
}

/* ───────────────────────── Layout defaults ───────────────────────── */
const SIZES = {
  kpi: { opts: [3, 4, 6], names: { 3: "S", 4: "M", 6: "L" } },
  trend: { opts: [6, 8, 12], names: { 6: "M", 8: "L", 12: "XL" } },
  breakdown: { opts: [4, 6, 12], names: { 4: "S", 6: "M", 12: "XL" } },
  compare: { opts: [6, 8, 12], names: { 6: "M", 8: "L", 12: "XL" } },
};
const INITIAL = [
  { id: "kpi:revenue", type: "kpi", metric: "revenue", span: 3 },
  { id: "kpi:shiftsFilled", type: "kpi", metric: "shiftsFilled", span: 3 },
  { id: "kpi:replyTime", type: "kpi", metric: "replyTime", span: 3 },
  { id: "kpi:costPerShift", type: "kpi", metric: "costPerShift", span: 3 },
  { id: "trend", type: "trend", span: 8 },
  { id: "breakdown", type: "breakdown", span: 4 },
  { id: "compare", type: "compare", span: 12 },
];
const CHART_LIBRARY = [
  { id: "trend", type: "trend", span: 8, label: "Value vs. cost trend", note: "Twelve months, stacked by source" },
  { id: "breakdown", type: "breakdown", span: 4, label: "Where the value comes from", note: "Ranked sources, net of cost" },
  { id: "compare", type: "compare", span: 8, label: "Before and after table", note: "Side by side, per metric" },
];

/* ───────────────────────── Atoms ───────────────────────── */
const EditCtx = createContext({ edit: false, setTyping: () => {} });
const WidgetCtx = createContext({ id: "", text: {}, setText: () => {} });

/* Inline-editable text. Shows plain text normally; in Customize mode it becomes
   editable in place. Clearing it (or retyping the default) reconnects it to live data. */
function Ed({ k, d, as: Tag = "span", className = "" }) {
  const { edit, setTyping } = useContext(EditCtx);
  const w = useContext(WidgetCtx);
  const override = w.text[k];
  const shown = override ?? d;
  if (!edit) return <Tag className={className}>{shown}</Tag>;
  return (
    <Tag
      className={`${className} ed ${override != null ? "ed-custom" : ""}`}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onFocus={() => setTyping(w.id)}
      onBlur={(e) => {
        const v = e.currentTarget.textContent.trim();
        const reset = v === "" || v === String(d);
        e.currentTarget.textContent = reset ? String(d) : v;
        w.setText(k, reset ? undefined : v);
        setTyping(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
        if (e.key === "Escape") { e.currentTarget.textContent = shown; e.currentTarget.blur(); }
      }}
      onPaste={(e) => {
        e.preventDefault();
        document.execCommand("insertText", false, e.clipboardData.getData("text/plain").replace(/\s+/g, " "));
      }}
    >
      {shown}
    </Tag>
  );
}

function PillarTag({ pillar, k, Icon }) {
  return (
    <span className="ptag">
      {Icon ? <span className="tile"><Icon size={18} strokeWidth={1.9} /></span> : <i style={{ background: PILLAR[pillar] }} />}
      {k ? <Ed k={k} d={pillar} /> : pillar}
    </span>
  );
}

/* Sensi mark: blue disc with a white S, redrawn from the product UI.
   Swap this component for the official logo asset when you have it. */
function SensiMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label="Sensi logo" style={{ flex: "none" }}>
      <circle cx="20" cy="20" r="20" fill="#4A8DF5" />
      <text x="20" y="28.2" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontWeight="600" fontSize="23" fill="#fff">S</text>
    </svg>
  );
}

function Delta({ metric }) {
  if (metric.before == null) return null;
  const change = ((metric.value - metric.before) / metric.before) * 100;
  const improved = metric.down ? change < 0 : change > 0;
  const Icon = change >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="delta-row">
      <span className={`chip ${improved ? "chip-good" : "chip-bad"}`}>
        <Icon size={13} strokeWidth={2.4} />
        <Ed k="delta" d={`${Math.abs(change).toFixed(0)}%`} />
      </span>
      <span className="muted">was <Ed k="was" d={metric.fmt(metric.before)} /></span>
    </span>
  );
}

function Spark({ data, color, height, id }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`g-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#g-${id})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ───────────────────────── Widgets ───────────────────────── */
function KpiCard({ metric, span, perLabel }) {
  const color = PILLAR[metric.pillar];
  const large = span >= 6;
  return (
    <>
      <div className="k-top">
        <PillarTag pillar={metric.pillar} k="pillar" Icon={METRIC_ICON[metric.id]} />
        {metric.add && <span className="per">{perLabel}</span>}
      </div>
      <Ed as="h3" className="k-label" k="title" d={metric.label} />
      <div className="k-val num"><Ed k="value" d={metric.fmt(metric.value)} /></div>
      <Delta metric={metric} />
      <Ed as="p" className="k-sub" k="sub" d={metric.sub} />
      <div className="k-spark">
        <Spark data={metric.data} color={color} height={large ? 96 : 48} id={metric.id} />
      </div>
    </>
  );
}

const LEGEND = [["Recovered shifts", C.blue], ["Protected visits", C.blueSoft], ["Overtime", C.navy], ["Staff time", C.green], ["SMS cost", C.amber]];

function TrendCard({ m, mult, perLabel }) {
  const seed = seedOf("trend");
  const data = RAMP.map((p, i) => {
    const w = wobble(i, seed) * p * mult;
    return {
      m: MONTHS[i],
      "Margin on recovered shifts": Math.round(m.marginRecovered * w),
      "Margin on protected visits": Math.round(m.marginProtected * w),
      "Overtime avoided": Math.round(m.otAvoided * w),
      "Staff time saved": Math.round(m.laborSaved * w),
      "SMS cost": i < 2 ? 0 : Math.round(m.cost * mult),
    };
  });
  return (
    <>
      <div className="k-top"><PillarTag pillar="Financial" k="pillar" Icon={BarChart3} /><span className="per">{perLabel}</span></div>
      <Ed as="h3" className="k-label" k="title" d="Value created vs. what SMS costs" />
      <div className="legend">
        {LEGEND.map(([label, color], i) => (
          <span key={i}><i className={i === 4 ? "line" : ""} style={{ background: color }} /><Ed k={`lg${i}`} d={label} /></span>
        ))}
      </div>
      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -8 }}>
            <CartesianGrid vertical={false} stroke="#E7ECF4" />
            <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#667085" }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#667085" }} tickFormatter={(v) => (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`)} />
            <Tooltip formatter={(v) => money(v)} contentStyle={{ borderRadius: 10, border: "1px solid #E3E8F0", fontSize: 12 }} cursor={{ fill: "rgba(47,111,228,.06)" }} />
            <Bar dataKey="Margin on recovered shifts" stackId="a" fill={C.blue} isAnimationActive={false} />
            <Bar dataKey="Margin on protected visits" stackId="a" fill={C.blueSoft} isAnimationActive={false} />
            <Bar dataKey="Overtime avoided" stackId="a" fill={C.navy} isAnimationActive={false} />
            <Bar dataKey="Staff time saved" stackId="a" fill={C.green} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            <Line type="monotone" dataKey="SMS cost" stroke={C.amber} strokeWidth={2.5} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

function sources(m, mult) {
  return [
    { label: "Margin on recovered shifts", v: m.marginRecovered * mult, c: C.blue },
    { label: "Margin on protected visits", v: m.marginProtected * mult, c: C.blueSoft },
    { label: "Overtime avoided", v: m.otAvoided * mult, c: C.navy },
    { label: "Staff time saved", v: m.laborSaved * mult, c: C.green },
  ];
}

function BreakdownCard({ m, mult, perLabel }) {
  const rows = sources(m, mult).sort((a, b) => b.v - a.v);
  const max = Math.max(...rows.map((r) => r.v), m.cost * mult, 1);
  return (
    <>
      <div className="k-top"><PillarTag pillar="Financial" k="pillar" Icon={PieChart} /><span className="per">{perLabel}</span></div>
      <Ed as="h3" className="k-label" k="title" d="Where the value comes from" />
      <ul className="bars">
        {rows.map((r) => (
          <li key={r.label}>
            <div className="bar-head">
              <Ed k={`row:${r.label}`} d={r.label} />
              <b className="num"><Ed k={`val:${r.label}`} d={money(r.v)} /></b>
            </div>
            <div className="bar-track"><div style={{ width: `${(r.v / max) * 100}%`, background: r.c }} /></div>
          </li>
        ))}
        <li className="bar-cost">
          <div className="bar-head">
            <Ed k="cost" d="Less SMS cost" />
            <b className="num"><Ed k="costval" d={`−${money(m.cost * mult)}`} /></b>
          </div>
          <div className="bar-track"><div style={{ width: `${((m.cost * mult) / max) * 100}%`, background: C.amber }} /></div>
        </li>
      </ul>
      <div className="net-row">
        <Ed k="net" d="Net impact" />
        <b className="num"><Ed k="netval" d={money(m.net * mult)} /></b>
      </div>
    </>
  );
}

const COMPARE_HEADS = ["Metric", "Before", "With SMS", "Change"];

function CompareCard({ byId }) {
  const ids = ["replyTime", "unanswered", "fillTime", "lateCovered", "missedVisits", "costPerShift"];
  return (
    <>
      <div className="k-top"><PillarTag pillar="Results" k="pillar" Icon={ArrowLeftRight} /></div>
      <Ed as="h3" className="k-label" k="title" d="Before and after SMS" />
      <table className="tbl">
        <thead>
          <tr>{COMPARE_HEADS.map((h, i) => <th key={h}><Ed k={`h${i}`} d={h} /></th>)}</tr>
        </thead>
        <tbody>
          {ids.map((id) => {
            const x = byId[id];
            const change = ((x.value - x.before) / x.before) * 100;
            const improved = x.down ? change < 0 : change > 0;
            return (
              <tr key={id}>
                <td><i className="dot" style={{ background: PILLAR[x.pillar] }} /><Ed k={`l:${id}`} d={x.label} /></td>
                <td className="num muted"><Ed k={`b:${id}`} d={x.fmt(x.before)} /></td>
                <td className="num strong"><Ed k={`a:${id}`} d={x.fmt(x.value)} /></td>
                <td className={`num ${improved ? "t-good" : "t-bad"}`}><Ed k={`c:${id}`} d={`${change > 0 ? "+" : "−"}${Math.abs(change).toFixed(0)}%`} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

/* ───────────────────────── Drawer ───────────────────────── */
function Field({ f, value, onChange }) {
  const set = (raw) => {
    const n = Number(raw);
    onChange(Number.isNaN(n) ? 0 : n);
  };
  return (
    <div className="field">
      <label>{f.label}</label>
      <div className="field-row">
        <input type="range" min={f.min} max={f.max} step={f.step} value={value} onChange={(e) => set(e.target.value)} aria-label={f.label} />
        <div className="numbox">
          {f.prefix && <span>{f.prefix}</span>}
          <input type="number" min={f.min} max={f.max} step={f.step} value={value} onChange={(e) => set(e.target.value)} aria-label={`${f.label} value`} />
          {f.suffix && <span>{f.suffix}</span>}
        </div>
      </div>
    </div>
  );
}

function AssumptionsPanel({ inp, setInp }) {
  return (
    <>
      <p className="drawer-help">Change a number and every card, chart and the headline update. Use these to match the customer's own figures during the session.</p>
      {FIELD_GROUPS.map((g) => (
        <fieldset key={g.title}>
          <legend>{g.title}</legend>
          {g.fields.map((f) => (
            <Field key={f.k} f={f} value={inp[f.k]} onChange={(v) => setInp((p) => ({ ...p, [f.k]: v }))} />
          ))}
        </fieldset>
      ))}
      <button className="btn ghost" onClick={() => setInp(DEFAULTS)}><RotateCcw size={14} />Reset assumptions</button>
    </>
  );
}

function LibraryPanel({ widgets, list, onAdd }) {
  const used = new Set(widgets.map((w) => w.id));
  const groups = ["Financial", "Responsiveness", "Results", "Value"];
  return (
    <>
      <p className="drawer-help">Add a card to the end of the grid, then drag it into place.</p>
      <fieldset>
        <legend>Charts and tables</legend>
        {CHART_LIBRARY.map((c) => (
          <div className="lib-row" key={c.id}>
            <div><b>{c.label}</b><span className="muted">{c.note}</span></div>
            <button className="btn small" disabled={used.has(c.id)} onClick={() => onAdd({ id: c.id, type: c.type, span: c.span })}>
              {used.has(c.id) ? <><Check size={14} />On dashboard</> : <><Plus size={14} />Add</>}
            </button>
          </div>
        ))}
      </fieldset>
      {groups.map((g) => (
        <fieldset key={g}>
          <legend><PillarTag pillar={g} /></legend>
          {list.filter((x) => x.pillar === g).map((x) => {
            const id = `kpi:${x.id}`;
            return (
              <div className="lib-row" key={id}>
                <div><b>{x.label}</b><span className="muted">{x.sub}</span></div>
                <button className="btn small" disabled={used.has(id)} onClick={() => onAdd({ id, type: "kpi", metric: x.id, span: 3 })}>
                  {used.has(id) ? <><Check size={14} />On dashboard</> : <><Plus size={14} />Add</>}
                </button>
              </div>
            );
          })}
        </fieldset>
      ))}
    </>
  );
}

/* ───────────────────────── App ───────────────────────── */
export default function SmsImpactDashboard() {
  const [inp, setInp] = useState(DEFAULTS);
  const [scenario, setScenario] = useState("expected");
  const [period, setPeriod] = useState("month");
  const [edit, setEdit] = useState(false);
  const [drawer, setDrawer] = useState(null);
  const [customer, setCustomer] = useState("Evergreen Home Care");
  const [subtitle, setSubtitle] = useState("SMS impact dashboard");
  const [badge, setBadge] = useState("Sample data");
  const [widgets, setWidgets] = useState(INITIAL);
  const [dragId, setDragId] = useState(null);
  const [typingId, setTypingId] = useState(null);

  const mult = period === "year" ? 12 : 1;
  const perLabel = period === "year" ? "per year" : "per month";
  const { m, list, byId } = useMemo(() => buildMetrics(inp, SCENARIOS[scenario], mult), [inp, scenario, mult]);

  const move = (id, dir) =>
    setWidgets((ws) => {
      const i = ws.findIndex((w) => w.id === id), j = i + dir;
      if (j < 0 || j >= ws.length) return ws;
      const c = [...ws];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });
  const cycle = (id) =>
    setWidgets((ws) => ws.map((w) => {
      if (w.id !== id) return w;
      const o = SIZES[w.type].opts;
      return { ...w, span: o[(o.indexOf(w.span) + 1) % o.length] };
    }));
  const setText = (id, key, val) =>
    setWidgets((ws) => ws.map((w) => {
      if (w.id !== id) return w;
      const text = { ...(w.text || {}) };
      if (val === undefined) delete text[key]; else text[key] = val;
      return { ...w, text };
    }));
  const remove = (id) => setWidgets((ws) => ws.filter((w) => w.id !== id));
  const drop = (targetId) => {
    if (!dragId || dragId === targetId) return;
    setWidgets((ws) => {
      const from = ws.findIndex((w) => w.id === dragId);
      const to = ws.findIndex((w) => w.id === targetId);
      const c = [...ws];
      const [x] = c.splice(from, 1);
      c.splice(to, 0, x);
      return c;
    });
    setDragId(null);
  };

  const body = (w) => {
    if (w.type === "kpi") return <KpiCard metric={byId[w.metric]} span={w.span} perLabel={perLabel} />;
    if (w.type === "trend") return <TrendCard m={m} mult={mult} perLabel={perLabel} />;
    if (w.type === "breakdown") return <BreakdownCard m={m} mult={mult} perLabel={perLabel} />;
    return <CompareCard byId={byId} />;
  };

  return (
    <EditCtx.Provider value={{ edit, setTyping: setTypingId }}>
      <div className="shell">
        <style>{CSS}</style>
        <div className="main">
          <div className="brand"><SensiMark size={34} /><span>Sensi</span></div>
          <header className="top">
            <div className="title">
              <input className="cust" value={customer} onChange={(e) => setCustomer(e.target.value)} aria-label="Customer name" size={Math.max(customer.length, 8)} />
              <p>
                <input className="sub-input" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} aria-label="Dashboard subtitle" size={Math.max(subtitle.length, 8)} />
                {(edit || badge) && (
                  <input className="badge badge-input" value={badge} placeholder="Add a label" onChange={(e) => setBadge(e.target.value)} aria-label="Status label" size={Math.max(badge.length, 10)} />
                )}
              </p>
            </div>
            <div className="controls">
              <div className="seg" role="group" aria-label="Scenario">
                {Object.keys(SCENARIOS).map((s) => (
                  <button key={s} aria-pressed={scenario === s} onClick={() => setScenario(s)}>{s[0].toUpperCase() + s.slice(1)}</button>
                ))}
              </div>
              <div className="seg" role="group" aria-label="Period">
                <button aria-pressed={period === "month"} onClick={() => setPeriod("month")}>Monthly</button>
                <button aria-pressed={period === "year"} onClick={() => setPeriod("year")}>Annual</button>
              </div>
              <button className={`btn ${drawer === "assumptions" ? "on" : ""}`} onClick={() => setDrawer(drawer === "assumptions" ? null : "assumptions")}>
                <SlidersHorizontal size={15} />Assumptions
              </button>
              <button className={`btn ${edit ? "primary" : ""}`} onClick={() => { setEdit(!edit); if (edit && drawer === "library") setDrawer(null); if (!edit) setDrawer("library"); }}>
                <LayoutGrid size={15} />{edit ? "Done customizing" : "Customize"}
              </button>
            </div>
          </header>

          <div className="grid">
            {widgets.map((w, idx) => (
              <section
                key={w.id}
                className={`card s${w.span} ${edit ? "editing" : ""} ${dragId === w.id ? "dragging" : ""}`}
                draggable={edit && typingId !== w.id}
                onDragStart={() => setDragId(w.id)}
                onDragOver={(e) => edit && e.preventDefault()}
                onDrop={() => drop(w.id)}
                onDragEnd={() => setDragId(null)}
              >
                {edit && (
                  <div className="ctl">
                    <span className="grip" aria-hidden><GripVertical size={16} /></span>
                    <button aria-label="Move earlier" disabled={idx === 0} onClick={() => move(w.id, -1)}><ChevronLeft size={15} /></button>
                    <button aria-label="Move later" disabled={idx === widgets.length - 1} onClick={() => move(w.id, 1)}><ChevronRight size={15} /></button>
                    <button className="size" aria-label="Change size" onClick={() => cycle(w.id)}>Size {SIZES[w.type].names[w.span]}</button>
                    <button aria-label="Remove card" onClick={() => remove(w.id)}><X size={15} /></button>
                  </div>
                )}
                <WidgetCtx.Provider value={{ id: w.id, text: w.text || {}, setText: (k, v) => setText(w.id, k, v) }}>
                  {body(w)}
                </WidgetCtx.Provider>
              </section>
            ))}
            {widgets.length === 0 && (
              <div className="empty">
                <p>Your dashboard is empty.</p>
                <button className="btn primary" onClick={() => { setEdit(true); setDrawer("library"); }}><Plus size={15} />Add a card</button>
              </div>
            )}
          </div>
          {edit && (
            <div className="foot">
              <p>Dashed text is editable. An amber underline marks a typed value that no longer follows the assumptions. Clear it to reconnect.</p>
              <button className="btn ghost" onClick={() => setWidgets(INITIAL)}><RotateCcw size={14} />Reset layout</button>
            </div>
          )}
        </div>

        {drawer && (
          <aside className="drawer" aria-label={drawer === "assumptions" ? "Assumptions" : "Add cards"}>
            <div className="drawer-top">
              <h2>{drawer === "assumptions" ? "Assumptions" : "Add cards"}</h2>
              <button className="icon" aria-label="Close panel" onClick={() => setDrawer(null)}><X size={18} /></button>
            </div>
            {drawer === "assumptions"
              ? <AssumptionsPanel inp={inp} setInp={setInp} />
              : <LibraryPanel widgets={widgets} list={list} onAdd={(w) => setWidgets((ws) => [...ws, w])} />}
          </aside>
        )}
      </div>
    </EditCtx.Provider>
  );
}

/* ───────────────────────── Styles ───────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,600;8..60,700&display=swap');
.shell{--ink:#1E2433;--navy:#222B3D;--mute:#667085;--line:#E3E8F0;--blue:#2F6FE4;--tint:#E8F0FD;
  font-family:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;color:var(--ink);
  background:linear-gradient(180deg,#EAF2FD 0,#F6F9FE 420px,#FFFFFF 900px);
  display:flex;min-height:100vh;line-height:1.45}
.shell *{box-sizing:border-box}
.shell button{font:inherit;color:inherit;cursor:pointer}
.shell :focus-visible{outline:2px solid var(--blue);outline-offset:2px}
.num{font-variant-numeric:tabular-nums;letter-spacing:-.01em}
.muted{color:var(--mute)}

.brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:20px;margin-bottom:22px}
.icon{border:0;background:transparent;border-radius:10px;padding:8px;display:flex;color:#4B5565}
.icon:hover{background:#EEF3FB}

/* page */
.main{flex:1;min-width:0;padding:36px 40px 56px;container-type:inline-size}
.top{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap;margin-bottom:24px}
.cust{font-family:'Source Serif 4',Georgia,serif;font-weight:700;font-size:36px;line-height:1.15;letter-spacing:-.01em;color:var(--ink);background:transparent;border:0;border-bottom:2px dashed transparent;padding:0 2px;margin-left:-2px;max-width:100%}
.cust:hover,.cust:focus{border-bottom-color:#B7C6E6;outline:none}
.title p{margin:6px 0 0;color:var(--mute);font-size:15px;display:flex;align-items:center;gap:10px}
.sub-input{font:inherit;color:var(--mute);background:transparent;border:0;border-bottom:2px dashed transparent;padding:0 2px;margin-left:-2px;max-width:100%}
.sub-input:hover,.sub-input:focus{border-bottom-color:#B7C6E6;outline:none}
.badge{font-size:12px;font-weight:600;color:#B45309;background:#FDF1DF;border-radius:999px;padding:3px 12px}
.badge-input{border:0;font-family:inherit}
.badge-input:focus{outline:2px solid var(--blue)}
.controls{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.seg{display:inline-flex;background:#fff;border:1px solid var(--line);border-radius:999px;padding:3px}
.seg button{border:0;background:transparent;padding:7px 14px;border-radius:999px;font-size:13.5px;font-weight:500;color:var(--mute)}
.seg button[aria-pressed=true]{background:#E3EDFD;color:var(--blue);font-weight:600}
.btn{display:inline-flex;align-items:center;gap:8px;border:1px solid #D5DDEA;background:#fff;border-radius:999px;padding:9px 16px;font-size:13.5px;font-weight:600}
.btn:hover:not(:disabled){border-color:#A9B8D6}
.btn.on{background:var(--tint);border-color:#BCD0F7;color:var(--blue)}
.btn.primary{background:var(--navy);border-color:var(--navy);color:#fff}
.btn.ghost{background:transparent}
.btn.small{padding:6px 12px;font-size:12.5px}
.btn:disabled{opacity:.55;cursor:default}

/* grid + cards */
.grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:18px}
.s3{grid-column:span 3}.s4{grid-column:span 4}.s6{grid-column:span 6}.s8{grid-column:span 8}.s12{grid-column:span 12}
.card{position:relative;background:#fff;border:1px solid var(--line);border-radius:22px;padding:22px 24px;display:flex;flex-direction:column;min-width:0}
.card.editing{outline:2px dashed #9DB6EC;outline-offset:3px;cursor:grab;padding-top:56px}
.card.dragging{opacity:.4}
.ctl{position:absolute;top:10px;left:12px;right:12px;display:flex;align-items:center;gap:4px}
.ctl .grip{color:#8D97B8;display:flex;margin-right:auto}
.ctl button{border:1px solid var(--line);background:#fff;border-radius:999px;height:28px;min-width:28px;padding:0 6px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:600}
.ctl button:disabled{opacity:.35;cursor:default}
.ctl button.size{padding:0 12px}

.k-top{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:14px}
.ptag{display:inline-flex;align-items:center;gap:10px;font-size:13px;font-weight:500;color:var(--mute)}
.ptag i{width:9px;height:9px;border-radius:3px}
.tile{display:grid;place-items:center;width:36px;height:36px;border-radius:11px;background:var(--tint);color:var(--blue);flex:none}
.per{font-size:12px;color:var(--mute);background:#F1F4F9;border-radius:999px;padding:3px 10px}
.k-label{margin:0;font-size:15px;font-weight:600}
.k-val{font-size:40px;font-weight:700;line-height:1.1;margin:10px 0 8px;letter-spacing:-.03em}
.delta-row{display:flex;align-items:center;gap:8px;font-size:13px}
.chip{display:inline-flex;align-items:center;gap:2px;font-weight:600;border-radius:999px;padding:3px 9px 3px 6px;font-size:12.5px}
.chip-good{background:#E6F4EA;color:#1E7B45}
.chip-bad{background:#FDEBDD;color:#B2400A}
.k-sub{margin:10px 0 0;font-size:13.5px;color:var(--mute)}
.k-spark{margin-top:auto;padding-top:14px}

.legend{display:flex;flex-wrap:wrap;gap:6px 16px;margin:12px 0 8px;font-size:12.5px;color:var(--mute)}
.legend span{display:inline-flex;align-items:center;gap:6px}
.legend i{width:10px;height:10px;border-radius:3px}
.legend i.line{height:3px;width:14px;border-radius:2px}

.bars{list-style:none;margin:16px 0 16px;padding:0;display:flex;flex-direction:column;gap:14px}
.bar-head{display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:6px}
.bar-track{height:10px;background:#EEF2F8;border-radius:5px;overflow:hidden}
.bar-track>div{height:100%;border-radius:5px}
.net-row{display:flex;justify-content:space-between;align-items:baseline;margin-top:auto;padding-top:14px;border-top:1px solid var(--line);font-weight:600}
.net-row b{font-size:22px;font-weight:700}

.tbl{width:100%;border-collapse:collapse;margin-top:12px;font-size:13.5px}
.tbl th{text-align:right;font-weight:500;color:var(--mute);font-size:12.5px;padding:6px 8px;border-bottom:1px solid var(--line)}
.tbl th:first-child,.tbl td:first-child{text-align:left}
.tbl td{padding:11px 8px;border-bottom:1px solid #EEF2F8;text-align:right}
.tbl tr:last-child td{border-bottom:0}
.tbl .dot{display:inline-block;width:8px;height:8px;border-radius:3px;margin-right:9px}
.strong{font-weight:700}
.t-good{color:#1E7B45;font-weight:600}.t-bad{color:#B2400A;font-weight:600}

.empty{grid-column:1/-1;text-align:center;padding:48px;border:2px dashed #B7C6E6;border-radius:22px;color:var(--mute)}
.foot{margin-top:18px;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
.foot p{margin:0;font-size:13px;color:var(--mute)}
.ed{border-radius:4px;outline:1px dashed #C3CFEA;outline-offset:2px;cursor:text}
.ed:hover{outline-color:#8FA6DC}
.ed:focus{outline:2px solid var(--blue);background:#fff}
.ed-custom{box-shadow:0 2px 0 0 var(--amber)}

/* drawer */
.drawer{width:380px;flex:none;position:sticky;top:0;height:100vh;overflow:auto;background:#fff;border-left:1px solid var(--line);padding:22px 24px 40px}
.drawer-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.drawer h2{margin:0;font-size:18px;font-weight:700}
.drawer-help{font-size:13px;color:var(--mute);margin:4px 0 14px}
.drawer fieldset{border:0;border-top:1px solid var(--line);padding:14px 0 6px;margin:0 0 6px}
.drawer legend{font-size:13px;font-weight:700;padding:0 8px 0 0;float:left;width:100%;margin-bottom:10px}
.field{margin-bottom:14px;clear:both}
.field label{display:block;font-size:13px;margin-bottom:6px}
.field-row{display:flex;align-items:center;gap:12px}
.field input[type=range]{flex:1;min-width:0;accent-color:var(--blue)}
.numbox{display:flex;align-items:center;gap:2px;border:1px solid var(--line);border-radius:10px;padding:5px 9px;font-size:13px;color:var(--mute);width:106px;flex:none}
.numbox input{border:0;width:100%;min-width:0;font:inherit;font-weight:600;color:var(--ink);text-align:right;background:transparent;font-variant-numeric:tabular-nums}
.numbox input:focus{outline:none}
.numbox:focus-within{border-color:var(--blue)}
.lib-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:8px 0;clear:both}
.lib-row>div{display:flex;flex-direction:column;min-width:0}
.lib-row b{font-size:13.5px;font-weight:600}
.lib-row .muted{font-size:12.5px}

@container (max-width:1000px){
  .s3{grid-column:span 6}.s4{grid-column:span 6}.s8{grid-column:span 12}
}
@container (max-width:620px){
  .s3,.s4,.s6,.s8{grid-column:span 12}
}
@media (max-width:900px){
  .drawer{position:fixed;right:0;top:0;z-index:20;box-shadow:-12px 0 32px rgba(30,36,51,.18);width:min(380px,92vw)}
  .main{padding:20px 16px 40px}
  .cust{font-size:28px}
}
@media (prefers-reduced-motion:no-preference){
  .card,.btn,.nav{transition:border-color .15s,background .15s,opacity .15s}
}
`;
