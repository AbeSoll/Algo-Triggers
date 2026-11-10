import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Flame,
  Plus,
  Sparkles,
  TrendingUp,
  Trash2,
  Zap,
} from "lucide-react";
import type { Condition, Rule } from "./types";
import { parseIdea, summarize } from "./domain";
import { instruments } from "./fixtures";
import { Modal } from "./ui";
const conditionUnit = (condition: Condition) =>
  condition.unit ??
  (["BNO", "USO"].includes(condition.optionUnderlying ?? "")
    ? "USD/share"
    : "USD/bbl");

const baseCondition = (metric: Condition["metric"] = "price"): Condition => ({
  id: crypto.randomUUID(),
  metric,
  operator: "crosses_above",
  threshold: 109.5,
  period: 9,
  slowPeriod: 21,
  windowBars: 12,
});

export function makeRule(
  instrument: string,
  partial: Partial<Rule> = {},
): Rule {
  return {
    id: crypto.randomUUID(),
    version: 1,
    name: "Brent price alert",
    instrument,
    join: "AND",
    conditions: [baseCondition("price")],
    cooldownMinutes: 30,
    frequency: "crossing",
    status: "draft",
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

export default function RuleEditor({
  initial,
  onClose,
  onSave,
}: {
  initial: Rule;
  onClose: () => void;
  onSave: (rule: Rule) => boolean;
}) {
  const [draft, setDraft] = useState<Rule>(() => structuredClone(initial));
  const [mode, setMode] = useState<"guided" | "describe">("guided");
  const [idea, setIdea] = useState("");
  const [error, setError] = useState("");
  const [discard, setDiscard] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const dirty =
    JSON.stringify(draft) !== JSON.stringify(initial) || idea.length > 0;
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);

  const close = () => (dirty ? setDiscard(true) : onClose());

  const update = (id: string, next: Partial<Condition>) =>
    setDraft({
      ...draft,
      conditions: draft.conditions.map((c) =>
        c.id === id ? { ...c, ...next } : c,
      ),
    });

  function applyTemplate(type: "breakout" | "drop" | "ma_cross" | "percent") {
    const next = baseCondition(
      type === "ma_cross"
        ? "sma_cross"
        : type === "percent"
          ? "percent_change"
          : "price",
    );
    const contract =
      instruments.find((i) => i.id === draft.instrument)?.label ??
      draft.instrument;

    let autoName = draft.name;
    if (type === "drop") {
      next.operator = "crosses_below";
      next.threshold = 105;
      autoName = `${contract} drops below $105.00`;
    } else if (type === "breakout") {
      next.threshold = 110;
      autoName = `${contract} crosses above $110.00`;
    } else if (type === "percent") {
      next.operator = "above";
      next.threshold = 1.5;
      autoName = `${contract} +1.5% momentum move`;
    } else if (type === "ma_cross") {
      autoName = `${contract} Fast SMA 9 crosses above Slow SMA 21`;
    }

    setDraft({
      ...draft,
      name: autoName,
      conditions: [
        { ...next, id: draft.conditions[0].id },
        ...draft.conditions.slice(1),
      ],
    });
    setError("");
    setFieldErrors({});
  }

  function parse(customText?: string) {
    const textToParse = customText ?? idea;
    const proposal = parseIdea(textToParse, draft.instrument);
    if (proposal.error) {
      setError(proposal.error);
      return;
    }
    setDraft({
      ...draft,
      conditions: [
        ...(proposal.rule?.conditions ?? []),
        ...draft.conditions.slice(1),
      ],
      id: draft.id,
      version: draft.version,
      name: proposal.rule?.name ?? draft.name,
    });
    setError("");
    setIdea("");
    setFieldErrors({});
    setMode("guided"); // Return to guided form so user sees the filled rule
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!draft.name.trim())
      errors.name = "Name this rule so it is recognizable in event history.";

    draft.conditions.forEach((c) => {
      if (!Number.isFinite(c.threshold))
        errors[c.id] = "Enter a finite threshold.";
      if (
        ["sma_cross", "ema_cross"].includes(c.metric) &&
        (!Number.isInteger(c.period) ||
          !Number.isInteger(c.slowPeriod) ||
          c.period < 2 ||
          c.slowPeriod <= c.period ||
          c.slowPeriod > 150)
      )
        errors[c.id] =
          "Use whole periods: fast ≥ 2, slow greater than fast, up to 150.";
      if (
        c.metric === "percent_change" &&
        (!Number.isInteger(c.windowBars) ||
          c.windowBars < 1 ||
          c.windowBars > 100)
      )
        errors[c.id] = "Use a lookback of 1–100 completed bars.";
    });

    if (!Number.isFinite(draft.cooldownMinutes) || draft.cooldownMinutes < 0)
      errors.cooldown = "Cooldown must be zero or more minutes.";

    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      const advanced = form.current?.querySelector<HTMLDetailsElement>(
        "details.rule-advanced",
      );
      if (advanced && errors.cooldown) advanced.open = true;
      setError("Review the highlighted fields. Your draft is preserved.");
      requestAnimationFrame(() =>
        form.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      );
      return;
    }

    if (onSave({ ...draft, name: draft.name.trim(), status: "draft" })) {
      setError("");
    } else {
      setError(
        "Could not save locally. Keep this draft open and check browser storage.",
      );
    }
  }

  const primaryCondition = draft.conditions[0];
  const isOption = primaryCondition.metric === "option_premium";
  const contract =
    instruments.find((i) => i.id === draft.instrument)?.label ??
    draft.instrument;

  return (
    <>
      <Modal
        title={
          initial.version > 1
            ? "Edit rule · new version"
            : "Create an alert rule"
        }
        onClose={close}
        drawer
      >
        <form ref={form} noValidate onSubmit={submit} className="rule-form">
          <>
            {/* Quick Template Starter Chips */}
            {!isOption && (
              <div>
                <span className="eyebrow">Choose a template</span>
                <div
                  className="template-chips"
                  role="group"
                  aria-label="Rule template"
                >
                  <button
                    type="button"
                    className={`template-chip ${primaryCondition.metric === "price" ? "active" : ""}`}
                    aria-pressed={primaryCondition.metric === "price"}
                    onClick={() => applyTemplate("breakout")}
                  >
                    <Zap size={13} /> Price level
                  </button>
                  <button
                    type="button"
                    className={`template-chip ${primaryCondition.metric === "percent_change" ? "active" : ""}`}
                    aria-pressed={primaryCondition.metric === "percent_change"}
                    onClick={() => applyTemplate("percent")}
                  >
                    <Flame size={13} /> Percentage move
                  </button>
                  <button
                    type="button"
                    className={`template-chip ${["sma_cross", "ema_cross"].includes(primaryCondition.metric) ? "active" : ""}`}
                    aria-pressed={["sma_cross", "ema_cross"].includes(
                      primaryCondition.metric,
                    )}
                    onClick={() => applyTemplate("ma_cross")}
                  >
                    <TrendingUp size={13} /> MA crossover
                  </button>
                </div>
                {draft.conditions.length > 1 && (
                  <p className="hint">
                    Templates and descriptions update the first condition. Your
                    additional conditions stay in place.
                  </p>
                )}
              </div>
            )}

            {/* Prominent Live Plain English Summary Card */}
            <div className="rule-live-card">
              <div className="rule-live-badge">ALERT CONDITION PREVIEW</div>
              <div className="rule-live-sentence">{summarize(draft)}</div>
              <small>
                {contract} ·{" "}
                {isOption
                  ? `${primaryCondition.priceField ?? "mark"} premium`
                  : "completed close"}{" "}
                · {draft.timeframe ?? "5m"} bars
              </small>
              <small>
                {draft.frequency === "once"
                  ? "One alert per monitoring version"
                  : draft.frequency === "bar"
                    ? "Each eligible bar"
                    : "When the condition turns true"}{" "}
                · {draft.cooldownMinutes} min cooldown
              </small>
            </div>

            {isOption && (
              <p className="notice">
                {primaryCondition.optionType?.toUpperCase()}{" "}
                {primaryCondition.strike} · expiry{" "}
                {primaryCondition.optionExpiry} ·{" "}
                {primaryCondition.priceField ?? "mark"} · underlying{" "}
                {primaryCondition.optionUnderlying ?? draft.instrument}.
                Option-history replay and monitoring are unavailable. Save this
                as a draft.
              </p>
            )}

            <p className="hint">
              Saved as a draft. Rule tests and sample monitoring use synthetic
              samples, independently of the market display source.
            </p>
            {/* Essential Fields */}
            <label className="field">
              Rule name
              <input
                name="name"
                aria-label="Rule name"
                value={draft.name}
                aria-invalid={!!fieldErrors.name}
                aria-describedby={fieldErrors.name ? "error-name" : undefined}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
              {fieldErrors.name && (
                <span className="field-error" id="error-name">
                  {fieldErrors.name}
                </span>
              )}
            </label>

            <label className="field">
              {isOption && ["BNO", "USO"].includes(draft.instrument)
                ? "Option underlying"
                : "Futures contract"}
              <select
                value={draft.instrument}
                disabled={draft.conditions.some(
                  (c) => c.metric === "option_premium",
                )}
                onChange={(e) =>
                  setDraft({ ...draft, instrument: e.target.value })
                }
              >
                {isOption && ["BNO", "USO"].includes(draft.instrument) && (
                  <option value={draft.instrument}>
                    {draft.instrument} · Oil fund
                  </option>
                )}
                {instruments.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.label}
                  </option>
                ))}
              </select>
            </label>

            {/* Conditions Builder */}
            {draft.conditions.map((c, index) => (
              <div className="condition-block" key={c.id}>
                {index > 0 && (
                  <div className="condition-join">
                    <label className="sr-only" htmlFor={`join-${index}`}>
                      Join conditions
                    </label>
                    <select
                      id={`join-${index}`}
                      value={draft.join}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          join: e.target.value as "AND" | "OR",
                        })
                      }
                    >
                      <option>AND</option>
                      <option>OR</option>
                    </select>
                  </div>
                )}

                <div className="condition-top">
                  <span className="eyebrow">
                    {index
                      ? `ADDITIONAL CONDITION ${index + 1}`
                      : "TRIGGER CONDITION"}
                  </span>
                  {draft.conditions.length > 1 && (
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Remove condition ${index + 1}`}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          conditions: draft.conditions.filter(
                            (x) => x.id !== c.id,
                          ),
                        })
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {index > 0 || isOption ? (
                  <label className="field">
                    Indicator / Measure
                    <select
                      value={c.metric}
                      disabled={c.metric === "option_premium"}
                      onChange={(e) =>
                        update(c.id, {
                          metric: e.target.value as Condition["metric"],
                        })
                      }
                    >
                      <option value="price">Closing price · USD/bbl</option>
                      <option value="percent_change">
                        Percentage change · %
                      </option>
                      <option value="sma_cross">
                        Simple Moving Average (SMA)
                      </option>
                      <option value="ema_cross">
                        Exponential Moving Average (EMA)
                      </option>
                      {c.metric === "option_premium" && (
                        <option value="option_premium">
                          Option premium · {conditionUnit(c)}
                        </option>
                      )}
                    </select>
                  </label>
                ) : ["sma_cross", "ema_cross"].includes(c.metric) ? (
                  <label className="field">
                    Average method
                    <select
                      value={c.metric}
                      onChange={(e) =>
                        update(c.id, {
                          metric: e.target.value as Condition["metric"],
                        })
                      }
                    >
                      <option value="sma_cross">
                        Simple moving average (SMA)
                      </option>
                      <option value="ema_cross">
                        Exponential moving average (EMA)
                      </option>
                    </select>
                  </label>
                ) : null}

                <div className="field-grid">
                  <label className="field">
                    Condition
                    <select
                      value={c.operator}
                      onChange={(e) =>
                        update(c.id, {
                          operator: e.target.value as Condition["operator"],
                        })
                      }
                    >
                      <option value="crosses_above">Crosses above</option>
                      <option value="crosses_below">Crosses below</option>
                      <option value="above">Is above</option>
                      <option value="below">Is below</option>
                    </select>
                  </label>

                  {["sma_cross", "ema_cross"].includes(c.metric) ? (
                    <label className="field">
                      Fast / slow periods
                      <div className="period-pair">
                        <input
                          type="number"
                          aria-label={`Fast period ${index + 1}`}
                          aria-invalid={!!fieldErrors[c.id]}
                          aria-describedby={
                            fieldErrors[c.id] ? `error-${c.id}` : undefined
                          }
                          value={c.period}
                          onChange={(e) =>
                            update(c.id, { period: Number(e.target.value) })
                          }
                        />
                        <span>/</span>
                        <input
                          type="number"
                          aria-label={`Slow period ${index + 1}`}
                          value={c.slowPeriod}
                          onChange={(e) =>
                            update(c.id, { slowPeriod: Number(e.target.value) })
                          }
                        />
                      </div>
                    </label>
                  ) : (
                    <label className="field">
                      Threshold{" "}
                      {c.metric === "percent_change"
                        ? "(%)"
                        : `(${conditionUnit(c)})`}
                      <input
                        type="number"
                        step="any"
                        aria-invalid={!!fieldErrors[c.id]}
                        aria-describedby={
                          fieldErrors[c.id] ? `error-${c.id}` : undefined
                        }
                        value={Number.isFinite(c.threshold) ? c.threshold : ""}
                        onChange={(e) =>
                          update(c.id, {
                            threshold:
                              e.target.value === ""
                                ? NaN
                                : Number(e.target.value),
                          })
                        }
                      />
                    </label>
                  )}
                </div>

                {c.metric === "percent_change" && (
                  <label className="field">
                    Lookback bars count
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={c.windowBars}
                      onChange={(e) =>
                        update(c.id, { windowBars: Number(e.target.value) })
                      }
                    />
                  </label>
                )}

                {fieldErrors[c.id] && (
                  <span className="field-error" id={`error-${c.id}`}>
                    {fieldErrors[c.id]}
                  </span>
                )}
              </div>
            ))}

            {/* Progressive Disclosure: Advanced Settings Accordion */}
            <details className="advanced rule-advanced">
              <summary>Advanced settings</summary>
              <div style={{ marginTop: "12px" }}>
                <button
                  type="button"
                  className="text-button"
                  style={{
                    marginBottom: "14px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                  disabled={
                    draft.conditions.length >= 3 ||
                    draft.conditions.some((c) => c.metric === "option_premium")
                  }
                  onClick={() =>
                    setDraft({
                      ...draft,
                      conditions: [...draft.conditions, baseCondition("price")],
                    })
                  }
                >
                  <Plus size={14} />
                  Add condition {draft.conditions.length >= 3 ? "(Max 3)" : ""}
                </button>

                <label className="field">
                  Calculation timeframe
                  <select
                    value={draft.timeframe ?? "5m"}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        timeframe: e.target.value as Rule["timeframe"],
                      })
                    }
                  >
                    <option value="5m">5-minute bars</option>
                    <option value="15m">15-minute bars</option>
                    <option value="1h">1-hour bars</option>
                  </select>
                </label>

                <div className="field-grid">
                  <label className="field">
                    Alert frequency
                    <select
                      value={draft.frequency}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          frequency: e.target.value as Rule["frequency"],
                        })
                      }
                    >
                      <option value="crossing">
                        Only when crossing threshold
                      </option>
                      <option value="bar">Once per eligible bar</option>
                      <option value="once">
                        One alert per monitoring version
                      </option>
                    </select>
                  </label>

                  <label className="field">
                    Cooldown (minutes)
                    <input
                      type="number"
                      value={draft.cooldownMinutes}
                      min="0"
                      aria-invalid={!!fieldErrors.cooldown}
                      aria-describedby={
                        fieldErrors.cooldown ? "error-cooldown" : undefined
                      }
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          cooldownMinutes: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>

                {fieldErrors.cooldown && (
                  <p className="field-error" id="error-cooldown">
                    {fieldErrors.cooldown}
                  </p>
                )}
              </div>
            </details>
          </>

          {/* Top Mode Switcher */}
          {!isOption && (
            <details
              className="advanced idea-shortcut"
              open={mode === "describe"}
              onToggle={(e) =>
                setMode(e.currentTarget.open ? "describe" : "guided")
              }
            >
              <summary>
                <Sparkles size={14} /> Describe your idea (optional)
              </summary>
              <div style={{ marginBottom: "16px" }}>
                <p className="muted small" style={{ margin: "0 0 10px" }}>
                  Type your idea in plain English or click a starter suggestion
                  below. Choose Build from description to apply it, then review
                  the form before saving.
                </p>
                <label className="sr-only" htmlFor="rule-idea">
                  Market condition in plain English
                </label>
                <textarea
                  id="rule-idea"
                  className="resize-none"
                  style={{ resize: "none" }}
                  rows={3}
                  placeholder="e.g. Brent crosses above $110.00"
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-primary full"
                  style={{ marginTop: "8px" }}
                  onClick={() => parse()}
                  disabled={!idea.trim()}
                >
                  <Sparkles size={15} />
                  Build from description <ArrowRight size={15} />
                </button>

                <div style={{ marginTop: "18px" }}>
                  <span
                    className="eyebrow"
                    style={{ display: "block", marginBottom: "8px" }}
                  >
                    OR CLICK A POPULAR PRESET
                  </span>
                  <div className="describe-suggestions">
                    <button
                      type="button"
                      className="describe-chip"
                      onClick={() => parse("Brent crosses above $110.00")}
                    >
                      <span>⚡ Brent crosses above $110.00</span>
                      <ArrowRight size={13} />
                    </button>
                    <button
                      type="button"
                      className="describe-chip"
                      onClick={() => parse("Brent crosses below $105.00")}
                    >
                      <span>📉 Brent drops below $105.00</span>
                      <ArrowRight size={13} />
                    </button>
                    <button
                      type="button"
                      className="describe-chip"
                      onClick={() => parse("SMA 9 crosses above SMA 21")}
                    >
                      <span>📈 Fast SMA 9 crosses above Slow SMA 21</span>
                      <ArrowRight size={13} />
                    </button>
                    <button
                      type="button"
                      className="describe-chip"
                      onClick={() =>
                        parse("percent change above 1.5% over 12 bars")
                      }
                    >
                      <span>📊 1.5% momentum move over 12 bars</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </details>
          )}

          {error && (
            <p
              className="error-message"
              role="alert"
              style={{ marginTop: "14px" }}
            >
              {error}
            </p>
          )}

          <div className="modal-actions" style={{ marginTop: "20px" }}>
            <button type="button" className="btn btn-outline" onClick={close}>
              Cancel
            </button>
            <button className="btn btn-primary" type="submit">
              Save rule <ArrowRight size={15} />
            </button>
          </div>
        </form>
      </Modal>

      {discard && (
        <Modal
          title="Discard unsaved changes?"
          onClose={() => setDiscard(false)}
        >
          <p>
            Your latest edits have not been saved. The rule draft will remain
            unchanged.
          </p>
          <div className="modal-actions">
            <button
              className="btn btn-outline"
              autoFocus
              onClick={() => setDiscard(false)}
            >
              Keep editing
            </button>
            <button className="btn btn-danger" onClick={onClose}>
              Discard changes
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
