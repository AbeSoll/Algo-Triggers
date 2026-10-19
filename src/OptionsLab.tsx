import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleHelp,
  Layers3,
  Plus,
  RotateCcw,
  ScanLine,
  Trash2,
} from "lucide-react";
import type { Rule } from "./types";
import "./options.css";

type OptionType = "call" | "put";
type PriceField = "bid" | "ask" | "last" | "mark";
type Template = "vanilla" | "put-spread" | "collar";
interface Expiry {
  id: string;
  label: string;
  underlying: string;
  reference: string;
  future: number;
  days: number;
}
interface Quote {
  type: OptionType;
  strike: number;
  bid: number | null;
  ask: number;
  last: number | null;
  mark: number | null;
  iv: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  volume: number;
  oi: number;
}
interface Leg {
  id: number;
  type: OptionType;
  strike: number;
  quantity: number;
}
const EXPIRIES: Expiry[] = [
  {
    id: "2026-11-25",
    label: "25 Nov 2026",
    underlying: "brent-jan27",
    reference: "BRN Jan 2027",
    future: 82.5,
    days: 37,
  },
  {
    id: "2026-12-23",
    label: "23 Dec 2026",
    underlying: "brent-feb27",
    reference: "BRN Feb 2027",
    future: 82.15,
    days: 65,
  },
];
const STRIKES = [76, 78, 80, 82, 84, 86, 88, 90];
const SNAPSHOT = "19 Oct 2026 · 02:30 UTC";
const number = (value: number | null, digits = 2) =>
  value === null ? "—" : value.toFixed(digits);
const signed = (value: number, digits = 2) =>
  `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(digits)}`;

// Deliberately illustrative supplied fixtures, not exchange quotes or model valuations.
function quoteFor(expiry: Expiry, strike: number, type: OptionType): Quote {
  const distance = strike - expiry.future;
  const timeValue =
    (1.75 + (expiry.days - 37) * 0.018) * Math.exp(-Math.abs(distance) / 9);
  const premium =
    Math.max(type === "call" ? -distance : distance, 0) + timeValue;
  const spread = 0.08 + Math.abs(distance) * 0.008;
  const missing = type === "put" && strike === 90;
  const bid = missing
    ? null
    : Number(Math.max(0.01, premium - spread / 2).toFixed(2));
  const ask = Number((premium + spread / 2).toFixed(2));
  const delta = Math.max(0.06, Math.min(0.94, 0.5 - distance / 20));
  return {
    type,
    strike,
    bid,
    ask,
    last: missing
      ? null
      : Number((premium + (type === "call" ? 0.01 : -0.01)).toFixed(2)),
    mark: bid === null ? null : (bid + ask) / 2,
    iv:
      26.1 +
      distance * distance * 0.065 -
      distance * 0.16 +
      (expiry.days - 37) * 0.018,
    delta: type === "call" ? delta : delta - 1,
    gamma: Math.max(0.011, 0.046 - Math.abs(distance) * 0.003),
    theta: -0.022 - timeValue * 0.009,
    vega: 0.08 + timeValue * 0.045,
    volume: 105 + strike * 9 + (type === "call" ? 83 : 17),
    oi: 1300 + strike * 31,
  };
}
function templateLegs(template: Template): Leg[] {
  if (template === "put-spread")
    return [
      { id: 1, type: "put", strike: 84, quantity: 1 },
      { id: 2, type: "put", strike: 78, quantity: -1 },
    ];
  if (template === "collar")
    return [
      { id: 1, type: "put", strike: 78, quantity: 1 },
      { id: 2, type: "call", strike: 88, quantity: -1 },
    ];
  return [{ id: 1, type: "call", strike: 84, quantity: 1 }];
}

export default function OptionsLab({
  instrument,
  onCreateRule,
}: {
  instrument: string;
  onCreateRule: (partial: Partial<Rule>) => void;
}) {
  const [expiryId, setExpiryId] = useState(
    EXPIRIES[instrument === "brent-feb27" ? 1 : 0].id,
  );
  const [view, setView] = useState<"chain" | "surface">("chain");
  const [priceField, setPriceField] = useState<PriceField>("mark");
  const [typeFilter, setTypeFilter] = useState<"all" | OptionType>("all");
  const [strikeFilter, setStrikeFilter] = useState("all");
  const [selected, setSelected] = useState<{
    strike: number;
    type: OptionType;
  }>({ strike: 84, type: "call" });
  const [template, setTemplate] = useState<Template>("put-spread");
  const [legs, setLegs] = useState<Leg[]>(templateLegs("put-spread"));
  const [futureQuantity, setFutureQuantity] = useState(1);
  const [rotation, setRotation] = useState(34);
  const [pitch, setPitch] = useState(32);
  const [zoom, setZoom] = useState(100);
  const [surfaceExpiry, setSurfaceExpiry] = useState("all");
  const [pointId, setPointId] = useState("0-3");
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startRotation: number;
    startPitch: number;
    lastX: number;
    lastY: number;
    lastTime: number;
    vx: number;
    vy: number;
  } | null>(null);
  const inertiaAnimRef = useRef<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const expiry = EXPIRIES.find((item) => item.id === expiryId)!;

  useEffect(() => {
    if (!isAutoRotating || isDragging) return;
    let animId: number;
    const tick = () => {
      setRotation((prev) => {
        const next = prev + 0.35;
        return next > 70 ? -60 : Math.round(next * 10) / 10;
      });
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isAutoRotating, isDragging]);

  useEffect(() => {
    return () => {
      if (inertiaAnimRef.current) {
        cancelAnimationFrame(inertiaAnimRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setExpiryId(EXPIRIES[instrument === "brent-feb27" ? 1 : 0].id);
    setSelected({ strike: 84, type: "call" });
  }, [instrument]);

  const selectedQuote = quoteFor(expiry, selected.strike, selected.type);
  const shownStrikes = STRIKES.filter(
    (strike) => strikeFilter === "all" || Math.abs(strike - expiry.future) <= 4,
  );
  const showCalls = typeFilter !== "put";
  const showPuts = typeFilter !== "call";
  const legValues = legs.map((leg) => ({
    ...leg,
    quote: quoteFor(expiry, leg.strike, leg.type),
  }));
  let strategyError = "";
  if (
    legs.some(
      (leg) =>
        !Number.isFinite(leg.quantity) ||
        leg.quantity === 0 ||
        !Number.isInteger(leg.quantity) ||
        Math.abs(leg.quantity) > 100,
    )
  ) {
    strategyError =
      "Use a whole signed quantity from −100 to 100, excluding zero, for every leg.";
  } else if (
    template === "put-spread" &&
    (legs.length !== 2 ||
      legs.some((leg) => leg.type !== "put") ||
      legs[0].strike === legs[1].strike ||
      legs[0].quantity !== -legs[1].quantity)
  ) {
    strategyError =
      "A put spread needs two put legs at different strikes, with equal and opposite quantities.";
  } else if (
    template === "collar" &&
    (legs.length !== 2 ||
      !legs.some((leg) => leg.type === "put" && leg.quantity > 0) ||
      !legs.some((leg) => leg.type === "call" && leg.quantity < 0) ||
      !Number.isInteger(futureQuantity) ||
      futureQuantity <= 0 ||
      futureQuantity > 100 ||
      legs.some((leg) => Math.abs(leg.quantity) !== futureQuantity))
  ) {
    strategyError =
      "This long-futures collar needs one long put, one short call and equal positive futures exposure.";
  } else if (legValues.some((leg) => leg.quote.mark === null)) {
    strategyError =
      "A selected leg has no valid midpoint because its bid is missing. Choose another strike.";
  }
  const premium = legValues.reduce(
    (total, leg) => total + leg.quantity * (leg.quote.mark ?? 0),
    0,
  );
  const greeks = legValues.reduce(
    (total, leg) => ({
      delta: total.delta + leg.quantity * leg.quote.delta,
      gamma: total.gamma + leg.quantity * leg.quote.gamma,
      theta: total.theta + leg.quantity * leg.quote.theta,
      vega: total.vega + leg.quantity * leg.quote.vega,
    }),
    {
      delta: template === "collar" ? futureQuantity : 0,
      gamma: 0,
      theta: 0,
      vega: 0,
    },
  );

  const surfacePoints = useMemo(
    () =>
      EXPIRIES.flatMap((item, expiryIndex) =>
        STRIKES.map((strike, strikeIndex) => ({
          id: `${expiryIndex}-${strikeIndex}`,
          expiry: item,
          strike,
          iv: quoteFor(item, strike, "call").iv,
        })),
      ),
    [],
  );
  const visiblePoints = surfacePoints.filter(
    (point) => surfaceExpiry === "all" || point.expiry.id === surfaceExpiry,
  );
  const inspectedPoint =
    visiblePoints.find((point) => point.id === pointId) ??
    visiblePoints[3] ??
    visiblePoints[0];
  const scale = zoom / 100;
  function project(strike: number, days: number, iv: number) {
    const x = (strike - 83) * 23;
    const y = (days - 51) * 5.4;
    const z = (iv - 25.5) * 15;
    const radYaw = (rotation * Math.PI) / 180;
    const radPitch = (pitch * Math.PI) / 180;
    const rx = x * Math.cos(radYaw) - y * Math.sin(radYaw);
    const ry = x * Math.sin(radYaw) + y * Math.cos(radYaw);
    return {
      x: 390 + rx * scale,
      y: 242 + (ry * Math.sin(radPitch) - z * Math.cos(radPitch)) * scale,
      depth: ry * Math.cos(radPitch) + z * Math.sin(radPitch),
    };
  }

  const meshData = useMemo(() => {
    const daySteps = [37, 44, 51, 58, 65];
    const grid = daySteps.map((d) => {
      const t = (d - 37) / (65 - 37);
      return STRIKES.map((strike) => {
        const iv0 = quoteFor(EXPIRIES[0], strike, "call").iv;
        const iv1 = quoteFor(EXPIRIES[1], strike, "call").iv;
        return {
          strike,
          days: d,
          iv: iv0 + (iv1 - iv0) * t,
        };
      });
    });
    const quads: {
      id: string;
      corners: { strike: number; days: number; iv: number }[];
      avgIv: number;
    }[] = [];
    for (let r = 0; r < grid.length - 1; r++) {
      for (let c = 0; c < grid[r].length - 1; c++) {
        const p0 = grid[r][c];
        const p1 = grid[r][c + 1];
        const p2 = grid[r + 1][c + 1];
        const p3 = grid[r + 1][c];
        quads.push({
          id: `quad-${r}-${c}`,
          corners: [p0, p1, p2, p3],
          avgIv: (p0.iv + p1.iv + p2.iv + p3.iv) / 4,
        });
      }
    }
    return { grid, quads };
  }, []);
  function makeRule(type: OptionType, strike: number) {
    const quote = quoteFor(expiry, strike, type);
    const value = quote[priceField];
    if (value === null) return;
    onCreateRule({
      name: `${expiry.reference} ${expiry.label} ${strike} ${type} · ${priceField}`,
      instrument: expiry.underlying,
      status: "draft",
      join: "AND",
      conditions: [
        {
          id: `option-${expiry.id}-${strike}-${type}`,
          metric: "option_premium",
          operator: "crosses_above",
          threshold: Number(value.toFixed(3)),
          period: 20,
          slowPeriod: 50,
          windowBars: 1,
          optionType: type,
          strike,
          priceField,
          optionExpiry: expiry.id,
          optionUnderlying: expiry.underlying,
        },
      ],
    });
  }
  function updateLeg(id: number, patch: Partial<Leg>) {
    setLegs((current) =>
      current.map((leg) => (leg.id === id ? { ...leg, ...patch } : leg)),
    );
  }
  function chooseTemplate(next: Template) {
    setTemplate(next);
    setLegs(templateLegs(next));
    setFutureQuantity(1);
  }
  function renderQuoteCells(type: OptionType, strike: number) {
    const quote = quoteFor(expiry, strike, type);
    const action = (
      <button
        className="option-rule-button"
        type="button"
        onClick={() => makeRule(type, strike)}
        disabled={quote[priceField] === null}
        aria-label={`Create ${strike} ${type} ${priceField} rule`}
        title={
          quote[priceField] === null
            ? `${priceField} unavailable; no fallback will be used`
            : `Draft a ${type} premium rule using ${priceField}`
        }
      >
        <Plus size={13} /> Rule
      </button>
    );
    const cells = [
      <td key="bid" className="opt-number">
        {number(quote.bid)}
      </td>,
      <td key="ask" className="opt-number">
        {number(quote.ask)}
      </td>,
      <td key="mark" className="opt-number">
        <button
          type="button"
          className={`quote-inspect ${selected.strike === strike && selected.type === type ? "selected" : ""}`}
          onClick={() => setSelected({ strike, type })}
          aria-label={`Inspect ${strike} ${type} quote`}
        >
          {number(quote.mark)}
        </button>
      </td>,
      <td key="iv" className="opt-number">
        {number(quote.iv, 1)}%
      </td>,
      <td key="delta" className="opt-number muted">
        {signed(quote.delta)}
      </td>,
    ];
    return type === "call"
      ? [<td key="action">{action}</td>, ...cells]
      : [...cells, <td key="action">{action}</td>];
  }

  return (
    <div className="options-lab">
      <section
        className="panel options-chain-panel"
        aria-labelledby="options-title"
      >
        <div className="panel-heading options-panel-heading">
          <div>
            <div className="eyebrow">Options lab</div>
            <h2 id="options-title">Options ladder & volatility</h2>
            <p className="muted options-subtitle">
              Inspect premiums, build signed exposures and explore the
              volatility smile.
            </p>
          </div>
          <div className="options-view-switch" aria-label="Options view">
            <button
              type="button"
              aria-pressed={view === "chain"}
              onClick={() => setView("chain")}
            >
              <Layers3 size={15} /> Options ladder
            </button>
            <button
              type="button"
              aria-pressed={view === "surface"}
              onClick={() => setView("surface")}
            >
              <ScanLine size={15} /> IV surface
            </button>
          </div>
        </div>
        <div className="options-toolbar">
          <label>
            Option expiry
            <select
              value={expiryId}
              onChange={(event) => {
                setExpiryId(event.target.value);
                setSelected({ strike: 84, type: "call" });
              }}
            >
              {EXPIRIES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label} · {item.days} days
                </option>
              ))}
            </select>
          </label>
          <div className="options-reference">
            <span>Underlying futures reference</span>
            <strong>
              {expiry.reference}{" "}
              <span className="opt-number">{expiry.future.toFixed(2)}</span>
            </strong>
            <small>USD/bbl · illustrative contract mapping</small>
          </div>
          <div className="options-snapshot">
            <span className="badge badge-purple">Synthetic snapshot</span>
            <span>{SNAPSHOT}</span>
          </div>
        </div>

        {view === "chain" ? (
          <>
            <div className="options-chain-controls">
              <div className="options-inline-fields">
                <label>
                  Rule price field
                  <select
                    value={priceField}
                    onChange={(event) =>
                      setPriceField(event.target.value as PriceField)
                    }
                  >
                    <option value="mark">Midpoint mark</option>
                    <option value="bid">Bid</option>
                    <option value="ask">Ask</option>
                    <option value="last">Last</option>
                  </select>
                </label>
                <label>
                  Option side
                  <select
                    value={typeFilter}
                    onChange={(event) =>
                      setTypeFilter(event.target.value as "all" | OptionType)
                    }
                  >
                    <option value="all">Calls + puts</option>
                    <option value="call">Calls only</option>
                    <option value="put">Puts only</option>
                  </select>
                </label>
                <label>
                  Strikes
                  <select
                    value={strikeFilter}
                    onChange={(event) => setStrikeFilter(event.target.value)}
                  >
                    <option value="all">All 8 strikes</option>
                    <option value="near">Within $4 of reference</option>
                  </select>
                </label>
              </div>
              <span className="options-table-count">
                {shownStrikes.length} strikes · USD/bbl
              </span>
            </div>
            <div
              className="table-wrap options-chain-scroll"
              tabIndex={0}
              aria-label="Options ladder, scroll horizontally for all columns"
            >
              <table className="options-chain">
                <caption className="opt-sr-only">
                  Synthetic options chain for {expiry.label}, underlying{" "}
                  {expiry.reference}. Mark is midpoint when both quote sides are
                  available. Rule actions use the chosen {priceField} field.
                </caption>
                <thead>
                  <tr className="option-side-heading">
                    {showCalls && (
                      <th colSpan={6} scope="colgroup">
                        <span className="calls-label">
                          <ArrowUpRight size={14} /> Calls
                        </span>
                      </th>
                    )}
                    <th className="strike-column" scope="col">
                      Strike
                    </th>
                    {showPuts && (
                      <th colSpan={6} scope="colgroup">
                        <span className="puts-label">
                          Puts <ArrowDownLeft size={14} />
                        </span>
                      </th>
                    )}
                  </tr>
                  <tr>
                    {showCalls && (
                      <>
                        <th scope="col">Draft rule</th>
                        <th scope="col">Bid</th>
                        <th scope="col">Ask</th>
                        <th scope="col">Mark</th>
                        <th scope="col">IV</th>
                        <th scope="col">Delta</th>
                      </>
                    )}
                    <th className="strike-column" scope="col">
                      USD/bbl
                    </th>
                    {showPuts && (
                      <>
                        <th scope="col">Bid</th>
                        <th scope="col">Ask</th>
                        <th scope="col">Mark</th>
                        <th scope="col">IV</th>
                        <th scope="col">Delta</th>
                        <th scope="col">Draft rule</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {shownStrikes.map((strike) => (
                    <tr
                      key={strike}
                      className={
                        Math.abs(strike - expiry.future) < 1
                          ? "near-reference"
                          : ""
                      }
                    >
                      {showCalls && renderQuoteCells("call", strike)}
                      <th scope="row" className="strike-column">
                        {strike.toFixed(2)}
                        {Math.abs(strike - expiry.future) < 1 && (
                          <span
                            className="reference-marker"
                            title="Nearest listed strike to the futures reference"
                          >
                            ATM vicinity
                          </span>
                        )}
                      </th>
                      {showPuts && renderQuoteCells("put", strike)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="option-quote-detail">
              <div className="option-detail-name">
                <span className="eyebrow">Inspected quote</span>
                <strong>
                  {selected.strike.toFixed(2)}{" "}
                  {selected.type === "call" ? "Call" : "Put"}
                </strong>
                <span>{expiry.label}</span>
              </div>
              <dl>
                <div>
                  <dt>Last</dt>
                  <dd>{number(selectedQuote.last)}</dd>
                </div>
                <div>
                  <dt>Bid–ask spread</dt>
                  <dd>
                    {selectedQuote.bid === null
                      ? "Unavailable"
                      : number(selectedQuote.ask - selectedQuote.bid)}
                  </dd>
                </div>
                <div>
                  <dt>Gamma / $1</dt>
                  <dd>{number(selectedQuote.gamma, 3)}</dd>
                </div>
                <div>
                  <dt>Theta / day</dt>
                  <dd>{signed(selectedQuote.theta, 3)}</dd>
                </div>
                <div>
                  <dt>Vega / vol pt</dt>
                  <dd>{number(selectedQuote.vega, 3)}</dd>
                </div>
                <div>
                  <dt>Volume / OI</dt>
                  <dd>
                    {selectedQuote.volume.toLocaleString("en-GB")} /{" "}
                    {selectedQuote.oi.toLocaleString("en-GB")}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="options-note">
              <CircleHelp size={15} />
              <p>
                Prices and Greeks are supplied illustrative fixtures. Mark =
                (bid + ask) / 2. The 90 put has no bid or last, so its midpoint
                and last-price rule are unavailable. No silent price fallback.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="surface-toolbar">
              <div>
                <h3>Volatility by strike and time</h3>
                <p className="muted">
                  Solid dots: supplied synthetic IV · mesh: visual interpolation
                  only
                </p>
              </div>
              <label>
                Surface expiries
                <select
                  value={surfaceExpiry}
                  onChange={(event) => setSurfaceExpiry(event.target.value)}
                >
                  <option value="all">Both synthetic expiries</option>
                  {EXPIRIES.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="surface-layout">
              <div className="surface-plot">
                <div className="surface-hud-toolbar">
                  <div className="surface-hud-left">
                    <span className="surface-hud-pill">
                      <span className="surface-hud-dot" />
                      3D Interactive Surface
                    </span>
                    <span className="surface-hud-hint">
                      ✦ Drag cursor to rotate 3D • Scroll to zoom • Double-click
                      to reset
                    </span>
                  </div>
                  <div className="surface-hud-presets">
                    <button
                      type="button"
                      className={`surface-preset-btn ${rotation === 34 && pitch === 32 ? "active" : ""}`}
                      onClick={() => {
                        setRotation(34);
                        setPitch(32);
                        setZoom(100);
                        setIsAutoRotating(false);
                      }}
                      title="3D Isometric perspective view"
                    >
                      3D Orbit
                    </button>
                    <button
                      type="button"
                      className={`surface-preset-btn ${rotation === 0 && pitch === 16 ? "active" : ""}`}
                      onClick={() => {
                        setRotation(0);
                        setPitch(16);
                        setZoom(105);
                        setIsAutoRotating(false);
                      }}
                      title="Volatility Skew: Front view along expiry"
                    >
                      Smile / Skew
                    </button>
                    <button
                      type="button"
                      className={`surface-preset-btn ${rotation === 70 && pitch === 18 ? "active" : ""}`}
                      onClick={() => {
                        setRotation(70);
                        setPitch(18);
                        setZoom(105);
                        setIsAutoRotating(false);
                      }}
                      title="Term Structure: Side view along strikes"
                    >
                      Term Structure
                    </button>
                    <button
                      type="button"
                      className={`surface-preset-btn ${rotation === 0 && pitch === 72 ? "active" : ""}`}
                      onClick={() => {
                        setRotation(0);
                        setPitch(72);
                        setZoom(100);
                        setIsAutoRotating(false);
                      }}
                      title="Contour Map: Top-down bird's-eye view"
                    >
                      Top View
                    </button>
                    <button
                      type="button"
                      className={`surface-preset-btn orbit-toggle ${isAutoRotating ? "active" : ""}`}
                      onClick={() => setIsAutoRotating((prev) => !prev)}
                      title={
                        isAutoRotating
                          ? "Pause auto-orbit"
                          : "Start continuous auto-orbit"
                      }
                      aria-label="Toggle auto-orbit"
                    >
                      {isAutoRotating ? "⏸ Pause" : "▶ Auto Orbit"}
                    </button>
                  </div>
                </div>

                <svg
                  ref={svgRef}
                  viewBox="0 0 780 370"
                  role="img"
                  aria-labelledby="iv-title iv-description"
                  style={{
                    cursor: isDragging ? "grabbing" : "grab",
                    userSelect: "none",
                    touchAction: "none",
                  }}
                  onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    setIsAutoRotating(false);
                    setIsDragging(true);
                    if (inertiaAnimRef.current) {
                      cancelAnimationFrame(inertiaAnimRef.current);
                      inertiaAnimRef.current = null;
                    }
                    dragRef.current = {
                      startX: e.clientX,
                      startY: e.clientY,
                      startRotation: rotation,
                      startPitch: pitch,
                      lastX: e.clientX,
                      lastY: e.clientY,
                      lastTime: performance.now(),
                      vx: 0,
                      vy: 0,
                    };
                    (e.target as Element).setPointerCapture?.(e.pointerId);
                  }}
                  onPointerMove={(e) => {
                    const now = performance.now();
                    if (dragRef.current && isDragging) {
                      const dx = e.clientX - dragRef.current.startX;
                      const dy = e.clientY - dragRef.current.startY;
                      const dt = Math.max(1, now - dragRef.current.lastTime);
                      const vx = (e.clientX - dragRef.current.lastX) / dt;
                      const vy = (e.clientY - dragRef.current.lastY) / dt;
                      dragRef.current.lastX = e.clientX;
                      dragRef.current.lastY = e.clientY;
                      dragRef.current.lastTime = now;
                      dragRef.current.vx = vx;
                      dragRef.current.vy = vy;

                      const nextRot = Math.max(
                        -60,
                        Math.min(70, dragRef.current.startRotation + dx * 0.35),
                      );
                      const nextPitch = Math.max(
                        12,
                        Math.min(75, dragRef.current.startPitch - dy * 0.3),
                      );
                      setRotation(Math.round(nextRot));
                      setPitch(Math.round(nextPitch));
                    } else {
                      const rect = svgRef.current?.getBoundingClientRect();
                      if (rect) {
                        const mouseSvgX =
                          ((e.clientX - rect.left) / rect.width) * 780;
                        const mouseSvgY =
                          ((e.clientY - rect.top) / rect.height) * 370;
                        let nearestDist = 55;
                        let nearestId: string | null = null;
                        for (const pt of visiblePoints) {
                          const projected = project(
                            pt.strike,
                            pt.expiry.days,
                            pt.iv,
                          );
                          const dist = Math.hypot(
                            projected.x - mouseSvgX,
                            projected.y - mouseSvgY,
                          );
                          if (dist < nearestDist) {
                            nearestDist = dist;
                            nearestId = pt.id;
                          }
                        }
                        setHoveredPointId(nearestId);
                      }
                    }
                  }}
                  onPointerUp={(e) => {
                    if (!isDragging) return;
                    setIsDragging(false);
                    try {
                      (e.target as Element).releasePointerCapture?.(
                        e.pointerId,
                      );
                    } catch {}
                    if (dragRef.current) {
                      let { vx, vy } = dragRef.current;
                      dragRef.current = null;
                      if (Math.abs(vx) > 0.12 || Math.abs(vy) > 0.12) {
                        let curRot = rotation;
                        let curPitch = pitch;
                        const coast = () => {
                          vx *= 0.92;
                          vy *= 0.92;
                          curRot = Math.max(
                            -60,
                            Math.min(70, curRot + vx * 2.2),
                          );
                          curPitch = Math.max(
                            12,
                            Math.min(75, curPitch - vy * 1.8),
                          );
                          setRotation(Math.round(curRot));
                          setPitch(Math.round(curPitch));
                          if (Math.abs(vx) > 0.04 || Math.abs(vy) > 0.04) {
                            inertiaAnimRef.current =
                              requestAnimationFrame(coast);
                          } else {
                            inertiaAnimRef.current = null;
                          }
                        };
                        inertiaAnimRef.current = requestAnimationFrame(coast);
                      }
                    }
                  }}
                  onWheel={(e) => {
                    e.preventDefault();
                    setZoom((z) =>
                      Math.max(80, Math.min(125, z - Math.sign(e.deltaY) * 4)),
                    );
                  }}
                  onDoubleClick={() => {
                    setRotation(34);
                    setPitch(32);
                    setZoom(100);
                    setIsAutoRotating(false);
                  }}
                >
                  <title id="iv-title">
                    Projected three-dimensional synthetic IV surface
                  </title>
                  <desc id="iv-description">
                    Two expiry slices across eight strikes. Use rotation and
                    zoom controls, then select any observed point below to
                    inspect its IV, strike and underlying reference. The data
                    table provides all values.
                  </desc>

                  {/* 3D Floor Grid */}
                  <g className="surface-floor" opacity="0.6">
                    {STRIKES.map((strike) => {
                      const a = project(strike, 37, 23.5);
                      const b = project(strike, 65, 23.5);
                      return (
                        <line
                          key={`floor-s-${strike}`}
                          x1={a.x}
                          y1={a.y}
                          x2={b.x}
                          y2={b.y}
                          stroke="var(--border)"
                          strokeDasharray="2 3"
                        />
                      );
                    })}
                    {[37, 44, 51, 58, 65].map((days) => {
                      const a = project(76, days, 23.5);
                      const b = project(90, days, 23.5);
                      return (
                        <line
                          key={`floor-d-${days}`}
                          x1={a.x}
                          y1={a.y}
                          x2={b.x}
                          y2={b.y}
                          stroke="var(--border)"
                          strokeDasharray="2 3"
                        />
                      );
                    })}
                    {STRIKES.filter((_, i) => i % 2 === 0).map((strike) => {
                      const pt = project(strike, 37, 23.5);
                      return (
                        <text
                          key={`lbl-${strike}`}
                          x={pt.x}
                          y={pt.y + 11}
                          className="surface-floor-tick"
                          textAnchor="middle"
                        >
                          ${strike}
                        </text>
                      );
                    })}
                  </g>

                  {/* Shaded 3D Surface Mesh */}
                  {surfaceExpiry === "all" &&
                    meshData.quads.map((quad) => {
                      const pts = quad.corners.map((c) =>
                        project(c.strike, c.days, c.iv),
                      );
                      const isHovered =
                        hoveredPointId &&
                        quad.corners.some((c) =>
                          visiblePoints.find(
                            (p) =>
                              p.id === hoveredPointId &&
                              p.strike === c.strike &&
                              p.expiry.days === c.days,
                          ),
                        );
                      const hue = Math.max(
                        220,
                        Math.min(295, 260 - (quad.avgIv - 26) * 16),
                      );
                      const lightness = isHovered ? 68 : 58;
                      const opacity = isHovered ? 0.62 : 0.44;
                      return (
                        <polygon
                          key={quad.id}
                          points={pts
                            .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
                            .join(" ")}
                          fill={`hsl(${hue} 52% ${lightness}% / ${opacity})`}
                          stroke="var(--primary)"
                          strokeWidth={isHovered ? "1.3" : "0.75"}
                          strokeOpacity={isHovered ? 0.95 : 0.65}
                          style={{
                            transition: "fill 0.15s ease, stroke 0.15s ease",
                          }}
                        />
                      );
                    })}

                  {/* Primary Expiry Splines */}
                  {EXPIRIES.filter(
                    (item) =>
                      surfaceExpiry === "all" || item.id === surfaceExpiry,
                  ).map((item) => (
                    <polyline
                      key={item.id}
                      points={STRIKES.map((strike) => {
                        const point = project(
                          strike,
                          item.days,
                          quoteFor(item, strike, "call").iv,
                        );
                        return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
                      }).join(" ")}
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth="2"
                    />
                  ))}

                  {/* Projection Drop Line & Floor Shadow for Active Point */}
                  {(() => {
                    const activePt =
                      visiblePoints.find(
                        (p) => p.id === (hoveredPointId || pointId),
                      ) || inspectedPoint;
                    const surf = project(
                      activePt.strike,
                      activePt.expiry.days,
                      activePt.iv,
                    );
                    const floor = project(
                      activePt.strike,
                      activePt.expiry.days,
                      23.5,
                    );
                    return (
                      <g
                        className="surface-projection-group"
                        pointerEvents="none"
                      >
                        <line
                          x1={floor.x}
                          y1={floor.y}
                          x2={surf.x}
                          y2={surf.y}
                          stroke="var(--primary)"
                          strokeWidth="1.2"
                          strokeDasharray="3 3"
                          opacity="0.75"
                        />
                        <ellipse
                          cx={floor.x}
                          cy={floor.y}
                          rx="7"
                          ry="3.5"
                          fill="var(--primary)"
                          opacity="0.35"
                        />
                      </g>
                    );
                  })()}

                  {/* Interactive Nodes */}
                  {visiblePoints.map((point) => {
                    const projected = project(
                      point.strike,
                      point.expiry.days,
                      point.iv,
                    );
                    const isSelected = inspectedPoint.id === point.id;
                    const isHovered = hoveredPointId === point.id;
                    return (
                      <g key={point.id} className="surface-node-group">
                        {isSelected && (
                          <circle
                            cx={projected.x}
                            cy={projected.y}
                            r={9}
                            fill="none"
                            stroke="var(--primary)"
                            strokeWidth="1.5"
                            opacity="0.6"
                          />
                        )}
                        <circle
                          cx={projected.x}
                          cy={projected.y}
                          r={isSelected ? 6.5 : isHovered ? 5.5 : 3.8}
                          fill={
                            isSelected
                              ? "var(--ink)"
                              : isHovered
                                ? "var(--primary-light)"
                                : "var(--primary)"
                          }
                          stroke="#ffffff"
                          strokeWidth={isSelected ? 2 : 1.4}
                          style={{ cursor: "pointer" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPointId(point.id);
                          }}
                          onMouseEnter={() => {
                            setPointId(point.id);
                            setHoveredPointId(point.id);
                          }}
                          onMouseLeave={() => setHoveredPointId(null)}
                        >
                          <title>
                            {point.strike} strike, {point.expiry.label},{" "}
                            {point.iv.toFixed(2)}% IV
                          </title>
                        </circle>
                      </g>
                    );
                  })}

                  {/* Point Label / Inspector Tooltip */}
                  {(() => {
                    const activePt =
                      visiblePoints.find(
                        (p) => p.id === (hoveredPointId || pointId),
                      ) || inspectedPoint;
                    const point = project(
                      activePt.strike,
                      activePt.expiry.days,
                      activePt.iv,
                    );
                    const x = Math.min(640, Math.max(16, point.x + 12));
                    const y = Math.max(22, point.y - 36);
                    return (
                      <g
                        className="surface-point-label"
                        aria-hidden="true"
                        pointerEvents="none"
                      >
                        <rect x={x} y={y} width="124" height="30" rx="6" />
                        <text x={x + 10} y={y + 19}>
                          {activePt.strike} · {activePt.iv.toFixed(2)}% IV
                        </text>
                      </g>
                    );
                  })()}

                  <text x="28" y="39" className="surface-axis-title">
                    IMPLIED VOLATILITY (%)
                  </text>
                  <text x="24" y="61" className="surface-axis-note">
                    Synthetic inputs · no pricing model
                  </text>
                  <text x="465" y="348" className="surface-axis-title">
                    STRIKE (USD/bbl)
                  </text>
                  <text x="52" y="318" className="surface-axis-title">
                    TIME TO EXPIRY (days)
                  </text>
                </svg>

                <div className="surface-controls">
                  <label>
                    Rotation <strong>{rotation}°</strong>
                    <span className="surface-drag-hint">↔ drag left/right</span>
                    <input
                      aria-label="Surface rotation"
                      type="range"
                      min="-60"
                      max="70"
                      value={rotation}
                      onChange={(event) =>
                        setRotation(Number(event.target.value))
                      }
                    />
                  </label>
                  <label>
                    Pitch <strong>{pitch}°</strong>
                    <span className="surface-drag-hint">↕ drag up/down</span>
                    <input
                      aria-label="Surface pitch"
                      type="range"
                      min="12"
                      max="75"
                      value={pitch}
                      onChange={(event) => setPitch(Number(event.target.value))}
                    />
                  </label>
                  <label>
                    Zoom <strong>{zoom}%</strong>
                    <span className="surface-drag-hint">scroll wheel</span>
                    <input
                      aria-label="Surface zoom"
                      type="range"
                      min="80"
                      max="125"
                      value={zoom}
                      onChange={(event) => setZoom(Number(event.target.value))}
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setRotation(34);
                      setPitch(32);
                      setZoom(100);
                      setIsAutoRotating(false);
                    }}
                  >
                    <RotateCcw size={14} /> Reset view
                  </button>
                </div>
              </div>
              <aside className="surface-inspector">
                <span className="eyebrow">Point inspector</span>
                <label>
                  Observed point
                  <select
                    value={inspectedPoint.id}
                    onChange={(event) => setPointId(event.target.value)}
                  >
                    {visiblePoints.map((point) => (
                      <option key={point.id} value={point.id}>
                        {point.expiry.label} · {point.strike} strike
                      </option>
                    ))}
                  </select>
                </label>
                <div className="surface-iv-value">
                  {inspectedPoint.iv.toFixed(2)}
                  <span>% IV</span>
                </div>
                <dl>
                  <div>
                    <dt>Underlying</dt>
                    <dd>{inspectedPoint.expiry.reference}</dd>
                  </div>
                  <div>
                    <dt>Futures reference</dt>
                    <dd>${inspectedPoint.expiry.future.toFixed(2)}/bbl</dd>
                  </div>
                  <div>
                    <dt>K / futures</dt>
                    <dd>
                      {(
                        inspectedPoint.strike / inspectedPoint.expiry.future
                      ).toFixed(4)}
                    </dd>
                  </div>
                  <div>
                    <dt>Time to expiry</dt>
                    <dd>{inspectedPoint.expiry.days} calendar days</dd>
                  </div>
                  <div>
                    <dt>Source quote</dt>
                    <dd>
                      {inspectedPoint.strike} call · mark{" "}
                      {number(
                        quoteFor(
                          inspectedPoint.expiry,
                          inspectedPoint.strike,
                          "call",
                        ).mark,
                      )}
                    </dd>
                  </div>
                </dl>
                <p className="muted">
                  Snapshot: {SNAPSHOT}. Day count: calendar days from 19 Oct
                  2026; maturity convention is illustrative.
                </p>
              </aside>
            </div>
            <details className="surface-data-details">
              <summary>
                View {visiblePoints.length} supplied IV points as a table
              </summary>
              <div
                className="table-wrap"
                tabIndex={0}
                aria-label="Surface data, scroll horizontally"
              >
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Option expiry</th>
                      <th scope="col">Underlying</th>
                      <th scope="col">Strike</th>
                      <th scope="col">K / futures</th>
                      <th scope="col">Days</th>
                      <th scope="col">Supplied IV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiblePoints.map((point) => (
                      <tr key={point.id}>
                        <td>{point.expiry.label}</td>
                        <td>{point.expiry.reference}</td>
                        <td>{point.strike.toFixed(2)}</td>
                        <td>
                          {(point.strike / point.expiry.future).toFixed(4)}
                        </td>
                        <td>{point.expiry.days}</td>
                        <td>{point.iv.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
            <div className="options-note">
              <CircleHelp size={15} />
              <p>
                The smile shows IV variation across strikes; the two expiry
                slices show a sparse term structure. Inspect a supplied point by
                hovering or using the point selector and data table. No market
                conclusion is implied.
              </p>
            </div>
          </>
        )}
      </section>

      <section
        className="panel strategy-panel"
        aria-labelledby="strategy-title"
      >
        <div className="panel-heading">
          <div>
            <div className="eyebrow">Position workshop</div>
            <h2 id="strategy-title">Strategy builder</h2>
          </div>
          <span className="badge">Illustrative valuation</span>
        </div>
        <div className="strategy-template-bar">
          <div className="strategy-templates" aria-label="Strategy template">
            {(
              [
                ["vanilla", "Vanilla option"],
                ["put-spread", "Put spread"],
                ["collar", "Long-futures collar"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={template === value}
                onClick={() => chooseTemplate(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="muted">Changing template resets the legs.</span>
        </div>
        <div className="strategy-content">
          <div className="strategy-legs">
            <div className="strategy-context">
              {expiry.label} <span>·</span> {expiry.reference} <span>·</span>{" "}
              midpoint marks in USD/bbl
            </div>
            {template === "collar" && (
              <div className="underlying-leg">
                <Layers3 size={17} />
                <div>
                  <strong>Long underlying futures</strong>
                  <span>
                    {expiry.reference} · reference ${expiry.future.toFixed(2)}
                    /bbl
                  </span>
                </div>
                <label>
                  Futures units
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={futureQuantity || ""}
                    onChange={(event) =>
                      setFutureQuantity(Number(event.target.value))
                    }
                    aria-invalid={!!strategyError}
                    aria-describedby={
                      strategyError ? "strategy-error" : undefined
                    }
                  />
                </label>
              </div>
            )}
            {legs.map((leg, index) => (
              <div className="strategy-leg" key={leg.id}>
                <label
                  className={`leg-side-label ${leg.quantity < 0 ? "short" : "long"}`}
                >
                  Position
                  <select
                    aria-label={`Leg ${index + 1} position`}
                    value={leg.quantity < 0 ? "short" : "long"}
                    onChange={(event) =>
                      updateLeg(leg.id, {
                        quantity:
                          (event.target.value === "short" ? -1 : 1) *
                          Math.abs(leg.quantity || 1),
                      })
                    }
                  >
                    <option value="long">Long</option>
                    <option value="short">Short</option>
                  </select>
                </label>
                <label>
                  Leg {index + 1} type
                  <select
                    value={leg.type}
                    onChange={(event) =>
                      updateLeg(leg.id, {
                        type: event.target.value as OptionType,
                      })
                    }
                  >
                    <option value="call">Call</option>
                    <option value="put">Put</option>
                  </select>
                </label>
                <label>
                  Strike
                  <select
                    value={leg.strike}
                    onChange={(event) =>
                      updateLeg(leg.id, { strike: Number(event.target.value) })
                    }
                  >
                    {STRIKES.map((strike) => (
                      <option key={strike} value={strike}>
                        {strike.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Quantity
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={Math.abs(leg.quantity) || ""}
                    onChange={(event) =>
                      updateLeg(leg.id, {
                        quantity:
                          Number(event.target.value) *
                          (leg.quantity < 0 ? -1 : 1),
                      })
                    }
                    aria-invalid={!!strategyError}
                    aria-describedby={
                      strategyError ? "strategy-error" : undefined
                    }
                  />
                </label>
                <button
                  type="button"
                  className="icon-button remove-leg"
                  aria-label={`Remove leg ${index + 1}`}
                  title={`Remove leg ${index + 1}`}
                  disabled={legs.length === 1}
                  onClick={() =>
                    setLegs((current) =>
                      current.filter((item) => item.id !== leg.id),
                    )
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <div className="strategy-leg-actions">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={legs.length >= 4}
                onClick={() =>
                  setLegs((current) => [
                    ...current,
                    {
                      id: Math.max(...current.map((leg) => leg.id)) + 1,
                      type: "call",
                      strike: 86,
                      quantity: 1,
                    },
                  ])
                }
              >
                <Plus size={14} /> Add option leg
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => chooseTemplate(template)}
              >
                <RotateCcw size={13} /> Reset template
              </button>
            </div>
            {strategyError && (
              <p className="strategy-error" id="strategy-error" role="status">
                {strategyError}
              </p>
            )}
            <div className="strategy-formula">
              <span className="eyebrow">Option premium formula</span>
              <code>
                {legValues
                  .map(
                    (leg, index) =>
                      `${index === 0 ? "" : leg.quantity >= 0 ? " + " : " − "}${index === 0 && leg.quantity < 0 ? "−" : ""}${Math.abs(leg.quantity)} × ${number(leg.quote.mark)}`,
                  )
                  .join("")}{" "}
                USD/bbl
              </code>
              <span>
                Signed quantity × midpoint, summed across option legs.
              </span>
            </div>
          </div>
          <aside className="strategy-valuation">
            <span className="eyebrow">Option-only signed premium</span>
            <div className="strategy-premium">
              {strategyError ? "—" : signed(premium)}
              <span>USD/bbl</span>
            </div>
            <span
              className={`premium-direction ${premium >= 0 ? "debit" : "credit"}`}
            >
              {strategyError
                ? "Valuation unavailable"
                : premium > 0
                  ? "Debit to establish"
                  : premium < 0
                    ? "Credit to establish"
                    : "Flat option premium"}
            </span>
            <dl className="strategy-net-greeks">
              <div>
                <dt>Net delta</dt>
                <dd>{strategyError ? "—" : signed(greeks.delta, 3)}</dd>
              </div>
              <div>
                <dt>Net gamma / $1</dt>
                <dd>{strategyError ? "—" : signed(greeks.gamma, 3)}</dd>
              </div>
              <div>
                <dt>Net theta / day</dt>
                <dd>{strategyError ? "—" : signed(greeks.theta, 3)}</dd>
              </div>
              <div>
                <dt>Net vega / vol pt</dt>
                <dd>{strategyError ? "—" : signed(greeks.vega, 3)}</dd>
              </div>
            </dl>
            <p>
              Per compatible unit.{" "}
              {template === "collar"
                ? "Net delta includes the long futures exposure; premium includes options only."
                : "Positive quantity is long; negative quantity is short."}{" "}
              Cash premium is unavailable until the contract multiplier is
              verified.
            </p>
          </aside>
        </div>
        <details className="strategy-breakdown" open>
          <summary>Signed leg-to-net reconciliation</summary>
          <div
            className="table-wrap"
            tabIndex={0}
            aria-label="Signed leg breakdown, scroll horizontally"
          >
            <table>
              <caption className="opt-sr-only">
                Each Greek is multiplied by the signed quantity. Gamma units are
                per USD/bbl, theta USD/bbl per calendar day, vega USD/bbl per
                one volatility point.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Leg · common expiry {expiry.label}</th>
                  <th scope="col">Signed qty</th>
                  <th scope="col">Premium</th>
                  <th scope="col">Delta</th>
                  <th scope="col">Gamma</th>
                  <th scope="col">Theta / day</th>
                  <th scope="col">Vega / vol pt</th>
                </tr>
              </thead>
              <tbody>
                {template === "collar" && (
                  <tr>
                    <td>{expiry.reference} futures</td>
                    <td>{signed(futureQuantity, 0)}</td>
                    <td>Excluded</td>
                    <td>{signed(futureQuantity, 3)}</td>
                    <td>0.000</td>
                    <td>0.000</td>
                    <td>0.000</td>
                  </tr>
                )}
                {legValues.map((leg) => (
                  <tr key={leg.id}>
                    <td>
                      {leg.strike.toFixed(2)} {leg.type}
                    </td>
                    <td>{signed(leg.quantity, 0)}</td>
                    <td>
                      {leg.quote.mark === null
                        ? "Unavailable"
                        : signed(leg.quantity * leg.quote.mark)}
                    </td>
                    <td>{signed(leg.quantity * leg.quote.delta, 3)}</td>
                    <td>{signed(leg.quantity * leg.quote.gamma, 3)}</td>
                    <td>{signed(leg.quantity * leg.quote.theta, 3)}</td>
                    <td>{signed(leg.quantity * leg.quote.vega, 3)}</td>
                  </tr>
                ))}
                <tr className="strategy-total">
                  <th scope="row">Net position</th>
                  <td>—</td>
                  <td>{strategyError ? "Unavailable" : signed(premium)}</td>
                  <td>{strategyError ? "—" : signed(greeks.delta, 3)}</td>
                  <td>{strategyError ? "—" : signed(greeks.gamma, 3)}</td>
                  <td>{strategyError ? "—" : signed(greeks.theta, 3)}</td>
                  <td>{strategyError ? "—" : signed(greeks.vega, 3)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>
        <div className="options-note options-replay-note">
          <CircleHelp size={15} />
          <p>
            <strong>Historical options replay is unavailable.</strong> This demo
            has no option-level history. Premium rules open as drafts; futures
            bars cannot supply evidence for an option rule. Exercise style,
            multiplier, model and exchange expiry conventions still require
            verification.
          </p>
        </div>
      </section>
    </div>
  );
}
