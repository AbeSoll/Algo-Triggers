import { describe, expect, it } from "vitest";
import { ema, parseIdea, replay, sma, summarize } from "./domain";
import { generateBars, seedRules } from "./fixtures";
import type { Bar, Condition, Rule } from "./types";

const origin = Date.UTC(2026, 9, 12, 7);
const bars = (closes: number[]): Bar[] =>
  closes.map((close, index) => ({
    time: origin + index * 60_000,
    open: close,
    high: close,
    low: close,
    close,
    volume: 100,
  }));
const condition = (changes: Partial<Condition> = {}): Condition => ({
  id: "one",
  metric: "price",
  operator: "above",
  threshold: 10,
  period: 2,
  slowPeriod: 3,
  windowBars: 1,
  ...changes,
});
const rule = (changes: Partial<Rule> = {}): Rule => ({
  id: "test",
  version: 1,
  name: "Test rule",
  instrument: "brent-dec26",
  join: "AND",
  conditions: [condition()],
  cooldownMinutes: 0,
  frequency: "bar",
  status: "draft",
  createdAt: "2026-10-12T07:00:00.000Z",
  ...changes,
});

describe("closed-bar averages", () => {
  it("has no SMA value before the complete warm-up and includes the current close", () => {
    expect(sma(bars([2, 4, 6, 8]), 3)).toEqual([null, null, 4, 6]);
  });

  it("seeds EMA with the first N-bar SMA, then recurses using alpha 2/(N+1)", () => {
    expect(ema(bars([2, 4, 6, 8]), 3)).toEqual([null, null, 4, 6]);
    expect(ema(bars([2, 4, 12, 8]), 3)[3]).toBeCloseTo(7);
  });

  it("marks missing inputs unknown and restarts warm-up without filling gaps", () => {
    const source = bars([2, 4, Number.NaN, 6, 8, 10]);
    expect(sma(source, 2)).toEqual([null, 3, null, null, 7, 9]);
    expect(ema(source, 2)).toEqual([null, 3, null, null, 7, 9]);
    expect(() => sma(source, 0)).toThrow("positive whole numbers");
    expect(() => ema(source, 1.5)).toThrow("positive whole numbers");
  });
});

describe("comparisons and crossings", () => {
  it("uses strict above and below comparisons without rounding inputs", () => {
    const source = bars([9.999999, 10, 10.000001]);
    expect(replay(rule(), source).events.map((event) => event.price)).toEqual([
      10.000001,
    ]);
    expect(
      replay(
        rule({ conditions: [condition({ operator: "below" })] }),
        source,
      ).events.map((event) => event.price),
    ).toEqual([9.999999]);
  });

  it("counts a genuine crossing from equality, without fabricating an initial crossing", () => {
    const testRule = rule({
      frequency: "crossing",
      conditions: [condition({ operator: "crosses_above" })],
    });
    expect(
      replay(testRule, bars([11, 12, 10, 11, 12])).events.map(
        (event) => event.time,
      ),
    ).toEqual([origin + 3 * 60_000]);
    expect(replay(testRule, bars([10, 11])).events).toHaveLength(1);
    expect(replay(testRule, bars([11])).events).toHaveLength(0);
  });

  it("supports crosses below and does not bridge a missing prior value", () => {
    const testRule = rule({
      conditions: [condition({ operator: "crosses_below" })],
    });
    expect(
      replay(testRule, bars([10, 9, Number.NaN, 8, 11, 9])).events.map(
        (event) => event.time,
      ),
    ).toEqual([origin + 60_000, origin + 5 * 60_000]);
  });

  it("waits for both average series and a valid prior observation before a cross", () => {
    const result = replay(
      rule({
        conditions: [
          condition({
            metric: "sma_cross",
            operator: "crosses_above",
            period: 2,
            slowPeriod: 3,
          }),
        ],
      }),
      bars([5, 4, 3, 4, 6]),
    );
    expect(result.eligibleBars).toBe(2);
    expect(result.events.map((event) => event.time)).toEqual([
      origin + 4 * 60_000,
    ]);
    expect(result.events[0].diagnostics[0].actual).toBe(5);
    expect(result.events[0].diagnostics[0].reference).toBeCloseTo(13 / 3);
  });

  it("uses one explicit rolling-bar percentage reference and rejects nonpositive references", () => {
    const testRule = rule({
      conditions: [
        condition({ metric: "percent_change", threshold: 2, windowBars: 1 }),
      ],
    });
    expect(replay(testRule, bars([100, 102])).events).toHaveLength(0);
    expect(
      replay(testRule, bars([100, 103])).events[0].diagnostics[0].actual,
    ).toBe(3);
    expect(replay(testRule, bars([0, 20])).eligibleBars).toBe(0);
    expect(replay(testRule, bars([-10, 20])).eligibleBars).toBe(0);
    expect(() =>
      replay(
        rule({
          conditions: [condition({ metric: "percent_change", windowBars: 0 })],
        }),
        bars([10, 11]),
      ),
    ).toThrow("rolling window");
  });
});

describe("group truth and emission policy", () => {
  it("uses false-dominant AND and true-dominant OR when one condition is unknown", () => {
    const unknown = condition({
      id: "unknown",
      metric: "option_premium",
      optionType: "call",
      strike: 85,
      priceField: "mark",
    });
    const source = bars([9, 11]);
    const conjunction = replay(
      rule({ conditions: [condition(), unknown], join: "AND" }),
      source,
      "demo",
    );
    expect(conjunction.eligibleBars).toBe(1);
    expect(conjunction.events).toHaveLength(0);
    const disjunction = replay(
      rule({ conditions: [condition(), unknown], join: "OR" }),
      source,
      "demo",
    );
    expect(disjunction.eligibleBars).toBe(1);
    expect(disjunction.events).toHaveLength(1);
    expect(disjunction.events[0].diagnostics.map((item) => item.met)).toEqual([
      true,
      null,
    ]);
  });

  it("separates a standing predicate from group-transition event frequency", () => {
    const result = replay(
      rule({ frequency: "crossing" }),
      bars([11, 12, 9, 11, 12, 9, 11]),
    );
    expect(result.events.map((event) => event.time)).toEqual([
      origin + 3 * 60_000,
      origin + 6 * 60_000,
    ]);
  });

  it("uses valid group state for mixed AND transitions and preserves each condition diagnostic", () => {
    const result = replay(
      rule({
        frequency: "crossing",
        conditions: [
          condition(),
          condition({ id: "limit", operator: "below", threshold: 15 }),
        ],
      }),
      bars([9, 11, 16, 12]),
    );
    expect(result.events.map((event) => event.price)).toEqual([11, 12]);
    expect(result.events[0].diagnostics).toHaveLength(2);
  });

  it("allows an emission exactly at cooldown and suppressed bars do not move the clock", () => {
    const result = replay(
      rule({ cooldownMinutes: 2 }),
      bars([11, 11, 11, 11, 11]),
    );
    expect(result.events.map((event) => event.time)).toEqual([
      origin,
      origin + 2 * 60_000,
      origin + 4 * 60_000,
    ]);
    expect(result.triggerPeriodPct).toBe(60);
    expect(result.meanGapMinutes).toBe(2);
  });

  it("supports one-shot and explicit historical replay of a paused rule", () => {
    expect(
      replay(
        rule({ frequency: "once", status: "paused" }),
        bars([9, 11, 9, 12]),
      ).events,
    ).toHaveLength(1);
    expect(
      replay(rule({ status: "paused" }), bars([11, 12])).events,
    ).toHaveLength(2);
  });

  it("reports unavailable mean gaps and zero eligible periods accurately", () => {
    expect(replay(rule(), []).meanGapMinutes).toBeNull();
    expect(replay(rule(), bars([Number.NaN])).triggerPeriodPct).toBe(0);
    expect(replay(rule(), bars([Number.NaN])).eligibleBars).toBe(0);
    expect(replay(rule(), bars([11])).meanGapMinutes).toBeNull();
  });
});

describe("provenance, determinism, and causality", () => {
  it("normalizes chronological order, deduplicates bar timestamps, and preserves version evidence", () => {
    const source = bars([9, 11, 12]);
    const result = replay(rule({ version: 3 }), [
      source[2],
      source[0],
      source[1],
      source[1],
    ]);
    expect(result.totalBars).toBe(3);
    expect(result.events.map((event) => event.time)).toEqual([
      source[1].time,
      source[2].time,
    ]);
    expect(result.events[0].id).toContain(":v3:");
    expect(result.events[0].ruleVersion).toBe(3);
    expect(result.events[0].mode).toBe("historical");
  });

  it("is deterministic with stable event IDs and leaves input data unmodified", () => {
    const source = generateBars("brent-dec26", "5m");
    const original = JSON.stringify(source);
    const first = replay(seedRules[0], source);
    expect(first.events.length).toBeGreaterThan(2);
    expect(replay(seedRules[0], source)).toEqual(first);
    expect(generateBars("brent-dec26", "5m")).toEqual(source);
    expect(JSON.stringify(source)).toBe(original);
  });

  it("does not allow future closes to change earlier averages or events", () => {
    const source = generateBars("brent-dec26", "5m");
    const cutoff = 233;
    const partial = source.slice(0, cutoff);
    expect(sma(source, 20).slice(0, cutoff)).toEqual(sma(partial, 20));
    expect(ema(source, 20).slice(0, cutoff)).toEqual(ema(partial, 20));
    for (const sample of seedRules.slice(0, 2)) {
      const full = replay(sample, source).events.filter(
        (event) => event.time <= partial[partial.length - 1].time,
      );
      expect(full).toEqual(replay(sample, partial).events);
    }
  });

  it("aggregates timeframes from the same underlying 5-minute fixture", () => {
    const source = generateBars("brent-dec26", "5m");
    const quarterHour = generateBars("brent-dec26", "15m");
    const hourly = generateBars("brent-dec26", "1h");
    expect(source).toHaveLength(720);
    expect(quarterHour).toHaveLength(240);
    expect(hourly).toHaveLength(60);
    expect(quarterHour[0].close).toBe(source[2].close);
    expect(hourly[0].high).toBe(
      Math.max(...source.slice(0, 12).map((bar) => bar.high)),
    );
    expect(hourly[0].volume).toBe(
      source.slice(0, 12).reduce((sum, bar) => sum + bar.volume, 0),
    );
  });

  it("rejects historical option evidence instead of inventing it from futures bars", () => {
    expect(() =>
      replay(
        rule({ conditions: [condition({ metric: "option_premium" })] }),
        bars([12]),
      ),
    ).toThrow("not option-level price history");
    expect(() =>
      replay(rule(), [{ ...bars([12])[0], time: Number.NaN }]),
    ).toThrow("timestamp");
  });
});

describe("inclusive output ranges and warm-up prefixes", () => {
  it("warms indicators before the output range without counting initialization bars", () => {
    const source = bars([5, 4, 3, 4, 6, 100]);
    const testRule = rule({
      conditions: [
        condition({
          metric: "sma_cross",
          operator: "crosses_above",
          period: 2,
          slowPeriod: 3,
        }),
      ],
    });
    const range = { start: origin + 4 * 60_000, end: origin + 4 * 60_000 };
    const result = replay(testRule, source, "historical", range);
    expect(result.totalBars).toBe(1);
    expect(result.eligibleBars).toBe(1);
    expect(result.triggerPeriodPct).toBe(100);
    expect(result.events.map((event) => event.price)).toEqual([6]);
    expect(result.events[0].diagnostics[0].actual).toBe(5);
    expect(result).toEqual(
      replay(testRule, source.slice(0, 5), "historical", range),
    );
    expect(
      replay(testRule, source.slice(4), "historical", range).eligibleBars,
    ).toBe(0);
  });

  it("does not consume one-shot state on a true prefix observation", () => {
    const result = replay(
      rule({ frequency: "once" }),
      bars([11, 12, 13, 14]),
      "historical",
      {
        start: origin + 2 * 60_000,
        end: origin + 3 * 60_000,
      },
    );
    expect(result.events.map((event) => event.price)).toEqual([13]);
    expect(result.totalBars).toBe(2);
    expect(result.eligibleBars).toBe(2);
    expect(result.triggerPeriodPct).toBe(50);
  });

  it("does not start cooldown before the output range", () => {
    const result = replay(
      rule({ cooldownMinutes: 2 }),
      bars([11, 12, 13, 14]),
      "historical",
      {
        start: origin + 60_000,
        end: origin + 3 * 60_000,
      },
    );
    expect(result.events.map((event) => event.price)).toEqual([12, 14]);
    expect(result.meanGapMinutes).toBe(2);
  });

  it("uses prefix predicate state to establish an in-range group transition", () => {
    const result = replay(
      rule({ frequency: "crossing" }),
      bars([9, 11, 12]),
      "historical",
      {
        start: origin + 60_000,
        end: origin + 2 * 60_000,
      },
    );
    expect(result.events.map((event) => event.price)).toEqual([11]);
    expect(
      replay(rule({ frequency: "crossing" }), bars([11, 12]), "historical", {
        start: origin + 60_000,
        end: origin + 60_000,
      }).events,
    ).toHaveLength(0);
  });

  it("has zero coverage when the requested range contains no bars and validates range bounds", () => {
    expect(
      replay(rule(), bars([11, 12]), "historical", {
        start: origin + 5 * 60_000,
        end: origin + 6 * 60_000,
      }),
    ).toEqual({
      events: [],
      totalBars: 0,
      eligibleBars: 0,
      triggerPeriodPct: 0,
      meanGapMinutes: null,
    });
    expect(() =>
      replay(rule(), bars([11]), "historical", {
        start: origin,
        end: origin - 1,
      }),
    ).toThrow("chronological order");
    expect(() =>
      replay(rule(), bars([11]), "historical", {
        start: Number.NaN,
        end: origin,
      }),
    ).toThrow("valid start and end");
  });

  it("rejects nonfinite rolling windows and never manufactures a missing percentage reference", () => {
    for (const windowBars of [Number.NaN, Number.POSITIVE_INFINITY, -1, 1.5]) {
      expect(() =>
        replay(
          rule({
            conditions: [condition({ metric: "percent_change", windowBars })],
          }),
          bars([100, 104]),
        ),
      ).toThrow("rolling window");
    }
    const testRule = rule({
      conditions: [
        condition({ metric: "percent_change", threshold: 2, windowBars: 1 }),
      ],
    });
    const result = replay(
      testRule,
      bars([100, Number.NaN, 104, 108]),
      "historical",
      {
        start: origin + 2 * 60_000,
        end: origin + 3 * 60_000,
      },
    );
    expect(result.totalBars).toBe(2);
    expect(result.eligibleBars).toBe(1);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].time).toBe(origin + 3 * 60_000);
  });
});

describe("reviewable natural-language proposals", () => {
  it("parses a supported price template into a draft without activation", () => {
    const proposal = parseIdea(
      "Alert me when Brent crosses above $82.50.",
      "brent-jan27",
    );
    expect(proposal.error).toBeUndefined();
    expect(proposal.rule?.status).toBe("draft");
    expect(proposal.rule?.instrument).toBe("brent-jan27");
    expect(proposal.rule?.conditions?.[0].operator).toBe("crosses_above");
    expect(proposal.rule?.conditions?.[0].threshold).toBe(82.5);
    expect(summarize(rule(proposal.rule))).toContain("82.5 USD/bbl");
  });

  it("parses explicitly named average families and rolling-bar percentage windows", () => {
    expect(
      parseIdea("SMA 20 crosses above SMA 50", "brent-dec26").rule
        ?.conditions?.[0].metric,
    ).toBe("sma_cross");
    expect(
      parseIdea("EMA 9 crosses below EMA 21", "brent-dec26").rule
        ?.conditions?.[0].operator,
    ).toBe("crosses_below");
    const proposal = parseIdea(
      "percent change below -2% over 12 bars",
      "brent-dec26",
    );
    expect(proposal.rule?.conditions?.[0].threshold).toBe(-2);
    expect(proposal.rule?.conditions?.[0].windowBars).toBe(12);
  });

  it("rejects missing references, option ambiguities, nested expressions, and arbitrary instructions", () => {
    expect(parseIdea("Brent rises 2%", "brent-dec26").error).toContain(
      "reference",
    );
    expect(parseIdea("put hits $2", "brent-dec26").error).toContain(
      "exact contract",
    );
    expect(
      parseIdea("SMA 20 crosses above EMA 50", "brent-dec26").error,
    ).toContain("same indicator");
    expect(
      parseIdea("price above 82 and price below 85", "brent-dec26").error,
    ).toContain("AND or OR");
    expect(
      parseIdea("buy 10 futures and email my desk", "brent-dec26").rule,
    ).toBeUndefined();
    expect(
      parseIdea("SMA 50 crosses above SMA 20", "brent-dec26").error,
    ).toContain("shorter");
  });
});
