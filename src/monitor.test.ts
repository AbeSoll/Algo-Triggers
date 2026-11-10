import { describe, expect, it } from "vitest";
import { generateBars } from "./fixtures";
import { evaluateDemoStep } from "./monitor";
import type { Rule } from "./types";

const source = generateBars("brent-dec26", "5m");
const monitoringRule = (changes: Partial<Rule> = {}): Rule => ({
  id: "monitor-rule",
  version: 1,
  name: "Sample monitor",
  instrument: "brent-dec26",
  join: "AND",
  conditions: [
    {
      id: "price",
      metric: "price",
      operator: "above",
      threshold: 1,
      period: 9,
      slowPeriod: 21,
      windowBars: 12,
    },
  ],
  cooldownMinutes: 0,
  frequency: "bar",
  status: "monitoring",
  createdAt: "2026-10-12T07:00:00.000Z",
  ...changes,
});

describe("deterministic sample monitor steps", () => {
  it("defaults to 5-minute bars and emits only the exact current completed bar", () => {
    const testRule = monitoringRule();
    const current = source[600];
    const events = evaluateDemoStep([testRule], current.time, {});
    expect(events).toHaveLength(1);
    expect(events[0].time).toBe(current.time);
    expect(events[0].price).toBe(current.close);
    expect(events[0].mode).toBe("demo");
    expect(events[0].timeframe).toBe("5m");
    expect(evaluateDemoStep([testRule], current.time + 1, {})).toEqual([]);
  });

  it("waits for the final 5-minute constituent before evaluating a 15-minute aggregate", () => {
    const testRule = monitoringRule({ timeframe: "15m" });
    expect(evaluateDemoStep([testRule], source[600].time, {})).toEqual([]);
    expect(evaluateDemoStep([testRule], source[601].time, {})).toEqual([]);
    const events = evaluateDemoStep([testRule], source[602].time, {});
    expect(events).toHaveLength(1);
    expect(events[0].price).toBe(source[602].close);
    expect(events[0].time).toBe(source[602].time);
    expect(events[0].timeframe).toBe("15m");
  });

  it("does not expose an hourly close before its aggregate completes", () => {
    const testRule = monitoringRule({ timeframe: "1h" });
    for (let index = 600; index < 611; index += 1) {
      expect(evaluateDemoStep([testRule], source[index].time, {})).toEqual([]);
    }
    const events = evaluateDemoStep([testRule], source[611].time, {});
    expect(events).toHaveLength(1);
    expect(events[0].price).toBe(source[611].close);
    expect(events[0].time).toBe(source[611].time);
    expect(events[0].timeframe).toBe("1h");
  });

  it("does not let preactivation observations consume one-shot state", () => {
    const testRule = monitoringRule({ frequency: "once" });
    const starts = { "monitor-rule:1": source[610].time };
    expect(evaluateDemoStep([testRule], source[609].time, starts)).toEqual([]);
    expect(evaluateDemoStep([testRule], source[610].time, starts)).toHaveLength(
      1,
    );
    expect(evaluateDemoStep([testRule], source[611].time, starts)).toEqual([]);
    const updated = { ...testRule, version: 2 };
    expect(
      evaluateDemoStep([updated], source[611].time, {
        ...starts,
        "monitor-rule:2": source[611].time,
      }),
    ).toHaveLength(1);
  });

  it("reconstructs cooldown from the activation interval and does not emit skipped old events", () => {
    const testRule = monitoringRule({ cooldownMinutes: 10 });
    const starts = { "monitor-rule:1": source[600].time };
    expect(evaluateDemoStep([testRule], source[600].time, starts)).toHaveLength(
      1,
    );
    expect(evaluateDemoStep([testRule], source[601].time, starts)).toEqual([]);
    expect(evaluateDemoStep([testRule], source[602].time, starts)).toHaveLength(
      1,
    );
    const later = evaluateDemoStep([testRule], source[604].time, starts);
    expect(later).toHaveLength(1);
    expect(later.every((event) => event.time === source[604].time)).toBe(true);
  });

  it("emits nothing for paused or draft rules and begins a new interval on resume", () => {
    const testRule = monitoringRule({ frequency: "once" });
    expect(
      evaluateDemoStep(
        [{ ...testRule, status: "paused" }],
        source[600].time,
        {},
      ),
    ).toEqual([]);
    expect(
      evaluateDemoStep(
        [{ ...testRule, status: "draft" }],
        source[600].time,
        {},
      ),
    ).toEqual([]);
    expect(
      evaluateDemoStep([testRule], source[610].time, {
        "monitor-rule:1": source[610].time,
      }),
    ).toHaveLength(1);
  });

  it("returns repeatable event IDs for caller deduplication without mutating rules", () => {
    const testRule = monitoringRule();
    const before = JSON.stringify(testRule);
    const first = evaluateDemoStep([testRule], source[600].time, {});
    expect(evaluateDemoStep([testRule], source[600].time, {})).toEqual(first);
    expect(JSON.stringify(testRule)).toBe(before);
  });

  it("requires valid replay-clock and activation timestamps", () => {
    expect(() => evaluateDemoStep([monitoringRule()], Number.NaN, {})).toThrow(
      "clock",
    );
    expect(() =>
      evaluateDemoStep([monitoringRule()], source[600].time, {
        "monitor-rule:1": Number.POSITIVE_INFINITY,
      }),
    ).toThrow("activation");
  });
});
