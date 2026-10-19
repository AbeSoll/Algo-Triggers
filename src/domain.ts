import type { Bar, Condition, ReplayResult, Rule, TriggerEvent } from "./types";

export const ENGINE_VERSION = "demo-closed-bars-v1";

type Truth = boolean | null;
type Diagnostic = TriggerEvent["diagnostics"][number];

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const isPeriod = (value: number) => Number.isInteger(value) && value > 0;
const format = (value: number) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 4 });

function assertPeriod(period: number) {
  if (!isPeriod(period))
    throw new Error(
      "Indicator periods must be positive whole numbers of bars.",
    );
}

/** Completed closes only. Missing observations break the contiguous warm-up window. */
export function sma(bars: Bar[], period: number): (number | null)[] {
  assertPeriod(period);
  return bars.map((_, index) => {
    if (index < period - 1) return null;
    const window = bars.slice(index - period + 1, index + 1);
    if (window.some((bar) => !finite(bar.close))) return null;
    return window.reduce((sum, bar) => sum + bar.close, 0) / period;
  });
}

/** SMA-seeded EMA; a missing close requires a fresh N-bar seed before resuming. */
export function ema(bars: Bar[], period: number): (number | null)[] {
  assertPeriod(period);
  const alpha = 2 / (period + 1);
  let previous: number | null = null;
  let seed: number[] = [];
  return bars.map((bar) => {
    if (!finite(bar.close)) {
      previous = null;
      seed = [];
      return null;
    }
    if (previous === null) {
      seed.push(bar.close);
      if (seed.length < period) return null;
      previous = seed.reduce((sum, close) => sum + close, 0) / period;
      seed = [];
      return previous;
    }
    previous = alpha * bar.close + (1 - alpha) * previous;
    return previous;
  });
}

function conditionLabel(condition: Condition): string {
  const operator = condition.operator.replaceAll("_", " ");
  switch (condition.metric) {
    case "price":
      return `Close ${operator} ${format(condition.threshold)} USD/bbl`;
    case "percent_change":
      return `${condition.windowBars}-bar close change ${operator} ${format(condition.threshold)}%`;
    case "sma_cross":
      return `SMA(${condition.period}) ${operator} SMA(${condition.slowPeriod})`;
    case "ema_cross":
      return `EMA(${condition.period}) ${operator} EMA(${condition.slowPeriod})`;
    case "option_premium":
      return `${condition.optionType ?? "Option"} ${condition.strike ?? "—"} ${condition.priceField ?? "unspecified field"} ${operator} ${format(condition.threshold)} USD/bbl`;
  }
}

export function summarize(rule: Rule): string {
  if (rule.conditions.length === 0) return "Add at least one condition.";
  return rule.conditions.map(conditionLabel).join(` ${rule.join} `);
}

function validate(rule: Rule, mode: TriggerEvent["mode"]) {
  if (rule.conditions.length === 0)
    throw new Error("Add at least one condition before running a replay.");
  if (!finite(rule.cooldownMinutes) || rule.cooldownMinutes < 0)
    throw new Error("Cooldown must be zero or a positive number of minutes.");
  for (const condition of rule.conditions) {
    if (condition.metric === "sma_cross" || condition.metric === "ema_cross") {
      assertPeriod(condition.period);
      assertPeriod(condition.slowPeriod);
      if (condition.period >= condition.slowPeriod)
        throw new Error(
          "The fast indicator period must be shorter than the slow period.",
        );
    } else if (!finite(condition.threshold)) {
      throw new Error("Every threshold must be a finite number.");
    }
    if (
      condition.metric === "percent_change" &&
      !isPeriod(condition.windowBars)
    ) {
      throw new Error(
        "Percentage changes require an explicit positive whole-number rolling window in bars.",
      );
    }
    if (condition.metric === "option_premium" && mode === "historical") {
      throw new Error(
        "Historical option replay is unavailable: these fixtures contain futures bars, not option-level price history.",
      );
    }
  }
}

function combine(values: Truth[], join: Rule["join"]): Truth {
  if (join === "AND")
    return values.includes(false) ? false : values.includes(null) ? null : true;
  return values.includes(true) ? true : values.includes(null) ? null : false;
}

function makeDiagnostics(condition: Condition, bars: Bar[]): Diagnostic[] {
  let actual: (number | null)[] = bars.map((bar) =>
    finite(bar.close) ? bar.close : null,
  );
  let reference: (number | null)[] = bars.map(() => condition.threshold);
  if (condition.metric === "sma_cross" || condition.metric === "ema_cross") {
    const average = condition.metric === "sma_cross" ? sma : ema;
    actual = average(bars, condition.period);
    reference = average(bars, condition.slowPeriod);
  } else if (condition.metric === "percent_change") {
    actual = bars.map((bar, index) => {
      const prior = bars[index - condition.windowBars]?.close;
      return finite(bar.close) && finite(prior) && prior > 0
        ? (100 * (bar.close - prior)) / prior
        : null;
    });
  } else if (condition.metric === "option_premium") {
    // Futures bars are never used to invent option prices, even in a demo.
    actual = bars.map(() => null);
  }

  return bars.map((_, index) => {
    const current = actual[index];
    const target = reference[index];
    let met: Truth = null;
    if (finite(current) && finite(target)) {
      if (condition.operator === "above") met = current > target;
      else if (condition.operator === "below") met = current < target;
      else {
        const prior = actual[index - 1];
        const priorTarget = reference[index - 1];
        if (finite(prior) && finite(priorTarget)) {
          met =
            condition.operator === "crosses_above"
              ? prior <= priorTarget && current > target
              : prior >= priorTarget && current < target;
        }
      }
    }
    return {
      label: conditionLabel(condition),
      actual: current,
      reference: target,
      met,
    };
  });
}

/**
 * Deterministic, closed-bar demonstration evaluator. Times are Unix milliseconds.
 * Input timestamps are sorted and duplicate bar IDs keep the last supplied revision.
 * Rule monitoring status does not prevent an explicitly requested historical replay.
 * Range bounds are inclusive. Earlier bars initialize indicators and group state,
 * but only in-range observations count toward coverage or event policy state.
 */
export function replay(
  rule: Rule,
  inputBars: Bar[],
  mode: TriggerEvent["mode"] = "historical",
  range?: { start: number; end: number },
): ReplayResult {
  validate(rule, mode);
  if (
    range &&
    (!finite(range.start) || !finite(range.end) || range.start > range.end)
  )
    throw new Error(
      "Replay range needs valid start and end timestamps in chronological order.",
    );
  if (inputBars.some((bar) => !finite(bar.time)))
    throw new Error("A bar has an invalid event timestamp.");
  const bars = [...new Map(inputBars.map((bar) => [bar.time, bar])).values()]
    .filter((bar) => !range || bar.time <= range.end)
    .sort((a, b) => a.time - b.time);
  const diagnostics = rule.conditions.map((condition) =>
    makeDiagnostics(condition, bars),
  );
  const events: TriggerEvent[] = [];
  let eligibleBars = 0;
  let totalBars = 0;
  let previousGroup: Truth = null;
  let lastEmission: number | null = null;
  const singleCross =
    rule.conditions.length === 1 &&
    rule.conditions[0].operator.startsWith("crosses_");

  bars.forEach((bar, index) => {
    const evidence = diagnostics.map((series) => series[index]);
    const truth = combine(
      evidence.map((diagnostic) => diagnostic.met),
      rule.join,
    );
    const inRange = !range || bar.time >= range.start;
    if (inRange) {
      totalBars += 1;
      if (truth !== null) eligibleBars += 1;
    }
    const policyAllows =
      rule.frequency === "bar" ||
      (rule.frequency === "once" && events.length === 0) ||
      (rule.frequency === "crossing" &&
        (singleCross || previousGroup === false));
    const cooldownAllows =
      lastEmission === null ||
      bar.time - lastEmission >= rule.cooldownMinutes * 60_000;
    if (inRange && truth === true && policyAllows && cooldownAllows) {
      events.push({
        id: `${mode}:${rule.id}:v${rule.version}:${bar.time}`,
        ruleId: rule.id,
        ruleVersion: rule.version,
        ruleName: rule.name,
        instrument: rule.instrument,
        time: bar.time,
        price: bar.close,
        mode,
        diagnostics: evidence,
      });
      lastEmission = bar.time;
    }
    previousGroup = truth;
  });

  const meanGapMinutes =
    events.length < 2
      ? null
      : (events[events.length - 1].time - events[0].time) /
        (events.length - 1) /
        60_000;
  return {
    events,
    eligibleBars,
    totalBars,
    triggerPeriodPct: eligibleBars ? (events.length / eligibleBars) * 100 : 0,
    meanGapMinutes,
  };
}

/** An allowlisted proposal parser, with no execution, hidden activation, or guessed references. */
export function parseIdea(
  text: string,
  instrument: string,
): { rule?: Partial<Rule>; error?: string } {
  const normalized = text
    .trim()
    .replace(/[.!]+$/, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
  if (!normalized)
    return {
      error: "Describe one condition, for example “Brent crosses above 82.50”.",
    };
  if (/\b(option|premium|put|call|strike|iv|vega|delta)\b/.test(normalized)) {
    return {
      error:
        "Option ideas need an exact contract, expiry, strike, type, and bid/ask/last/mark field. Configure those explicitly; futures bars cannot establish option history.",
    };
  }
  if (/\b(and|or)\b/.test(normalized)) {
    return {
      error:
        "This demo parser supports one condition at a time. Add conditions in the structured builder and choose AND or OR explicitly.",
    };
  }
  const cleaned = normalized.replace(
    /^(?:alert(?: me)? when|notify(?: me)? when|when) /,
    "",
  );
  const makeCondition = (partial: Partial<Condition>): Condition => ({
    id: "condition-1",
    metric: "price",
    operator: "crosses_above",
    threshold: 82.5,
    period: 20,
    slowPeriod: 50,
    windowBars: 12,
    ...partial,
  });
  const proposal = (condition: Condition): { rule: Partial<Rule> } => ({
    rule: {
      name: conditionLabel(condition),
      instrument,
      join: "AND",
      conditions: [condition],
      frequency: "crossing",
      cooldownMinutes: 15,
      status: "draft",
    },
  });
  const operator = (phrase: string): Condition["operator"] => {
    if (phrase === "crosses below" || phrase === "falls below")
      return "crosses_below";
    if (phrase === "crosses above" || phrase === "rises above")
      return "crosses_above";
    return phrase.includes("below") ? "below" : "above";
  };
  const average = cleaned.match(
    /^(sma|ema)\s*\(?([1-9]\d*)\)?\s+(crosses above|crosses below|above|below)\s+(sma|ema)\s*\(?([1-9]\d*)\)?$/,
  );
  if (average) {
    if (average[1] !== average[4])
      return {
        error: "Use the same indicator family for both averages in this demo.",
      };
    if (Number(average[2]) >= Number(average[5]))
      return {
        error:
          "The first (fast) period must be shorter than the second (slow) period.",
      };
    return proposal(
      makeCondition({
        metric: average[1] === "sma" ? "sma_cross" : "ema_cross",
        period: Number(average[2]),
        slowPeriod: Number(average[5]),
        operator: operator(average[3]),
      }),
    );
  }
  const percent = cleaned.match(
    /^(?:brent |price |close )?(?:percent(?:age)? change|close change) (?:is )?(above|below|crosses above|crosses below) ([+-]?\d+(?:\.\d+)?)% over ([1-9]\d*) bars?$/,
  );
  if (percent)
    return proposal(
      makeCondition({
        metric: "percent_change",
        operator: operator(percent[1]),
        threshold: Number(percent[2]),
        windowBars: Number(percent[3]),
      }),
    );
  if (cleaned.includes("%") || /\bpercent/.test(cleaned)) {
    return {
      error:
        "Specify direction, reference, and interval: “percent change above 2% over 12 bars”. The reference is the same contract’s close exactly 12 bars earlier.",
    };
  }
  const price = cleaned.match(
    /^(?:brent |price |close )?(crosses above|crosses below|rises above|falls below|is above|is below|above|below)\s+\$?([+-]?\d+(?:\.\d+)?)(?: usd\/bbl)?$/,
  );
  if (price)
    return proposal(
      makeCondition({
        operator: operator(price[1]),
        threshold: Number(price[2]),
      }),
    );
  return {
    error:
      "Try “Brent crosses above 82.50”, “SMA 20 crosses above SMA 50”, or “percent change above 2% over 12 bars”. Review all draft settings before saving.",
  };
}
