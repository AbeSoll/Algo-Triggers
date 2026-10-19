import { useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickSeries,
  LineSeries,
  ColorType,
  createChart,
  createSeriesMarkers,
  LineStyle,
  type IChartApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { ArrowUpRight, BarChart3, Minus, Plus } from "lucide-react";
import { sma, ema } from "./domain";
import type { Bar, Condition, TriggerEvent } from "./types";
import { money, timestamp, getLocalTzLabel } from "./ui";

export default function PriceChart({
  bars,
  allBars,
  events,
  threshold,
  selectedEvent,
  onEvent,
  onCreate,
  kind = "candles",
  ruleCondition,
}: {
  bars: Bar[];
  allBars?: Bar[];
  events: TriggerEvent[];
  threshold?: number;
  selectedEvent?: TriggerEvent | null;
  onEvent: (event: TriggerEvent) => void;
  onCreate: (condition: Partial<Condition>) => void;
  ruleCondition?: Condition;
  kind?: "candles" | "line";
}) {
  const container = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const [averages, setAverages] = useState(true);
  const [maKind, setMaKind] = useState<"SMA" | "EMA">(
    ruleCondition?.metric === "ema_cross" ? "EMA" : "SMA",
  );
  const [inspected, setInspected] = useState<Bar | null>(null);
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
  const current = inspected ?? bars.at(-1);

  useEffect(() => {
    if (!container.current || !bars.length) return;
    const styles = getComputedStyle(document.documentElement);
    const color = (name: string) => styles.getPropertyValue(name).trim();

    const offsetSec =
      tzMode === "local" ? -new Date().getTimezoneOffset() * 60 : 0;
    const toChartTime = (timeMs: number) =>
      Math.floor(timeMs / 1000 + offsetSec) as UTCTimestamp;

    const instance = createChart(container.current, {
      autoSize: true,
      height: 350,
      layout: {
        background: { type: ColorType.Solid, color: color("--surface") },
        textColor: color("--muted"),
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
      },
      crosshair: {
        vertLine: {
          color: "rgba(98,81,216,0.5)",
          labelBackgroundColor: color("--ink"),
          width: 1,
          style: LineStyle.Dashed,
        },
        horzLine: {
          color: "rgba(98,81,216,0.5)",
          labelBackgroundColor: color("--ink"),
        },
      },
      localization: {
        timeFormatter: (time: number | string | object) => {
          if (typeof time === "number") {
            const rawTime = (time - offsetSec) * 1000;
            return tzMode === "local"
              ? `${timestamp(rawTime, "local")} (${localTzLabel})`
              : `${timestamp(rawTime, "UTC")} UTC`;
          }
          return String(time);
        },
      },
    });
    chart.current = instance;
    const series =
      kind === "candles"
        ? instance.addSeries(CandlestickSeries, {
            upColor: color("--up"),
            downColor: color("--down"),
            borderVisible: false,
            wickUpColor: color("--up"),
            wickDownColor: color("--down"),
          })
        : instance.addSeries(LineSeries, {
            color: color("--primary"),
            lineWidth: 2,
          });
    if (kind === "candles")
      series.setData(
        bars.map((b) => ({
          time: toChartTime(b.time),
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
        })),
      );
    else
      series.setData(
        bars.map((b) => ({
          time: toChartTime(b.time),
          value: b.close,
        })),
      );
    if (threshold !== undefined)
      series.createPriceLine({
        price: threshold,
        color: color("--primary"),
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: selectedEvent ? "Rule" : "Reference",
      });
    if (averages) {
      [period, slow].forEach((p, i) => {
        const values = indicatorValues[i];
        const visibleTimes = new Set(bars.map((bar) => bar.time));
        const line = instance.addSeries(LineSeries, {
          color: i ? "#d0a24c" : color("--primary"),
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        line.setData(
          history.flatMap((b, index) =>
            values[index] === null || !visibleTimes.has(b.time)
              ? []
              : [
                  {
                    time: toChartTime(b.time),
                    value: values[index]!,
                  },
                ],
          ),
        );
      });
    }
    const validTimes = new Set(bars.map((b) => b.time));
    const matching = events.filter((e) => validTimes.has(e.time));
    const unique = matching
      .filter((e, i) => matching.findIndex((m) => m.time === e.time) === i)
      .sort((a, b) => a.time - b.time);
    createSeriesMarkers(
      series,
      unique.map((e) => ({
        time: toChartTime(e.time),
        position: "aboveBar" as const,
        color: color("--primary"),
        shape: "circle" as const,
        text: selectedEvent?.id === e.id ? "Selected event" : "",
      })),
    );
    instance.subscribeCrosshairMove((p) => {
      if (typeof p.time === "number") {
        const rawTime = (Number(p.time) - offsetSec) * 1000;
        setInspected(
          bars.find((b) => b.time === rawTime) ?? null,
        );
      } else setInspected(null);
    });
    instance.subscribeClick((p) => {
      if (typeof p.time === "number") {
        const rawTime = (Number(p.time) - offsetSec) * 1000;
        const event = matching.find((e) => e.time === rawTime);
        if (event) onEvent(event);
      }
    });
    instance.timeScale().fitContent();
    if (selectedEvent && validTimes.has(selectedEvent.time)) {
      instance.timeScale().setVisibleRange({
        from: toChartTime(Math.max(bars[0].time, selectedEvent.time - 12 * 3600000)),
        to: toChartTime(Math.min(bars.at(-1)!.time, selectedEvent.time + 6 * 3600000)),
      });
    }
    return () => {
      instance.remove();
      chart.current = null;
    };
  }, [
    bars,
    history,
    indicatorValues,
    events,
    threshold,
    kind,
    averages,
    maKind,
    period,
    slow,
    selectedEvent,
    onEvent,
    tzMode,
    localTzLabel,
  ]);
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
            <>
              <label className="sr-only" htmlFor="ma-method">
                Average method
              </label>
              <select
                id="ma-method"
                value={maKind}
                onChange={(e) => setMaKind(e.target.value as "SMA" | "EMA")}
              >
                <option>SMA</option>
                <option>EMA</option>
              </select>
              <label className="sr-only" htmlFor="fast-period">
                Fast average period
              </label>
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
              <label className="sr-only" htmlFor="slow-period">
                Slow average period
              </label>
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
            </>
          )}
        </div>
        <div className="chart-actions">
          <div className="chart-tz-switch" role="group" aria-label="Chart timezone">
            <button
              type="button"
              className={`tz-toggle-btn ${tzMode === "utc" ? "active" : ""}`}
              onClick={() => handleTzChange("utc")}
              title="Display in Exchange UTC (London/ICE standard)"
            >
              UTC
            </button>
            <button
              type="button"
              className={`tz-toggle-btn ${tzMode === "local" ? "active" : ""}`}
              onClick={() => handleTzChange("local")}
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
              onClick={() => chart.current?.timeScale().fitContent()}
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
        aria-label="Synthetic Brent price chart. Event markers are purple; inspect the equivalent data table below."
        role="region"
      />
      <div className="chart-footer">
        <div className="chart-note">
          <span className="dot purple" />
          Rule events <span className="separator">/</span>
          <span>
            {tzMode === "local" ? `Local time (${localTzLabel})` : "Exchange UTC"} · ~10–15m delay · USD/bbl
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
              Last 20 displayed bars ({tzMode === "local" ? localTzLabel : "UTC"}). For all bars, use the CSV export.
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
