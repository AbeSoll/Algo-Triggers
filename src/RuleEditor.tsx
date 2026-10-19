import { useEffect, useRef, useState } from "react";
import { ArrowRight, Plus, Sparkles, Trash2 } from "lucide-react";
import type { Condition, Rule } from "./types";
import { parseIdea, summarize } from "./domain";
import { instruments } from "./fixtures";
import { Modal } from "./ui";

const baseCondition = (): Condition => ({
  id: crypto.randomUUID(),
  metric: "price",
  operator: "crosses_above",
  threshold: 82.5,
  period: 20,
  slowPeriod: 50,
  windowBars: 12,
});
export function makeRule(
  instrument: string,
  partial: Partial<Rule> = {},
): Rule {
  return {
    id: crypto.randomUUID(),
    version: 1,
    name: "Brent price breakout",
    instrument,
    join: "AND",
    conditions: [baseCondition()],
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
  function parse() {
    const proposal = parseIdea(idea, draft.instrument);
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
    } else
      setError(
        "Could not save locally. Keep this draft open and check browser storage.",
      );
  }
  return (
    <>
      <Modal
        title={
          initial.version > 1 ? "Edit rule · new version" : "Create a rule"
        }
        onClose={close}
        drawer
      >
        <form ref={form} noValidate onSubmit={submit} className="rule-form">
          <div className="rule-step">
            <span className="step-number">1</span>
            <h3>Describe your idea</h3>
            <span className="badge">Optional</span>
          </div>
          <p className="muted small">
            Use a supported template, then review the exact conditions below.
          </p>
          <label className="sr-only" htmlFor="rule-idea">
            Market condition in plain English
          </label>
          <textarea
            id="rule-idea"
            className="resize-none"
            style={{ resize: "none" }}
            rows={3}
            placeholder="Brent crosses above $82.50"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-outline full"
            onClick={parse}
            disabled={!idea.trim()}
          >
            <Sparkles size={15} />
            Build from description <ArrowRight size={15} />
          </button>
          <p className="hint">
            Templates: “Brent crosses above $82.50”, “SMA 20 crosses below SMA
            50”, or “percent change above 2% over 12 bars”.
          </p>
          <div className="rule-step">
            <span className="step-number">2</span>
            <h3>Define the condition</h3>
          </div>
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
            Instrument
            <select
              value={draft.instrument}
              disabled={draft.conditions.some(
                (c) => c.metric === "option_premium",
              )}
              onChange={(e) =>
                setDraft({ ...draft, instrument: e.target.value })
              }
            >
              {instruments.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.label} · specific futures
                </option>
              ))}
            </select>
          </label>
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
                  IF {index ? `CONDITION ${index + 1}` : "THE MARKET"}
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
              <label className="field">
                Measure
                <select
                  value={c.metric}
                  disabled={c.metric === "option_premium"}
                  onChange={(e) =>
                    update(c.id, {
                      metric: e.target.value as Condition["metric"],
                    })
                  }
                >
                  <option value="price">Futures closing price · USD/bbl</option>
                  <option value="percent_change">
                    Rolling percentage change · %
                  </option>
                  <option value="sma_cross">SMA fast versus slow</option>
                  <option value="ema_cross">EMA fast versus slow</option>
                  {c.metric === "option_premium" && (
                    <option value="option_premium">
                      Option premium · USD/bbl
                    </option>
                  )}
                </select>
              </label>
              {c.metric === "option_premium" && (
                <p className="notice">
                  {c.optionType?.toUpperCase()} {c.strike} · {c.optionExpiry} ·{" "}
                  {c.priceField} · underlying {c.optionUnderlying}. Option-level
                  replay and monitoring are unavailable in this demo.
                </p>
              )}
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
                    {c.metric === "percent_change" ? "(%)" : "(USD/bbl)"}
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
                  Reference: completed bars ago
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
          <button
            type="button"
            className="text-button"
            disabled={
              draft.conditions.length >= 3 ||
              draft.conditions.some((c) => c.metric === "option_premium")
            }
            onClick={() =>
              setDraft({
                ...draft,
                conditions: [...draft.conditions, baseCondition()],
              })
            }
          >
            <Plus size={15} />
            Add condition{" "}
            {draft.conditions.length >= 3 ? "(demo limit: 3)" : ""}
          </button>
          <details className="advanced">
            <summary>Evaluation & alert behavior</summary>
            <p className="hint">
              Uses this rule's saved timeframe and completed bar close. Prices
              use close; SMA/EMA seed and warm-up are included.
            </p>
            <label className="field">
              Saved calculation timeframe
              <select
                value={draft.timeframe ?? "5m"}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    timeframe: e.target.value as Rule["timeframe"],
                  })
                }
              >
                <option value="5m">5 minutes</option>
                <option value="15m">15 minutes</option>
                <option value="1h">1 hour</option>
              </select>
            </label>
            <div className="field-grid">
              <label className="field">
                Frequency
                <select
                  value={draft.frequency}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      frequency: e.target.value as Rule["frequency"],
                    })
                  }
                >
                  <option value="crossing">On a new crossing</option>
                  <option value="bar">Once per eligible bar</option>
                  <option value="once">One-shot</option>
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
          </details>
          <div className="rule-preview">
            <span className="eyebrow">YOUR RULE IN PLAIN ENGLISH</span>
            <p>{summarize(draft)}</p>
            <span className="hint">
              THEN record an event and show an in-app demo alert. No orders.
            </span>
          </div>
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={close}>
              Cancel
            </button>
            <button className="btn btn-primary" type="submit">
              Save draft <ArrowRight size={15} />
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
            Your latest edits have not been saved. The saved rule will stay as
            it is.
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
