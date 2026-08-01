import { useState, useEffect, useMemo, createContext, useContext, Fragment } from "react";
import {
  LayoutDashboard, ListTodo, Users, Receipt, Settings, Plus, X, Search, Sun, Moon,
  ChevronDown, ChevronRight, Link2, Trash2, Check, Copy, TrendingUp, Wallet,
  AlertTriangle, Menu, Printer, Circle, Download, Music, Film, Pencil, Upload,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

/* ============================== tokens ============================== */

const makeTokens = (mode) =>
  mode === "light"
    ? {
        mode,
        bg: "#F7F8FA", surface: "#FFFFFF", surface2: "#F1F3F6", raised: "#FFFFFF",
        border: "#E3E7ED", borderStrong: "#CFD6E0",
        text: "#151A21", muted: "#5C6675", faint: "#8B95A5",
        accent: "#E08A1E", accentText: "#3A2400",
        good: "#12A150", warn: "#D98200", bad: "#DC3D43", info: "#3B7DE0", violet: "#7C5CE0",
        shadow: "0 1px 2px rgba(16,24,40,.05), 0 8px 24px -12px rgba(16,24,40,.14)",
      }
    : {
        mode,
        bg: "#0F1216", surface: "#161A20", surface2: "#1C2128", raised: "#1C2128",
        border: "#252B34", borderStrong: "#333B47",
        text: "#E9EDF2", muted: "#909BAA", faint: "#646E7C",
        accent: "#E8A33D", accentText: "#1A1200",
        good: "#3DD68C", warn: "#E8A33D", bad: "#E5595E", info: "#5B8DEF", violet: "#A98BF0",
        shadow: "0 2px 4px rgba(0,0,0,.3), 0 12px 32px -16px rgba(0,0,0,.7)",
      };

const SANS = "'Inter', ui-sans-serif, system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

const ThemeCtx = createContext(makeTokens("dark"));
const useT = () => useContext(ThemeCtx);

function ensureFonts() {
  if (document.getElementById("vt-fonts")) return;
  const l = document.createElement("link");
  l.id = "vt-fonts";
  l.rel = "stylesheet";
  l.href =
    "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap";
  document.head.appendChild(l);
}

/* ============================== domain ============================== */

const STATUSES = ["Pending", "In Progress", "Review", "Revision", "Done", "Delivered", "Paid"];
const statusTone = {
  Pending: "faint", "In Progress": "warn", Review: "info", Revision: "violet",
  Done: "info", Delivered: "good", Paid: "good",
};

const DEFAULT_EDITORS = ["Hoang", "TE Cuong", "NM"];
const DEFAULT_CLIENTS = ["Brock", "AK", "Mill", "Nestor"];
const JOB_TYPES = ["Video", "Photo", "Reel", "Other"];

const DEFAULT_RATES = [
  { label: "Edit", price: 400000 },
  { label: "Subtext Caption", price: 120000 },
  { label: "AI Effect", price: 100000 },
  { label: "Masking", price: 40000 },
  { label: "Over Files", price: 50000 },
  { label: "Voice Over", price: 70000 },
  { label: "Lotline", price: 40000 },
  { label: "RM", price: 30000 },
  { label: "FL", price: 30000 },
];

let uid = 0;
const nextId = (p) => `${p}${Date.now().toString(36)}${uid++}`;

const newBudgetLine = (rates, label) => {
  const l = label || rates[0]?.label || "Edit";
  return { id: nextId("b"), label: l, amount: rates.find((r) => r.label === l)?.price ?? 0 };
};

const emptyJob = (rates = DEFAULT_RATES) => ({
  jobCode: "",
  date: new Date().toISOString().slice(0, 10),
  client: "",
  csName: "MH",
  jobType: "Video",
  jobName: "",
  inputLink: "",
  sampleLink: "",
  musicLink: "",
  instruction: "",
  outputVideo: "",
  outputLink: "",
  videoNote: "",
  assignedEditor: "",
  status: "Pending",
  budgetItems: [newBudgetLine(rates)],
  invoicePrice: "",
  invoiceId: null,
});

const budgetTotal = (j) => (j.budgetItems || []).reduce((s, b) => s + (parseFloat(b.amount) || 0), 0);
const invPrice = (j) => parseFloat(j.invoicePrice) || 0;

const monthKey = (d) => (d || "").slice(0, 7);
const monthName = (k) => {
  if (!k) return "";
  const [y, m] = k.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
};
const weekKey = (d) => {
  const dt = new Date(d);
  const day = (dt.getDay() + 6) % 7;
  dt.setDate(dt.getDate() - day);
  return dt.toISOString().slice(0, 10);
};

const fmtVND = (n) => `${Math.round(n).toLocaleString("vi-VN")}₫`;
const fmtUSD = (n) => `$${(Math.round(n * 100) / 100).toLocaleString("en-US")}`;

function nextJobCode(jobs, dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  const p = `MH${d.toLocaleString("en-US", { month: "short" }).toUpperCase()}${String(d.getDate()).padStart(2, "0")}`;
  const n = jobs
    .map((j) => j.jobCode)
    .filter((c) => c?.startsWith(p))
    .map((c) => parseInt(c.slice(p.length), 10))
    .filter((x) => !isNaN(x));
  return `${p}${String((n.length ? Math.max(...n) : 0) + 1).padStart(3, "0")}`;
}

/* ============================== primitives ============================== */

function Pill({ tone = "faint", children, dot = true, size = "sm" }) {
  const T = useT();
  const c = T[tone] || T.faint;
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
        fontFamily: MONO, fontSize: size === "sm" ? 11 : 12, fontWeight: 600, letterSpacing: ".02em",
        color: c, background: `${c}1A`, border: `1px solid ${c}44`, borderRadius: 999,
        padding: size === "sm" ? "3px 9px" : "5px 11px",
      }}
    >
      {dot && <span style={{ width: 5, height: 5, borderRadius: "50%", background: c }} />}
      {children}
    </span>
  );
}

const PALETTE = ["#E8735A", "#4FA3E0", "#7BC77B", "#C58BE0", "#E0A93D", "#4FC4C0", "#E07BA8", "#8B9BE0"];
const hashColor = (s) => {
  if (!s) return "#888";
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
};

function ClientBadge({ name }) {
  const T = useT();
  if (!name) return <span style={{ color: T.faint }}>—</span>;
  const c = hashColor(name);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap",
      color: c, background: `${c}20`, border: `1px solid ${c}44`, borderRadius: 6, padding: "3px 9px",
    }}>
      {name}
    </span>
  );
}

function Avatar({ name, size = 26 }) {
  const T = useT();
  if (!name) return <span style={{ width: size, height: size, borderRadius: "50%", border: `1px dashed ${T.borderStrong}`, display: "inline-block", flexShrink: 0 }} />;
  const c = hashColor(name);
  const ini = name.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  return (
    <span title={name} style={{
      width: size, height: size, borderRadius: "50%", background: c, color: "#10141A", flexShrink: 0,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 800, fontFamily: MONO,
    }}>{ini}</span>
  );
}

function Btn({ variant = "ghost", children, style, ...p }) {
  const T = useT();
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
    fontFamily: SANS, fontSize: 13, fontWeight: 600, borderRadius: 8, padding: "8px 13px",
    cursor: p.disabled ? "not-allowed" : "pointer", opacity: p.disabled ? 0.5 : 1,
    transition: "background .12s, border-color .12s", whiteSpace: "nowrap",
  };
  const v = {
    primary: { background: T.accent, color: T.accentText, border: "none" },
    ghost: { background: "transparent", color: T.text, border: `1px solid ${T.border}` },
    subtle: { background: "transparent", color: T.muted, border: "none" },
    danger: { background: "transparent", color: T.bad, border: `1px solid ${T.bad}55` },
  }[variant];
  return <button {...p} style={{ ...base, ...v, ...style }}>{children}</button>;
}

function inputStyle(T) {
  return {
    width: "100%", background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8,
    color: T.text, padding: "9px 11px", fontSize: 13.5, fontFamily: SANS, outline: "none",
  };
}
const TextInput = (p) => { const T = useT(); return <input {...p} style={{ ...inputStyle(T), ...(p.style || {}) }} />; };
const TextArea = (p) => { const T = useT(); return <textarea {...p} style={{ ...inputStyle(T), minHeight: 80, resize: "vertical", ...(p.style || {}) }} />; };
function Select({ children, ...p }) {
  const T = useT();
  return (
    <select {...p} style={{
      ...inputStyle(T), appearance: "none", WebkitAppearance: "none", paddingRight: 28, cursor: "pointer",
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23888' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
      backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
      ...(p.style || {}),
    }}>{children}</select>
  );
}
function Field({ label, children, span }) {
  const T = useT();
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: span ? `span ${span}` : undefined, minWidth: 0 }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: T.muted }}>{label}</span>
      {children}
    </label>
  );
}

function Card({ children, style, pad = 16 }) {
  const T = useT();
  return <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: pad, ...style }}>{children}</div>;
}

function Stat({ label, value, sub, tone }) {
  const T = useT();
  return (
    <Card>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: T.muted }}>{label}</div>
      <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, marginTop: 6, color: tone ? T[tone] : T.text, letterSpacing: "-.02em" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: T.faint, marginTop: 3 }}>{sub}</div>}
    </Card>
  );
}

function Skeleton({ h = 16, w = "100%", r = 6 }) {
  const T = useT();
  return (
    <div style={{ height: h, width: w, borderRadius: r, background: T.surface2, opacity: 0.7, animation: "vtPulse 1.4s ease-in-out infinite" }} />
  );
}

function Modal({ title, icon, onClose, children, footer, width = 720 }) {
  const T = useT();
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(8,10,14,.6)", backdropFilter: "blur(2px)" }} />
      <div style={{
        position: "relative", width: `min(${width}px, 100%)`, maxHeight: "90vh", display: "flex", flexDirection: "column",
        background: T.bg, border: `1px solid ${T.border}`, borderRadius: 14, boxShadow: T.shadow, color: T.text, fontFamily: SANS,
        animation: "vtIn .16s ease-out",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 18px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 700, fontSize: 15 }}>{icon}{title}</div>
          <Btn variant="subtle" onClick={onClose} style={{ padding: 6 }}><X size={18} /></Btn>
        </div>
        <div style={{ padding: 18, overflowY: "auto", flex: 1 }}>{children}</div>
        {footer && <div style={{ padding: 14, borderTop: `1px solid ${T.border}`, display: "flex", gap: 9, justifyContent: "flex-end" }}>{footer}</div>}
      </div>
    </div>
  );
}

/* ============================== app ============================== */

const NAV_ADMIN = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "jobs", label: "Jobs", icon: ListTodo },
  { key: "editors", label: "Editors", icon: Users },
  { key: "invoices", label: "Invoices", icon: Receipt },
  { key: "settings", label: "Settings", icon: Settings },
];
const NAV_EDITOR = [
  { key: "jobs", label: "My jobs", icon: ListTodo },
  { key: "earnings", label: "My earnings", icon: Wallet },
];

export default function App() {
  const [mode, setMode] = useState("dark");
  const T = useMemo(() => makeTokens(mode), [mode]);

  const [role, setRole] = useState("admin");
  const [me, setMe] = useState(DEFAULT_EDITORS[0]);
  const [view, setView] = useState("dashboard");
  const [navOpen, setNavOpen] = useState(false);

  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [config, setConfig] = useState({
    exchangeRate: 25950,
    clients: DEFAULT_CLIENTS,
    editors: DEFAULT_EDITORS,
    rates: DEFAULT_RATES,
    invoiceSeq: 1,
  });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [month, setMonth] = useState("ALL");
  const [drawer, setDrawer] = useState(null);
  const [openInvoice, setOpenInvoice] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(ensureFonts, []);

  useEffect(() => {
    (async () => {
      try {
        const c = await window.storage.get("config", true);
        if (c) setConfig((p) => ({ ...p, ...JSON.parse(c.value) }));
      } catch {}
      try {
        const l = await window.storage.list("job:", true);
        const rows = await Promise.all(
          (l?.keys || []).map(async (k) => {
            try { const r = await window.storage.get(k, true); return r ? JSON.parse(r.value) : null; } catch { return null; }
          })
        );
        setJobs(rows.filter(Boolean));
      } catch { setErr("Couldn't load jobs. Reload to try again."); }
      try {
        const l = await window.storage.list("invoice:", true);
        const rows = await Promise.all(
          (l?.keys || []).map(async (k) => {
            try { const r = await window.storage.get(k, true); return r ? JSON.parse(r.value) : null; } catch { return null; }
          })
        );
        setInvoices(rows.filter(Boolean));
      } catch {}
      setLoading(false);
    })();
  }, []);

  const saveConfig = async (patch) => {
    const next = { ...config, ...patch };
    setConfig(next);
    try { await window.storage.set("config", JSON.stringify(next), true); } catch { setErr("Couldn't save settings."); }
  };

  const putJob = async (job) => {
    setJobs((p) => {
      const i = p.findIndex((x) => x.jobCode === job.jobCode);
      return i >= 0 ? [...p.slice(0, i), job, ...p.slice(i + 1)] : [...p, job];
    });
    try { await window.storage.set(`job:${job.jobCode}`, JSON.stringify(job), true); }
    catch { setErr("Couldn't save the job. Check your connection and try again."); }
  };
  const patchJob = async (code, patch) => {
    const j = jobs.find((x) => x.jobCode === code);
    if (j) await putJob({ ...j, ...patch });
  };
  const removeJob = async (code) => {
    setJobs((p) => p.filter((x) => x.jobCode !== code));
    try { await window.storage.delete(`job:${code}`, true); } catch {}
  };
  const putInvoice = async (inv) => {
    setInvoices((p) => {
      const i = p.findIndex((x) => x.id === inv.id);
      return i >= 0 ? [...p.slice(0, i), inv, ...p.slice(i + 1)] : [...p, inv];
    });
    try { await window.storage.set(`invoice:${inv.id}`, JSON.stringify(inv), true); }
    catch { setErr("Couldn't save the invoice."); }
  };
  const removeInvoice = async (inv) => {
    setInvoices((p) => p.filter((x) => x.id !== inv.id));
    try { await window.storage.delete(`invoice:${inv.id}`, true); } catch {}
    for (const code of inv.jobCodes) await patchJob(code, { invoiceId: null });
  };

  const renameAcross = async (field, from, to) => {
    const listKey = field === "client" ? "clients" : "editors";
    await saveConfig({ [listKey]: config[listKey].map((x) => (x === from ? to : x)) });
    if (role === "editor" && field === "assignedEditor" && me === from) setMe(to);
    const touched = jobs.filter((j) => j[field] === from);
    const updated = touched.map((j) => ({ ...j, [field]: to }));
    setJobs((p) => p.map((j) => (j[field] === from ? { ...j, [field]: to } : j)));
    for (const j of updated) {
      try { await window.storage.set(`job:${j.jobCode}`, JSON.stringify(j), true); }
      catch { setErr(`Renamed, but couldn't update job ${j.jobCode}.`); }
    }
  };

  const importJobs = async (rows) => {
    setJobs((p) => [...p, ...rows]);
    const newClients = Array.from(new Set(rows.map((r) => r.client).filter((c) => c && !config.clients.includes(c))));
    const newEditors = Array.from(new Set(rows.map((r) => r.assignedEditor).filter((e) => e && !config.editors.includes(e))));
    if (newClients.length || newEditors.length) {
      await saveConfig({ clients: [...config.clients, ...newClients], editors: [...config.editors, ...newEditors] });
    }
    let failed = 0;
    for (const j of rows) {
      try { await window.storage.set(`job:${j.jobCode}`, JSON.stringify(j), true); } catch { failed++; }
    }
    setImportOpen(false);
    if (failed) setErr(`${rows.length - failed} of ${rows.length} jobs imported. ${failed} failed to save — try importing those again.`);
  };

  const months = useMemo(
    () => Array.from(new Set(jobs.map((j) => monthKey(j.date)).filter(Boolean))).sort().reverse(),
    [jobs]
  );

  const visibleJobs = useMemo(
    () => (role === "admin" ? jobs : jobs.filter((j) => j.assignedEditor === me)),
    [jobs, role, me]
  );
  const scoped = useMemo(
    () => (month === "ALL" ? visibleJobs : visibleJobs.filter((j) => monthKey(j.date) === month)),
    [visibleJobs, month]
  );

  const nav = role === "admin" ? NAV_ADMIN : NAV_EDITOR;
  useEffect(() => { if (!nav.some((n) => n.key === view)) setView(nav[0].key); }, [role]);

  return (
    <ThemeCtx.Provider value={T}>
      <style>{`
        @keyframes vtPulse{0%,100%{opacity:.5}50%{opacity:.85}}
        @keyframes vtIn{from{opacity:0;transform:translateY(6px) scale(.99)}to{opacity:1;transform:none}}
        @media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}}
        .vt-scroll::-webkit-scrollbar{height:9px;width:9px}
        .vt-scroll::-webkit-scrollbar-thumb{background:${T.borderStrong};border-radius:9px}
        .vt-scroll::-webkit-scrollbar-track{background:transparent}
        .vt-row:hover{background:${T.surface2}}
        .vt-nav{display:none}
        .vt-nav-open{
          display:flex;position:fixed;top:0;bottom:0;left:0;z-index:70;
          box-shadow:0 0 40px rgba(0,0,0,.4);
        }
        .vt-scrim{position:fixed;inset:0;z-index:69;background:rgba(8,10,14,.5)}
        @media (min-width:900px){
          .vt-nav{display:flex;position:static;box-shadow:none}
          .vt-scrim{display:none}
          .vt-menu-btn{display:none!important}
        }
        @media print{.vt-noprint{display:none!important}}
      `}</style>

      <div style={{
        display: "flex", minHeight: 720, fontFamily: SANS, fontSize: 14, lineHeight: 1.5,
        background: T.bg, color: T.text, borderRadius: 14, overflow: "hidden", border: `1px solid ${T.border}`,
      }}>
        {/* sidebar */}
        {navOpen && <div className="vt-scrim vt-noprint" onClick={() => setNavOpen(false)} />}
        <aside className={`vt-nav vt-noprint${navOpen ? " vt-nav-open" : ""}`} style={{
          width: 216, flexShrink: 0, background: T.surface, borderRight: `1px solid ${T.border}`,
          flexDirection: "column",
        }}>
          <SidebarInner {...{ nav, view, setView, role, setRole, me, setMe, mode, setMode, editors: config.editors, onClose: () => setNavOpen(false) }} />
        </aside>

        {/* main */}
        <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <header className="vt-noprint" style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            padding: "13px 18px", borderBottom: `1px solid ${T.border}`, background: T.surface,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <Btn variant="subtle" className="vt-menu-btn" onClick={() => setNavOpen((v) => !v)} style={{ padding: 6 }}><Menu size={18} /></Btn>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-.01em" }}>
                  {nav.find((n) => n.key === view)?.label}
                </div>
                <div style={{ fontSize: 12, color: T.faint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {role === "admin" ? "Admin" : me} · {month === "ALL" ? "All months" : monthName(month)}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Select value={month} onChange={(e) => setMonth(e.target.value)} style={{ width: 158 }}>
                <option value="ALL">All months</option>
                {months.map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
              </Select>
              {role === "admin" && (
                <Btn variant="primary" onClick={() => setDrawer({ mode: "new", job: { ...emptyJob(config.rates), jobCode: nextJobCode(jobs) } })}>
                  <Plus size={15} /> New job
                </Btn>
              )}
            </div>
          </header>

          {err && (
            <div style={{ margin: "12px 18px 0", padding: "10px 13px", borderRadius: 8, display: "flex", gap: 8, alignItems: "center",
              background: `${T.bad}14`, border: `1px solid ${T.bad}44`, color: T.bad, fontSize: 13 }}>
              <AlertTriangle size={15} /> {err}
              <Btn variant="subtle" onClick={() => setErr("")} style={{ marginLeft: "auto", padding: 4, color: T.bad }}><X size={14} /></Btn>
            </div>
          )}

          <div className="vt-scroll" style={{ flex: 1, overflow: "auto", padding: 18 }}>
            {loading ? (
              <LoadingState />
            ) : view === "dashboard" ? (
              <Dashboard jobs={scoped} invoices={invoices} rate={config.exchangeRate} month={month} />
            ) : view === "jobs" ? (
              <JobsView
                jobs={scoped} role={role} clients={config.clients}
                onOpen={(j) => setDrawer({ mode: "view", job: j })}
                onStatus={(code, s) => patchJob(code, { status: s })}
                onNew={() => setDrawer({ mode: "new", job: { ...emptyJob(config.rates), jobCode: nextJobCode(jobs) } })}
              />
            ) : view === "editors" ? (
              <EditorsView jobs={scoped} rate={config.exchangeRate} editors={config.editors} />
            ) : view === "earnings" ? (
              <EarningsView jobs={scoped} me={me} rate={config.exchangeRate} />
            ) : view === "invoices" ? (
              <InvoicesView
                jobs={jobs} invoices={invoices} config={config} month={month} months={months}
                onOpen={setOpenInvoice} onCreate={putInvoice} onPatchJob={patchJob}
                onBumpSeq={(n) => saveConfig({ invoiceSeq: n })}
              />
            ) : (
              <SettingsView
                config={config} onSave={saveConfig} jobs={jobs}
                onRenameAcross={renameAcross} onImport={() => setImportOpen(true)}
              />
            )}
          </div>
        </main>
      </div>

      {drawer && (
        <JobDrawer
          drawer={drawer} role={role} clients={config.clients} editors={config.editors} rates={config.rates} rate={config.exchangeRate}
          existing={jobs.map((j) => j.jobCode)}
          onClose={() => setDrawer(null)}
          onSave={async (j) => { await putJob(j); setDrawer(null); }}
          onDelete={async (c) => { await removeJob(c); setDrawer(null); }}
        />
      )}
      {openInvoice && (
        <InvoiceDetail
          invoice={openInvoice} jobs={jobs} onClose={() => setOpenInvoice(null)}
          onUpdate={async (inv) => { await putInvoice(inv); setOpenInvoice(inv); }}
          onDelete={async (inv) => { await removeInvoice(inv); setOpenInvoice(null); }}
        />
      )}
      {importOpen && (
        <ImportModal
          onClose={() => setImportOpen(false)}
          onImport={importJobs}
          existingCodes={jobs.map((j) => j.jobCode)}
          rates={config.rates}
        />
      )}
    </ThemeCtx.Provider>
  );
}

function SidebarInner({ nav, view, setView, role, setRole, me, setMe, mode, setMode, editors, onClose }) {
  const T = useT();
  return (
    <>
      <div style={{ padding: "16px 14px 12px", display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: T.accent, display: "grid", placeItems: "center" }}>
          <Circle size={13} color={T.accentText} strokeWidth={3} />
        </div>
        <div style={{ fontWeight: 800, fontSize: 14.5, letterSpacing: "-.01em" }}>Edit Tracker</div>
        {onClose && <Btn variant="subtle" className="vt-menu-btn" onClick={onClose} style={{ marginLeft: "auto", padding: 4 }}><X size={16} /></Btn>}
      </div>

      <nav style={{ padding: "4px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
        {nav.map((n) => {
          const on = view === n.key;
          return (
            <button key={n.key} onClick={() => { setView(n.key); onClose?.(); }} style={{
              display: "flex", alignItems: "center", gap: 9, width: "100%", textAlign: "left",
              padding: "8px 10px", borderRadius: 8, cursor: "pointer", fontSize: 13.5, fontWeight: on ? 650 : 500,
              background: on ? T.surface2 : "transparent", color: on ? T.text : T.muted, border: "none",
              fontFamily: SANS,
            }}>
              <n.icon size={16} strokeWidth={on ? 2.4 : 2} color={on ? T.accent : T.faint} />
              {n.label}
            </button>
          );
        })}
      </nav>

      <div style={{ marginTop: "auto", padding: 12, borderTop: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: T.faint, marginBottom: 6 }}>View as</div>
          <div style={{ display: "flex", background: T.surface2, borderRadius: 8, padding: 3, gap: 2 }}>
            {["admin", "editor"].map((r) => (
              <button key={r} onClick={() => setRole(r)} style={{
                flex: 1, padding: "5px 0", borderRadius: 6, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 700, fontFamily: SANS, textTransform: "capitalize",
                background: role === r ? T.accent : "transparent", color: role === r ? T.accentText : T.muted,
              }}>{r}</button>
            ))}
          </div>
        </div>
        {role === "editor" && (
          <Select value={me} onChange={(e) => setMe(e.target.value)} style={{ fontSize: 12.5, padding: "7px 9px" }}>
            {editors.map((e) => <option key={e}>{e}</option>)}
          </Select>
        )}
        <Btn variant="ghost" onClick={() => setMode(mode === "dark" ? "light" : "dark")} style={{ justifyContent: "flex-start" }}>
          {mode === "dark" ? <Sun size={15} /> : <Moon size={15} />} {mode === "dark" ? "Light mode" : "Dark mode"}
        </Btn>
      </div>
    </>
  );
}

function LoadingState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12 }}>
        {[0, 1, 2, 3].map((i) => <Card key={i}><Skeleton h={11} w="55%" /><div style={{ height: 10 }} /><Skeleton h={22} w="70%" /></Card>)}
      </div>
      <Card><Skeleton h={200} /></Card>
    </div>
  );
}

/* ============================== dashboard ============================== */

function Dashboard({ jobs, invoices, rate, month }) {
  const T = useT();
  const [grain, setGrain] = useState("day");

  const counts = useMemo(() => {
    const c = {};
    STATUSES.forEach((s) => (c[s] = 0));
    jobs.forEach((j) => (c[j.status] = (c[j.status] || 0) + 1));
    return c;
  }, [jobs]);

  const revUSD = jobs.reduce((s, j) => s + invPrice(j), 0);
  const payoutVND = jobs.reduce((s, j) => s + budgetTotal(j), 0);

  const chart = useMemo(() => {
    const m = {};
    jobs.forEach((j) => {
      if (!j.date) return;
      const k = grain === "day" ? j.date : grain === "week" ? weekKey(j.date) : monthKey(j.date);
      m[k] = (m[k] || 0) + invPrice(j);
    });
    return Object.entries(m).sort(([a], [b]) => a.localeCompare(b)).slice(-14)
      .map(([k, v]) => ({ k: grain === "month" ? k.slice(2) : k.slice(5), usd: Math.round(v * 100) / 100 }));
  }, [jobs, grain]);

  const byGroup = (key) => {
    const m = {};
    jobs.forEach((j) => {
      const g = j[key];
      if (!g) return;
      m[g] = m[g] || { jobs: 0, usd: 0, vnd: 0 };
      m[g].jobs++; m[g].usd += invPrice(j); m[g].vnd += budgetTotal(j);
    });
    return Object.entries(m).sort((a, b) => b[1].usd - a[1].usd || b[1].vnd - a[1].vnd);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12 }}>
        <Stat label="Total jobs" value={jobs.length} sub={month === "ALL" ? "All months" : monthName(month)} />
        <Stat label="Revenue (USD)" value={fmtUSD(revUSD)} sub="Invoice price to clients" tone="good" />
        <Stat label="Revenue (VNĐ)" value={fmtVND(revUSD * rate)} sub={`Rate ${rate.toLocaleString("vi-VN")}`} />
        <Stat label="Editor payout" value={fmtVND(payoutVND)} sub="Total budget" tone="warn" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(118px,1fr))", gap: 10 }}>
        {STATUSES.map((s) => (
          <Card key={s} pad={12}>
            <Pill tone={statusTone[s]}>{s}</Pill>
            <div style={{ fontFamily: MONO, fontSize: 21, fontWeight: 700, marginTop: 8 }}>{counts[s]}</div>
          </Card>
        ))}
      </div>

      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 650 }}>
            <TrendingUp size={16} color={T.accent} /> Revenue (USD)
          </div>
          <div style={{ display: "flex", background: T.surface2, borderRadius: 8, padding: 3, gap: 2 }}>
            {["day", "week", "month"].map((g) => (
              <button key={g} onClick={() => setGrain(g)} style={{
                padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: SANS,
                fontSize: 12, fontWeight: 650, textTransform: "capitalize",
                background: grain === g ? T.surface : "transparent", color: grain === g ? T.text : T.muted,
              }}>{g}</button>
            ))}
          </div>
        </div>
        {chart.length === 0 ? (
          <Empty title="No revenue yet" body="Add an invoice price to a job and it shows up here." />
        ) : (
          <div style={{ height: 230 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke={T.border} vertical={false} />
                <XAxis dataKey="k" tick={{ fill: T.faint, fontSize: 11, fontFamily: MONO }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: T.faint, fontSize: 11, fontFamily: MONO }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: `${T.accent}12` }}
                  contentStyle={{ background: T.raised, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12, fontFamily: SANS, color: T.text }}
                  formatter={(v) => [fmtUSD(v), "Revenue"]}
                />
                <Bar dataKey="usd" fill={T.accent} radius={[4, 4, 0, 0]} maxBarSize={38} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 12 }}>
        <BreakdownCard title="By client" rows={byGroup("client")} render={(n) => <ClientBadge name={n} />} rate={rate} />
        <BreakdownCard title="By editor" rows={byGroup("assignedEditor")} render={(n) => (
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Avatar name={n} size={22} />{n}</span>
        )} rate={rate} showVnd />
      </div>
    </div>
  );
}

function BreakdownCard({ title, rows, render, showVnd }) {
  const T = useT();
  return (
    <Card>
      <div style={{ fontWeight: 650, marginBottom: 10 }}>{title}</div>
      {rows.length === 0 ? <div style={{ color: T.faint, fontSize: 13 }}>Nothing here yet.</div> : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {rows.map(([name, v]) => (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: `1px solid ${T.border}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>{render(name)}</div>
              <span style={{ fontSize: 12, color: T.faint, fontFamily: MONO }}>{v.jobs} jobs</span>
              <span style={{ fontFamily: MONO, fontWeight: 700, minWidth: 78, textAlign: "right" }}>
                {showVnd ? fmtVND(v.vnd) : fmtUSD(v.usd)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function Empty({ title, body, action }) {
  const T = useT();
  return (
    <div style={{ padding: "44px 20px", textAlign: "center" }}>
      <div style={{ fontWeight: 650, marginBottom: 4 }}>{title}</div>
      <div style={{ color: T.muted, fontSize: 13, marginBottom: action ? 14 : 0 }}>{body}</div>
      {action}
    </div>
  );
}

/* ============================== jobs ============================== */

function StatusSelect({ value, onChange }) {
  const T = useT();
  const c = T[statusTone[value]] || T.faint;
  return (
    <select
      value={value}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => { e.stopPropagation(); onChange(e.target.value); }}
      style={{
        appearance: "none", WebkitAppearance: "none", cursor: "pointer",
        fontFamily: MONO, fontSize: 11.5, fontWeight: 650, color: c,
        background: `${c}1A`, border: `1px solid ${c}44`, borderRadius: 999, padding: "5px 22px 5px 11px",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='5'%3E%3Cpath d='M1 1l3.5 3L8 1' stroke='%23999' stroke-width='1.4' fill='none'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat", backgroundPosition: "right 9px center",
      }}
    >
      {STATUSES.map((s) => <option key={s} value={s} style={{ background: T.surface, color: T.text }}>{s}</option>)}
    </select>
  );
}

function JobsView({ jobs, role, clients, onOpen, onStatus, onNew }) {
  const T = useT();
  const [q, setQ] = useState("");
  const [fClient, setFClient] = useState("ALL");
  const [fStatus, setFStatus] = useState("ALL");
  const [sortDesc, setSortDesc] = useState(true);
  const [expanded, setExpanded] = useState({});

  const rows = useMemo(() => {
    let r = jobs.filter((j) => {
      if (fClient !== "ALL" && j.client !== fClient) return false;
      if (fStatus !== "ALL" && j.status !== fStatus) return false;
      if (q.trim()) {
        const s = `${j.jobCode} ${j.client} ${j.jobName} ${j.instruction} ${j.assignedEditor}`.toLowerCase();
        if (!s.includes(q.toLowerCase().trim())) return false;
      }
      return true;
    });
    r.sort((a, b) => (a.date || "").localeCompare(b.date || "") * (sortDesc ? -1 : 1));
    return r;
  }, [jobs, q, fClient, fStatus, sortDesc]);

  const stickyCell = { position: "sticky", background: "inherit", zIndex: 1 };
  const th = {
    textAlign: "left", padding: "10px 12px", fontSize: 10.5, fontWeight: 700, letterSpacing: ".07em",
    color: T.faint, whiteSpace: "nowrap", background: T.surface2, position: "sticky", top: 0, zIndex: 2,
  };
  const td = { padding: "11px 12px", fontSize: 13, verticalAlign: "middle" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 200px", minWidth: 170 }}>
          <Search size={14} color={T.faint} style={{ position: "absolute", left: 11, top: 11 }} />
          <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search code, client, note…" style={{ paddingLeft: 32 }} />
        </div>
        <Select value={fClient} onChange={(e) => setFClient(e.target.value)} style={{ width: 150 }}>
          <option value="ALL">All clients</option>
          {clients.map((c) => <option key={c}>{c}</option>)}
        </Select>
        <Select value={fStatus} onChange={(e) => setFStatus(e.target.value)} style={{ width: 150 }}>
          <option value="ALL">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </Select>
        <Btn onClick={() => setSortDesc((v) => !v)}>Date {sortDesc ? "↓" : "↑"}</Btn>
      </div>

      <Card pad={0} style={{ overflow: "hidden" }}>
        {rows.length === 0 ? (
          <Empty
            title={jobs.length ? "No jobs match these filters" : "No jobs yet"}
            body={jobs.length ? "Clear a filter to see more." : role === "admin" ? "Create your first job to start tracking." : "Jobs assigned to you will show up here."}
            action={role === "admin" && !jobs.length ? <Btn variant="primary" onClick={onNew}><Plus size={15} /> New job</Btn> : null}
          />
        ) : (
          <div className="vt-scroll" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr>
                  <th style={{ ...th, ...stickyCell, left: 0, width: 104, minWidth: 104 }}>Date</th>
                  <th style={{ ...th, ...stickyCell, left: 104, width: 116, minWidth: 116 }}>Client</th>
                  <th style={th}>Job code</th>
                  <th style={th}>Job / note</th>
                  <th style={th}>Links</th>
                  <th style={th}>Editor</th>
                  <th style={th}>Status</th>
                  <th style={{ ...th, textAlign: "right" }}>Budget</th>
                  {role === "admin" && <th style={{ ...th, textAlign: "right" }}>Invoice</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((j) => {
                  const open = expanded[j.jobCode];
                  return (
                    <Fragment key={j.jobCode}>
                      <tr className="vt-row" onClick={() => onOpen(j)}
                        style={{ borderTop: `1px solid ${T.border}`, cursor: "pointer", background: T.surface }}>
                        <td style={{ ...td, ...stickyCell, left: 0, width: 104, fontFamily: MONO, fontSize: 12, color: T.muted }}>{j.date}</td>
                        <td style={{ ...td, ...stickyCell, left: 104, width: 116 }}><ClientBadge name={j.client} /></td>
                        <td style={{ ...td, fontFamily: MONO, fontSize: 12, fontWeight: 650 }}>{j.jobCode}</td>
                        <td style={{ ...td, maxWidth: 240 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {j.jobName || <span style={{ color: T.faint }}>Untitled</span>}
                            </span>
                            {j.instruction && (
                              <button onClick={(e) => { e.stopPropagation(); setExpanded((s) => ({ ...s, [j.jobCode]: !open })); }}
                                title={open ? "Hide instruction" : "Show instruction"}
                                style={{ background: "none", border: "none", cursor: "pointer", color: T.faint, padding: 2, display: "flex" }}>
                                {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>
                            )}
                          </div>
                        </td>
                        <td style={td}>
                          <div style={{ display: "flex", gap: 5 }} onClick={(e) => e.stopPropagation()}>
                            <IconLink href={j.inputLink} label="Input footage" tone="info" icon={Download} />
                            <IconLink href={j.sampleLink} label="Sample / reference" tone="violet" icon={Film} />
                            <IconLink href={j.musicLink} label="Music" tone="warn" icon={Music} />
                            <IconLink href={j.outputLink} label="Output" tone="good" icon={Link2} />
                          </div>
                        </td>
                        <td style={td}>
                          <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <Avatar name={j.assignedEditor} size={22} />
                            <span style={{ color: j.assignedEditor ? T.text : T.faint, fontSize: 12.5 }}>{j.assignedEditor || "Unassigned"}</span>
                          </span>
                        </td>
                        <td style={td}><StatusSelect value={j.status} onChange={(s) => onStatus(j.jobCode, s)} /></td>
                        <td style={{ ...td, textAlign: "right", fontFamily: MONO, fontWeight: 650 }}>{fmtVND(budgetTotal(j))}</td>
                        {role === "admin" && (
                          <td style={{ ...td, textAlign: "right", fontFamily: MONO, fontWeight: 650, color: invPrice(j) ? T.good : T.faint }}>
                            {invPrice(j) ? fmtUSD(invPrice(j)) : "—"}
                          </td>
                        )}
                      </tr>
                      {open && (
                        <tr style={{ background: T.surface2 }}>
                          <td colSpan={role === "admin" ? 9 : 8} style={{ padding: "12px 16px", borderTop: `1px solid ${T.border}` }}>
                            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", color: T.faint, marginBottom: 5 }}>INSTRUCTION</div>
                            <div style={{ whiteSpace: "pre-wrap", fontSize: 13, color: T.text }}>{j.instruction}</div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function IconLink({ href, label, tone, icon: Icon = Link2 }) {
  const T = useT();
  if (!href) return <span style={{ width: 24, height: 24, display: "grid", placeItems: "center", color: T.faint, opacity: .35 }}>–</span>;
  return (
    <a href={href} target="_blank" rel="noreferrer" title={label} style={{
      width: 24, height: 24, borderRadius: 6, display: "grid", placeItems: "center",
      color: T[tone], background: `${T[tone]}18`, border: `1px solid ${T[tone]}3A`,
    }}><Icon size={12} /></a>
  );
}

/* ============================== editors ============================== */

function editorRows(jobs, name) {
  const m = {};
  jobs.filter((j) => j.assignedEditor === name).forEach((j) => {
    const d = j.date || "—";
    m[d] = m[d] || { jobs: 0, vnd: 0 };
    m[d].jobs++; m[d].vnd += budgetTotal(j);
  });
  return Object.entries(m).sort(([a], [b]) => b.localeCompare(a));
}

function EditorsView({ jobs, rate, editors }) {
  const T = useT();
  const [open, setOpen] = useState(editors[0] || "");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 }}>
        {editors.map((e) => {
          const mine = jobs.filter((j) => j.assignedEditor === e);
          const vnd = mine.reduce((s, j) => s + budgetTotal(j), 0);
          return (
            <Card key={e} style={{ cursor: "pointer", borderColor: open === e ? T.accent : T.border }}>
              <div onClick={() => setOpen(e)}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <Avatar name={e} size={32} />
                  <div>
                    <div style={{ fontWeight: 650 }}>{e}</div>
                    <div style={{ fontSize: 12, color: T.faint }}>{mine.length} jobs</div>
                  </div>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, marginTop: 10 }}>{fmtVND(vnd)}</div>
                <div style={{ fontFamily: MONO, fontSize: 12, color: T.muted }}>≈ {fmtUSD(vnd / rate)}</div>
              </div>
            </Card>
          );
        })}
      </div>
      <EarningsTable jobs={jobs} name={open} rate={rate} />
    </div>
  );
}

function EarningsView({ jobs, me, rate }) {
  return <EarningsTable jobs={jobs} name={me} rate={rate} />;
}

function EarningsTable({ jobs, name, rate }) {
  const T = useT();
  const rows = editorRows(jobs, name);
  const mine = jobs.filter((j) => j.assignedEditor === name);
  const total = mine.reduce((s, j) => s + budgetTotal(j), 0);

  const now = new Date();
  const thisWeek = weekKey(now.toISOString().slice(0, 10));
  const weekTotal = mine.filter((j) => j.date && weekKey(j.date) === thisWeek).reduce((s, j) => s + budgetTotal(j), 0);
  const monthTotal = mine.filter((j) => monthKey(j.date) === now.toISOString().slice(0, 7)).reduce((s, j) => s + budgetTotal(j), 0);
  const yearTotal = mine.filter((j) => (j.date || "").startsWith(String(now.getFullYear()))).reduce((s, j) => s + budgetTotal(j), 0);

  const th = { textAlign: "left", padding: "10px 12px", fontSize: 10.5, fontWeight: 700, letterSpacing: ".07em", color: T.faint, background: T.surface2 };
  const td = { padding: "10px 12px", fontSize: 13 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
        <Stat label="This week" value={fmtVND(weekTotal)} />
        <Stat label="This month" value={fmtVND(monthTotal)} />
        <Stat label="This year" value={fmtVND(yearTotal)} />
        <Stat label="Selected period" value={fmtVND(total)} sub={`≈ ${fmtUSD(total / rate)}`} tone="accent" />
      </div>
      <Card pad={0} style={{ overflow: "hidden" }}>
        <div style={{ padding: "13px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 9 }}>
          <Avatar name={name} size={26} /><span style={{ fontWeight: 650 }}>{name}</span>
          <span style={{ color: T.faint, fontSize: 12.5 }}>· {mine.length} jobs</span>
        </div>
        {rows.length === 0 ? (
          <Empty title="Nothing earned in this period" body="Pick another month, or check back once jobs are assigned." />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>Date</th><th style={th}>Jobs</th><th style={{ ...th, textAlign: "right" }}>VNĐ</th><th style={{ ...th, textAlign: "right" }}>USD</th></tr></thead>
            <tbody>
              {rows.map(([d, v]) => (
                <tr key={d} style={{ borderTop: `1px solid ${T.border}` }}>
                  <td style={{ ...td, fontFamily: MONO, fontSize: 12, color: T.muted }}>{d}</td>
                  <td style={td}>{v.jobs}</td>
                  <td style={{ ...td, textAlign: "right", fontFamily: MONO, fontWeight: 650 }}>{fmtVND(v.vnd)}</td>
                  <td style={{ ...td, textAlign: "right", fontFamily: MONO, color: T.muted }}>{fmtUSD(v.vnd / rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

/* ============================== invoices ============================== */

function InvoicesView({ jobs, invoices, config, month, months, onOpen, onCreate, onPatchJob, onBumpSeq }) {
  const T = useT();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [fMonth, setFMonth] = useState("ALL");
  const [builder, setBuilder] = useState(false);

  const totalsOf = (inv) => {
    const list = jobs.filter((j) => inv.jobCodes.includes(j.jobCode));
    const usd = list.reduce((s, j) => s + invPrice(j), 0);
    return { count: list.length, usd, vnd: usd * inv.rate };
  };

  const rows = invoices
    .filter((inv) => {
      if (q.trim() && !inv.client.toLowerCase().includes(q.toLowerCase().trim())) return false;
      if (fMonth !== "ALL" && monthKey(inv.createdAt) !== fMonth) return false;
      if (filter === "Draft" && (inv.sentAt || inv.paidAt)) return false;
      if (filter === "Sent" && (!inv.sentAt || inv.paidAt)) return false;
      if (filter === "Paid" && !inv.paidAt) return false;
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const th = { textAlign: "left", padding: "10px 12px", fontSize: 10.5, fontWeight: 700, letterSpacing: ".07em", color: T.faint, background: T.surface2, whiteSpace: "nowrap" };
  const td = { padding: "11px 12px", fontSize: 13 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 180px", minWidth: 160 }}>
          <Search size={14} color={T.faint} style={{ position: "absolute", left: 11, top: 11 }} />
          <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search client…" style={{ paddingLeft: 32 }} />
        </div>
        <Select value={fMonth} onChange={(e) => setFMonth(e.target.value)} style={{ width: 152 }}>
          <option value="ALL">All months</option>
          {months.map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
        </Select>
        <div style={{ display: "flex", background: T.surface2, borderRadius: 8, padding: 3, gap: 2 }}>
          {["ALL", "Draft", "Sent", "Paid"].map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "6px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: SANS,
              fontSize: 12, fontWeight: 650,
              background: filter === f ? T.surface : "transparent", color: filter === f ? T.text : T.muted,
            }}>{f === "ALL" ? "All" : f}</button>
          ))}
        </div>
        <Btn variant="primary" onClick={() => setBuilder(true)}><Plus size={15} /> New invoice</Btn>
      </div>

      <Card pad={0} style={{ overflow: "hidden" }}>
        {rows.length === 0 ? (
          <Empty
            title={invoices.length ? "No invoices match these filters" : "No invoices yet"}
            body={invoices.length ? "Clear a filter to see more." : "Group a client's delivered jobs into an invoice to bill them."}
            action={!invoices.length ? <Btn variant="primary" onClick={() => setBuilder(true)}><Plus size={15} /> New invoice</Btn> : null}
          />
        ) : (
          <div className="vt-scroll" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr>
                  <th style={th}>Invoice #</th><th style={th}>Client</th><th style={th}>Jobs</th>
                  <th style={{ ...th, textAlign: "right" }}>Total USD</th><th style={{ ...th, textAlign: "right" }}>Total VNĐ</th>
                  <th style={{ ...th, textAlign: "center" }}>Sent</th><th style={{ ...th, textAlign: "center" }}>Paid</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((inv) => {
                  const t = totalsOf(inv);
                  return (
                    <tr key={inv.id} className="vt-row" onClick={() => onOpen(inv)} style={{ borderTop: `1px solid ${T.border}`, cursor: "pointer", background: T.surface }}>
                      <td style={{ ...td, fontFamily: MONO, fontWeight: 650 }}>{inv.number}</td>
                      <td style={td}><ClientBadge name={inv.client} /></td>
                      <td style={{ ...td, color: T.muted }}>{t.count}</td>
                      <td style={{ ...td, textAlign: "right", fontFamily: MONO, fontWeight: 700 }}>{fmtUSD(t.usd)}</td>
                      <td style={{ ...td, textAlign: "right", fontFamily: MONO, color: T.muted }}>{fmtVND(t.vnd)}</td>
                      <td style={{ ...td, textAlign: "center" }}>{inv.sentAt ? <Pill tone="info" dot={false}>{inv.sentAt}</Pill> : <span style={{ color: T.faint }}>—</span>}</td>
                      <td style={{ ...td, textAlign: "center" }}>{inv.paidAt ? <Pill tone="good" dot={false}>{inv.paidAt}</Pill> : <span style={{ color: T.faint }}>—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {builder && (
        <InvoiceBuilder
          jobs={jobs} clients={config.clients} rate={config.exchangeRate} seq={config.invoiceSeq}
          onClose={() => setBuilder(false)}
          onCreate={async (inv) => {
            await onCreate(inv);
            for (const c of inv.jobCodes) await onPatchJob(c, { invoiceId: inv.id });
            await onBumpSeq(config.invoiceSeq + 1);
            setBuilder(false);
            onOpen(inv);
          }}
        />
      )}
    </div>
  );
}

function InvoiceBuilder({ jobs, clients, rate, seq, onClose, onCreate }) {
  const T = useT();
  const withClients = clients.filter((c) => jobs.some((j) => j.client === c));
  const [client, setClient] = useState(withClients[0] || "");
  const [sel, setSel] = useState({});

  const candidates = jobs
    .filter((j) => j.client === client && !j.invoiceId)
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  useEffect(() => {
    const n = {};
    candidates.forEach((j) => (n[j.jobCode] = ["Done", "Delivered"].includes(j.status)));
    setSel(n);
  }, [client]);

  const picked = candidates.filter((j) => sel[j.jobCode]);
  const usd = picked.reduce((s, j) => s + invPrice(j), 0);

  return (
    <Modal title="New invoice" icon={<Receipt size={17} color={T.accent} />} onClose={onClose} width={720}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" disabled={!picked.length}
            onClick={() => onCreate({
              id: nextId("inv"),
              number: `INV-${String(seq).padStart(4, "0")}`,
              client,
              jobCodes: picked.map((j) => j.jobCode),
              rate,
              createdAt: new Date().toISOString().slice(0, 10),
              sentAt: null,
              paidAt: null,
            })}>
            Create invoice · {fmtUSD(usd)}
          </Btn>
        </>
      }>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Client">
          <Select value={client} onChange={(e) => setClient(e.target.value)}>
            {withClients.length === 0 && <option value="">No clients with jobs yet</option>}
            {withClients.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </Field>

        {candidates.length === 0 ? (
          <Empty title="Nothing left to invoice" body="Every job for this client is already on an invoice." />
        ) : (
          <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
            {candidates.map((j) => (
              <label key={j.jobCode} style={{
                display: "grid", gridTemplateColumns: "22px 1fr 90px 88px", gap: 10, alignItems: "center",
                padding: "10px 12px", borderBottom: `1px solid ${T.border}`, cursor: "pointer", fontSize: 13,
              }}>
                <input type="checkbox" checked={!!sel[j.jobCode]} onChange={(e) => setSel((s) => ({ ...s, [j.jobCode]: e.target.checked }))} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ fontFamily: MONO, fontSize: 11.5, color: T.muted }}>{j.jobCode}</span>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.jobName || "Untitled"}</div>
                </span>
                <Pill tone={statusTone[j.status]}>{j.status}</Pill>
                <span style={{ textAlign: "right", fontFamily: MONO, fontWeight: 650, color: invPrice(j) ? T.text : T.faint }}>
                  {invPrice(j) ? fmtUSD(invPrice(j)) : "no price"}
                </span>
              </label>
            ))}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ color: T.muted, fontSize: 13 }}>{picked.length} jobs selected · rate {rate.toLocaleString("vi-VN")}</span>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 800, color: T.accent }}>{fmtUSD(usd)}</div>
            <div style={{ fontFamily: MONO, fontSize: 12.5, color: T.muted }}>{fmtVND(usd * rate)}</div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function InvoiceDetail({ invoice, jobs, onClose, onUpdate, onDelete }) {
  const T = useT();
  const [copied, setCopied] = useState(false);
  const list = jobs.filter((j) => invoice.jobCodes.includes(j.jobCode));
  const usd = list.reduce((s, j) => s + invPrice(j), 0);
  const vnd = usd * invoice.rate;
  const today = () => new Date().toISOString().slice(0, 10);

  const text = [
    `${invoice.number} — ${invoice.client}`,
    "",
    ...list.map((j) => `${j.jobCode}  ${j.jobName || "Untitled"}  ${fmtUSD(invPrice(j))}`),
    "",
    `Total jobs: ${list.length}`,
    `Total invoice: ${fmtUSD(usd)}`,
    `Exchange rate: ${invoice.rate.toLocaleString("vi-VN")}`,
    `Equivalent: ${fmtVND(vnd)}`,
    `Created: ${invoice.createdAt}`,
  ].join("\n");

  const th = { textAlign: "left", padding: "9px 11px", fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", color: T.faint, background: T.surface2, whiteSpace: "nowrap" };
  const td = { padding: "10px 11px", fontSize: 13, borderTop: `1px solid ${T.border}` };

  return (
    <Modal
      title={`${invoice.number} · ${invoice.client}`}
      icon={<Receipt size={17} color={T.accent} />}
      onClose={onClose}
      width={820}
      footer={
        <>
          <Btn variant="danger" onClick={() => onDelete(invoice)}><Trash2 size={14} /> Delete</Btn>
          <div style={{ flex: 1 }} />
          <Btn onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} }}>
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
          </Btn>
          <Btn onClick={() => window.print()}><Printer size={14} /> Print / PDF</Btn>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="vt-noprint" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
          <ToggleRow
            label="Invoice sent" tone="info" on={!!invoice.sentAt} date={invoice.sentAt}
            onToggle={(v) => onUpdate({ ...invoice, sentAt: v ? today() : null, paidAt: v ? invoice.paidAt : null })}
          />
          <ToggleRow
            label="Payment received" tone="good" on={!!invoice.paidAt} date={invoice.paidAt} disabled={!invoice.sentAt}
            hint={!invoice.sentAt ? "Mark as sent first" : ""}
            onToggle={(v) => onUpdate({ ...invoice, paidAt: v ? today() : null })}
          />
        </div>

        <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
          <div className="vt-scroll" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
              <thead>
                <tr><th style={th}>Client</th><th style={th}>Job name</th><th style={th}>Job code</th><th style={th}>Video note</th><th style={th}>Done link</th><th style={{ ...th, textAlign: "right" }}>Price</th></tr>
              </thead>
              <tbody>
                {list.map((j) => (
                  <tr key={j.jobCode}>
                    <td style={td}><ClientBadge name={j.client} /></td>
                    <td style={{ ...td, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.jobName || "Untitled"}</td>
                    <td style={{ ...td, fontFamily: MONO, fontSize: 12 }}>{j.jobCode}</td>
                    <td style={{ ...td, maxWidth: 170, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.videoNote || "—"}</td>
                    <td style={td}>{j.outputLink ? <a href={j.outputLink} target="_blank" rel="noreferrer" style={{ color: T.info, display: "inline-flex", gap: 4, alignItems: "center" }}><Link2 size={12} /> Open</a> : <span style={{ color: T.faint }}>—</span>}</td>
                    <td style={{ ...td, textAlign: "right", fontFamily: MONO, fontWeight: 700 }}>{fmtUSD(invPrice(j))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <Card style={{ background: T.surface2 }}>
          {[
            ["Total jobs", String(list.length)],
            ["Total invoice", fmtUSD(usd)],
            ["PayPal exchange rate", invoice.rate.toLocaleString("vi-VN")],
            ["Equivalent", fmtVND(vnd)],
            ["Created", invoice.createdAt],
          ].map(([k, v], i) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderTop: i ? `1px solid ${T.border}` : "none" }}>
              <span style={{ color: T.muted, fontSize: 13 }}>{k}</span>
              <span style={{ fontFamily: MONO, fontWeight: k === "Total invoice" ? 800 : 600, color: k === "Total invoice" ? T.accent : T.text }}>{v}</span>
            </div>
          ))}
        </Card>
      </div>
    </Modal>
  );
}

function ToggleRow({ label, tone, on, date, onToggle, disabled, hint }) {
  const T = useT();
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 11, padding: "11px 13px", borderRadius: 10,
      border: `1px solid ${on ? T[tone] + "55" : T.border}`, background: on ? `${T[tone]}12` : "transparent",
      opacity: disabled ? 0.55 : 1,
    }}>
      <input type="checkbox" checked={on} disabled={disabled} onChange={(e) => onToggle(e.target.checked)} style={{ width: 16, height: 16 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 650, fontSize: 13.5 }}>{label}</div>
        <div style={{ fontSize: 12, color: T.faint }}>{on ? date : hint || "Not yet"}</div>
      </div>
    </div>
  );
}

/* ============================== job drawer ============================== */

function JobDrawer({ drawer, role, clients, editors, rates, rate, existing, onClose, onSave, onDelete }) {
  const T = useT();
  const isNew = drawer.mode === "new";
  const [form, setForm] = useState(drawer.job);
  const [editing, setEditing] = useState(isNew);
  const [more, setMore] = useState(!isNew);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const canSave = form.jobCode && form.client && (!isNew || !existing.includes(form.jobCode));
  const readOnly = role !== "admin";

  const updLine = (id, patch) => setForm((f) => ({ ...f, budgetItems: f.budgetItems.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(8,10,14,.6)" }} />
      <div className="vt-scroll" style={{
        position: "relative", width: "min(520px,100%)", height: "100%", overflowY: "auto",
        background: T.bg, borderLeft: `1px solid ${T.border}`, color: T.text, fontFamily: SANS,
      }}>
        <div style={{ position: "sticky", top: 0, zIndex: 2, background: T.bg, borderBottom: `1px solid ${T.border}`, padding: "15px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, fontFamily: MONO }}>{isNew ? "New job" : form.jobCode}</div>
            <div style={{ fontSize: 12, color: T.faint }}>{isNew ? "Only code and client are required" : editing ? "Editing" : form.jobName || "Job details"}</div>
          </div>
          <Btn variant="subtle" onClick={onClose} style={{ padding: 6 }}><X size={18} /></Btn>
        </div>

        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 18 }}>
          {!editing ? (
            <JobRead form={form} role={role} rate={rate} />
          ) : (
            <>
              <Sect title="Required">
                <Grid2>
                  <Field label="Job code"><TextInput value={form.jobCode} onChange={set("jobCode")} disabled={!isNew} /></Field>
                  <Field label="Client">
                    <Select value={form.client} onChange={set("client")}>
                      <option value="">Select a client</option>
                      {clients.map((c) => <option key={c}>{c}</option>)}
                    </Select>
                  </Field>
                </Grid2>
              </Sect>

              <Sect title="Assignment">
                <Grid2>
                  <Field label="Date"><TextInput type="date" value={form.date} onChange={set("date")} /></Field>
                  <Field label="Editor">
                    <Select value={form.assignedEditor} onChange={set("assignedEditor")}>
                      <option value="">Unassigned</option>
                      {editors.map((e) => <option key={e}>{e}</option>)}
                    </Select>
                  </Field>
                  <Field label="Status">
                    <Select value={form.status} onChange={set("status")}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</Select>
                  </Field>
                  <Field label="Job name"><TextInput value={form.jobName} onChange={set("jobName")} placeholder="4364 Corso Venetia Blvd" /></Field>
                </Grid2>
              </Sect>

              {!more && <Btn onClick={() => setMore(true)} style={{ borderStyle: "dashed", justifyContent: "flex-start", color: T.muted }}>Add details, links and pricing</Btn>}

              {more && (
                <>
                  <Sect title="Brief">
                    <Grid2>
                      {role === "admin" && <Field label="CS name"><TextInput value={form.csName} onChange={set("csName")} /></Field>}
                      {role === "admin" && (
                        <Field label="Job type">
                          <Select value={form.jobType} onChange={set("jobType")}>{JOB_TYPES.map((t) => <option key={t}>{t}</option>)}</Select>
                        </Field>
                      )}
                      <Field label="Input link" span={2}><TextInput value={form.inputLink} onChange={set("inputLink")} placeholder="https:// — raw footage" /></Field>
                      <Field label="Sample link"><TextInput value={form.sampleLink} onChange={set("sampleLink")} placeholder="https:// — reference video" /></Field>
                      <Field label="Music link"><TextInput value={form.musicLink} onChange={set("musicLink")} placeholder="https:// — track or folder" /></Field>
                      <Field label="Instruction" span={2}><TextArea value={form.instruction} onChange={set("instruction")} /></Field>
                    </Grid2>
                  </Sect>

                  <Sect title="Output">
                    <Grid2>
                      <Field label="Output video"><TextInput value={form.outputVideo} onChange={set("outputVideo")} placeholder="1min20" /></Field>
                      <Field label="Output link"><TextInput value={form.outputLink} onChange={set("outputLink")} placeholder="https://" /></Field>
                      <Field label="Video note" span={2}><TextInput value={form.videoNote} onChange={set("videoNote")} placeholder="Shown on the client invoice" /></Field>
                    </Grid2>
                  </Sect>

                  <Sect title={`Budget · editor pay${readOnly ? " (read only)" : ""}`}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {form.budgetItems.map((b) => (
                        <div key={b.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <Select value={b.label} disabled={readOnly} onChange={(e) => updLine(b.id, { label: e.target.value, amount: rates.find((r) => r.label === e.target.value)?.price ?? 0 })} style={{ flex: 2 }}>
                            {rates.map((c) => <option key={c.label}>{c.label}</option>)}
                          </Select>
                          <TextInput type="number" value={b.amount} disabled={readOnly} onChange={(e) => updLine(b.id, { amount: e.target.value })} style={{ flex: 1 }} />
                          {!readOnly && form.budgetItems.length > 1 && (
                            <Btn variant="subtle" onClick={() => setForm((f) => ({ ...f, budgetItems: f.budgetItems.filter((x) => x.id !== b.id) }))} style={{ padding: 5 }}>
                              <X size={14} />
                            </Btn>
                          )}
                        </div>
                      ))}
                      {!readOnly && (
                        <Btn onClick={() => setForm((f) => ({ ...f, budgetItems: [...f.budgetItems, newBudgetLine(rates)] }))} style={{ alignSelf: "flex-start", borderStyle: "dashed", color: T.muted }}>
                          <Plus size={14} /> Add line
                        </Btn>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 9, borderTop: `1px solid ${T.border}` }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: T.muted, letterSpacing: ".05em" }}>TOTAL</span>
                        <span style={{ fontFamily: MONO, fontWeight: 800, color: T.accent }}>{fmtVND(budgetTotal(form))}</span>
                      </div>
                    </div>
                  </Sect>

                  {role === "admin" && (
                    <Sect title="Invoice price · charged to client">
                      <Field label="Price (USD)">
                        <TextInput type="number" value={form.invoicePrice} onChange={set("invoicePrice")} placeholder="80" />
                      </Field>
                      {invPrice(form) > 0 && (
                        <div style={{ fontSize: 12.5, color: T.muted, fontFamily: MONO }}>≈ {fmtVND(invPrice(form) * rate)} at today's rate</div>
                      )}
                    </Sect>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <div style={{ position: "sticky", bottom: 0, background: T.bg, borderTop: `1px solid ${T.border}`, padding: 15, display: "flex", gap: 9 }}>
          {!isNew && !editing && role === "admin" && <Btn variant="danger" onClick={() => onDelete(form.jobCode)}><Trash2 size={14} /> Delete</Btn>}
          <div style={{ flex: 1 }} />
          {editing ? (
            <>
              {!isNew && <Btn onClick={() => { setForm(drawer.job); setEditing(false); }}>Cancel</Btn>}
              <Btn variant="primary" disabled={!canSave} onClick={() => onSave(form)}>{isNew ? "Create job" : "Save changes"}</Btn>
            </>
          ) : (
            <Btn variant="primary" onClick={() => { setMore(true); setEditing(true); }}>Edit</Btn>
          )}
        </div>
      </div>
    </div>
  );
}

const Grid2 = ({ children }) => <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{children}</div>;

function Sect({ title, children }) {
  const T = useT();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: T.accent }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value, link }) {
  const T = useT();
  if (!value) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "8px 0", borderBottom: `1px solid ${T.border}` }}>
      <span style={{ fontSize: 12.5, color: T.muted, flexShrink: 0 }}>{label}</span>
      {link
        ? <a href={value} target="_blank" rel="noreferrer" style={{ color: T.info, fontSize: 13, display: "flex", gap: 4, alignItems: "center" }}><Link2 size={12} /> Open</a>
        : <span style={{ fontSize: 13, textAlign: "right", wordBreak: "break-word" }}>{value}</span>}
    </div>
  );
}

function JobRead({ form, role, rate }) {
  const T = useT();
  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <Pill tone={statusTone[form.status]} size="md">{form.status}</Pill>
        <ClientBadge name={form.client} />
        {form.assignedEditor && (
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <Avatar name={form.assignedEditor} size={22} />{form.assignedEditor}
          </span>
        )}
      </div>

      <Sect title="Job">
        <Row label="Date" value={form.date} />
        <Row label="Job name" value={form.jobName} />
        {role === "admin" && <Row label="CS name" value={form.csName} />}
        {role === "admin" && <Row label="Job type" value={form.jobType} />}
        <Row label="Input link" value={form.inputLink} link />
        <Row label="Sample link" value={form.sampleLink} link />
        <Row label="Music link" value={form.musicLink} link />
        <Row label="Output" value={form.outputVideo} />
        <Row label="Output link" value={form.outputLink} link />
      </Sect>

      {form.instruction && (
        <Sect title="Instruction">
          <div style={{ whiteSpace: "pre-wrap", fontSize: 13, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 9, padding: 13 }}>
            {form.instruction}
          </div>
        </Sect>
      )}

      <Sect title="Budget">
        {form.budgetItems.filter((b) => parseFloat(b.amount)).map((b) => (
          <Row key={b.id} label={b.label} value={fmtVND(parseFloat(b.amount))} />
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 9 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.muted, letterSpacing: ".05em" }}>TOTAL</span>
          <span style={{ fontFamily: MONO, fontWeight: 800, color: T.accent }}>{fmtVND(budgetTotal(form))}</span>
        </div>
      </Sect>

      {role === "admin" && invPrice(form) > 0 && (
        <Sect title="Invoice price">
          <Row label="Charged to client" value={fmtUSD(invPrice(form))} />
          <Row label="Equivalent" value={fmtVND(invPrice(form) * rate)} />
        </Sect>
      )}
    </>
  );
}

/* ============================== settings ============================== */

function EditableList({ title, blurb, items, jobs, jobField, onChange, onRename, renderBadge }) {
  const T = useT();
  const [adding, setAdding] = useState("");
  const [editIdx, setEditIdx] = useState(-1);
  const [draft, setDraft] = useState("");

  const usage = (name) => jobs.filter((j) => j[jobField] === name).length;

  const commit = (i) => {
    const name = draft.trim();
    const old = items[i];
    if (!name || name === old) { setEditIdx(-1); return; }
    if (items.some((x, k) => k !== i && x === name)) { setEditIdx(-1); return; }
    onRename(old, name);
    setEditIdx(-1);
  };

  return (
    <Card>
      <div style={{ fontWeight: 650, marginBottom: 4 }}>{title}</div>
      <div style={{ color: T.muted, fontSize: 13, marginBottom: 12 }}>{blurb}</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
        {items.length === 0 && <div style={{ color: T.faint, fontSize: 13 }}>Nothing here yet.</div>}
        {items.map((name, i) => {
          const n = usage(name);
          return (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: i ? `1px solid ${T.border}` : "none" }}>
              {editIdx === i ? (
                <>
                  <TextInput
                    autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") commit(i); if (e.key === "Escape") setEditIdx(-1); }}
                  />
                  <Btn variant="primary" onClick={() => commit(i)} style={{ padding: "7px 11px" }}><Check size={14} /></Btn>
                  <Btn variant="subtle" onClick={() => setEditIdx(-1)} style={{ padding: 6 }}><X size={15} /></Btn>
                </>
              ) : (
                <>
                  <div style={{ flex: 1, minWidth: 0 }}>{renderBadge(name)}</div>
                  <span style={{ fontFamily: MONO, fontSize: 12, color: T.faint }}>{n} jobs</span>
                  <Btn variant="subtle" title="Rename" onClick={() => { setEditIdx(i); setDraft(name); }} style={{ padding: 5 }}>
                    <Pencil size={13} />
                  </Btn>
                  <Btn
                    variant="subtle" title={n ? "Used by jobs — rename instead" : "Remove"} disabled={!!n}
                    onClick={() => onChange(items.filter((x) => x !== name))} style={{ padding: 5 }}
                  >
                    <Trash2 size={13} />
                  </Btn>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <TextInput
          value={adding} onChange={(e) => setAdding(e.target.value)} placeholder="Add new"
          onKeyDown={(e) => {
            if (e.key === "Enter" && adding.trim() && !items.includes(adding.trim())) {
              onChange([...items, adding.trim()]); setAdding("");
            }
          }}
        />
        <Btn variant="primary" disabled={!adding.trim() || items.includes(adding.trim())}
          onClick={() => { onChange([...items, adding.trim()]); setAdding(""); }}>Add</Btn>
      </div>
    </Card>
  );
}

function RateList({ rates, onSave }) {
  const T = useT();
  const [adding, setAdding] = useState("");

  const upd = (i, patch) => onSave({ rates: rates.map((r, k) => (k === i ? { ...r, ...patch } : r)) });

  return (
    <Card>
      <div style={{ fontWeight: 650, marginBottom: 4 }}>Budget rate card</div>
      <div style={{ color: T.muted, fontSize: 13, marginBottom: 12 }}>
        Default pay per line item. Changing a price here only affects new budget lines — jobs already created keep what they were saved with.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 12 }}>
        {rates.map((r, i) => (
          <div key={r.label} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <TextInput value={r.label} onChange={(e) => upd(i, { label: e.target.value })} style={{ flex: 2 }} />
            <TextInput type="number" value={r.price} onChange={(e) => upd(i, { price: parseFloat(e.target.value) || 0 })} style={{ flex: 1 }} />
            <Btn variant="subtle" onClick={() => onSave({ rates: rates.filter((_, k) => k !== i) })} style={{ padding: 5 }}>
              <Trash2 size={13} />
            </Btn>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <TextInput value={adding} onChange={(e) => setAdding(e.target.value)} placeholder="Add a line item" />
        <Btn variant="primary" disabled={!adding.trim() || rates.some((r) => r.label === adding.trim())}
          onClick={() => { onSave({ rates: [...rates, { label: adding.trim(), price: 0 }] }); setAdding(""); }}>Add</Btn>
      </div>
    </Card>
  );
}

function parseDelimited(text) {
  const raw = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const head = raw.split("\n")[0] || "";
  const delim = (head.match(/\t/g) || []).length >= (head.match(/,/g) || []).length ? "\t" : ",";

  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (q) {
      if (c === '"') {
        if (raw[i + 1] === '"') { cell += '"'; i++; }
        else q = false;
      } else cell += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  row.push(cell);
  rows.push(row);
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const IMPORT_FIELDS = [
  { key: "skip", label: "— Skip —" },
  { key: "date", label: "Date" },
  { key: "client", label: "Client" },
  { key: "jobCode", label: "Job code" },
  { key: "jobName", label: "Job name" },
  { key: "csName", label: "CS name" },
  { key: "jobType", label: "Job type" },
  { key: "assignedEditor", label: "Editor" },
  { key: "status", label: "Status" },
  { key: "instruction", label: "Instruction" },
  { key: "inputLink", label: "Input link" },
  { key: "sampleLink", label: "Sample link" },
  { key: "musicLink", label: "Music link" },
  { key: "outputLink", label: "Output link" },
  { key: "outputVideo", label: "Output length" },
  { key: "videoNote", label: "Video note" },
  { key: "budget", label: "Budget (VNĐ)" },
  { key: "invoicePrice", label: "Invoice price (USD)" },
];

function guessField(header) {
  const h = header.toLowerCase().replace(/[^a-z0-9]/g, "");
  const map = [
    ["date", "date"], ["cus", "client"], ["client", "client"], ["khach", "client"],
    ["jobcode", "jobCode"], ["code", "jobCode"],
    ["csname", "csName"], ["jobtype", "jobType"], ["jobtypes", "jobType"],
    ["assignededit", "assignedEditor"], ["editor", "assignedEditor"], ["edit", "assignedEditor"],
    ["status", "status"], ["instruction", "instruction"], ["note", "videoNote"],
    ["input", "inputLink"], ["sample", "sampleLink"], ["music", "musicLink"], ["nhac", "musicLink"],
    ["output", "outputLink"], ["sloutputvideo", "outputVideo"],
    ["jobname", "jobName"], ["name", "jobName"],
    ["budget", "budget"], ["total", "budget"], ["price", "invoicePrice"], ["invoice", "invoicePrice"],
  ];
  for (const [needle, field] of map) if (h.includes(needle)) return field;
  return "skip";
}

const parseMoney = (v) => {
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? 0 : n;
};

function normalizeDate(v) {
  const s = String(v).trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  const d = new Date(s);
  return isNaN(d) ? "" : d.toISOString().slice(0, 10);
}

function ImportModal({ onClose, onImport, existingCodes, rates }) {
  const T = useT();
  const [text, setText] = useState("");
  const [hasHeader, setHasHeader] = useState(true);
  const [dayFirst, setDayFirst] = useState(false);
  const [map, setMap] = useState([]);
  const [step, setStep] = useState(1);

  const rows = useMemo(() => (text.trim() ? parseDelimited(text) : []), [text]);
  const header = hasHeader && rows.length ? rows[0] : [];
  const body = hasHeader ? rows.slice(1) : rows;

  const analyse = () => {
    const cols = Math.max(...rows.map((r) => r.length), 0);
    const guessed = Array.from({ length: cols }, (_, i) => (hasHeader ? guessField(header[i] || "") : "skip"));
    setMap(guessed);
    setStep(2);
  };

  const built = useMemo(() => {
    if (step < 2) return [];
    const out = [];
    const seen = new Set(existingCodes);
    body.forEach((r, ri) => {
      const j = { ...emptyJob(rates), budgetItems: [] };
      let budget = 0;
      map.forEach((field, ci) => {
        const v = (r[ci] ?? "").trim();
        if (!v || field === "skip") return;
        if (field === "budget") budget = parseMoney(v);
        else if (field === "invoicePrice") j.invoicePrice = String(parseMoney(v));
        else if (field === "date") {
          let s = v;
          if (dayFirst) {
            const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
            if (m) s = `${m[2]}/${m[1]}/${m[3]}`;
          }
          j.date = normalizeDate(s) || j.date;
        } else j[field] = v;
      });
      j.budgetItems = [{ id: nextId("b"), label: "Edit", amount: budget }];
      if (!j.jobCode) j.jobCode = `IMP-${Date.now().toString(36)}-${ri}`;
      if (!STATUSES.includes(j.status)) j.status = "Pending";
      const dup = seen.has(j.jobCode);
      seen.add(j.jobCode);
      out.push({ job: j, dup });
    });
    return out;
  }, [step, map, body, dayFirst, existingCodes, rates]);

  const fresh = built.filter((b) => !b.dup);
  const dups = built.length - fresh.length;
  const mapped = map.filter((m) => m !== "skip").length;

  return (
    <Modal
      title="Import jobs" icon={<Upload size={17} color={T.accent} />} onClose={onClose} width={860}
      footer={
        step === 1 ? (
          <>
            <Btn onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" disabled={!rows.length} onClick={analyse}>Continue · {rows.length} rows</Btn>
          </>
        ) : (
          <>
            <Btn onClick={() => setStep(1)}>Back</Btn>
            <div style={{ flex: 1 }} />
            <Btn variant="primary" disabled={!fresh.length} onClick={() => onImport(fresh.map((b) => b.job))}>
              Import {fresh.length} jobs
            </Btn>
          </>
        )
      }
    >
      {step === 1 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <div style={{ fontSize: 13, color: T.muted }}>
            In Google Sheets, select the rows you want, press Ctrl/Cmd+C, then paste into the box below. Nothing is saved until you confirm the column mapping on the next step.
          </div>
          <TextArea
            value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 220, fontFamily: MONO, fontSize: 12 }}
            placeholder={"DATE\tCUS\tJOB CODE\tINSTRUCTION\t...\n01/08/2026\tBrock\tMHAUG001\t..."}
          />
          <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13.5, cursor: "pointer" }}>
            <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} />
            First row is a header
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13.5, cursor: "pointer" }}>
            <input type="checkbox" checked={dayFirst} onChange={(e) => setDayFirst(e.target.checked)} />
            Dates are day/month/year (e.g. 04/07/2026 means 4 July)
          </label>
          {rows.length > 0 && (
            <div style={{ fontSize: 13, color: T.good }}>
              Found {rows.length} rows × {Math.max(...rows.map((r) => r.length))} columns.
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <div style={{ fontSize: 13, color: T.muted }}>
            Match each column to a field. Anything set to Skip is ignored.
          </div>
          <div className="vt-scroll" style={{ overflowX: "auto", border: `1px solid ${T.border}`, borderRadius: 10 }}>
            <table style={{ borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr>
                  {map.map((f, i) => (
                    <th key={i} style={{ padding: 8, borderBottom: `1px solid ${T.border}`, background: T.surface2, minWidth: 150 }}>
                      <Select value={f} onChange={(e) => setMap((m) => m.map((x, k) => (k === i ? e.target.value : x)))} style={{ fontSize: 12, padding: "6px 8px" }}>
                        {IMPORT_FIELDS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                      </Select>
                      {hasHeader && (
                        <div style={{ marginTop: 5, color: T.faint, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {header[i] || "(no header)"}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.slice(0, 4).map((r, ri) => (
                  <tr key={ri}>
                    {map.map((_, ci) => (
                      <td key={ci} style={{ padding: "7px 8px", borderTop: `1px solid ${T.border}`, color: T.muted, maxWidth: 190, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {(r[ci] ?? "").trim() || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 13 }}>
            <span><b style={{ fontFamily: MONO }}>{fresh.length}</b> jobs ready</span>
            <span style={{ color: T.muted }}><b style={{ fontFamily: MONO }}>{mapped}</b> columns mapped</span>
            {dups > 0 && <span style={{ color: T.warn }}><b style={{ fontFamily: MONO }}>{dups}</b> skipped — job code already exists</span>}
          </div>

          {mapped === 0 && (
            <div style={{ fontSize: 13, color: T.warn, display: "flex", gap: 7, alignItems: "center" }}>
              <AlertTriangle size={14} /> Map at least one column before importing.
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function SettingsView({ config, onSave, jobs, onRenameAcross, onImport }) {
  const T = useT();
  const [rate, setRate] = useState(String(config.exchangeRate));
  const [saved, setSaved] = useState(false);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 12, alignItems: "start" }}>
      <Card>
        <div style={{ fontWeight: 650, marginBottom: 4 }}>PayPal exchange rate</div>
        <div style={{ color: T.muted, fontSize: 13, marginBottom: 12 }}>
          Converts USD to VNĐ across the app. Invoices keep the rate they were created with, so past totals never shift.
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <Field label="1 USD ="><TextInput type="number" value={rate} onChange={(e) => setRate(e.target.value)} /></Field>
          <Btn variant="primary" onClick={async () => { await onSave({ exchangeRate: parseFloat(rate) || 0 }); setSaved(true); setTimeout(() => setSaved(false), 1500); }}>
            {saved ? <Check size={14} /> : null} {saved ? "Saved" : "Save rate"}
          </Btn>
        </div>
        <div style={{ marginTop: 10, fontFamily: MONO, fontSize: 12.5, color: T.muted }}>
          $1 = {(parseFloat(rate) || 0).toLocaleString("vi-VN")}₫
        </div>
      </Card>

      <Card>
        <div style={{ fontWeight: 650, marginBottom: 4 }}>Import from Google Sheets</div>
        <div style={{ color: T.muted, fontSize: 13, marginBottom: 12 }}>
          Select the rows in your sheet, copy them, and paste here. You choose which column maps to which field before anything is saved.
        </div>
        <Btn variant="primary" onClick={onImport}><Upload size={14} /> Import jobs</Btn>
      </Card>

      <EditableList
        title="Clients" blurb="Shown as a dropdown when creating a job. Renaming updates every job that uses the old name."
        items={config.clients} jobs={jobs} jobField="client"
        onChange={(clients) => onSave({ clients })}
        onRename={(from, to) => onRenameAcross("client", from, to)}
        renderBadge={(n) => <ClientBadge name={n} />}
      />

      <EditableList
        title="Editors" blurb="Who jobs can be assigned to. Renaming updates every job assigned to the old name."
        items={config.editors} jobs={jobs} jobField="assignedEditor"
        onChange={(editors) => onSave({ editors })}
        onRename={(from, to) => onRenameAcross("assignedEditor", from, to)}
        renderBadge={(n) => (
          <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}><Avatar name={n} size={24} />{n}</span>
        )}
      />

      <RateList rates={config.rates} onSave={onSave} />
    </div>
  );
}