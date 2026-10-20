import { useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickSeries,
  LineSeries,
  ColorType,
  createChart,
  createSeriesMarkers,
  LineStyle,
  TickMarkType,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type LogicalRange,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import { ArrowUpRight, BarChart3, Minus, Plus } from "lucide-react";
import { sma, ema } from "./domain";
import type { Bar, Condition, TriggerEvent } from "./types";
import { money, timestamp, getLocalTzLabel } from "./ui";

const chartTime = (time: number) => Math.floor(time / 1000) as UTCTimestamp;
const chartColor = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

type ChartRuntime = {
  candles: ISeriesApi<"Candlestick">;
  line: ISeriesApi<"Line">;
  averages: ISeriesApi<"Line">[];
  markers: ISeriesMarkersPluginApi<Time>[];
};

// Anchor the viewport to a retained timestamp when a provider rolls its window.
// Keeping bare logical indices would move the user's view to different candles.
function retainedRange(range: LogicalRange, previous: Bar[], next: Bar[]) {
  const middle = (range.from + range.to) / 2;
  const nextIndices = new Map(next.map((bar, index) => [bar.time, index]));
  let anchor: { before: number; after: number } | undefined;
  previous.forEach((bar, index) => {
    const after = nextIndices.get(bar.time);
    if (
      after !== undefined &&
      (!anchor || Math.abs(index - middle) < Math.abs(anchor.before - middle))
    )
      anchor = { before: index, after };
  });
  if (anchor) {
    const shift = anchor.after - anchor.before;
    return { from: range.from + shift, to: range.to + shift };
  }
  // No history remains in common: retain zoom width at the nearest data edge.
  const oldMiddle =
    previous[Math.max(0, Math.min(previous.length - 1, Math.round(middle)))];
  const edge = oldMiddle && oldMiddle.time < next[0].time ? 0 : next.length - 1;
  const half = (range.to - range.from) / 2;
  return { from: edge - half, to: edge + half };
}

export default function PriceChart({
  bars,
  dataMode = "demo",
  allBars,
  events,
  threshold,
  selectedEvent,
  onEvent,
  onCreate,
  kind = "candles",
  ruleCondition,
  viewportKey,
}: {
  bars: Bar[];
  dataMode?: "demo" | "yahoo";
  allBars?: Bar[];
  events: TriggerEvent[];
  threshold?: number;
  selectedEvent?: TriggerEvent | null;
  onEvent: (event: TriggerEvent) => void;
  onCreate: (condition: Partial<Condition>) => void;
  ruleCondition?: Condition;
  kind?: "candles" | "line";
  viewportKey: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const runtime = useRef<ChartRuntime | null>(null);
  const previousBars = useRef<Bar[]>([]);
  const fittedContext = useRef<string | null>(null);
  const framedEvent = useRef<string | null>(null);
  const latest = useRef({ bars, events, onEvent });
  latest.current = { bars, events, onEvent };
  const [averages, setAverages] = useState(true);
  const [maKind, setMaKind] = useState<"SMA" | "EMA">(
    ruleCondition?.metric === "ema_cross" ? "EMA" : "SMA",
  );
  const [inspectedTime, setInspectedTime] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const [period, setPeriod] = useState(ruleCondition?.period ?? 20);
  const [slow, setSlow] = useState(ruleCondition?.slowPeriod ?? 50);
  const [tzMode, setTzMode] = useState<"utc" | "local">(() => {
    return (
      (localStorage.getItem("algo_triggers_chart_tz") as "utc" | "local") ||
      "local"
    );
  });
  const localTzLabel = useMemo(() => getLocalTzLabel(), []);

  const handleTzChange = (mode: "utc" | "local") => {
    setTzMode(mode);
    try {
      localStorage.setItem("algo_triggers_chart_tz", mode);
    } catch {}
  };

  const history = allBars ?? bars;
  const indicatorValues = useMemo(
    () => [period, slow].map((p) => (maKind === "SMA" ? sma : ema)(history, p)),
    [history, period, slow, maKind],
  );
  const current = bars.find((bar) => bar.time === inspectedTime) ?? bars.at(-1);

  useEffect(() => {
    if (!container.current) return;
    const instance = createChart(container.current, {
      autoSize: true,
      height: 350,
      layout: {
        background: { type: ColorType.Solid, color: chartColor("--surface") },
        textColor: chartColor("--muted"),
        fontFamily: "'Consolas', ui-monospace, monospace",
        fontSize: 11,
        attributionLogo: true,
      },
      grid: {
        vertLines: { color: "rgba(224,230,236,0.6)" },
        horzLines: { color: "rgba(224,230,236,0.9)" },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.12, bottom: 0.12 },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
        shiftVisibleRangeOnNewBar: false,
      },
      crosshair: {
        vertLine: {
          color: "rgba(98,81,216,0.5)",
          labelBackgroundColor: chartColor("--ink"),
          width: 1,
          style: LineStyle.Dashed,
        },
        horzLine: {
          color: "rgba(98,81,216,0.5)",
          labelBackgroundColor: chartColor("--ink"),
        },
      },
    });
    chart.current = instance;
    runtime.current = {
      candles: instance.addSeries(CandlestickSeries, {
        upColor: chartColor("--up"),
        downColor: chartColor("--down"),
        borderVisible: false,
        wickUpColor: chartColor("--up"),
        wickDownColor: chartColor("--down"),
      }),
      line: instance.addSeries(LineSeries, {
        color: chartColor("--primary"),
        lineWidth: 2,
        visible: false,
      }),
      averages: [0, 1].map((i) =>
        instance.addSeries(LineSeries, {
          color: i ? "#d0a24c" : chartColor("--primary"),
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        }),
      ),
      markers: [],
    };
    runtime.current.markers = [
      createSeriesMarkers(runtime.current.candles, []),
      createSeriesMarkers(runtime.current.line, []),
    ];
    instance.subscribeCrosshairMove((p) => {
      setInspectedTime(typeof p.time === "number" ? p.time * 1000 : null);
    });
    instance.subscribeClick((p) => {
      if (typeof p.time === "number") {
        const time = p.time * 1000;
        const state = latest.current;
        const event = state.events.find((e) => e.time === time);
        if (event && state.bars.some((b) => b.time === time))
          state.onEvent(event);
      }
    });
    instance.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (!range || !container.current) return;
      container.current.dataset.visibleFrom = String(range.from);
      container.current.dataset.visibleTo = String(range.to);
    });
    return () => {
      instance.remove();
      chart.current = null;
      runtime.current = null;
      previousBars.current = [];
      fittedContext.current = null;
      framedEvent.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = chart.current;
    const series = runtime.current;
    if (!instance || !series || !bars.length) return;
    const previous = previousBars.current;
    const contextChanged = fittedContext.current !== viewportKey;
    const visible = instance.timeScale().getVisibleLogicalRange();
    const retained =
      !contextChanged && visible && previous.length
        ? retainedRange(visible, previous, bars)
        : null;
    if (previous !== bars || contextChanged) {
      const candles = bars.map((b) => ({
        time: chartTime(b.time),
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      }));
      const line = bars.map((b) => ({
        time: chartTime(b.time),
        value: b.close,
      }));
      const tailOnly =
        !contextChanged &&
        previous.length > 0 &&
        bars.length >= previous.length &&
        previous.every(
          (b, index) =>
            b.time === bars[index].time &&
            (index === previous.length - 1 ||
              (b.open === bars[index].open &&
                b.high === bars[index].high &&
                b.low === bars[index].low &&
                b.close === bars[index].close)),
        );
      if (tailOnly) {
        candles
          .slice(previous.length - 1)
          .forEach((point) => series.candles.update(point));
        line
          .slice(previous.length - 1)
          .forEach((point) => series.line.update(point));
      } else {
        series.candles.setData(candles);
        series.line.setData(line);
      }
    }
    const visibleTimes = new Set(bars.map((bar) => bar.time));
    series.averages.forEach((line, i) =>
      line.setData(
        history.flatMap((bar, index) =>
          indicatorValues[i][index] == null || !visibleTimes.has(bar.time)
            ? []
            : [
                {
                  time: chartTime(bar.time),
                  value: indicatorValues[i][index]!,
                },
              ],
        ),
      ),
    );
    previousBars.current = bars;
    if (contextChanged || !previous.length) {
      instance.priceScale("right").applyOptions({ autoScale: true });
      instance.timeScale().fitContent();
      fittedContext.current = viewportKey;
      framedEvent.current = null;
      setInspectedTime(null);
    } else if (retained) instance.timeScale().setVisibleLogicalRange(retained);
  }, [bars, history, indicatorValues, viewportKey]);

  useEffect(() => {
    const series = runtime.current;
    if (!series) return;
    series.candles.applyOptions({ visible: kind === "candles" });
    series.line.applyOptions({ visible: kind === "line" });
  }, [kind]);

  useEffect(() => {
    runtime.current?.averages.forEach((line) =>
      line.applyOptions({ visible: averages }),
    );
  }, [averages]);

  useEffect(() => {
    const validTimes = new Set(bars.map((b) => b.time));
    const unique = [
      ...new Map(
        events.filter((e) => validTimes.has(e.time)).map((e) => [e.time, e]),
      ).values(),
    ].sort((a, b) => a.time - b.time);
    runtime.current?.markers.forEach((markers) =>
      markers.setMarkers(
        unique.map((e) => ({
          time: chartTime(e.time),
          position: "aboveBar",
          color: chartColor("--primary"),
          shape: "circle",
          text: selectedEvent?.id === e.id ? "Selected event" : "",
        })),
      ),
    );
    if (
      selectedEvent &&
      framedEvent.current !== selectedEvent.id &&
      validTimes.has(selectedEvent.time)
    ) {
      chart.current?.timeScale().setVisibleRange({
        from: chartTime(
          Math.max(bars[0].time, selectedEvent.time - 12 * 3600000),
        ),
        to: chartTime(
          Math.min(bars.at(-1)!.time, selectedEvent.time + 6 * 3600000),
        ),
      });
      framedEvent.current = selectedEvent.id;
    }
  }, [bars, events, selectedEvent, kind, viewportKey]);

  useEffect(() => {
    const series =
      kind === "candles" ? runtime.current?.candles : runtime.current?.line;
    if (!series || threshold === undefined) return;
    const line = series.createPriceLine({
      price: threshold,
      color: chartColor("--primary"),
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: selectedEvent ? "Rule" : "Reference",
    });
    return () => {
      if (chart.current) series.removePriceLine(line);
    };
  }, [threshold, kind, selectedEvent]);

  useEffect(() => {
    // Keep UTC instants in the data; timezone changes only format axis labels.
    const zone = tzMode === "utc" ? { timeZone: "UTC" } : {};
    const formats = {
      [TickMarkType.Year]: new Intl.DateTimeFormat("en-GB", {
        ...zone,
        year: "numeric",
      }),
      [TickMarkType.Month]: new Intl.DateTimeFormat("en-GB", {
        ...zone,
        month: "short",
      }),
      [TickMarkType.DayOfMonth]: new Intl.DateTimeFormat("en-GB", {
        ...zone,
        day: "numeric",
        month: "short",
      }),
      [TickMarkType.Time]: new Intl.DateTimeFormat("en-GB", {
        ...zone,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }),
      [TickMarkType.TimeWithSeconds]: new Intl.DateTimeFormat("en-GB", {
        ...zone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      }),
    };
    chart.current?.applyOptions({
      timeScale: {
        tickMarkFormatter: (time: Time, type: TickMarkType) =>
          typeof time === "number"
            ? formats[type].format(new Date(time * 1000))
            : null,
      },
      localization: {
        timeFormatter: (time: Time) =>
          typeof time === "number"
            ? `${timestamp(time * 1000, tzMode)} (${tzMode === "local" ? localTzLabel : "UTC"})`
            : String(time),
      },
    });
  }, [tzMode, localTzLabel]);
  const zoom = (ratio: number) => {
    const scale = chart.current?.timeScale();
    const range = scale?.getVisibleLogicalRange();
    if (range) {
      const mid = (range.from + range.to) / 2;
      const half = ((range.to - range.from) * ratio) / 2;
      scale?.setVisibleLogicalRange({ from: mid - half, to: mid + half });
    }
  };
  return (
    <>
      <div className="chart-toolbar">
        <div className="indicator-controls">
          <button
            className={`indicator-toggle ${averages ? "is-on" : ""}`}
            aria-pressed={averages}
            onClick={() => setAverages(!averages)}
          >
            <span className="legend-line" />
            Moving averages
          </button>
          {averages && (
            <details className="indicator-settings">
              <summary>
                Indicator settings · {maKind} {period}/{slow}
              </summary>
              <div className="indicator-settings-fields">
                <label htmlFor="ma-method">Average method</label>
                <select
                  id="ma-method"
                  value={maKind}
                  onChange={(e) => setMaKind(e.target.value as "SMA" | "EMA")}
                >
                  <option>SMA</option>
                  <option>EMA</option>
                </select>
                <label htmlFor="fast-period">Fast average period</label>
                <input
                  id="fast-period"
                  type="number"
                  min="2"
                  max="100"
                  value={period}
                  onChange={(e) =>
                    setPeriod(
                      Math.max(
                        2,
                        Math.min(100, Math.round(Number(e.target.value))),
                      ),
                    )
                  }
                />
                <span className="legend-line gold" />
                <label htmlFor="slow-period">Slow average period</label>
                <input
                  id="slow-period"
                  type="number"
                  min="3"
                  max="150"
                  value={slow}
                  onChange={(e) =>
                    setSlow(
                      Math.max(
                        3,
                        Math.min(150, Math.round(Number(e.target.value))),
                      ),
                    )
                  }
                />
              </div>
            </details>
          )}
        </div>
        <div className="chart-actions">
          <div
            className="chart-tz-switch"
            role="group"
            aria-label="Chart timezone"
          >
            <button
              type="button"
              className={`tz-toggle-btn ${tzMode === "utc" ? "active" : ""}`}
              onClick={() => handleTzChange("utc")}
              aria-pressed={tzMode === "utc"}
              title="Display timestamps in UTC"
            >
              UTC
            </button>
            <button
              type="button"
              className={`tz-toggle-btn ${tzMode === "local" ? "active" : ""}`}
              onClick={() => handleTzChange("local")}
              aria-pressed={tzMode === "local"}
              title={`Display in your local time (${localTzLabel})`}
            >
              Local ({localTzLabel})
            </button>
          </div>
          <div className="chart-zoom">
            <button
              className="icon-button"
              aria-label="Zoom out chart"
              onClick={() => zoom(1.3)}
            >
              <Minus size={15} />
            </button>
            <button
              className="icon-button"
              aria-label="Zoom in chart"
              onClick={() => zoom(0.7)}
            >
              <Plus size={15} />
            </button>
            <button
              className="text-button"
              onClick={() => {
                chart.current
                  ?.priceScale("right")
                  .applyOptions({ autoScale: true });
                chart.current?.timeScale().fitContent();
              }}
            >
              Fit
            </button>
          </div>
        </div>
      </div>
      <div className="ohlc" aria-live="off">
        <span>
          {current ? timestamp(current.time, tzMode) : "No bars"}{" "}
          <small>{tzMode === "local" ? localTzLabel : "UTC"}</small>
        </span>
        {current &&
          (["open", "high", "low", "close"] as const).map((field, i) => (
            <span key={field}>
              <small>{["O", "H", "L", "C"][i]}</small> {money(current[field])}
            </span>
          ))}
        {averages &&
          current &&
          [period, slow].map((p, i) => {
            const value =
              indicatorValues[i][
                history.findIndex((b) => b.time === current.time)
              ];
            return (
              <span key={i} data-testid={`ma-value-${i}`}>
                <small>
                  {maKind}
                  {p}
                </small>{" "}
                {value == null ? "Warming up" : value.toFixed(6)}
              </span>
            );
          })}
      </div>
      <div
        className="chart-canvas"
        ref={container}
        data-first-time={bars[0]?.time}
        data-last-time={bars.at(-1)?.time}
        data-bars-count={bars.length}
        aria-label={`${dataMode === "demo" ? "Synthetic" : "Yahoo snapshot"} Brent price chart. Inspect the equivalent data table below.`}
        role="region"
      />
      <div className="chart-footer">
        <div className="chart-note">
          <span className="dot purple" />
          Rule events <span className="separator">/</span>
          <span>
            {tzMode === "local" ? `Local time (${localTzLabel})` : "UTC"} ·{" "}
            {dataMode === "demo"
              ? "Synthetic sample"
              : "Delay unverified · indicators use valid returned bars"}{" "}
            · USD/bbl
          </span>
        </div>
        <button className="text-button" onClick={() => setTable(!table)}>
          <BarChart3 size={14} />
          {table ? "Hide data" : "View data"}
        </button>
        <button
          className="text-button"
          onClick={() =>
            onCreate(
              averages
                ? {
                    metric: maKind === "SMA" ? "sma_cross" : "ema_cross",
                    period,
                    slowPeriod: slow,
                  }
                : { metric: "price", threshold: current?.close ?? 82.5 },
            )
          }
        >
          {averages ? "Create average rule" : "Create price rule"}{" "}
          <ArrowUpRight size={14} />
        </button>
      </div>
      {table && (
        <div className="table-wrap chart-data">
          <table>
            <caption>
              Last 20 displayed bars (
              {tzMode === "local" ? localTzLabel : "UTC"}). For all bars, use
              the CSV export.
            </caption>
            <thead>
              <tr>
                <th>Time ({tzMode === "local" ? localTzLabel : "UTC"})</th>
                <th>Open</th>
                <th>High</th>
                <th>Low</th>
                <th>Close</th>
              </tr>
            </thead>
            <tbody>
              {bars.slice(-20).map((b) => (
                <tr key={b.time}>
                  <td>{timestamp(b.time, tzMode)}</td>
                  <td>{money(b.open)}</td>
                  <td>{money(b.high)}</td>
                  <td>{money(b.low)}</td>
                  <td>{money(b.close)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
