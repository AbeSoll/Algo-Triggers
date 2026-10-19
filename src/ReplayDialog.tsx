import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, CalendarDays, Loader2, Play } from "lucide-react";
import type { ReplayResult, Rule, TriggerEvent } from "./types";
import { ENGINE_VERSION, replay, summarize } from "./domain";
import { generateBars } from "./fixtures";
import { Empty, Modal, timestamp } from "./ui";

export interface StoredRun {
  id: string;
  rule: Rule;
  timeframe: "5m" | "15m" | "1h";
  start: string;
  end: string;
  result: ReplayResult;
  engine: string;
  dataset: string;
}
export default function ReplayDialog({
  rule,
  timeframe,
  onClose,
  onComplete,
  onInspect,
}: {
  rule: Rule;
  timeframe: "5m" | "15m" | "1h";
  onClose: () => void;
  onComplete: (run: StoredRun) => boolean;
  onInspect: (event: TriggerEvent) => void;
}) {
  const [start, setStart] = useState("2026-10-12");
  const [end, setEnd] = useState("2026-10-16");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ReplayResult | null>(null);
  const sequence = useRef(0);
  const startInput = useRef<HTMLInputElement>(null);
  useEffect(
    () => () => {
      sequence.current++;
    },
    [],
  );
  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!start || !end || start > end) {
      setError("Choose a start date on or before the end date.");
      startInput.current?.focus();
      return;
    }
    setError("");
    setPending(true);
    setResult(null);
    const request = ++sequence.current;
    await new Promise((r) => setTimeout(r, 500));
    if (request !== sequence.current) return;
    try {
      const from = Date.parse(start + "T00:00:00Z"),
        to = Date.parse(end + "T23:59:59Z");
      const bars = generateBars(rule.instrument, timeframe);
      if (from < bars[0].time - 86400000 || to > bars.at(-1)!.time + 86400000)
        throw new Error(
          "This demo contains 12–16 October 2026. Select dates within that range.",
        );
      const calculated = replay(rule, bars, "historical", {
        start: from,
        end: to,
      });
      calculated.events = calculated.events.map((event) => ({
        ...event,
        timeframe,
      }));
      const stored: StoredRun = {
        id: crypto.randomUUID(),
        rule: structuredClone(rule),
        timeframe,
        start,
        end,
        result: calculated,
        engine: ENGINE_VERSION,
        dataset: "brent-synthetic-oct26-v1",
      };
      if (!onComplete(stored))
        throw new Error(
          "The report could not be saved in browser storage. Your settings are preserved.",
        );
      setResult(calculated);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not run replay. Check your settings.",
      );
    } finally {
      setPending(false);
    }
  }
  const close = () => {
    sequence.current++;
    onClose();
  };
  return (
    <Modal title="Historical trigger replay" onClose={close} wide>
      <div className="replay-rule">
        <span className="badge badge-purple">
          {rule.name} · v{rule.version}
        </span>
        <p>{summarize(rule)}</p>
      </div>
      <form noValidate onSubmit={run}>
        <div className="replay-controls">
          <label className="field">
            Start date · UTC
            <input
              ref={startInput}
              disabled={pending}
              aria-invalid={!!error}
              aria-describedby={error ? "replay-error" : undefined}
              type="date"
              min="2026-10-12"
              max="2026-10-16"
              value={start}
              onChange={(e) => {
                setStart(e.target.value);
                setResult(null);
              }}
            />
          </label>
          <label className="field">
            End date · UTC
            <input
              disabled={pending}
              aria-invalid={!!error}
              aria-describedby={error ? "replay-error" : undefined}
              type="date"
              min="2026-10-12"
              max="2026-10-16"
              value={end}
              onChange={(e) => {
                setEnd(e.target.value);
                setResult(null);
              }}
            />
          </label>
          <div className="replay-frequency">
            <CalendarDays size={16} />
            <strong>{timeframe} bars</strong>
            <span>Completed closes</span>
          </div>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? (
              <Loader2 size={16} className="spinner" />
            ) : (
              <Play size={15} />
            )}
            Run replay
          </button>
        </div>
      </form>
      <p className="hint">
        Synthetic data · 12–16 Oct 2026 · UTC · Alert counts, not simulated
        returns. Earlier bars initialize indicators.
      </p>
      {error && (
        <p id="replay-error" className="error-message" role="alert">
          {error}
        </p>
      )}
      <div className="replay-output" aria-live="polite">
        {pending ? (
          <div className="empty">
            <Loader2 className="spinner" size={28} />
            <h3>Evaluating completed bars</h3>
            <p>Every event retains its exact condition values.</p>
            <button
              className="btn btn-outline"
              onClick={() => {
                sequence.current++;
                setPending(false);
                setError("Replay canceled. No report was saved.");
              }}
            >
              Cancel replay
            </button>
          </div>
        ) : result ? (
          <>
            <div className="result-stats">
              <div>
                <span>Triggers</span>
                <strong>{result.events.length}</strong>
              </div>
              <div>
                <span>Trigger periods</span>
                <strong>
                  {result.triggerPeriodPct.toFixed(2)}
                  <small>%</small>
                </strong>
              </div>
              <div>
                <span>Mean event gap</span>
                <strong>
                  {result.meanGapMinutes === null
                    ? "—"
                    : result.meanGapMinutes.toFixed(0)}
                  <small> min</small>
                </strong>
              </div>
              <div>
                <span>Eligible bars</span>
                <strong>
                  {result.eligibleBars}
                  <small> / {result.totalBars}</small>
                </strong>
              </div>
            </div>
            <p className="hint">
              Trigger periods = periods with an emitted event ÷ eligible
              periods. Warm-up and unknown observations are excluded.
            </p>
            {result.events.length ? (
              <div className="table-wrap replay-events">
                <table>
                  <caption>
                    Historical signal timeline · {result.events.length} events
                  </caption>
                  <thead>
                    <tr>
                      <th>Timestamp · UTC</th>
                      <th>Observed close</th>
                      <th>Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.events.slice(0, 50).map((event) => (
                      <tr key={event.id}>
                        <td>{timestamp(event.time)}</td>
                        <td>${event.price.toFixed(4)}/bbl</td>
                        <td>
                          <button
                            className="text-button"
                            onClick={() => onInspect(event)}
                          >
                            Inspect event <ArrowUpRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.events.length > 50 && (
                  <p className="hint">
                    First 50 events shown; all events are retained in history.
                  </p>
                )}
              </div>
            ) : (
              <Empty title="No signals in this range">
                The rule was evaluated, but no eligible event met its conditions
                and alert policy. Try a different threshold or range.
              </Empty>
            )}
            <details className="advanced">
              <summary>Reproducibility details</summary>
              <p>
                Dataset: brent-synthetic-oct26-v1
                <br />
                Engine: {ENGINE_VERSION}
                <br />
                Rule version: {rule.version}
                <br />
                Evaluation: {timeframe}, completed close
                <br />
                Output range: {start} through {end}, UTC
                <br />
                Price: unrounded close; indicators initialized from earlier
                fixture bars.
                <br />
                Warm-up: EMA uses the first N-bar SMA seed. Missing input is
                unknown.
              </p>
            </details>
          </>
        ) : (
          <Empty title="Test an idea before you monitor it">
            Run the saved rule against the same reproducible sample market.
            Inspect why each signal happened.
          </Empty>
        )}
      </div>
    </Modal>
  );
}
