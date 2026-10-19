import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Copy,
  Download,
  FlaskConical,
  History,
  LayoutDashboard,
  ListFilter,
  Loader2,
  Pause,
  Play,
  Plus,
  Radio,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  X,
  RefreshCw,
} from "lucide-react";
import type { Bar, Condition, Rule, TriggerEvent } from "./types";
import { generateBars, instruments, seedRules } from "./fixtures";
import {
  fetchLiveInstruments,
  fetchLiveBars,
  fetchLiveCurve,
  type LiveInstrument,
  type LiveCurve,
} from "./api";
import { replay, summarize } from "./domain";
import { evaluateDemoStep } from "./monitor";
import PriceChart from "./PriceChart";
import RuleEditor, { makeRule } from "./RuleEditor";
import ReplayDialog, { type StoredRun } from "./ReplayDialog";
import { Empty, Modal, money, timestamp } from "./ui";
const OptionsLab = lazy(() => import("./OptionsLab"));
type View = "market" | "rules" | "options" | "history";
type Store = {
  schema: number;
  revision: number;
  rules: Rule[];
  events: TriggerEvent[];
  runs: StoredRun[];
  recovery?: string;
  monitorStarts?: Record<string, number>;
  demoCursor?: number;
  monitorLast?: Record<string, number>;
};
const KEY = "algo-triggers-demo-v1";
const latest = (rules: Rule[]) =>
  Array.from(
    rules
      .reduce((map, rule) => {
        if ((map.get(rule.id)?.version ?? 0) < rule.version)
          map.set(rule.id, rule);
        return map;
      }, new Map<string, Rule>())
      .values(),
  );
const isView = (v: string | null): v is View =>
  ["market", "rules", "options", "history"].includes(v ?? "");
function readStore(): Store {
  let recovery: string | undefined;
  try {
    const text = localStorage.getItem(KEY);
    if (text) {
      const saved = JSON.parse(text);
      if (
        saved.schema === 1 &&
        Array.isArray(saved.rules) &&
        Number.isFinite(saved.revision) &&
        saved.rules.every(validRule) &&
        Array.isArray(saved.events) &&
        saved.events.every(validEvent) &&
        Array.isArray(saved.runs) &&
        saved.runs.every(
          (run: StoredRun) =>
            run &&
            typeof run.id === "string" &&
            validRule(run.rule) &&
            ["5m", "15m", "1h"].includes(run.timeframe) &&
            run.result &&
            Array.isArray(run.result.events) &&
            run.result.events.every(validEvent) &&
            Number.isFinite(run.result.eligibleBars) &&
            Number.isFinite(run.result.triggerPeriodPct),
        ) &&
        (saved.demoCursor === undefined ||
          (Number.isInteger(saved.demoCursor) &&
            saved.demoCursor >= 600 &&
            saved.demoCursor <= 719))
      )
        return saved;
      recovery =
        "Saved data has an incompatible format. Reset local demo data to recover a writable sample workspace.";
    }
  } catch {
    recovery =
      "Saved browser data could not be read. Reset local demo data to recover. The sample view remains available.";
  }
  return {
    schema: 1,
    revision: 0,
    rules: structuredClone(seedRules),
    events: seedRules
      .flatMap(
        (rule) => replay(rule, generateBars(rule.instrument, "5m")).events,
      )
      .sort((a, b) => b.time - a.time)
      .slice(0, 12),
    runs: [],
    recovery,
  };
}
function validRule(r: Rule) {
  return (
    r &&
    typeof r.id === "string" &&
    typeof r.name === "string" &&
    Number.isInteger(r.version) &&
    r.version > 0 &&
    instruments.some((i) => i.id === r.instrument) &&
    ["AND", "OR"].includes(r.join) &&
    ["crossing", "bar", "once"].includes(r.frequency) &&
    ["draft", "monitoring", "paused"].includes(r.status) &&
    Number.isFinite(r.cooldownMinutes) &&
    r.cooldownMinutes >= 0 &&
    (r.timeframe === undefined || ["5m", "15m", "1h"].includes(r.timeframe)) &&
    Array.isArray(r.conditions) &&
    r.conditions.length > 0 &&
    r.conditions.every(
      (c) =>
        c &&
        typeof c.id === "string" &&
        [
          "price",
          "percent_change",
          "sma_cross",
          "ema_cross",
          "option_premium",
        ].includes(c.metric) &&
        ["above", "below", "crosses_above", "crosses_below"].includes(
          c.operator,
        ) &&
        Number.isFinite(c.threshold) &&
        Number.isInteger(c.period) &&
        c.period > 0 &&
        Number.isInteger(c.slowPeriod) &&
        c.slowPeriod > 0 &&
        Number.isInteger(c.windowBars) &&
        c.windowBars > 0,
    )
  );
}
function validEvent(event: TriggerEvent) {
  return (
    event &&
    typeof event.id === "string" &&
    typeof event.ruleName === "string" &&
    typeof event.ruleId === "string" &&
    Number.isFinite(event.ruleVersion) &&
    Number.isFinite(event.time) &&
    Number.isFinite(event.price) &&
    instruments.some((i) => i.id === event.instrument) &&
    ["demo", "historical"].includes(event.mode) &&
    Array.isArray(event.diagnostics) &&
    event.diagnostics.every(
      (d) =>
        d &&
        typeof d.label === "string" &&
        (d.actual === null || Number.isFinite(d.actual)) &&
        (d.reference === null || Number.isFinite(d.reference)) &&
        [true, false, null].includes(d.met),
    )
  );
}
const names: Record<View, string> = {
  market: "Market explorer",
  rules: "Rules & alerts",
  options: "Options lab",
  history: "Event history",
};
export default function App() {
  const [store, setStore] = useState<Store>(readStore);
  const storeRef = useRef(store);
  storeRef.current = store;
  const [view, setView] = useState<View>(() => {
    const v = new URLSearchParams(location.search).get("view");
    return isView(v) ? v : "market";
  });
  const [instrument, setInstrument] = useState("brent-dec26");
  const [timeframe, setTimeframe] = useState<"5m" | "15m" | "1h">("5m");
  const [chartTab, setChartTab] = useState<"price" | "curve">("price");
  const [chartKind, setChartKind] = useState<"candles" | "line">("candles");
  const [range, setRange] = useState("5D");
  const [editor, setEditor] = useState<Rule | null>(null);
  const [testRule, setTestRule] = useState<Rule | null>(null);
  const [detail, setDetail] = useState<TriggerEvent | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<TriggerEvent | null>(null);
  const [notice, setNotice] = useState("");
  const [storageError, setStorageError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [help, setHelp] = useState(false);
  const [settings, setSettings] = useState(false);
  const [reset, setReset] = useState(false);
  const [query, setQuery] = useState(
    () => new URLSearchParams(location.search).get("q") ?? "",
  );
  const [ruleFilter, setRuleFilter] = useState("all");
  const [eventMode, setEventMode] = useState("all");
  const [page, setPage] = useState(1);
  const [health, setHealth] = useState<"healthy" | "stale" | "unavailable">(
    "healthy",
  );
  const [demoIndex, setDemoIndex] = useState(store.demoCursor ?? 600);
  const [curveNear, setCurveNear] = useState("brent-dec26");
  const [curveFar, setCurveFar] = useState("brent-feb27");
  const [versionRule, setVersionRule] = useState<Rule | null>(null);
  const [savedRun, setSavedRun] = useState<StoredRun | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const rules = useMemo(() => latest(store.rules), [store.rules]);

  // Live Yahoo Finance data state
  const [liveInstruments, setLiveInstruments] = useState<LiveInstrument[]>([]);
  const [liveBars, setLiveBars] = useState<Bar[]>(() =>
    generateBars(instrument, timeframe),
  );
  const [isLiveLoading, setIsLiveLoading] = useState(false);
  const [liveConnected, setLiveConnected] = useState(true);
  const [lastLiveUpdate, setLastLiveUpdate] = useState<Date>(new Date());
  const [liveCurveData, setLiveCurveData] = useState<LiveCurve | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadInst = async () => {
      const list = await fetchLiveInstruments();
      if (mounted && list.length > 0) {
        setLiveInstruments(list);
      }
    };
    loadInst();
    const timer = setInterval(loadInst, 20000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const reloadLiveBars = useCallback(
    async (showLoading = true) => {
      if (showLoading) setIsLiveLoading(true);
      try {
        const data = await fetchLiveBars(instrument, timeframe, range);
        if (data && data.length > 0) {
          setLiveBars(data);
          setLiveConnected(true);
          setLastLiveUpdate(new Date());
        }
      } catch (err) {
        console.warn("[Live Bars Error]:", err);
        setLiveConnected(false);
      } finally {
        if (showLoading) setIsLiveLoading(false);
      }
    },
    [instrument, timeframe, range],
  );

  useEffect(() => {
    reloadLiveBars(true);
    const timer = setInterval(() => {
      reloadLiveBars(false);
    }, 15000);
    return () => clearInterval(timer);
  }, [reloadLiveBars]);

  useEffect(() => {
    if (chartTab === "curve") {
      fetchLiveCurve().then((c) => {
        if (c) setLiveCurveData(c);
      });
    }
  }, [chartTab]);

  const bars = liveBars;
  const visibleBars = useMemo(
    () => (range === "1D" ? bars.slice(-Math.floor(bars.length / 5)) : bars),
    [bars, range],
  );
  const last = bars.at(-1) ?? {
    time: Date.now(),
    open: 109.3,
    high: 109.3,
    low: 109.3,
    close: 109.3,
    volume: 0,
  };
  const first = bars[0] ?? last;
  const change = last.close - first.close;
  const currentLiveMeta = liveInstruments.find((i) => i.id === instrument);
  const instrumentLabel =
    currentLiveMeta?.label ??
    instruments.find((i) => i.id === instrument)?.label ??
    instrument;
  const filteredRules = rules.filter(
    (r) =>
      (ruleFilter === "all" || r.status === ruleFilter) &&
      (r.name + " " + summarize(r)).toLowerCase().includes(query.toLowerCase()),
  );
  const filteredEvents = store.events
    .filter(
      (e) =>
        (eventMode === "all" || e.mode === eventMode) &&
        (e.ruleName + " " + e.instrument)
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => b.time - a.time);
  const activeCount = rules.filter((r) => r.status === "monitoring").length;
  const selectedRule = selectedEvent
    ? store.rules.find(
        (r) =>
          r.id === selectedEvent.ruleId &&
          r.version === selectedEvent.ruleVersion,
      )
    : undefined;
  function commit(next: Store) {
    if (store.recovery) {
      setStorageError(store.recovery);
      return false;
    }
    if (conflict) {
      setStorageError(
        "Another tab changed this workspace. Reload before saving.",
      );
      return false;
    }
    try {
      const currentText = localStorage.getItem(KEY);
      if (
        currentText &&
        JSON.parse(currentText).revision !== storeRef.current.revision
      ) {
        setConflict(true);
        setStorageError(
          "Another tab has newer saved data. Reload before making changes.",
        );
        return false;
      }
      const updated = { ...next, revision: storeRef.current.revision + 1 };
      localStorage.setItem(KEY, JSON.stringify(updated));
      storeRef.current = updated;
      setStore(updated);
      setStorageError("");
      return true;
    } catch {
      setStorageError(
        "Browser storage is unavailable or full. Changes were not saved. Keep your draft open and retry after enabling storage.",
      );
      return false;
    }
  }
  const navigate = useCallback((next: View) => {
    setView(next);
    setPage(1);
    setQuery("");
    const url = new URL(location.href);
    url.searchParams.set("view", next);
    url.searchParams.delete("q");
    history.pushState({}, "", url);
  }, []);
  useEffect(() => {
    document.title = `${names[view]} · Algo Triggers`;
  }, [view]);
  useEffect(() => {
    const listener = () => {
      const v = new URLSearchParams(location.search).get("view");
      setView(isView(v) ? v : "market");
      setQuery(new URLSearchParams(location.search).get("q") ?? "");
      setPage(1);
    };
    window.addEventListener("popstate", listener);
    const storage = (e: StorageEvent) => {
      if (e.key === KEY) setConflict(true);
    };
    window.addEventListener("storage", storage);
    return () => {
      window.removeEventListener("popstate", listener);
      window.removeEventListener("storage", storage);
    };
  }, []);
  function search(value: string) {
    setQuery(value);
    setPage(1);
    const url = new URL(location.href);
    if (value) url.searchParams.set("q", value);
    else url.searchParams.delete("q");
    history.replaceState({}, "", url);
  }
  const inspect = useCallback((event: TriggerEvent) => setDetail(event), []);
  function create(partial: Partial<Rule> = {}) {
    setEditor(makeRule(instrument, { timeframe, ...partial }));
  }
  function chartRule(condition: Partial<Condition>) {
    create({
      name:
        condition.metric === "price"
          ? "Brent price level"
          : "Brent moving-average crossover",
      conditions: [
        {
          id: crypto.randomUUID(),
          metric: "price",
          operator: "crosses_above",
          threshold: last.close,
          period: 20,
          slowPeriod: 50,
          windowBars: 12,
          ...condition,
        },
      ],
    });
  }
  function saveRule(rule: Rule) {
    if (commit({ ...store, rules: [...store.rules, structuredClone(rule)] })) {
      setEditor(null);
      navigate("rules");
      setNotice(
        `Saved ${rule.name} · version ${rule.version} in this browser.`,
      );
      return true;
    }
    return false;
  }
  function status(rule: Rule) {
    const next = rule.status === "monitoring" ? "paused" : "monitoring";
    if (
      next === "monitoring" &&
      rule.frequency === "once" &&
      store.monitorLast?.[`${rule.id}:${rule.version}`] !== undefined
    ) {
      setNotice(
        "This one-shot rule already fired. Duplicate it or save a new version to explicitly start another one-shot.",
      );
      return;
    }
    if (rule.conditions.some((c) => c.metric === "option_premium")) {
      setNotice(
        "Option monitoring needs an option quote stream. The saved draft is preserved.",
      );
      return;
    }
    if (
      commit({
        ...store,
        monitorStarts: {
          ...store.monitorStarts,
          [`${rule.id}:${rule.version}`]: generateBars(rule.instrument, "5m")[
            demoIndex
          ].time,
        },
        rules: store.rules.map((r) =>
          r.id === rule.id && r.version === rule.version
            ? { ...r, status: next }
            : r,
        ),
      })
    )
      setNotice(
        next === "monitoring"
          ? "Demo monitoring started. Advance demo bars to evaluate it; closing this browser stops the demo."
          : "Demo monitoring paused.",
      );
  }
  function duplicate(rule: Rule) {
    create({
      ...structuredClone(rule),
      id: crypto.randomUUID(),
      version: 1,
      name: `${rule.name} copy`,
      status: "draft",
    });
  }
  function advance() {
    if (health !== "healthy") return;
    const starts = { ...store.monitorStarts };
    rules.forEach((r) => {
      const key = `${r.id}:${r.version}`,
        last = store.monitorLast?.[key];
      if (last !== undefined)
        starts[key] = Math.max(
          starts[key] ?? 0,
          last + r.cooldownMinutes * 60000,
        );
    });
    let newEvents = evaluateDemoStep(
      rules.filter(
        (r) =>
          !(
            r.frequency === "once" &&
            store.monitorLast?.[`${r.id}:${r.version}`] !== undefined
          ),
      ),
      generateBars(instrument, "5m")[demoIndex].time,
      starts,
    );
    newEvents = newEvents.filter(
      (e) => !store.events.some((old) => old.id === e.id),
    );
    if (
      commit({
        ...store,
        events: [...newEvents, ...store.events].slice(0, 500),
        demoCursor: demoIndex >= 719 ? 600 : demoIndex + 1,
        monitorLast: {
          ...store.monitorLast,
          ...Object.fromEntries(
            newEvents.map((e) => [`${e.ruleId}:${e.ruleVersion}`, e.time]),
          ),
        },
      })
    ) {
      setDemoIndex((i) => (i >= 719 ? 600 : i + 1));
      setNotice(
        `${newEvents.length ? `${newEvents.length} demo event recorded` : "No new crossing"} at ${timestamp(generateBars(instrument, "5m")[demoIndex].time)} UTC. This is a manually stepped sample, not a live feed.`,
      );
    }
  }
  function onComplete(run: StoredRun) {
    if (
      commit({
        ...store,
        runs: [run, ...store.runs].slice(0, 20),
        events: [...run.result.events, ...store.events]
          .filter((e, i, all) => all.findIndex((x) => x.id === e.id) === i)
          .slice(0, 500),
      })
    ) {
      setNotice(
        `Replay complete: ${run.result.events.length} historical triggers. Report saved locally.`,
      );
      return true;
    }
    return false;
  }
  function exportCsv() {
    const data = [
      "timestamp_utc,open,high,low,close,volume",
      ...visibleBars.map((b) =>
        [
          new Date(b.time).toISOString(),
          b.open,
          b.high,
          b.low,
          b.close,
          b.volume,
        ].join(","),
      ),
    ].join("\n");
    const link = document.createElement("a");
    const url = URL.createObjectURL(new Blob([data], { type: "text/csv" }));
    link.href = url;
    link.download = `algo-triggers-synthetic-${instrument}-${timeframe}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Synthetic chart bars exported as CSV.");
  }
  const setViewLink = (target: View) => ({
    href: `?view=${target}`,
    onClick: (e: React.MouseEvent) => {
      e.preventDefault();
      navigate(target);
    },
    "aria-current": view === target ? ("page" as const) : undefined,
  });
  function renderRuleRows(compact = false) {
    const rows = compact
      ? rules.slice(0, 3)
      : filteredRules.slice((page - 1) * 6, page * 6);
    return rows.length ? (
      <div className="table-wrap">
        <table className="rules-table">
          <caption className="sr-only">
            Saved rule versions and demo monitoring status
          </caption>
          <thead>
            <tr>
              <th>Rule & condition</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((rule) => (
              <tr key={rule.id}>
                <td>
                  <button
                    className="rule-name"
                    onClick={() => setVersionRule(rule)}
                  >
                    {rule.name}
                    <span>v{rule.version}</span>
                  </button>
                  <p className="rule-summary">{summarize(rule)}</p>
                  <span className="table-meta">
                    {instruments.find((i) => i.id === rule.instrument)?.short} ·{" "}
                    {rule.timeframe ?? "5m"} · {rule.cooldownMinutes}m cooldown
                  </span>
                </td>
                <td>
                  <span
                    className={`badge ${rule.status === "monitoring" ? "badge-green" : rule.status === "paused" ? "badge-amber" : ""}`}
                  >
                    <span
                      className={`dot ${rule.status === "monitoring" ? "green" : "gray"}`}
                    />
                    {rule.status === "monitoring"
                      ? "Demo monitoring"
                      : rule.status === "paused"
                        ? "Paused"
                        : "Draft"}
                  </span>
                </td>
                <td>
                  <div className="row-actions">
                    <button
                      className="icon-button"
                      aria-label={`Run replay for ${rule.name}`}
                      onClick={() => setTestRule(rule)}
                      title="Run replay"
                    >
                      <Play size={15} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`${rule.status === "monitoring" ? "Pause" : "Start demo monitoring for"} ${rule.name}`}
                      onClick={() => status(rule)}
                      title={
                        rule.status === "monitoring"
                          ? "Pause"
                          : "Start demo monitoring"
                      }
                    >
                      {rule.status === "monitoring" ? (
                        <Pause size={15} />
                      ) : (
                        <Radio size={15} />
                      )}
                    </button>
                    {!compact && (
                      <>
                        <button
                          className="icon-button"
                          aria-label={`Edit ${rule.name}`}
                          title="Edit as new version"
                          onClick={() =>
                            setEditor({
                              ...structuredClone(rule),
                              version: rule.version + 1,
                              status: "draft",
                              createdAt: new Date().toISOString(),
                            })
                          }
                        >
                          <SlidersHorizontal size={15} />
                        </button>
                        <button
                          className="icon-button"
                          title="Duplicate"
                          aria-label={`Duplicate ${rule.name}`}
                          onClick={() => duplicate(rule)}
                        >
                          <Copy size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <Empty title="No matching rules">
        Clear the search or create a rule to start testing an idea.
      </Empty>
    );
  }
  function renderEventList(compact = false) {
    const events = compact
      ? filteredEvents.slice(0, 4)
      : filteredEvents.slice((page - 1) * 8, page * 8);
    return events.length ? (
      <div className="event-list">
        {events.map((event) => (
          <button
            key={event.id}
            className="event-item"
            onClick={() => inspect(event)}
          >
            <span className="event-icon">
              <Activity size={15} />
            </span>
            <span>
              <strong>{event.ruleName}</strong>
              <span className="event-description">
                {event.mode === "historical"
                  ? "Historical replay"
                  : "Manual demo"}{" "}
                · v{event.ruleVersion} · ${money(event.price)}/bbl
              </span>
            </span>
            <span className="event-time">
              {timestamp(event.time)}
              <ArrowUpRight size={14} />
            </span>
          </button>
        ))}
      </div>
    ) : (
      <Empty title="No events to show">
        Run a replay or step an active demo rule to inspect its evidence.
      </Empty>
    );
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to workspace
      </a>
      <aside className="sidebar">
        <a className="brand" {...setViewLink("market")}>
          <span className="brand-symbol">
            <i />
            <i />
            <i />
          </span>
          <span>
            algo<span className="brand-light">triggers</span>
            <small>RESEARCH TERMINAL</small>
          </span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          <a {...setViewLink("market")}>
            <LayoutDashboard size={18} />
            Market explorer
          </a>
          <a {...setViewLink("rules")}>
            <SlidersHorizontal size={18} />
            Rules & alerts<span className="nav-count">{rules.length}</span>
          </a>
          <a {...setViewLink("options")}>
            <FlaskConical size={18} />
            Options lab
          </a>
          <a {...setViewLink("history")}>
            <History size={18} />
            Event history
          </a>
        </nav>
        <div className="sidebar-divider" />
        <div className="workspace-label secondary-label">YOUR RESEARCH</div>
        <div className="research-card">
          <span className="dot lavender" />
          <span>
            Brent crude oil<small>Futures & options</small>
          </span>
        </div>
        <div className="sidebar-bottom">
          <div className="demo-side">
            <span className="demo-orbit" style={{ background: "rgba(8,125,104,0.18)", color: "#087d68" }}>
              <Activity size={18} />
            </span>
            <strong>Live Yahoo Finance Feed</strong>
            <p>Connected to NYMEX/ICE live Brent & WTI quotes, curve and options chain.</p>
            <span className="side-demo-badge" style={{ background: "rgba(8,125,104,0.22)", color: "#087d68" }}>
              LIVE MARKET FEED
            </span>
          </div>
          <button onClick={() => setHelp(true)} className="sidebar-help">
            <CircleHelp size={17} />
            Workspace guide <ArrowUpRight size={14} />
          </button>
          <div className="user-chip">
            <span>AS</span>
            <div>
              Analyst workspace<small>Saved on this browser</small>
            </div>
            <button
              className="icon-button"
              aria-label="Workspace settings"
              onClick={() => setSettings(true)}
            >
              <Settings2 size={16} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-crumb">
            <span>Research workspace</span>
            <ChevronRight size={13} />
            <strong>Brent crude</strong>
          </div>
          <div className="topbar-right">
            <span
              className="demo-top"
              style={{
                color: liveConnected ? "#087d68" : "#c4962e",
                background: liveConnected ? "rgba(8,125,104,0.1)" : "rgba(196,150,46,0.1)",
                padding: "4px 9px",
                borderRadius: "6px",
                fontWeight: 600,
              }}
            >
              <span className={`dot ${liveConnected ? "green" : "amber"}`} />
              {liveConnected ? "Live Yahoo Finance (BZ=F)" : "Offline fallback"}
            </span>
            <span className="topbar-time">
              {new Date().toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}{" "}
              · Live
            </span>
            <button
              className="icon-button mobile-settings"
              aria-label="Workspace settings"
              onClick={() => setSettings(true)}
            >
              <Settings2 size={17} />
            </button>
            <button
              className="icon-button"
              aria-label="Open event history"
              onClick={() => navigate("history")}
            >
              <Bell size={18} />
              <span className="notification-dot" />
            </button>
          </div>
        </header>
        <main id="main-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">ICE BRENT · RESEARCH DEMO</div>
              <h1>
                {names[view]}
                <span className="heading-dot">.</span>
              </h1>
              <p>
                {view === "market"
                  ? "Explore the market. Find a pattern. Make it a rule."
                  : view === "rules"
                    ? "Turn an observation into a precise, testable signal."
                    : view === "options"
                      ? "See the structure behind premiums, exposures and volatility."
                      : "Every signal has a story. Inspect the values behind it."}
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => create()}>
              <Plus size={17} />
              Create rule
            </button>
          </div>
          {conflict && (
            <div className="error-message" role="alert">
              This workspace changed in another tab. Your current inputs are
              preserved.{" "}
              <button className="text-button" onClick={() => location.reload()}>
                Reload saved workspace
              </button>
            </div>
          )}
          {storageError && (
            <div className="error-message" role="alert">
              {storageError}
            </div>
          )}
          {store.recovery && (
            <div className="error-message" role="alert">
              {store.recovery}{" "}
              <button className="text-button" onClick={() => setReset(true)}>
                Reset local demo data
              </button>
            </div>
          )}
          <div className="status-region" role="status" aria-live="polite">
            {notice && (
              <>
                <Check size={15} />
                <span>{notice}</span>
                <button
                  className="icon-button"
                  aria-label="Dismiss status"
                  onClick={() => setNotice("")}
                >
                  <X size={14} />
                </button>
              </>
            )}
          </div>
          {view === "market" && (
            <>
              <div className="quote-strip">
                <div className="quote-primary">
                  <span className="quote-label">
                    <span className="contract-icon">B</span>
                    {instrumentLabel}
                    <span className="badge">Futures</span>
                  </span>
                  <div className="quote-value">
                    ${money(last.close)}
                    <small>USD/bbl</small>
                    <span className={change >= 0 ? "up" : "down"}>
                      {change >= 0 ? (
                        <ArrowUpRight size={16} />
                      ) : (
                        <ArrowDownRight size={16} />
                      )}{" "}
                      {change >= 0 ? "+" : ""}
                      {change.toFixed(2)}{" "}
                      <small>
                        ({((change / first.close) * 100).toFixed(2)}%)
                      </small>
                    </span>
                  </div>
                </div>
                <div className="quote-detail">
                  <span>5-day high</span>
                  <strong>{money(Math.max(...bars.map((b) => b.high)))}</strong>
                </div>
                <div className="quote-detail">
                  <span>5-day low</span>
                  <strong>{money(Math.min(...bars.map((b) => b.low)))}</strong>
                </div>
                <div className="quote-detail quote-health">
                  <span>Data source</span>
                  <strong>
                    <span className={`dot ${liveConnected ? "green" : "amber"}`} />
                    {liveConnected ? "Yahoo Finance Live" : "Cached fallback"}
                  </strong>
                  <small>
                    {currentLiveMeta?.symbol ?? "BZ=F"} · {timestamp(last.time)} UTC
                  </small>
                </div>
              </div>
              <div className="market-grid">
                <section className="panel market-panel">
                  <div className="panel-heading">
                    <div className="view-switch" aria-label="Market view">
                      <button
                        aria-pressed={chartTab === "price"}
                        onClick={() => setChartTab("price")}
                        className={chartTab === "price" ? "active" : ""}
                      >
                        Price chart
                      </button>
                      <button
                        aria-pressed={chartTab === "curve"}
                        onClick={() => setChartTab("curve")}
                        className={chartTab === "curve" ? "active" : ""}
                      >
                        Futures curve
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <button
                        className="icon-button"
                        onClick={() => reloadLiveBars(true)}
                        aria-label="Refresh live data"
                        title="Refresh live data from Yahoo Finance"
                      >
                        <RefreshCw size={16} className={isLiveLoading ? "spinner" : ""} />
                      </button>
                      <button
                        className="icon-button"
                        onClick={exportCsv}
                        aria-label="Export chart data"
                      >
                        <Download size={17} />
                      </button>
                    </div>
                  </div>
                  <div className="market-controls">
                    <label className="sr-only" htmlFor="instrument">
                      Futures contract
                    </label>
                    <select
                      id="instrument"
                      value={instrument}
                      onChange={(e) => {
                        setInstrument(e.target.value);
                        setSelectedEvent(null);
                      }}
                    >
                      {instruments.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.label}
                        </option>
                      ))}
                    </select>
                    <div className="segmented" aria-label="Chart timeframe">
                      {(["5m", "15m", "1h"] as const).map((t) => (
                        <button
                          aria-pressed={timeframe === t}
                          key={t}
                          onClick={() => {
                            setTimeframe(t);
                            setSelectedEvent(null);
                          }}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <label className="sr-only" htmlFor="chart-kind">
                      Price display
                    </label>
                    <select
                      id="chart-kind"
                      value={chartKind}
                      onChange={(e) =>
                        setChartKind(e.target.value as "candles" | "line")
                      }
                    >
                      <option value="candles">Candlesticks</option>
                      <option value="line">Line</option>
                    </select>
                    <div className="range-controls">
                      {["1D", "5D"].map((r) => (
                        <button
                          className={range === r ? "selected" : ""}
                          aria-pressed={range === r}
                          onClick={() => setRange(r)}
                          key={r}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                  {health !== "healthy" ? (
                    <Empty
                      title={
                        health === "stale"
                          ? "Quotes are stale"
                          : "Market data unavailable"
                      }
                    >
                      {health === "stale"
                        ? "This demonstration state pauses new evaluations. No stale values are treated as current."
                        : "The sample data view is disabled. Choose Healthy in workspace settings to restore it."}
                      <button
                        className="btn btn-outline"
                        onClick={() => setHealth("healthy")}
                      >
                        Restore demo data
                      </button>
                    </Empty>
                  ) : chartTab === "price" ? (
                    <PriceChart
                      bars={visibleBars}
                      allBars={bars}
                      events={store.events.filter(
                        (e) =>
                          e.instrument === instrument &&
                          (e.timeframe ?? "5m") === timeframe,
                      )}
                      key={selectedEvent?.id ?? instrument}
                      threshold={
                        selectedEvent
                          ? selectedRule?.conditions.find(
                              (c) => c.metric === "price",
                            )?.threshold
                          : 82.5
                      }
                      ruleCondition={selectedRule?.conditions.find(
                        (c) =>
                          c.metric === "sma_cross" || c.metric === "ema_cross",
                      )}
                      selectedEvent={selectedEvent}
                      onEvent={inspect}
                      onCreate={chartRule}
                      kind={chartKind}
                    />
                  ) : (
                    <Curve
                      near={curveNear}
                      far={curveFar}
                      setNear={setCurveNear}
                      setFar={setCurveFar}
                      liveInstruments={liveInstruments}
                      onContract={(id) => {
                        setInstrument(id);
                        setChartTab("price");
                      }}
                    />
                  )}
                </section>
                <aside className="signal-column">
                  <section className="signal-card">
                    <div className="signal-card-icon">
                      <Sparkles size={21} />
                    </div>
                    <span className="eyebrow">FROM INSIGHT TO SIGNAL</span>
                    <h2>
                      A market move.
                      <br />
                      Your next rule.
                    </h2>
                    <p>
                      Give your idea a clear condition. We’ll help you test when
                      it would have happened.
                    </p>
                    <div className="example-rule">
                      <span className="rule-keyword">IF</span>
                      <span>
                        Brent crosses above
                        <br />
                        <strong>
                          $82.50 <small>/bbl</small>
                        </strong>
                      </span>
                      <span className="rule-keyword then">THEN</span>
                      <span>Record an alert</span>
                    </div>
                    <button
                      className="btn btn-primary full"
                      onClick={() => create()}
                    >
                      Build a rule <ArrowRight size={16} />
                    </button>
                    <span className="signal-note">
                      No code. No automatic trades.
                    </span>
                  </section>
                  <section className="monitor-card">
                    <div>
                      <span className="monitor-icon">
                        <Radio size={18} />
                      </span>
                      <strong>{activeCount} demo rules enabled</strong>
                    </div>
                    <p>
                      Step through a sample bar and inspect what your rules
                      detect.
                    </p>
                    <button
                      className="text-button"
                      onClick={advance}
                      disabled={!activeCount || health !== "healthy"}
                    >
                      Advance demo bar <ArrowRight size={14} />
                    </button>
                    <small>Manual playback · browser only</small>
                  </section>
                </aside>
              </div>
              <div className="bottom-grid">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>
                        Saved rules{" "}
                        <span className="count-label">{rules.length}</span>
                      </h2>
                      <p>Your ideas, ready to test.</p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => navigate("rules")}
                    >
                      View all <ArrowRight size={14} />
                    </button>
                  </div>
                  {renderRuleRows(true)}
                </section>
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Recent signals</h2>
                      <p>Historical evidence from sample data.</p>
                    </div>
                    <button
                      className="icon-button"
                      aria-label="View all event history"
                      onClick={() => navigate("history")}
                    >
                      <ArrowUpRight size={18} />
                    </button>
                  </div>
                  {renderEventList(true)}
                </section>
              </div>
            </>
          )}
          {view === "rules" && (
            <>
              <div className="research-summary">
                <div>
                  <span className="small muted">YOUR SIGNAL LIBRARY</span>
                  <strong>
                    {rules.length}
                    <small>saved rules</small>
                  </strong>
                </div>
                <div>
                  <span className="small muted">MANUAL DEMO</span>
                  <strong>
                    {activeCount}
                    <small>enabled</small>
                  </strong>
                </div>
                <div>
                  <span className="small muted">RESEARCH EVIDENCE</span>
                  <strong>
                    {store.runs.length}
                    <small>saved replays</small>
                  </strong>
                </div>
                <div className="summary-note">
                  <ShieldCheck size={23} />
                  <span>
                    Precise conditions.
                    <br />
                    <strong>Evidence you can inspect.</strong>
                  </span>
                </div>
              </div>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Saved rules & versions</h2>
                    <p>
                      Changes create a new version. Earlier evidence stays
                      intact.
                    </p>
                  </div>
                  <button
                    className="btn btn-outline"
                    onClick={advance}
                    disabled={!activeCount || health !== "healthy"}
                  >
                    <Play size={14} />
                    Advance demo bar
                  </button>
                </div>
                <div className="list-controls">
                  <div className="search-field">
                    <Search size={16} />
                    <input
                      ref={searchRef}
                      aria-label="Search saved rules"
                      placeholder="Search rules or conditions…"
                      value={query}
                      onChange={(e) => search(e.target.value)}
                    />
                    {query && (
                      <button
                        className="icon-button"
                        aria-label="Clear search"
                        onClick={() => {
                          search("");
                          searchRef.current?.focus();
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <label className="filter-select">
                    <ListFilter size={15} />
                    <span className="sr-only">Filter rule status</span>
                    <select
                      value={ruleFilter}
                      onChange={(e) => {
                        setRuleFilter(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="all">All statuses</option>
                      <option value="monitoring">Demo monitoring</option>
                      <option value="paused">Paused</option>
                      <option value="draft">Draft</option>
                    </select>
                  </label>
                </div>
                {renderRuleRows()}
                <Pager
                  page={page}
                  total={filteredRules.length}
                  size={6}
                  setPage={setPage}
                />
              </section>
              <section className="panel report-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Replay reports</h2>
                    <p>Immutable settings and a reproducible sample dataset.</p>
                  </div>
                  <BookOpen size={18} />
                </div>
                {store.runs.length ? (
                  <div className="run-list">
                    {store.runs.slice(0, 5).map((run) => (
                      <div key={run.id}>
                        <span>
                          <strong>
                            {run.rule.name} · v{run.rule.version}
                          </strong>
                          <small>
                            {run.start} – {run.end} · {run.timeframe} ·{" "}
                            {run.engine}
                          </small>
                        </span>
                        <span className="badge badge-purple">
                          {run.result.events.length} triggers
                        </span>
                        <button
                          className="text-button"
                          onClick={() => setSavedRun(run)}
                        >
                          View saved report <ArrowUpRight size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty title="Your first replay starts with a rule">
                    Select the play button beside a saved rule to build a
                    report.
                  </Empty>
                )}
              </section>
            </>
          )}
          {view === "options" && (
            <Suspense
              fallback={
                <div className="empty">
                  <Loader2 className="spinner" />
                  Loading Options Lab…
                </div>
              }
            >
              {health === "healthy" ? (
                <OptionsLab instrument={instrument} onCreateRule={create} />
              ) : (
                <section className="panel">
                  <Empty
                    title={
                      health === "stale"
                        ? "Option quotes are stale"
                        : "Option data unavailable"
                    }
                  >
                    No option rule can use the disabled quote state.
                    <button
                      className="btn btn-outline"
                      onClick={() => setHealth("healthy")}
                    >
                      Restore demo data
                    </button>
                  </Empty>
                </section>
              )}
            </Suspense>
          )}
          {view === "history" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>
                    Trigger history{" "}
                    <span className="count-label">{store.events.length}</span>
                  </h2>
                  <p>Original rule versions, observed values and timestamps.</p>
                </div>
                <span className="badge">Local evidence</span>
              </div>
              <div className="list-controls">
                <div className="search-field">
                  <Search size={16} />
                  <input
                    ref={searchRef}
                    aria-label="Search events"
                    placeholder="Search by rule or instrument…"
                    value={query}
                    onChange={(e) => search(e.target.value)}
                  />
                  {query && (
                    <button
                      className="icon-button"
                      aria-label="Clear search"
                      onClick={() => {
                        search("");
                        searchRef.current?.focus();
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <label className="filter-select">
                  <span className="sr-only">Filter event mode</span>
                  <select
                    value={eventMode}
                    onChange={(e) => {
                      setEventMode(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="all">All event modes</option>
                    <option value="historical">Historical replay</option>
                    <option value="demo">Manual demo</option>
                  </select>
                </label>
              </div>
              {renderEventList()}
              <Pager
                page={page}
                total={filteredEvents.length}
                size={8}
                setPage={setPage}
              />
            </section>
          )}
          <footer className="workspace-footer">
            <span>
              <FlaskConical size={13} />
              Synthetic research demo · no real market data or order execution
            </span>
            <button className="text-button" onClick={() => setHelp(true)}>
              Data & methodology <ArrowUpRight size={12} />
            </button>
          </footer>
        </main>
      </div>
      {editor && (
        <RuleEditor
          key={editor.id + editor.version}
          initial={editor}
          onClose={() => setEditor(null)}
          onSave={saveRule}
        />
      )}
      {testRule && (
        <ReplayDialog
          rule={testRule}
          timeframe={testRule.timeframe ?? "5m"}
          onClose={() => setTestRule(null)}
          onComplete={onComplete}
          onInspect={(event) => {
            setTestRule(null);
            setDetail(event);
          }}
        />
      )}
      {detail && (
        <Modal
          title="The evidence behind this signal"
          onClose={() => setDetail(null)}
          wide
        >
          <div className="evidence-heading">
            <span className="badge badge-purple">
              {detail.mode === "historical"
                ? "Historical replay"
                : "Manual demo"}
            </span>
            <h3>
              {detail.ruleName} <small>v{detail.ruleVersion}</small>
            </h3>
            <p>
              {timestamp(detail.time)} UTC ·{" "}
              {instruments.find((i) => i.id === detail.instrument)?.label} ·{" "}
              {detail.timeframe ?? "5m"} bar close
            </p>
          </div>
          <div className="table-wrap">
            <table>
              <caption>
                Condition diagnostics · unrounded inputs, values shown to six
                decimals
              </caption>
              <thead>
                <tr>
                  <th>Condition</th>
                  <th>Observed</th>
                  <th>Reference</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {detail.diagnostics.map((d, i) => (
                  <tr key={i}>
                    <td>{d.label}</td>
                    <td>
                      {d.actual === null ? "Unavailable" : d.actual.toFixed(6)}
                    </td>
                    <td>
                      {d.reference === null
                        ? "Unavailable"
                        : d.reference.toFixed(6)}
                    </td>
                    <td>
                      <span className={`badge ${d.met ? "badge-green" : ""}`}>
                        {d.met === null ? "Unknown" : d.met ? "Met" : "Not met"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="notice">
            Source: deterministic synthetic fixture. In-app event recorded; no
            external notification was sent. This event counts a condition, not a
            trade.
          </p>
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => setDetail(null)}>
              Close
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                setInstrument(detail.instrument);
                setTimeframe(detail.timeframe ?? "5m");
                setSelectedEvent(detail);
                setChartTab("price");
                setRange("5D");
                navigate("market");
                setDetail(null);
              }}
            >
              Inspect on chart <ArrowUpRight size={15} />
            </button>
          </div>
        </Modal>
      )}
      {versionRule && (
        <Modal
          title="Rule version history"
          onClose={() => setVersionRule(null)}
          wide
        >
          <h3>{versionRule.name}</h3>
          <div className="version-list">
            {store.rules
              .filter((r) => r.id === versionRule.id)
              .sort((a, b) => b.version - a.version)
              .map((r) => (
                <div key={r.version}>
                  <span className="badge badge-purple">
                    Version {r.version}
                  </span>
                  <p>{summarize(r)}</p>
                  <small>
                    {r.timeframe ?? "5m"} · {r.frequency} · {r.cooldownMinutes}m
                    cooldown ·{" "}
                    {new Date(r.createdAt).toLocaleDateString("en-GB", {
                      timeZone: "UTC",
                    })}
                  </small>
                  <button
                    className="text-button"
                    onClick={() => {
                      setTestRule(r);
                      setVersionRule(null);
                    }}
                  >
                    Replay this version <Play size={13} />
                  </button>
                </div>
              ))}
          </div>
        </Modal>
      )}
      {savedRun && (
        <Modal
          title="Saved replay report"
          onClose={() => setSavedRun(null)}
          wide
        >
          <h3>
            {savedRun.rule.name} · v{savedRun.rule.version}
          </h3>
          <p className="hint">
            {savedRun.start} – {savedRun.end} · {savedRun.timeframe} · UTC ·{" "}
            {savedRun.engine} · {savedRun.dataset}
          </p>
          <p>{summarize(savedRun.rule)}</p>
          <div className="result-stats">
            <div>
              <span>Triggers</span>
              <strong>{savedRun.result.events.length}</strong>
            </div>
            <div>
              <span>Eligible bars</span>
              <strong>{savedRun.result.eligibleBars}</strong>
            </div>
            <div>
              <span>Trigger periods</span>
              <strong>{savedRun.result.triggerPeriodPct.toFixed(2)}%</strong>
            </div>
          </div>
          {savedRun.result.events.length ? (
            <div className="table-wrap replay-events">
              <table>
                <caption>Original saved event evidence</caption>
                <thead>
                  <tr>
                    <th>Time · UTC</th>
                    <th>Observed close</th>
                    <th>Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {savedRun.result.events.map((e) => (
                    <tr key={e.id}>
                      <td>{timestamp(e.time)}</td>
                      <td>{e.price.toFixed(6)}</td>
                      <td>
                        <button
                          className="text-button"
                          onClick={() => {
                            setSavedRun(null);
                            setDetail(e);
                          }}
                        >
                          Inspect event <ArrowUpRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="No events in this saved report">
              The original settings did not emit a signal.
            </Empty>
          )}
        </Modal>
      )}
      {help && (
        <Modal
          title="A research desk for your ideas"
          onClose={() => setHelp(false)}
        >
          <div className="help-steps">
            <div>
              <span>1</span>
              <section>
                <h3>Find a pattern</h3>
                <p>
                  Explore synthetic Brent futures. Candles and SMA/EMA overlays
                  use the same sample bars as replay.
                </p>
              </section>
            </div>
            <div>
              <span>2</span>
              <section>
                <h3>Make the rule precise</h3>
                <p>
                  Choose an instrument, condition, timeframe and cooldown.
                  Natural language supports explicit templates; ambiguous
                  requests ask for clarification.
                </p>
              </section>
            </div>
            <div>
              <span>3</span>
              <section>
                <h3>Replay, then inspect</h3>
                <p>
                  Count historical triggers and inspect their exact values.
                  These are signals, not simulated trading returns.
                </p>
              </section>
            </div>
          </div>
          <p className="notice">
            Synthetic dataset: 12–16 October 2026, UTC. Demo contract metadata,
            option quotes and Greeks are illustrative. No licensed ICE data is
            connected. Demo monitoring advances only when you press Advance demo
            bar and stops when this browser closes.
          </p>
          <button className="btn btn-primary" onClick={() => setHelp(false)}>
            Back to research <ArrowRight size={15} />
          </button>
        </Modal>
      )}
      {settings && (
        <Modal title="Workspace settings" onClose={() => setSettings(false)}>
          <label className="field">
            Demo data health
            <select
              value={health}
              onChange={(e) => setHealth(e.target.value as typeof health)}
            >
              <option value="healthy">Healthy synthetic data</option>
              <option value="stale">Show stale-data state</option>
              <option value="unavailable">Show unavailable-data state</option>
            </select>
          </label>
          <p className="hint">
            This control demonstrates data-quality states. It does not report a
            real provider connection.
          </p>
          <div className="settings-info">
            <ShieldCheck size={20} />
            <div>
              <strong>Browser-local research</strong>
              <p>
                Rules, versions and up to 20 reports / 500 events are stored on
                this browser. No account or external delivery provider is
                connected.
              </p>
            </div>
          </div>
          <button className="btn btn-danger" onClick={() => setReset(true)}>
            Reset local demo data
          </button>
        </Modal>
      )}
      {reset && (
        <Modal
          title="Reset this demo workspace?"
          onClose={() => setReset(false)}
        >
          <p>
            This removes rules, versions, reports and events saved in this
            browser and restores the sample workspace.
          </p>
          <div className="modal-actions">
            <button
              className="btn btn-outline"
              autoFocus
              onClick={() => setReset(false)}
            >
              Keep my research
            </button>
            <button
              className="btn btn-danger"
              onClick={() => {
                try {
                  localStorage.removeItem(KEY);
                  location.assign(location.pathname);
                } catch {
                  setStorageError("Could not reset browser storage.");
                  setReset(false);
                }
              }}
            >
              Reset demo data
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function Pager({
  page,
  total,
  size,
  setPage,
}: {
  page: number;
  total: number;
  size: number;
  setPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  return (
    <div className="pagination">
      <span>
        {total
          ? `${(page - 1) * size + 1}–${Math.min(page * size, total)}`
          : "0"}{" "}
        of {total}
      </span>
      <nav aria-label="Dataset pagination">
        <button
          className="icon-button"
          disabled={page === 1}
          aria-label="Previous page"
          onClick={() => setPage(page - 1)}
        >
          <ChevronLeft size={16} />
        </button>
        <span>
          Page {page} of {pages}
        </span>
        <button
          className="icon-button"
          disabled={page >= pages}
          aria-label="Next page"
          onClick={() => setPage(page + 1)}
        >
          <ChevronRight size={16} />
        </button>
      </nav>
    </div>
  );
}
function Curve({
  near,
  far,
  setNear,
  setFar,
  onContract,
  liveInstruments,
}: {
  near: string;
  far: string;
  setNear: (v: string) => void;
  setFar: (v: string) => void;
  onContract: (id: string) => void;
  liveInstruments?: LiveInstrument[];
}) {
  const prices = instruments.map((i) => {
    const live = liveInstruments?.find((li) => li.id === i.id);
    return {
      ...i,
      price: live ? live.price : generateBars(i.id, "5m").at(-1)!.close,
    };
  });
  const nearPrice = prices.find((p) => p.id === near)!.price,
    farPrice = prices.find((p) => p.id === far)!.price;
  const diff = nearPrice - farPrice;
  const validPair =
    instruments.findIndex((i) => i.id === near) <
    instruments.findIndex((i) => i.id === far);
  const maxPrice = Math.max(...prices.map((p) => p.price)) + 0.8;
  const minPrice = Math.min(...prices.map((p) => p.price)) - 0.8;
  const W = 700,
    H = 260,
    PAD_L = 58,
    PAD_R = 30,
    PAD_T = 40,
    PAD_B = 50;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;
  const n = prices.length;
  const xOf = (i: number) => PAD_L + (i / (n - 1)) * chartW;
  const yOf = (price: number) =>
    PAD_T + ((maxPrice - price) / (maxPrice - minPrice)) * chartH;
  const pts = prices.map((p, i) => ({ x: xOf(i), y: yOf(p.price) }));
  const pathD = pts.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x},${pt.y}`;
    const prev = pts[i - 1];
    const cpx = prev.x + (pt.x - prev.x) * 0.5;
    return `${acc} C ${cpx},${prev.y} ${cpx},${pt.y} ${pt.x},${pt.y}`;
  }, "");
  const areaD = `${pathD} L ${pts[n - 1].x},${PAD_T + chartH} L ${PAD_L},${PAD_T + chartH} Z`;
  const isBackwardation = diff > 0;
  const strokeColor = isBackwardation ? "#c0404e" : "#0a8c73";
  const gradId = isBackwardation ? "cvred" : "cvgreen";
  const gradStart = isBackwardation
    ? "rgba(192,64,78,0.22)"
    : "rgba(10,140,115,0.18)";
  const gradEnd = isBackwardation
    ? "rgba(192,64,78,0.01)"
    : "rgba(10,140,115,0.01)";
  const glowColor = isBackwardation
    ? "rgba(192,64,78,0.3)"
    : "rgba(10,140,115,0.3)";
  const gridCount = 4;
  return (
    <div className="curve-view">
      <div className="curve-summary">
        <div>
          <span className="eyebrow">LISTED CONTRACT SNAPSHOT</span>
          <h3>
            {!validPair
              ? "Select chronological expiries"
              : diff > 0
                ? "Backwardation"
                : diff < 0
                  ? "Contango"
                  : "Flat selected pair"}{" "}
            <span className="badge">Selected pair</span>
          </h3>
          <p>
            {validPair ? (
              <>
                The selected nearer contract{" "}
                {diff >= 0 ? "costs more" : "costs less"} than the deferred
                contract.
              </>
            ) : (
              "Near expiry must precede far expiry. Choose two distinct contracts."
            )}
          </p>
        </div>
        <strong className={isBackwardation ? "down" : "up"}>
          {diff >= 0 ? "+" : ""}
          {diff.toFixed(2)}
          <small>USD/bbl · near − far</small>
        </strong>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Synthetic futures curve. Three prices are listed with contract actions below."
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={gradStart} />
            <stop offset="100%" stopColor={gradEnd} />
          </linearGradient>
          <filter id="gn">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="gl">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {Array.from({ length: gridCount + 1 }, (_, i) => {
          const price = maxPrice - ((maxPrice - minPrice) * i) / gridCount;
          const yg = yOf(price);
          return (
            <g key={i}>
              <line
                x1={PAD_L}
                x2={W - PAD_R}
                y1={yg}
                y2={yg}
                stroke={i === 0 ? "transparent" : "#e8ecf2"}
                strokeWidth="1"
                strokeDasharray="4 5"
              />
              <text
                x={PAD_L - 8}
                y={yg + 4}
                fill="#8fa4b0"
                fontSize="10"
                textAnchor="end"
                fontFamily="Consolas, monospace"
              >
                {price.toFixed(2)}
              </text>
            </g>
          );
        })}
        <line
          x1={PAD_L}
          x2={W - PAD_R}
          y1={PAD_T + chartH}
          y2={PAD_T + chartH}
          stroke="#d4dbe3"
          strokeWidth="1"
        />
        <path d={areaD} fill={`url(#${gradId})`} />
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#gl)"
          opacity="0.45"
        />
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {prices.map((p, i) => {
          const cx = xOf(i),
            cy = yOf(p.price);
          return (
            <g key={p.id}>
              <circle cx={cx} cy={cy} r="11" fill={glowColor} opacity="0.35" />
              <circle
                cx={cx}
                cy={cy}
                r="6"
                fill="white"
                stroke={strokeColor}
                strokeWidth="2.5"
                filter="url(#gn)"
              />
              <circle cx={cx} cy={cy} r="2.5" fill={strokeColor} />
              <rect
                x={cx - 27}
                y={cy - 37}
                width="54"
                height="20"
                rx="5"
                fill={
                  isBackwardation
                    ? "rgba(192,64,78,0.07)"
                    : "rgba(10,140,115,0.07)"
                }
                stroke={
                  isBackwardation
                    ? "rgba(192,64,78,0.18)"
                    : "rgba(10,140,115,0.18)"
                }
                strokeWidth="1"
              />
              <text
                x={cx}
                y={cy - 23}
                textAnchor="middle"
                fill={strokeColor}
                fontSize="11"
                fontWeight="600"
                fontFamily="Consolas, monospace"
              >
                {money(p.price)}
              </text>
              <text
                x={cx}
                y={PAD_T + chartH + 22}
                textAnchor="middle"
                fill="#5b6b77"
                fontSize="11"
                fontWeight="500"
              >
                {p.short}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="curve-contracts">
        {prices.map((p) => (
          <button
            className="btn btn-outline"
            key={p.id}
            onClick={() => onContract(p.id)}
          >
            {p.short} · ${money(p.price)}
            <ArrowUpRight size={13} />
          </button>
        ))}
      </div>
      <div className="field-grid">
        <label className="field">
          Near contract
          <select value={near} onChange={(e) => setNear(e.target.value)}>
            {instruments.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Far contract
          <select value={far} onChange={(e) => setFar(e.target.value)}>
            {instruments.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="hint">
        Formula: {money(nearPrice)} − {money(farPrice)} = {diff.toFixed(2)}{" "}
        USD/bbl. Quotes share the same synthetic timestamp. Curve rules and
        historical overlays are planned; individual contract selection is
        available now.
      </p>
    </div>
  );
}
