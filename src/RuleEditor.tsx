import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Flame,
  Plus,
  Sliders,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trash2,
  Zap,
} from "lucide-react";
import type { Condition, Rule } from "./types";
import { parseIdea, summarize } from "./domain";
import { instruments } from "./fixtures";
import { Modal } from "./ui";

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
    const contract = instruments.find((i) => i.id === draft.instrument)?.short ?? "Brent";
    if (type === "breakout") {
      setDraft({
        ...draft,
        name: `${contract} breaks above $110.00`,
        conditions: [
          {
            ...baseCondition("price"),
            operator: "crosses_above",
            threshold: 110.0,
          },
        ],
      });
    } else if (type === "drop") {
      setDraft({
        ...draft,
        name: `${contract} drops below $105.00`,
        conditions: [
          {
            ...baseCondition("price"),
            operator: "crosses_below",
            threshold: 105.0,
          },
        ],
      });
    } else if (type === "ma_cross") {
      setDraft({
        ...draft,
        name: `${contract} SMA 9/21 bullish crossover`,
        conditions: [
          {
            ...baseCondition("sma_cross"),
            operator: "crosses_above",
            threshold: 0,
            period: 9,
            slowPeriod: 21,
          },
        ],
      });
    } else if (type === "percent") {
      setDraft({
        ...draft,
        name: `${contract} +1.5% momentum move`,
        conditions: [
          {
            ...baseCondition("percent_change"),
            operator: "above",
            threshold: 1.5,
            windowBars: 12,
          },
        ],
      });
    }
    setError("");
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
      ...proposal.rule,
      id: draft.id,
      version: draft.version,
      name: proposal.rule?.name ?? draft.name,
    });
    setError("");
    setIdea("");
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

  return (
    <>
      <Modal
        title={
          initial.version > 1 ? "Edit rule · new version" : "Create an alert rule"
        }
        onClose={close}
        drawer
      >
        <form ref={form} noValidate onSubmit={submit} className="rule-form">
          {/* Top Mode Switcher */}
          <div className="rule-mode-switch" role="tablist">
            <button
              type="button"
              className={mode === "guided" ? "active" : ""}
              onClick={() => setMode("guided")}
            >
              <Zap size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
              Visual templates (Simple)
            </button>
            <button
              type="button"
              className={mode === "describe" ? "active" : ""}
              onClick={() => setMode("describe")}
            >
              <Sparkles size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
              Describe with text (Shortcut)
            </button>
          </div>

          {mode === "describe" ? (
            <div style={{ marginBottom: "16px" }}>
              <p className="muted small" style={{ margin: "0 0 10px" }}>
                Type your idea in plain English or click a starter suggestion below. The system fills the form for your review.
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
                <span className="eyebrow" style={{ display: "block", marginBottom: "8px" }}>
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
                    onClick={() => parse("percent change above 1.5% over 12 bars")}
                  >
                    <span>📊 1.5% momentum move over 12 bars</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Quick Template Starter Chips */}
              <div>
                <span className="eyebrow" style={{ display: "block", marginBottom: "6px" }}>
                  CHOOSE A STARTER TEMPLATE
                </span>
                <div className="template-chips">
                  <button
                    type="button"
                    className={`template-chip ${primaryCondition?.metric === "price" && primaryCondition?.operator === "crosses_above" ? "active" : ""}`}
                    onClick={() => applyTemplate("breakout")}
                  >
                    <Zap size={13} /> Price breakout
                  </button>
                  <button
                    type="button"
                    className={`template-chip ${primaryCondition?.metric === "price" && primaryCondition?.operator === "crosses_below" ? "active" : ""}`}
                    onClick={() => applyTemplate("drop")}
                  >
                    <TrendingDown size={13} /> Price drop
                  </button>
                  <button
                    type="button"
                    className={`template-chip ${primaryCondition?.metric === "sma_cross" ? "active" : ""}`}
                    onClick={() => applyTemplate("ma_cross")}
                  >
                    <TrendingUp size={13} /> MA crossover
                  </button>
                  <button
                    type="button"
                    className={`template-chip ${primaryCondition?.metric === "percent_change" ? "active" : ""}`}
                    onClick={() => applyTemplate("percent")}
                  >
                    <Flame size={13} /> % Change move
                  </button>
                </div>
              </div>

              {/* Prominent Live Plain English Summary Card */}
              <div className="rule-live-card">
                <div className="rule-live-badge">ALERT CONDITION PREVIEW</div>
                <div className="rule-live-sentence">{summarize(draft)}</div>
                <small>Triggered using completed {draft.timeframe ?? "5m"} bar closes. Verified deterministically.</small>
              </div>

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
                Futures contract
                <select
                  value={draft.instrument}
                  disabled={draft.conditions.some((c) => c.metric === "option_premium")}
                  onChange={(e) => setDraft({ ...draft, instrument: e.target.value })}
                >
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
                      {index ? `ADDITIONAL CONDITION ${index + 1}` : "TRIGGER CONDITION"}
                    </span>
                    {draft.conditions.length > 1 && (
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Remove condition ${index + 1}`}
                        onClick={() =>
                          setDraft({
                            ...draft,
                            conditions: draft.conditions.filter((x) => x.id !== c.id),
                          })
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

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
                      <option value="percent_change">Percentage change · %</option>
                      <option value="sma_cross">Simple Moving Average (SMA)</option>
                      <option value="ema_cross">Exponential Moving Average (EMA)</option>
                      {c.metric === "option_premium" && (
                        <option value="option_premium">Option premium · USD/bbl</option>
                      )}
                    </select>
                  </label>

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
                            aria-describedby={fieldErrors[c.id] ? `error-${c.id}` : undefined}
                            value={c.period}
                            onChange={(e) => update(c.id, { period: Number(e.target.value) })}
                          />
                          <span>/</span>
                          <input
                            type="number"
                            aria-label={`Slow period ${index + 1}`}
                            value={c.slowPeriod}
                            onChange={(e) => update(c.id, { slowPeriod: Number(e.target.value) })}
                          />
                        </div>
                      </label>
                    ) : (
                      <label className="field">
                        Threshold {c.metric === "percent_change" ? "(%)" : "(USD/bbl)"}
                        <input
                          type="number"
                          step="any"
                          aria-invalid={!!fieldErrors[c.id]}
                          aria-describedby={fieldErrors[c.id] ? `error-${c.id}` : undefined}
                          value={Number.isFinite(c.threshold) ? c.threshold : ""}
                          onChange={(e) =>
                            update(c.id, {
                              threshold: e.target.value === "" ? NaN : Number(e.target.value),
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
                        onChange={(e) => update(c.id, { windowBars: Number(e.target.value) })}
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
              <details className="advanced">
                <summary>
                  ⚙️ Advanced settings (Cooldown, Multiple Conditions, Timeframe)
                </summary>
                <div style={{ marginTop: "12px" }}>
                  <button
                    type="button"
                    className="text-button"
                    style={{ marginBottom: "14px", display: "inline-flex", alignItems: "center", gap: "6px" }}
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
                    Add second condition {draft.conditions.length >= 3 ? "(Max 3)" : ""}
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
                        <option value="crossing">Only when crossing threshold</option>
                        <option value="bar">Once per eligible bar</option>
                        <option value="once">One-shot (disable after 1st alert)</option>
                      </select>
                    </label>

                    <label className="field">
                      Cooldown (minutes)
                      <input
                        type="number"
                        value={draft.cooldownMinutes}
                        min="0"
                        aria-invalid={!!fieldErrors.cooldown}
                        aria-describedby={fieldErrors.cooldown ? "error-cooldown" : undefined}
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
          )}

          {error && (
            <p className="error-message" role="alert" style={{ marginTop: "14px" }}>
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
            Your latest edits have not been saved. The rule draft will remain unchanged.
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
