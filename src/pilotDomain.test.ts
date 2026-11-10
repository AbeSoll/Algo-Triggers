import { describe, expect, it } from "vitest";
import {
  compareDecimals,
  evaluatePilotRule,
  makeDefaultSeedPilotRule,
  normalizeDecimal,
  runControlledScenarioTests,
  validateObservationInput,
  validatePilotRuleDraft,
  type PilotObservation,
  type PilotRuleDefinition,
} from "./pilotDomain";

describe("HedgeSignal domain (SRS v0.2)", () => {
  it("compares exact decimals without binary floating-point rounding (NFR-001)", () => {
    expect(normalizeDecimal("0075.00")).toBe("75.00");
    expect(normalizeDecimal("-0.00")).toBe("0.00");
    expect(normalizeDecimal("")).toBeNull();
    expect(normalizeDecimal(null)).toBeNull();
    expect(normalizeDecimal("NaN")).toBeNull();
    expect(compareDecimals("75.00", "80.00")).toBe(-1);
    expect(compareDecimals("80.00", "80")).toBe(0);
    expect(compareDecimals("80.000001", "80.000000")).toBe(1);
    expect(compareDecimals("-10.5", "-10.49")).toBe(-1);
  });

  it("evaluates BR-EX-01 positive, boundary, missing and stale cases (TC-001..TC-004)", () => {
    const rule = makeDefaultSeedPilotRule();
    const evalTime = "2026-11-05T08:05:00.000Z";

    const makePriceObs = (
      valueDecimal: string,
      observedAt = "2026-11-05T08:00:00.000Z",
    ): PilotObservation => ({
      id: `obs-${valueDecimal}`,
      sourceId: "synthetic-fixture",
      instrument: "brent-dec26",
      fieldId: "reference_price",
      specialization: "MARKET",
      valueDecimal,
      unit: "USD/bbl",
      observedAt,
      receivedAt: evalTime,
      mode: "SYNTHETIC",
      quality: "VALID",
      quarantineReason: null,
    });

    // TC-001: 75.00 < 80.00 -> TRUE
    const tc1 = evaluatePilotRule(rule, [makePriceObs("75.00")], {
      evaluationTimeIso: evalTime,
    });
    expect(tc1.outcome).toBe("TRUE");
    expect(tc1.shouldEmit).toBe(true);
    expect(tc1.diagnostics[0].observedDecimal).toBe("75.00");

    // TC-002: 80.00 < 80.00 -> FALSE
    const tc2 = evaluatePilotRule(rule, [makePriceObs("80.00")], {
      evaluationTimeIso: evalTime,
    });
    expect(tc2.outcome).toBe("FALSE");
    expect(tc2.shouldEmit).toBe(false);

    // TC-003: Missing required input -> NOT_EVALUABLE (never 0 or FALSE)
    const tc3 = evaluatePilotRule(rule, [], {
      evaluationTimeIso: evalTime,
    });
    expect(tc3.outcome).toBe("NOT_EVALUABLE");
    expect(tc3.shouldEmit).toBe(false);

    // TC-004: Stale input beyond 900s max age -> NOT_EVALUABLE
    const tc4 = evaluatePilotRule(
      rule,
      [makePriceObs("75.00", "2026-11-05T07:30:00.000Z")],
      { evaluationTimeIso: evalTime },
    );
    expect(tc4.outcome).toBe("NOT_EVALUABLE");
    expect(tc4.shouldEmit).toBe(false);
    expect(tc4.diagnostics[0].status).toBe("STALE");
  });

  it("blocks compound rule emission when any mandatory input is missing (TC-005)", () => {
    const compound: PilotRuleDefinition = {
      ...makeDefaultSeedPilotRule(),
      join: "OR",
      conditions: [
        {
          id: "c1",
          fieldId: "reference_price",
          operator: "<",
          thresholdDecimal: "80.00",
          unit: "USD/bbl",
          maxAgeSeconds: 900,
          instrument: "brent-dec26",
        },
        {
          id: "c2",
          fieldId: "volume",
          operator: "<",
          thresholdDecimal: "10.5",
          unit: "million bbl",
          maxAgeSeconds: 86_400,
        },
      ],
    };

    const res = evaluatePilotRule(
      compound,
      [
        {
          id: "obs-price",
          sourceId: "synthetic-fixture",
          instrument: "brent-dec26",
          fieldId: "reference_price",
          specialization: "MARKET",
          valueDecimal: "75.00",
          unit: "USD/bbl",
          observedAt: "2026-11-05T08:00:00.000Z",
          receivedAt: "2026-11-05T08:01:00.000Z",
          mode: "SYNTHETIC",
          quality: "VALID",
        },
      ],
      { evaluationTimeIso: "2026-11-05T08:05:00.000Z" },
    );
    expect(res.outcome).toBe("NOT_EVALUABLE");
    expect(res.shouldEmit).toBe(false);
  });

  it("ignores future observations relative to evaluation time and quarantines future clock skew (TC-013)", () => {
    const rule = makeDefaultSeedPilotRule();
    const futureCheck = validateObservationInput({
      sourceId: "manual-entry",
      instrument: "brent-dec26",
      fieldId: "reference_price",
      valueDecimal: "71.25",
      unit: "USD/bbl",
      observedAt: "2026-11-05T10:00:00.000Z",
      receivedAt: "2026-11-05T08:00:00.000Z",
      mode: "SYNTHETIC",
    });
    expect(futureCheck.valid).toBe(false);
    expect(futureCheck.observation?.quality).toBe("QUARANTINED");

    // Even if a valid observation exists at 08:10, evaluating as-of 08:05 must not use it
    const validLater = validateObservationInput({
      sourceId: "synthetic-replay",
      instrument: "brent-dec26",
      fieldId: "reference_price",
      valueDecimal: "71.25",
      unit: "USD/bbl",
      observedAt: "2026-11-05T08:10:00.000Z",
      receivedAt: "2026-11-05T08:10:05.000Z",
      mode: "SYNTHETIC",
    });
    expect(validLater.valid).toBe(true);
    const earlyEval = evaluatePilotRule(rule, [validLater.observation!], {
      evaluationTimeIso: "2026-11-05T08:05:00.000Z",
    });
    expect(earlyEval.outcome).toBe("NOT_EVALUABLE");
  });

  it("rejects mismatched units and unapproved operational mode (TC-014, FR-010)", () => {
    const badUnit = validateObservationInput({
      sourceId: "manual",
      instrument: "brent-dec26",
      fieldId: "reference_price",
      valueDecimal: "75.00",
      unit: "USD/share",
      observedAt: "2026-11-05T08:00:00.000Z",
      receivedAt: "2026-11-05T08:00:01.000Z",
      mode: "SYNTHETIC",
    });
    expect(badUnit.valid).toBe(false);
    expect(badUnit.error).toContain("incompatible");

    const unapprovedLive = validatePilotRuleDraft({
      ...makeDefaultSeedPilotRule(),
      mode: "AUTHORISED_PILOT",
      entitlementApproved: false,
    });
    expect(unapprovedLive.valid).toBe(false);
    expect(unapprovedLive.errors.join(" ")).toContain("AUTHORISED_PILOT");
  });

  it("enforces once-per-transition, one-shot and cooldown suppression (FR-016, FR-021)", () => {
    const rule = makeDefaultSeedPilotRule();
    const obs: PilotObservation = {
      id: "obs-1",
      sourceId: "synthetic",
      instrument: "brent-dec26",
      fieldId: "reference_price",
      specialization: "MARKET",
      valueDecimal: "75.00",
      unit: "USD/bbl",
      observedAt: "2026-11-05T08:04:00.000Z",
      receivedAt: "2026-11-05T08:04:01.000Z",
      mode: "SYNTHETIC",
      quality: "VALID",
    };

    // Repeated TRUE without transition is suppressed
    const repeat = evaluatePilotRule(rule, [obs], {
      evaluationTimeIso: "2026-11-05T08:05:00.000Z",
      previousOutcome: "TRUE",
    });
    expect(repeat.outcome).toBe("TRUE");
    expect(repeat.shouldEmit).toBe(false);
    expect(repeat.suppressionReason).toContain("once-per-transition");

    // Transition from FALSE -> TRUE within cooldown is suppressed
    const inCooldown = evaluatePilotRule(rule, [obs], {
      evaluationTimeIso: "2026-11-05T08:05:00.000Z",
      previousOutcome: "FALSE",
      lastEmittedAtIso: "2026-11-05T07:55:00.000Z",
    });
    expect(inCooldown.outcome).toBe("TRUE");
    expect(inCooldown.shouldEmit).toBe(false);
    expect(inCooldown.suppressionReason).toContain("cooldown");
  });

  it("executes the controlled pre-activation test suite with 100% pass on valid draft (FR-036)", () => {
    const suite = runControlledScenarioTests(makeDefaultSeedPilotRule());
    expect(suite.allPassed).toBe(true);
    expect(suite.passedCount).toBe(5);
  });
});
