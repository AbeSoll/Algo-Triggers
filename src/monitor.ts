import { replay } from "./domain";
import { generateBars } from "./fixtures";
import type { Bar, Rule, TriggerEvent } from "./types";

/**
 * One deterministic replay-clock step, using only completed fixture bars.
 *
 * Each id:version activation start reconstructs one-shot and cooldown state for
 * that activation interval. Earlier observations warm indicators and crossing
 * state without consuming those policies. Callers set a new start on activation
 * or resume; pause history is not represented by this helper. Calls are pure and
 * repeatable, so the caller deduplicates the returned stable event IDs.
 */
export function evaluateDemoStep(
  rules: Rule[],
  baseTime: number,
  starts: Record<string, number>,
): TriggerEvent[] {
  if (!Number.isFinite(baseTime))
    throw new Error("The sample replay clock needs a valid timestamp.");

  const defaultStart = generateBars("brent-dec26", "5m")[600].time;
  const series = new Map<string, Bar[]>();
  return rules.flatMap((rule) => {
    if (rule.status !== "monitoring") return [];
    const start = starts[`${rule.id}:${rule.version}`] ?? defaultStart;
    if (!Number.isFinite(start))
      throw new Error("The sample monitor activation needs a valid timestamp.");
    if (start > baseTime) return [];

    const timeframe = rule.timeframe ?? "5m";
    const key = `${rule.instrument}:${timeframe}`;
    let bars = series.get(key);
    if (!bars) {
      // An aggregate is available only at its final constituent bar's close.
      bars = generateBars(rule.instrument, timeframe).filter(
        (bar) => bar.time <= baseTime,
      );
      series.set(key, bars);
    }
    if (!bars.some((bar) => bar.time === baseTime)) return [];

    return replay(rule, bars, "demo", { start, end: baseTime })
      .events.filter((event) => event.time === baseTime)
      .map((event) => ({ ...event, timeframe }));
  });
}
