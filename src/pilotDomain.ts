export const PILOT_ENGINE_VERSION = "hedgesignal-pilot-v0.2";

export type PilotDataMode = "SYNTHETIC" | "REPLAY" | "AUTHORISED_PILOT";
export type PilotRuleLifecycle =
  "DRAFT" | "VALIDATED" | "ACTIVE" | "PAUSED" | "DISABLED";
export type PilotEvalOutcome = "TRUE" | "FALSE" | "NOT_EVALUABLE" | "ERROR";
export type PilotNotificationState =
  "PENDING" | "SENDING" | "ACCEPTED" | "HELD" | "FAILED" | "UNKNOWN";
export type PilotRole = "team_member";

export type PilotFieldId =
  | "reference_price"
  | "wapl"
  | "volume"
  | "implied_volatility"
  | "option_premium";

export type PilotOperator = "<" | "<=" | ">" | ">=" | "==" | "!=";
export type PilotEmissionPolicy = "once_per_transition" | "once" | "cooldown";
export type ObservationSpecialization = "MARKET" | "BUSINESS";
export type ObservationQuality = "VALID" | "STALE" | "INVALID" | "QUARANTINED";

export interface PilotFieldSpec {
  id: PilotFieldId;
  label: string;
  specialization: ObservationSpecialization;
  allowedUnits: readonly string[];
  requiresInstrument: boolean;
  defaultMaxAgeSeconds: number;
}

export const PILOT_FIELD_SPECS: Record<PilotFieldId, PilotFieldSpec> = {
  reference_price: {
    id: "reference_price",
    label: "Futures / swap reference price",
    specialization: "MARKET",
    allowedUnits: ["USD/bbl"],
    requiresInstrument: true,
    defaultMaxAgeSeconds: 900,
  },
  wapl: {
    id: "wapl",
    label: "WAPL (business indicator · definition pending approval)",
    specialization: "BUSINESS",
    allowedUnits: ["USD/bbl"],
    requiresInstrument: false,
    defaultMaxAgeSeconds: 86_400,
  },
  volume: {
    id: "volume",
    label: "Base hedge volume / exposure",
    specialization: "BUSINESS",
    allowedUnits: ["million bbl", "bbl"],
    requiresInstrument: false,
    defaultMaxAgeSeconds: 86_400,
  },
  implied_volatility: {
    id: "implied_volatility",
    label: "Implied volatility",
    specialization: "MARKET",
    allowedUnits: ["%"],
    requiresInstrument: true,
    defaultMaxAgeSeconds: 900,
  },
  option_premium: {
    id: "option_premium",
    label: "Option premium",
    specialization: "MARKET",
    allowedUnits: ["USD/bbl", "USD/share"],
    requiresInstrument: true,
    defaultMaxAgeSeconds: 900,
  },
};

export interface PilotCondition {
  id: string;
  fieldId: PilotFieldId;
  operator: PilotOperator;
  thresholdDecimal: string;
  unit: string;
  maxAgeSeconds: number;
  instrument?: string;
}

export interface PilotTriggerPolicy {
  emission: PilotEmissionPolicy;
  cooldownMinutes: number;
}

export interface PilotRuleDefinition {
  scenario: string;
  instrument: string;
  join: "AND" | "OR";
  conditions: PilotCondition[];
  mode: PilotDataMode;
  scheduleSeconds: number;
  triggerPolicy: PilotTriggerPolicy;
  recipients: string[];
  entitlementApproved?: boolean;
}

export interface PilotObservationInput {
  id?: string;
  sourceId: string;
  instrument?: string | null;
  fieldId: string;
  valueDecimal: string | number | null | undefined;
  unit: string;
  observedAt: string;
  receivedAt?: string;
  mode: PilotDataMode;
}

export interface PilotObservation {
  id: string;
  sourceId: string;
  instrument: string | null;
  fieldId: PilotFieldId;
  specialization: ObservationSpecialization;
  valueDecimal: string;
  unit: string;
  observedAt: string;
  receivedAt: string;
  mode: PilotDataMode;
  quality: ObservationQuality;
  quarantineReason?: string | null;
}

export interface PilotConditionDiagnostic {
  conditionId: string;
  label: string;
  fieldId: PilotFieldId;
  operator: PilotOperator;
  thresholdDecimal: string;
  unit: string;
  observedDecimal: string | null;
  observedUnit: string | null;
  observedAt: string | null;
  sourceId: string | null;
  observationId: string | null;
  ageSeconds: number | null;
  maxAgeSeconds: number;
  status: "ELIGIBLE" | "MISSING" | "STALE" | "UNIT_MISMATCH" | "INVALID";
  met: boolean | null;
  detail: string;
}

export interface PilotEvaluationResult {
  outcome: PilotEvalOutcome;
  shouldEmit: boolean;
  suppressionReason: string | null;
  reason: string;
  engineVersion: string;
  evaluatedAt: string;
  diagnostics: PilotConditionDiagnostic[];
  selectedInputs: PilotObservation[];
}

export interface PilotTestCase {
  id: string;
  name: string;
  description: string;
  evaluationTime: string;
  observations: PilotObservation[];
  expectedOutcome: PilotEvalOutcome;
  expectedEmit: boolean;
}

export interface PilotTestRunItem {
  testCase: PilotTestCase;
  actualOutcome: PilotEvalOutcome;
  actualEmit: boolean;
  passed: boolean;
  reason: string;
  diagnostics: PilotConditionDiagnostic[];
}

export interface PilotTestSuiteResult {
  engineVersion: string;
  ruleSummary: string;
  passedCount: number;
  totalCount: number;
  allPassed: boolean;
  results: PilotTestRunItem[];
}

const DECIMAL_RE = /^[+-]?\d+(?:\.\d+)?$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OPERATORS: readonly PilotOperator[] = ["<", "<=", ">", ">=", "==", "!="];
const MODES: readonly PilotDataMode[] = [
  "SYNTHETIC",
  "REPLAY",
  "AUTHORISED_PILOT",
];
const EMISSIONS: readonly PilotEmissionPolicy[] = [
  "once_per_transition",
  "once",
  "cooldown",
];

/**
 * Validates and normalizes an exact base-10 decimal representation without
 * binary floating-point rounding. Never coerces null, empty or invalid input to zero.
 */
export function normalizeDecimal(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  let text: string;
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return null;
    text = String(raw);
  } else if (typeof raw === "string") {
    text = raw.trim();
  } else {
    return null;
  }
  if (!text || !DECIMAL_RE.test(text)) return null;
  const negative = text.startsWith("-");
  const unsigned = text.replace(/^[+-]/, "");
  const [intRaw, fracRaw = ""] = unsigned.split(".");
  const intTrimmed = intRaw.replace(/^0+(?=\d)/, "");
  const isZero = /^0+$/.test(intTrimmed) && /^0*$/.test(fracRaw);
  const sign = negative && !isZero ? "-" : "";
  return fracRaw.length > 0
    ? `${sign}${intTrimmed}.${fracRaw}`
    : `${sign}${intTrimmed}`;
}

/** Exact base-10 comparison using scaled BigInt arithmetic. */
export function compareDecimals(leftRaw: string, rightRaw: string): -1 | 0 | 1 {
  const left = normalizeDecimal(leftRaw);
  const right = normalizeDecimal(rightRaw);
  if (left === null || right === null) {
    throw new Error("Exact decimal comparison requires valid decimal strings.");
  }
  const leftNeg = left.startsWith("-");
  const rightNeg = right.startsWith("-");
  if (leftNeg !== rightNeg) return leftNeg ? -1 : 1;

  const [lInt, lFrac = ""] = left.replace(/^-/, "").split(".");
  const [rInt, rFrac = ""] = right.replace(/^-/, "").split(".");
  const scale = Math.max(lFrac.length, rFrac.length);
  const lScaled = BigInt(lInt + lFrac.padEnd(scale, "0"));
  const rScaled = BigInt(rInt + rFrac.padEnd(scale, "0"));
  if (lScaled === rScaled) return 0;
  const magnitude = lScaled < rScaled ? -1 : 1;
  return (leftNeg ? -magnitude : magnitude) as -1 | 0 | 1;
}

export function evaluateDecimalComparison(
  actual: string,
  operator: PilotOperator,
  threshold: string,
): boolean {
  const cmp = compareDecimals(actual, threshold);
  switch (operator) {
    case "<":
      return cmp === -1;
    case "<=":
      return cmp <= 0;
    case ">":
      return cmp === 1;
    case ">=":
      return cmp >= 0;
    case "==":
      return cmp === 0;
    case "!=":
      return cmp !== 0;
  }
}

export function formatPilotCondition(condition: PilotCondition): string {
  const spec = PILOT_FIELD_SPECS[condition.fieldId];
  const label = spec ? spec.label.split(" (")[0] : condition.fieldId;
  const scope = condition.instrument ? ` [${condition.instrument}]` : "";
  return `${label}${scope} ${condition.operator} ${condition.thresholdDecimal} ${condition.unit} (max age ${condition.maxAgeSeconds}s)`;
}

export function summarizePilotRule(rule: PilotRuleDefinition): string {
  if (!rule.conditions.length) return "Add at least one pilot condition.";
  const expr = rule.conditions.map(formatPilotCondition).join(` ${rule.join} `);
  const policyLabel =
    rule.triggerPolicy.emission === "once"
      ? "once per activation"
      : rule.triggerPolicy.emission === "once_per_transition"
        ? "once per transition"
        : "every eligible evaluation";
  const cooldown =
    rule.triggerPolicy.cooldownMinutes > 0
      ? `, ${rule.triggerPolicy.cooldownMinutes}m cooldown`
      : "";
  return `[${rule.mode}] ${rule.scenario} (${rule.instrument}): IF ${expr} THEN record event & email ${rule.recipients.join(", ") || "configured recipient"} (${policyLabel}${cooldown}, every ${rule.scheduleSeconds}s).`;
}

export function validateObservationInput(
  input: PilotObservationInput,
  maxFutureSkewMs = 60_000,
): {
  valid: boolean;
  observation: PilotObservation | null;
  error?: string;
} {
  if (!input || typeof input !== "object") {
    return {
      valid: false,
      observation: null,
      error: "Observation payload is required.",
    };
  }
  const spec = PILOT_FIELD_SPECS[input.fieldId as PilotFieldId];
  if (!spec) {
    return {
      valid: false,
      observation: null,
      error: `Unsupported field "${String(input.fieldId)}". Select an approved pilot field.`,
    };
  }
  if (!MODES.includes(input.mode)) {
    return {
      valid: false,
      observation: null,
      error: `Unsupported data mode "${String(input.mode)}".`,
    };
  }
  const sourceId = String(input.sourceId ?? "").trim();
  if (!sourceId) {
    return {
      valid: false,
      observation: null,
      error: "Observation provenance (sourceId) is required.",
    };
  }
  const normalized = normalizeDecimal(input.valueDecimal);
  if (normalized === null) {
    return {
      valid: false,
      observation: null,
      error:
        "Observation value must be an exact finite decimal; missing values are never converted to zero.",
    };
  }
  const unit = String(input.unit ?? "").trim();
  if (!spec.allowedUnits.includes(unit)) {
    return {
      valid: false,
      observation: null,
      error: `Unit "${unit || "empty"}" is incompatible with ${spec.id}; expected ${spec.allowedUnits.join(" or ")}.`,
    };
  }
  const instrument = input.instrument ? String(input.instrument).trim() : null;
  if (spec.requiresInstrument && !instrument) {
    return {
      valid: false,
      observation: null,
      error: `Market observation "${spec.id}" requires an explicit contract/instrument identifier.`,
    };
  }
  const observedMs = Date.parse(input.observedAt);
  if (!Number.isFinite(observedMs)) {
    return {
      valid: false,
      observation: null,
      error: "Observation timestamp (observedAt) must be a valid UTC ISO time.",
    };
  }
  const receivedIso = input.receivedAt ?? new Date().toISOString();
  const receivedMs = Date.parse(receivedIso);
  if (!Number.isFinite(receivedMs)) {
    return {
      valid: false,
      observation: null,
      error: "Received timestamp (receivedAt) must be a valid UTC ISO time.",
    };
  }

  const futureSkew = observedMs - receivedMs > maxFutureSkewMs;
  const observation: PilotObservation = {
    id: input.id ?? crypto.randomUUID(),
    sourceId,
    instrument,
    fieldId: spec.id,
    specialization: spec.specialization,
    valueDecimal: normalized,
    unit,
    observedAt: new Date(observedMs).toISOString(),
    receivedAt: new Date(receivedMs).toISOString(),
    mode: input.mode,
    quality: futureSkew ? "QUARANTINED" : "VALID",
    quarantineReason: futureSkew
      ? `Observation timestamp (${new Date(observedMs).toISOString()}) exceeds allowed future clock skew relative to receipt (${new Date(receivedMs).toISOString()}).`
      : null,
  };

  if (futureSkew) {
    return {
      valid: false,
      observation,
      error: observation.quarantineReason ?? "Observation is future-dated.",
    };
  }
  return { valid: true, observation };
}

export function validatePilotRuleDraft(rule: PilotRuleDefinition): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  summary: string;
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!rule || typeof rule !== "object") {
    return {
      valid: false,
      errors: ["Rule definition is required."],
      warnings,
      summary: "",
    };
  }
  if (!String(rule.scenario ?? "").trim()) {
    errors.push("Scenario name / business reference is required.");
  }
  if (!String(rule.instrument ?? "").trim()) {
    errors.push("Target instrument or business scope is required.");
  }
  if (!["AND", "OR"].includes(rule.join)) {
    errors.push("Condition join must be explicitly AND or OR.");
  }
  if (!MODES.includes(rule.mode)) {
    errors.push("Data mode must be SYNTHETIC, REPLAY or AUTHORISED_PILOT.");
  }
  if (rule.mode === "AUTHORISED_PILOT" && !rule.entitlementApproved) {
    errors.push(
      "AUTHORISED_PILOT mode is blocked until market-data entitlements and IT hosting approvals are confirmed (OD-05 / FR-010).",
    );
  }
  if (
    !Number.isInteger(rule.scheduleSeconds) ||
    rule.scheduleSeconds < 10 ||
    rule.scheduleSeconds > 86_400
  ) {
    errors.push(
      "Evaluation schedule must be an explicit whole number between 10 and 86400 seconds.",
    );
  }
  if (
    !rule.triggerPolicy ||
    !EMISSIONS.includes(rule.triggerPolicy.emission) ||
    !Number.isFinite(rule.triggerPolicy.cooldownMinutes) ||
    rule.triggerPolicy.cooldownMinutes < 0
  ) {
    errors.push(
      "Trigger policy requires an explicit emission mode and non-negative cooldown minutes.",
    );
  }
  if (!Array.isArray(rule.recipients) || rule.recipients.length === 0) {
    errors.push("At least one authorised alert recipient email is required.");
  } else {
    for (const email of rule.recipients) {
      if (!EMAIL_RE.test(String(email).trim())) {
        errors.push(`Invalid recipient email address: "${email}".`);
      }
    }
  }
  if (!Array.isArray(rule.conditions) || rule.conditions.length === 0) {
    errors.push("Add at least one structured condition.");
  } else {
    rule.conditions.forEach((cond, idx) => {
      const prefix = `Condition ${idx + 1}`;
      const spec = PILOT_FIELD_SPECS[cond.fieldId];
      if (!spec) {
        errors.push(`${prefix}: unsupported field "${String(cond.fieldId)}".`);
        return;
      }
      if (!OPERATORS.includes(cond.operator)) {
        errors.push(
          `${prefix}: unsupported operator "${String(cond.operator)}".`,
        );
      }
      if (normalizeDecimal(cond.thresholdDecimal) === null) {
        errors.push(`${prefix}: threshold must be an exact finite decimal.`);
      }
      if (!spec.allowedUnits.includes(cond.unit)) {
        errors.push(
          `${prefix}: unit "${cond.unit}" does not match ${spec.id} (${spec.allowedUnits.join(" / ")}).`,
        );
      }
      if (
        !Number.isInteger(cond.maxAgeSeconds) ||
        cond.maxAgeSeconds <= 0 ||
        cond.maxAgeSeconds > 604_800
      ) {
        errors.push(
          `${prefix}: maximum input age must be a positive whole number of seconds.`,
        );
      }
      if (cond.fieldId === "wapl") {
        warnings.push(
          "WAPL expansion, weighting formula and business owner remain marked TBD (OD-04) until trading sign-off.",
        );
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary:
      Array.isArray(rule.conditions) && rule.conditions.length > 0
        ? summarizePilotRule(rule)
        : "Incomplete rule draft.",
  };
}

export interface PilotEvalContext {
  evaluationTimeIso: string;
  previousOutcome?: PilotEvalOutcome | null;
  lastEmittedAtIso?: string | null;
  priorEmissionsCount?: number;
}

/**
 * Deterministic 4-valued rule evaluator (TRUE, FALSE, NOT_EVALUABLE, ERROR).
 * Enforces as-of timestamp cutoff (no future leakage), unit/contract identity,
 * freshness windows, exact decimal comparison, and explicit emission policy.
 */
export function evaluatePilotRule(
  rule: PilotRuleDefinition,
  observations: PilotObservation[],
  context: PilotEvalContext,
): PilotEvaluationResult {
  const evaluatedAt = context.evaluationTimeIso;
  try {
    const evalMs = Date.parse(evaluatedAt);
    if (!Number.isFinite(evalMs)) {
      return {
        outcome: "ERROR",
        shouldEmit: false,
        suppressionReason: null,
        reason: "Invalid evaluation timestamp supplied to engine.",
        engineVersion: PILOT_ENGINE_VERSION,
        evaluatedAt: new Date().toISOString(),
        diagnostics: [],
        selectedInputs: [],
      };
    }

    if (!Array.isArray(rule.conditions) || rule.conditions.length === 0) {
      return {
        outcome: "ERROR",
        shouldEmit: false,
        suppressionReason: null,
        reason: "Rule contains no conditions to evaluate.",
        engineVersion: PILOT_ENGINE_VERSION,
        evaluatedAt: new Date(evalMs).toISOString(),
        diagnostics: [],
        selectedInputs: [],
      };
    }

    const diagnostics: PilotConditionDiagnostic[] = [];
    const selectedMap = new Map<string, PilotObservation>();

    for (const cond of rule.conditions) {
      const spec = PILOT_FIELD_SPECS[cond.fieldId];
      const targetInstrument = cond.instrument || rule.instrument;
      const label = formatPilotCondition(cond);
      const thresholdNorm = normalizeDecimal(cond.thresholdDecimal);

      if (!spec || thresholdNorm === null) {
        diagnostics.push({
          conditionId: cond.id,
          label,
          fieldId: cond.fieldId,
          operator: cond.operator,
          thresholdDecimal: cond.thresholdDecimal,
          unit: cond.unit,
          observedDecimal: null,
          observedUnit: null,
          observedAt: null,
          sourceId: null,
          observationId: null,
          ageSeconds: null,
          maxAgeSeconds: cond.maxAgeSeconds,
          status: "INVALID",
          met: null,
          detail: "Condition definition has an invalid field or threshold.",
        });
        continue;
      }

      // Filter to observations at or before evaluation time (FR-009 / TC-013: no future data).
      const candidates = observations
        .filter((obs) => {
          if (obs.fieldId !== cond.fieldId) return false;
          if (obs.quality === "QUARANTINED" || obs.quality === "INVALID")
            return false;
          if (obs.mode !== rule.mode) return false;
          if (spec.requiresInstrument && obs.instrument !== targetInstrument) {
            return false;
          }
          if (
            !spec.requiresInstrument &&
            obs.instrument &&
            targetInstrument &&
            obs.instrument !== targetInstrument
          ) {
            return false;
          }
          const obsMs = Date.parse(obs.observedAt);
          return Number.isFinite(obsMs) && obsMs <= evalMs;
        })
        .sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt));

      const latest = candidates[0];
      if (!latest) {
        diagnostics.push({
          conditionId: cond.id,
          label,
          fieldId: cond.fieldId,
          operator: cond.operator,
          thresholdDecimal: thresholdNorm,
          unit: cond.unit,
          observedDecimal: null,
          observedUnit: null,
          observedAt: null,
          sourceId: null,
          observationId: null,
          ageSeconds: null,
          maxAgeSeconds: cond.maxAgeSeconds,
          status: "MISSING",
          met: null,
          detail: `Required ${cond.fieldId} observation (${rule.mode}${spec.requiresInstrument ? `, ${targetInstrument}` : ""}) is missing as of ${new Date(evalMs).toISOString()}.`,
        });
        continue;
      }

      selectedMap.set(latest.id, latest);
      const ageSeconds = Math.floor(
        (evalMs - Date.parse(latest.observedAt)) / 1000,
      );

      if (latest.unit !== cond.unit) {
        diagnostics.push({
          conditionId: cond.id,
          label,
          fieldId: cond.fieldId,
          operator: cond.operator,
          thresholdDecimal: thresholdNorm,
          unit: cond.unit,
          observedDecimal: latest.valueDecimal,
          observedUnit: latest.unit,
          observedAt: latest.observedAt,
          sourceId: latest.sourceId,
          observationId: latest.id,
          ageSeconds,
          maxAgeSeconds: cond.maxAgeSeconds,
          status: "UNIT_MISMATCH",
          met: null,
          detail: `Unit mismatch: observation has "${latest.unit}", condition requires "${cond.unit}".`,
        });
        continue;
      }

      if (ageSeconds > cond.maxAgeSeconds || latest.quality === "STALE") {
        diagnostics.push({
          conditionId: cond.id,
          label,
          fieldId: cond.fieldId,
          operator: cond.operator,
          thresholdDecimal: thresholdNorm,
          unit: cond.unit,
          observedDecimal: latest.valueDecimal,
          observedUnit: latest.unit,
          observedAt: latest.observedAt,
          sourceId: latest.sourceId,
          observationId: latest.id,
          ageSeconds,
          maxAgeSeconds: cond.maxAgeSeconds,
          status: "STALE",
          met: null,
          detail: `Observation is stale (${ageSeconds}s old > max ${cond.maxAgeSeconds}s).`,
        });
        continue;
      }

      const met = evaluateDecimalComparison(
        latest.valueDecimal,
        cond.operator,
        thresholdNorm,
      );
      diagnostics.push({
        conditionId: cond.id,
        label,
        fieldId: cond.fieldId,
        operator: cond.operator,
        thresholdDecimal: thresholdNorm,
        unit: cond.unit,
        observedDecimal: latest.valueDecimal,
        observedUnit: latest.unit,
        observedAt: latest.observedAt,
        sourceId: latest.sourceId,
        observationId: latest.id,
        ageSeconds,
        maxAgeSeconds: cond.maxAgeSeconds,
        status: "ELIGIBLE",
        met,
        detail: `${latest.valueDecimal} ${latest.unit} ${cond.operator} ${thresholdNorm} ${cond.unit} -> ${met ? "TRUE" : "FALSE"}`,
      });
    }

    // Conservative pilot policy (SRS Section 6.4.2 / TC-005):
    // All configured inputs must be eligible before emitting or declaring FALSE/TRUE.
    const ineligible = diagnostics.filter((d) => d.met === null);
    if (ineligible.length > 0) {
      return {
        outcome: "NOT_EVALUABLE",
        shouldEmit: false,
        suppressionReason: null,
        reason: ineligible.map((d) => d.detail).join(" "),
        engineVersion: PILOT_ENGINE_VERSION,
        evaluatedAt: new Date(evalMs).toISOString(),
        diagnostics,
        selectedInputs: [...selectedMap.values()],
      };
    }

    const truth =
      rule.join === "AND"
        ? diagnostics.every((d) => d.met === true)
        : diagnostics.some((d) => d.met === true);

    if (!truth) {
      return {
        outcome: "FALSE",
        shouldEmit: false,
        suppressionReason: null,
        reason: `Rule evaluated FALSE (${diagnostics.filter((d) => d.met === true).length}/${diagnostics.length} conditions met under ${rule.join}).`,
        engineVersion: PILOT_ENGINE_VERSION,
        evaluatedAt: new Date(evalMs).toISOString(),
        diagnostics,
        selectedInputs: [...selectedMap.values()],
      };
    }

    // Outcome is TRUE — check emission and cooldown policy (FR-016, FR-021, UC-06).
    let suppressionReason: string | null = null;
    const priorCount = context.priorEmissionsCount ?? 0;
    if (rule.triggerPolicy.emission === "once" && priorCount > 0) {
      suppressionReason =
        "Suppressed by one-shot policy: rule version already emitted an event.";
    } else if (
      rule.triggerPolicy.emission === "once_per_transition" &&
      context.previousOutcome === "TRUE"
    ) {
      suppressionReason =
        "Suppressed by once-per-transition policy: condition remained TRUE without resetting.";
    } else if (
      rule.triggerPolicy.cooldownMinutes > 0 &&
      context.lastEmittedAtIso
    ) {
      const lastMs = Date.parse(context.lastEmittedAtIso);
      if (
        Number.isFinite(lastMs) &&
        evalMs - lastMs < rule.triggerPolicy.cooldownMinutes * 60_000
      ) {
        const remainingSec = Math.ceil(
          (rule.triggerPolicy.cooldownMinutes * 60_000 - (evalMs - lastMs)) /
            1000,
        );
        suppressionReason = `Suppressed by cooldown policy (${remainingSec}s remaining).`;
      }
    }

    return {
      outcome: "TRUE",
      shouldEmit: suppressionReason === null,
      suppressionReason,
      reason:
        suppressionReason ??
        `All required ${rule.join} conditions satisfied (${diagnostics.map((d) => d.detail).join("; ")}).`,
      engineVersion: PILOT_ENGINE_VERSION,
      evaluatedAt: new Date(evalMs).toISOString(),
      diagnostics,
      selectedInputs: [...selectedMap.values()],
    };
  } catch (error) {
    return {
      outcome: "ERROR",
      shouldEmit: false,
      suppressionReason: null,
      reason:
        error instanceof Error
          ? `Unexpected evaluation error: ${error.message}`
          : "Unexpected evaluation processing failure.",
      engineVersion: PILOT_ENGINE_VERSION,
      evaluatedAt,
      diagnostics: [],
      selectedInputs: [],
    };
  }
}

function shiftedDecimal(
  threshold: string,
  operator: PilotOperator,
  pass: boolean,
): string {
  const norm = normalizeDecimal(threshold) ?? "80.00";
  const num = Number(norm);
  const delta = 5;
  if (operator === "<") return (pass ? num - delta : num + delta).toFixed(2);
  if (operator === "<=") return (pass ? num - delta : num + delta).toFixed(2);
  if (operator === ">") return (pass ? num + delta : num - delta).toFixed(2);
  if (operator === ">=") return (pass ? num + delta : num - delta).toFixed(2);
  if (operator === "==") return pass ? norm : (num + delta).toFixed(2);
  return pass ? (num + delta).toFixed(2) : norm;
}

/**
 * Generates reproducible synthetic verification cases (positive, boundary,
 * missing mandatory input, stale input) for controlled pre-activation testing (FR-036).
 */
export function buildControlledTestCases(
  rule: PilotRuleDefinition,
): PilotTestCase[] {
  const evalIso = "2026-11-05T08:05:00.000Z";
  const freshIso = "2026-11-05T08:00:00.000Z";

  const makeObs = (
    cond: PilotCondition,
    valueDecimal: string,
    observedAt = freshIso,
  ): PilotObservation => {
    const spec = PILOT_FIELD_SPECS[cond.fieldId];
    return {
      id: `tc-obs-${cond.id}-${valueDecimal}-${observedAt}`,
      sourceId: "synthetic-test-fixture",
      instrument: spec.requiresInstrument
        ? cond.instrument || rule.instrument
        : rule.instrument,
      fieldId: cond.fieldId,
      specialization: spec.specialization,
      valueDecimal: normalizeDecimal(valueDecimal) ?? valueDecimal,
      unit: cond.unit,
      observedAt,
      receivedAt: evalIso,
      mode: rule.mode,
      quality: "VALID",
      quarantineReason: null,
    };
  };

  const positiveObs = rule.conditions.map((cond) =>
    makeObs(cond, shiftedDecimal(cond.thresholdDecimal, cond.operator, true)),
  );

  const negativeObs = rule.conditions.map((cond) =>
    makeObs(cond, shiftedDecimal(cond.thresholdDecimal, cond.operator, false)),
  );

  const first = rule.conditions[0];
  const boundaryExpectedTrue =
    first.operator === "<=" ||
    first.operator === ">=" ||
    first.operator === "==";
  const boundaryObs = rule.conditions.map((cond, idx) =>
    idx === 0
      ? makeObs(cond, cond.thresholdDecimal)
      : makeObs(
          cond,
          shiftedDecimal(
            cond.thresholdDecimal,
            cond.operator,
            rule.join === "AND",
          ),
        ),
  );

  const staleAgeMs = (first.maxAgeSeconds + 120) * 1000;
  const staleIso = new Date(Date.parse(evalIso) - staleAgeMs).toISOString();
  const staleObs = rule.conditions.map((cond, idx) =>
    makeObs(
      cond,
      shiftedDecimal(cond.thresholdDecimal, cond.operator, true),
      idx === 0 ? staleIso : freshIso,
    ),
  );

  return [
    {
      id: "TC-001",
      name: "Positive match",
      description:
        "All configured conditions receive fresh, eligible synthetic inputs satisfying their operators.",
      evaluationTime: evalIso,
      observations: positiveObs,
      expectedOutcome: "TRUE",
      expectedEmit: true,
    },
    {
      id: "TC-002",
      name: "Boundary equality check",
      description: `First condition equals exact threshold (${first.thresholdDecimal} ${first.unit}) under "${first.operator}".`,
      evaluationTime: evalIso,
      observations: boundaryObs,
      expectedOutcome: boundaryExpectedTrue ? "TRUE" : "FALSE",
      expectedEmit: boundaryExpectedTrue,
    },
    {
      id: "TC-003",
      name: "Missing mandatory input",
      description:
        "First required observation is absent; engine must return NOT_EVALUABLE rather than 0 or FALSE.",
      evaluationTime: evalIso,
      observations: positiveObs.slice(1),
      expectedOutcome: "NOT_EVALUABLE",
      expectedEmit: false,
    },
    {
      id: "TC-004",
      name: "Stale input beyond max age",
      description: `Observation exceeds configured ${first.maxAgeSeconds}s freshness window.`,
      evaluationTime: evalIso,
      observations: staleObs,
      expectedOutcome: "NOT_EVALUABLE",
      expectedEmit: false,
    },
    {
      id: "TC-NEG",
      name: "Negative non-triggering input",
      description:
        "Fresh, valid inputs do not satisfy the configured threshold expression.",
      evaluationTime: evalIso,
      observations: negativeObs,
      expectedOutcome: "FALSE",
      expectedEmit: false,
    },
  ];
}

export function runControlledScenarioTests(
  rule: PilotRuleDefinition,
  cases: PilotTestCase[] = buildControlledTestCases(rule),
): PilotTestSuiteResult {
  const results: PilotTestRunItem[] = cases.map((testCase) => {
    const evalResult = evaluatePilotRule(rule, testCase.observations, {
      evaluationTimeIso: testCase.evaluationTime,
      previousOutcome: null,
      lastEmittedAtIso: null,
      priorEmissionsCount: 0,
    });
    const passed =
      evalResult.outcome === testCase.expectedOutcome &&
      evalResult.shouldEmit === testCase.expectedEmit;
    return {
      testCase,
      actualOutcome: evalResult.outcome,
      actualEmit: evalResult.shouldEmit,
      passed,
      reason: evalResult.reason,
      diagnostics: evalResult.diagnostics,
    };
  });

  const passedCount = results.filter((r) => r.passed).length;
  return {
    engineVersion: PILOT_ENGINE_VERSION,
    ruleSummary: summarizePilotRule(rule),
    passedCount,
    totalCount: results.length,
    allPassed: passedCount === results.length,
    results,
  };
}

export function makeDefaultSeedPilotRule(): PilotRuleDefinition {
  return {
    scenario: "BR-EX-01 — Synthetic Brent Reference Price Guard",
    instrument: "brent-dec26",
    join: "AND",
    conditions: [
      {
        id: "cond-br-ex-01",
        fieldId: "reference_price",
        operator: "<",
        thresholdDecimal: "80.00",
        unit: "USD/bbl",
        maxAgeSeconds: 900,
        instrument: "brent-dec26",
      },
    ],
    mode: "SYNTHETIC",
    scheduleSeconds: 60,
    triggerPolicy: {
      emission: "once_per_transition",
      cooldownMinutes: 15,
    },
    recipients: ["pilot-alerts@example.com"],
  };
}
