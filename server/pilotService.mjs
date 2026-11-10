import crypto from "node:crypto";
import {
  PILOT_ENGINE_VERSION,
  evaluatePilotRule,
  runControlledScenarioTests,
  summarizePilotRule,
  validateObservationInput,
  validatePilotRuleDraft,
} from "../src/pilotDomain.ts";
import { openDb } from "./db.mjs";
import { alertEmail, deliver, smtpConfigured } from "./mailer.mjs";

export class PilotHttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function extractActorContext(req) {
  const headers = req?.headers ?? {};
  const actorHeader = String(headers["x-pilot-actor"] || "").trim();
  const authHeader = String(headers.authorization || "").trim();
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : String(headers["x-pilot-token"] || "").trim();

  return {
    role: "team_member",
    actor: actorHeader || "team-member",
    token,
  };
}

export function recordAudit(
  db,
  { actor, role, action, target, outcome, details },
) {
  db.prepare(
    `INSERT INTO pilot_audit_events (
      id, actor, role, action, target, outcome, safe_details, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    crypto.randomUUID(),
    String(actor || "anonymous").slice(0, 80),
    role === "system" ? "system" : "team_member",
    action,
    String(target || "system").slice(0, 140),
    outcome,
    String(details || "").slice(0, 500),
    new Date().toISOString(),
  );
}

export function authorizePilot(
  permission,
  actorCtx = { actor: "team-member", role: "team_member", token: "" },
  target = "pilot",
) {
  const db = openDb();
  const requiredToken = (process.env.PILOT_TOKEN || "").trim();
  if (requiredToken && actorCtx.token !== requiredToken) {
    recordAudit(db, {
      actor: actorCtx.actor || "unauthenticated",
      role: actorCtx.role || "none",
      action: `AUTH_${permission.toUpperCase()}`,
      target,
      outcome: "DENIED",
      details:
        "Denied unauthenticated request: invalid or missing pilot token.",
    });
    throw new PilotHttpError(
      401,
      "UNAUTHENTICATED",
      "Authentication is required to access HedgeSignal resources.",
    );
  }
}

function mapObservationRow(row) {
  return {
    id: row.id,
    sourceId: row.source_id,
    instrument: row.instrument,
    fieldId: row.field_id,
    specialization: row.specialization,
    valueDecimal: row.value_decimal,
    unit: row.unit,
    observedAt: row.observed_at,
    receivedAt: row.received_at,
    mode: row.mode,
    quality: row.quality,
    quarantineReason: row.quarantine_reason,
  };
}

function formatPilotEmail({
  mode,
  ruleName,
  ruleVersion,
  instrument,
  summary,
  eventId,
  evaluatedAt,
  diagnostics,
}) {
  const banner =
    mode === "AUTHORISED_PILOT"
      ? "[PILOT ALERT · AUTHORISED DATA]"
      : `[PILOT / TEST ALERT · ${mode} DATA — NOT LIVE MARKET EXECUTION]`;
  const subject = `${banner} HedgeSignal: ${ruleName} (v${ruleVersion})`;
  const condLines = diagnostics.map(
    (d) =>
      `- ${d.fieldId}: observed ${d.observedDecimal ?? "MISSING"} ${d.observedUnit ?? ""} vs ${d.operator} ${d.thresholdDecimal} ${d.unit} | source=${d.sourceId ?? "n/a"} | observedAt=${d.observedAt ?? "n/a"}`,
  );
  const body = [
    banner,
    "",
    `Scenario / Rule: ${ruleName} (immutable version v${ruleVersion})`,
    `Instrument / Scope: ${instrument}`,
    `Summary: ${summary}`,
    `Evaluated at (UTC): ${evaluatedAt}`,
    `Event Reference ID: ${eventId}`,
    "",
    "Recorded Condition Evidence:",
    ...condLines,
    "",
    "Notice: Human review required. HedgeSignal records hedging trigger conditions only and never submits orders.",
  ].join("\n");
  return { subject, body };
}

export function capturePilotObservation(
  payload,
  actorCtx = { actor: "team-member", role: "team_member", token: "" },
) {
  authorizePilot(
    "configure",
    actorCtx,
    `observation:${payload?.fieldId || "unknown"}`,
  );
  const db = openDb();
  const validation = validateObservationInput(payload);

  if (!validation.valid) {
    if (validation.observation?.quality === "QUARANTINED") {
      const q = validation.observation;
      db.prepare(
        `INSERT INTO pilot_observations (
          id, source_id, instrument, field_id, specialization, value_decimal, unit,
          observed_at, received_at, mode, quality, quarantine_reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        q.id,
        q.sourceId,
        q.instrument,
        q.fieldId,
        q.specialization,
        q.valueDecimal,
        q.unit,
        q.observedAt,
        q.receivedAt,
        q.mode,
        q.quality,
        q.quarantineReason,
      );
      recordAudit(db, {
        actor: actorCtx.actor,
        role: actorCtx.role,
        action: "QUARANTINE_OBSERVATION",
        target: `${q.fieldId}:${q.id}`,
        outcome: "QUARANTINED",
        details: validation.error,
      });
      throw new PilotHttpError(
        400,
        "QUARANTINED_OBSERVATION",
        validation.error || "Observation quarantined.",
      );
    }

    recordAudit(db, {
      actor: actorCtx.actor,
      role: actorCtx.role,
      action: "REJECT_OBSERVATION",
      target: String(payload?.fieldId || "unknown"),
      outcome: "REJECTED",
      details: validation.error || "Invalid observation rejected.",
    });
    throw new PilotHttpError(
      400,
      "INVALID_OBSERVATION",
      validation.error || "Invalid observation.",
    );
  }

  const obs = validation.observation;
  db.prepare(
    `INSERT INTO pilot_observations (
      id, source_id, instrument, field_id, specialization, value_decimal, unit,
      observed_at, received_at, mode, quality, quarantine_reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
  ).run(
    obs.id,
    obs.sourceId,
    obs.instrument,
    obs.fieldId,
    obs.specialization,
    obs.valueDecimal,
    obs.unit,
    obs.observedAt,
    obs.receivedAt,
    obs.mode,
    obs.quality,
  );

  recordAudit(db, {
    actor: actorCtx.actor,
    role: actorCtx.role,
    action: "CAPTURE_OBSERVATION",
    target: `${obs.fieldId}:${obs.id}`,
    outcome: "ALLOWED",
    details: `Recorded ${obs.mode} ${obs.fieldId}=${obs.valueDecimal} ${obs.unit} (${obs.sourceId}).`,
  });

  return { success: true, observation: obs };
}

export function savePilotRuleVersion(
  { ruleId, name, definition },
  actorCtx = { actor: "team-member", role: "team_member", token: "" },
) {
  authorizePilot("configure", actorCtx, ruleId || "new-rule");
  const normalizedDef = {
    ...definition,
    recipients:
      Array.isArray(definition?.recipients) && definition.recipients.length > 0
        ? definition.recipients.map((r) => String(r).trim()).filter(Boolean)
        : [alertEmail() || "pilot-alerts@example.com"],
  };
  const check = validatePilotRuleDraft(normalizedDef);
  if (!check.valid) {
    throw new PilotHttpError(400, "INVALID_RULE", check.errors.join(" "));
  }

  const db = openDb();
  const now = new Date().toISOString();
  const cleanName = String(name || normalizedDef.scenario).trim();

  db.exec("BEGIN IMMEDIATE");
  try {
    let targetRuleId = ruleId ? String(ruleId).trim() : "";
    let nextVersion = 1;

    if (targetRuleId) {
      const existing = db
        .prepare("SELECT * FROM pilot_rules WHERE id = ?")
        .get(targetRuleId);
      if (!existing) {
        throw new PilotHttpError(404, "RULE_NOT_FOUND", "Rule not found.");
      }
      nextVersion = existing.latest_version + 1;
      db.prepare(
        `UPDATE pilot_rules
         SET name = ?, scenario = ?, instrument = ?, latest_version = ?, updated_at = ?
         WHERE id = ?`,
      ).run(
        cleanName,
        normalizedDef.scenario,
        normalizedDef.instrument,
        nextVersion,
        now,
        targetRuleId,
      );
    } else {
      targetRuleId = `pilot-rule-${crypto.randomUUID().slice(0, 8)}`;
      db.prepare(
        `INSERT INTO pilot_rules (
          id, name, scenario, instrument, status, latest_version, active_version, owner, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'VALIDATED', 1, NULL, ?, ?, ?)`,
      ).run(
        targetRuleId,
        cleanName,
        normalizedDef.scenario,
        normalizedDef.instrument,
        actorCtx.actor,
        now,
        now,
      );
    }

    const versionId = `${targetRuleId}:v${nextVersion}`;
    const summary = summarizePilotRule(normalizedDef);
    db.prepare(
      `INSERT INTO pilot_rule_versions (
        id, rule_id, version, definition_json, summary, mode, schedule_seconds,
        trigger_policy_json, recipients_json, created_by, approved_by, approved_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)`,
    ).run(
      versionId,
      targetRuleId,
      nextVersion,
      JSON.stringify(normalizedDef),
      summary,
      normalizedDef.mode,
      normalizedDef.scheduleSeconds,
      JSON.stringify(normalizedDef.triggerPolicy),
      JSON.stringify(normalizedDef.recipients),
      actorCtx.actor,
      now,
    );

    recordAudit(db, {
      actor: actorCtx.actor,
      role: actorCtx.role,
      action: "SAVE_RULE_VERSION",
      target: versionId,
      outcome: "ALLOWED",
      details: `Saved immutable version v${nextVersion} for "${cleanName}".`,
    });

    db.exec("COMMIT");
    return {
      success: true,
      ruleId: targetRuleId,
      version: nextVersion,
      versionId,
      summary,
      warnings: check.warnings,
    };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function activatePilotRule(
  { ruleId, expectedVersion },
  actorCtx = { actor: "team-member", role: "team_member", token: "" },
) {
  authorizePilot("configure", actorCtx, `${ruleId}:v${expectedVersion}`);
  const db = openDb();
  const rule = db
    .prepare("SELECT * FROM pilot_rules WHERE id = ?")
    .get(String(ruleId || ""));
  if (!rule) {
    throw new PilotHttpError(404, "RULE_NOT_FOUND", "Pilot rule not found.");
  }
  if (
    !Number.isInteger(expectedVersion) ||
    rule.latest_version !== expectedVersion
  ) {
    recordAudit(db, {
      actor: actorCtx.actor,
      role: actorCtx.role,
      action: "ACTIVATE_RULE_CONFLICT",
      target: `${rule.id}:v${expectedVersion}`,
      outcome: "REJECTED",
      details: `Stale version activation blocked: reviewed v${expectedVersion}, latest is v${rule.latest_version}.`,
    });
    throw new PilotHttpError(
      409,
      "STALE_VERSION",
      `Rule changed after preview (reviewed v${expectedVersion}, latest is v${rule.latest_version}). Review the latest version before activating.`,
    );
  }

  const rv = db
    .prepare(
      "SELECT * FROM pilot_rule_versions WHERE rule_id = ? AND version = ?",
    )
    .get(rule.id, expectedVersion);
  if (!rv) {
    throw new PilotHttpError(
      404,
      "VERSION_NOT_FOUND",
      "Requested rule version does not exist.",
    );
  }
  const check = validatePilotRuleDraft(JSON.parse(rv.definition_json));
  if (!check.valid) {
    throw new PilotHttpError(400, "INVALID_RULE", check.errors.join(" "));
  }

  const now = new Date().toISOString();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(
      "UPDATE pilot_rule_versions SET approved_by = ?, approved_at = ? WHERE id = ?",
    ).run(actorCtx.actor, now, rv.id);
    db.prepare(
      "UPDATE pilot_rules SET status = 'ACTIVE', active_version = ?, updated_at = ? WHERE id = ?",
    ).run(expectedVersion, now, rule.id);

    recordAudit(db, {
      actor: actorCtx.actor,
      role: actorCtx.role,
      action: "ACTIVATE_RULE",
      target: `${rule.id}:v${expectedVersion}`,
      outcome: "ALLOWED",
      details: `Activated ${rule.name} v${expectedVersion} in ${rv.mode} mode.`,
    });
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return {
    success: true,
    ruleId: rule.id,
    activeVersion: expectedVersion,
    status: "ACTIVE",
    message: `Activated ${rule.name} · v${expectedVersion} for scheduled monitoring.`,
  };
}

export function pausePilotRule(
  { ruleId },
  actorCtx = { actor: "team-member", role: "team_member", token: "" },
) {
  authorizePilot("configure", actorCtx, String(ruleId || ""));
  const db = openDb();
  const rule = db
    .prepare("SELECT * FROM pilot_rules WHERE id = ?")
    .get(String(ruleId || ""));
  if (!rule) {
    throw new PilotHttpError(404, "RULE_NOT_FOUND", "Pilot rule not found.");
  }
  const now = new Date().toISOString();
  db.prepare(
    "UPDATE pilot_rules SET status = 'PAUSED', updated_at = ? WHERE id = ?",
  ).run(now, rule.id);

  recordAudit(db, {
    actor: actorCtx.actor,
    role: actorCtx.role,
    action: "PAUSE_RULE",
    target: `${rule.id}:v${rule.active_version ?? rule.latest_version}`,
    outcome: "ALLOWED",
    details: `Paused monitoring for "${rule.name}".`,
  });

  return {
    success: true,
    ruleId: rule.id,
    status: "PAUSED",
    message: `Monitoring paused for ${rule.name}.`,
  };
}

export function runPilotRuleTests(
  { ruleId, version },
  actorCtx = { actor: "team-member", role: "team_member", token: "" },
) {
  authorizePilot("configure", actorCtx, `${ruleId}:v${version || "latest"}`);
  const db = openDb();
  const rule = db
    .prepare("SELECT * FROM pilot_rules WHERE id = ?")
    .get(String(ruleId || ""));
  if (!rule) {
    throw new PilotHttpError(404, "RULE_NOT_FOUND", "Pilot rule not found.");
  }
  const targetVersion = Number.isInteger(version)
    ? version
    : rule.latest_version;
  const rv = db
    .prepare(
      "SELECT * FROM pilot_rule_versions WHERE rule_id = ? AND version = ?",
    )
    .get(rule.id, targetVersion);
  if (!rv) {
    throw new PilotHttpError(
      404,
      "VERSION_NOT_FOUND",
      "Rule version not found.",
    );
  }

  const def = JSON.parse(rv.definition_json);
  const suite = runControlledScenarioTests(def);
  recordAudit(db, {
    actor: actorCtx.actor,
    role: actorCtx.role,
    action: "RUN_CONTROLLED_TESTS",
    target: `${rule.id}:v${targetVersion}`,
    outcome: suite.allPassed ? "ALLOWED" : "WARNING",
    details: `Controlled test suite completed: ${suite.passedCount}/${suite.totalCount} passed (${suite.engineVersion}).`,
  });

  return {
    success: true,
    ruleId: rule.id,
    version: targetVersion,
    suite,
  };
}

/**
 * Evaluates one immutable rule version atomically with unique logicalKey deduplication.
 * Commits evaluation, inputs, trigger_event and notification_intents in one transaction.
 */
export function evaluateRuleVersionAtomic({
  ruleRow,
  versionRow,
  evaluationTimeIso = new Date().toISOString(),
  logicalKey,
}) {
  const db = openDb();
  const resolvedLogicalKey =
    logicalKey || `eval:${versionRow.id}:${evaluationTimeIso}`;

  const duplicate = db
    .prepare("SELECT * FROM pilot_evaluations WHERE logical_key = ?")
    .get(resolvedLogicalKey);
  if (duplicate) {
    const existingEvent = db
      .prepare("SELECT * FROM pilot_trigger_events WHERE evaluation_id = ?")
      .get(duplicate.id);
    return {
      deduplicated: true,
      evaluationId: duplicate.id,
      outcome: duplicate.outcome,
      shouldEmit: Boolean(duplicate.should_emit),
      eventId: existingEvent?.id ?? null,
      reason: duplicate.reason,
    };
  }

  const def = JSON.parse(versionRow.definition_json);
  const observations = db
    .prepare(
      "SELECT * FROM pilot_observations WHERE mode = ? ORDER BY observed_at DESC LIMIT 500",
    )
    .all(def.mode)
    .map(mapObservationRow);

  const prevEval = db
    .prepare(
      `SELECT outcome FROM pilot_evaluations
       WHERE rule_version_id = ? AND evaluated_at <= ?
       ORDER BY evaluated_at DESC LIMIT 1`,
    )
    .get(versionRow.id, evaluationTimeIso);

  const lastEvent = db
    .prepare(
      `SELECT triggered_at FROM pilot_trigger_events
       WHERE rule_version_id = ? AND triggered_at <= ?
       ORDER BY triggered_at DESC LIMIT 1`,
    )
    .get(versionRow.id, evaluationTimeIso);

  const emissionCountRow = db
    .prepare(
      "SELECT COUNT(*) AS count FROM pilot_trigger_events WHERE rule_version_id = ?",
    )
    .get(versionRow.id);

  const result = evaluatePilotRule(def, observations, {
    evaluationTimeIso,
    previousOutcome: prevEval?.outcome ?? null,
    lastEmittedAtIso: lastEvent?.triggered_at ?? null,
    priorEmissionsCount: emissionCountRow?.count ?? 0,
  });

  const evaluationId = `eval-${crypto.randomUUID()}`;
  let createdEventId = null;

  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(
      `INSERT INTO pilot_evaluations (
        id, rule_id, rule_version_id, rule_version, logical_key, scheduled_at, evaluated_at,
        outcome, should_emit, reason, engine_version, diagnostics_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      evaluationId,
      ruleRow.id,
      versionRow.id,
      versionRow.version,
      resolvedLogicalKey,
      evaluationTimeIso,
      result.evaluatedAt,
      result.outcome,
      result.shouldEmit ? 1 : 0,
      result.reason,
      result.engineVersion,
      JSON.stringify(result.diagnostics),
    );

    const insertInput = db.prepare(
      `INSERT INTO pilot_evaluation_inputs (
        evaluation_id, observation_id, field_id, value_snapshot, unit, observed_at, quality
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const obs of result.selectedInputs) {
      insertInput.run(
        evaluationId,
        obs.id,
        obs.fieldId,
        obs.valueDecimal,
        obs.unit,
        obs.observedAt,
        obs.quality,
      );
    }

    if (result.outcome === "TRUE" && result.shouldEmit) {
      createdEventId = `evt-${crypto.randomUUID()}`;
      const eventKey = `evt:${resolvedLogicalKey}`;
      const evidence = {
        ruleId: ruleRow.id,
        ruleName: ruleRow.name,
        scenario: def.scenario,
        ruleVersion: versionRow.version,
        summary: versionRow.summary,
        instrument: def.instrument,
        mode: def.mode,
        engineVersion: result.engineVersion,
        evaluatedAt: result.evaluatedAt,
        diagnostics: result.diagnostics,
      };

      db.prepare(
        `INSERT INTO pilot_trigger_events (
          id, evaluation_id, event_key, rule_id, rule_version_id, rule_version,
          rule_name, instrument, triggered_at, mode, evidence_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        createdEventId,
        evaluationId,
        eventKey,
        ruleRow.id,
        versionRow.id,
        versionRow.version,
        ruleRow.name,
        def.instrument,
        result.evaluatedAt,
        def.mode,
        JSON.stringify(evidence),
      );

      const recipients = JSON.parse(versionRow.recipients_json);
      const { subject, body } = formatPilotEmail({
        mode: def.mode,
        ruleName: ruleRow.name,
        ruleVersion: versionRow.version,
        instrument: def.instrument,
        summary: versionRow.summary,
        eventId: createdEventId,
        evaluatedAt: result.evaluatedAt,
        diagnostics: result.diagnostics,
      });

      const insertIntent = db.prepare(
        `INSERT INTO pilot_notification_intents (
          id, event_id, channel, recipient, subject, body, idempotency_key,
          state, attempts_count, last_error, updated_at, created_at
        ) VALUES (?, ?, 'EMAIL', ?, ?, ?, ?, 'PENDING', 0, NULL, ?, ?)`,
      );
      for (const recipient of recipients) {
        insertIntent.run(
          `ntf-${crypto.randomUUID()}`,
          createdEventId,
          recipient,
          subject,
          body,
          `idemp:${createdEventId}:${recipient}`,
          result.evaluatedAt,
          result.evaluatedAt,
        );
      }
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return {
    deduplicated: false,
    evaluationId,
    outcome: result.outcome,
    shouldEmit: result.shouldEmit,
    eventId: createdEventId,
    reason: result.reason,
  };
}

async function attemptIntentDelivery(db, intent, sendFn = deliver) {
  const startedAt = new Date().toISOString();
  const attemptNo = intent.attempts_count + 1;
  db.prepare(
    "UPDATE pilot_notification_intents SET state = 'SENDING', updated_at = ? WHERE id = ?",
  ).run(startedAt, intent.id);

  let mappedState = "FAILED";
  let providerRef = null;
  let safeError = null;

  try {
    const res = await sendFn({
      to: intent.recipient,
      subject: intent.subject,
      text: intent.body,
      idempotencyKey: intent.idempotency_key,
    });
    if (res.status === "sent" || res.status === "accepted") {
      mappedState = "ACCEPTED";
      providerRef = String(res.detail || "accepted").slice(0, 200);
    } else if (res.status === "held") {
      mappedState = "HELD";
      safeError = String(res.detail || "Held in local outbox.").slice(0, 300);
    } else if (res.status === "unknown") {
      mappedState = "UNKNOWN";
      safeError = String(
        res.detail ||
          "Provider handoff timed out with uncertain outcome; reconcile before retrying.",
      ).slice(0, 300);
    } else {
      mappedState = "FAILED";
      safeError = String(res.detail || "Provider rejected message.").slice(
        0,
        300,
      );
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const isAmbiguousTimeout =
      /timeout|ETIMEDOUT|ESOCKETTIMEDOUT|uncertain/i.test(msg);
    mappedState = isAmbiguousTimeout ? "UNKNOWN" : "FAILED";
    safeError = msg.slice(0, 300);
  }

  const completedAt = new Date().toISOString();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(
      `INSERT INTO pilot_notification_attempts (
        id, intent_id, attempt_no, started_at, completed_at, state, provider_reference, safe_error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      crypto.randomUUID(),
      intent.id,
      attemptNo,
      startedAt,
      completedAt,
      mappedState,
      providerRef,
      safeError,
    );

    db.prepare(
      `UPDATE pilot_notification_intents
       SET state = ?, attempts_count = ?, last_error = ?, updated_at = ?
       WHERE id = ?`,
    ).run(mappedState, attemptNo, safeError, completedAt, intent.id);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return { state: mappedState, providerRef, safeError };
}

export async function processPilotOutbox(sendFn = deliver) {
  const db = openDb();
  // Never automatically retry UNKNOWN intents (FR-029, FR-030, TC-008).
  // HELD intents only auto-process if SMTP becomes configured.
  const eligibleStates = smtpConfigured()
    ? ["PENDING", "FAILED", "HELD"]
    : ["PENDING"];
  const placeholders = eligibleStates.map(() => "?").join(", ");
  const intents = db
    .prepare(
      `SELECT * FROM pilot_notification_intents
       WHERE state IN (${placeholders}) AND attempts_count < 3
       ORDER BY created_at ASC LIMIT 20`,
    )
    .all(...eligibleStates);

  const outcomes = [];
  for (const intent of intents) {
    outcomes.push(await attemptIntentDelivery(db, intent, sendFn));
  }
  return outcomes;
}

export async function retryPilotNotification(
  { intentId },
  actorCtx = { actor: "team-member", role: "team_member", token: "" },
  sendFn = deliver,
) {
  authorizePilot("operate", actorCtx, String(intentId || ""));
  const db = openDb();
  const intent = db
    .prepare("SELECT * FROM pilot_notification_intents WHERE id = ?")
    .get(String(intentId || ""));
  if (!intent) {
    throw new PilotHttpError(
      404,
      "NOTIFICATION_NOT_FOUND",
      "Notification intent not found.",
    );
  }
  if (intent.state === "UNKNOWN") {
    throw new PilotHttpError(
      409,
      "RECONCILIATION_REQUIRED",
      "Notification state is UNKNOWN after provider handoff. Reconcile outcome before retrying to prevent duplicate alerts.",
    );
  }
  if (intent.state === "ACCEPTED") {
    throw new PilotHttpError(
      409,
      "ALREADY_ACCEPTED",
      "Notification was already accepted by the mail provider.",
    );
  }

  const outcome = await attemptIntentDelivery(db, intent, sendFn);
  recordAudit(db, {
    actor: actorCtx.actor,
    role: actorCtx.role,
    action: "RETRY_NOTIFICATION",
    target: intent.id,
    outcome: "ALLOWED",
    details: `Manual retry finished with state ${outcome.state}.`,
  });

  return { success: true, intentId: intent.id, ...outcome };
}

export function reconcilePilotNotification(
  { intentId, resolution, note },
  actorCtx = { actor: "team-member", role: "team_member", token: "" },
) {
  authorizePilot("operate", actorCtx, String(intentId || ""));
  const db = openDb();
  const intent = db
    .prepare("SELECT * FROM pilot_notification_intents WHERE id = ?")
    .get(String(intentId || ""));
  if (!intent) {
    throw new PilotHttpError(
      404,
      "NOTIFICATION_NOT_FOUND",
      "Notification intent not found.",
    );
  }
  if (intent.state !== "UNKNOWN") {
    throw new PilotHttpError(
      409,
      "NOT_UNKNOWN",
      `Only UNKNOWN notifications require reconciliation (current state: ${intent.state}).`,
    );
  }
  if (!["MARK_ACCEPTED", "AUTHORISE_RETRY"].includes(resolution)) {
    throw new PilotHttpError(
      400,
      "INVALID_RESOLUTION",
      "Resolution must be MARK_ACCEPTED or AUTHORISE_RETRY.",
    );
  }

  const nextState = resolution === "MARK_ACCEPTED" ? "ACCEPTED" : "FAILED";
  const now = new Date().toISOString();
  const cleanNote = String(
    note || "Operator reconciled provider outcome.",
  ).slice(0, 240);
  db.prepare(
    `UPDATE pilot_notification_intents
     SET state = ?, last_error = ?, updated_at = ?
     WHERE id = ?`,
  ).run(nextState, cleanNote, now, intent.id);

  recordAudit(db, {
    actor: actorCtx.actor,
    role: actorCtx.role,
    action: "RECONCILE_NOTIFICATION",
    target: intent.id,
    outcome: "ALLOWED",
    details: `${resolution} -> ${nextState}: ${cleanNote}`,
  });

  return {
    success: true,
    intentId: intent.id,
    state: nextState,
    message:
      nextState === "ACCEPTED"
        ? "Notification marked ACCEPTED from provider evidence."
        : "Notification marked FAILED; controlled retry is now permitted.",
  };
}

export async function pilotWorkerTick({
  evaluationTimeIso = new Date().toISOString(),
  logicalPrefix = "",
  expectedIntervalMs = 60_000,
  sendFn = deliver,
  actorCtx = null,
} = {}) {
  if (actorCtx) {
    authorizePilot("operate", actorCtx, "worker-tick");
  }
  const db = openDb();
  const evalMs = Date.parse(evaluationTimeIso);
  const nowIso = Number.isFinite(evalMs)
    ? new Date(evalMs).toISOString()
    : new Date().toISOString();

  const worker = db
    .prepare("SELECT * FROM pilot_worker_state WHERE id = 'singleton'")
    .get();
  if (worker?.last_heartbeat_at) {
    const elapsed = Date.parse(nowIso) - Date.parse(worker.last_heartbeat_at);
    if (Number.isFinite(elapsed) && elapsed > expectedIntervalMs * 2) {
      const missed = Math.max(1, Math.floor(elapsed / expectedIntervalMs) - 1);
      db.prepare(
        `UPDATE pilot_worker_state
         SET missed_intervals = missed_intervals + ?, last_heartbeat_at = ?
         WHERE id = 'singleton'`,
      ).run(missed, nowIso);
      recordAudit(db, {
        actor: "pilot-worker",
        role: "system",
        action: "WORKER_GAP_DETECTED",
        target: "pilot-worker",
        outcome: "WARNING",
        details: `Detected ${missed} missed monitoring interval(s); historical catch-up emails suppressed per FR-025.`,
      });
    }
  }

  const activeRules = db
    .prepare(
      "SELECT * FROM pilot_rules WHERE status = 'ACTIVE' AND active_version IS NOT NULL",
    )
    .all();

  const evaluations = [];
  let emittedCount = 0;

  try {
    for (const ruleRow of activeRules) {
      const versionRow = db
        .prepare(
          "SELECT * FROM pilot_rule_versions WHERE rule_id = ? AND version = ?",
        )
        .get(ruleRow.id, ruleRow.active_version);
      if (!versionRow) continue;

      const bucketKey = logicalPrefix
        ? `${logicalPrefix}:${versionRow.id}`
        : `sched:${versionRow.id}:${nowIso}`;
      const evalOutcome = evaluateRuleVersionAtomic({
        ruleRow,
        versionRow,
        evaluationTimeIso: nowIso,
        logicalKey: bucketKey,
      });
      evaluations.push({
        ruleId: ruleRow.id,
        ruleName: ruleRow.name,
        version: versionRow.version,
        ...evalOutcome,
      });
      if (evalOutcome.eventId && !evalOutcome.deduplicated) emittedCount += 1;
    }

    const deliveries = await processPilotOutbox(sendFn);

    db.prepare(
      `UPDATE pilot_worker_state
       SET last_heartbeat_at = ?, last_evaluation_at = ?, last_error = NULL
       WHERE id = 'singleton'`,
    ).run(
      nowIso,
      activeRules.length > 0 ? nowIso : (worker?.last_evaluation_at ?? null),
    );

    if (actorCtx) {
      recordAudit(db, {
        actor: actorCtx.actor,
        role: actorCtx.role,
        action: "MANUAL_EVALUATION_RUN",
        target: `${activeRules.length}-active-rules`,
        outcome: "ALLOWED",
        details: `Evaluated ${activeRules.length} active rule(s); emitted ${emittedCount} event(s).`,
      });
    }

    return {
      success: true,
      evaluatedAt: nowIso,
      activeRulesChecked: activeRules.length,
      emittedCount,
      evaluations,
      deliveriesProcessed: deliveries.length,
    };
  } catch (error) {
    const safeMsg =
      error instanceof Error ? error.message.slice(0, 240) : "Worker error";
    db.prepare(
      "UPDATE pilot_worker_state SET last_heartbeat_at = ?, last_error = ? WHERE id = 'singleton'",
    ).run(nowIso, safeMsg);
    throw error;
  }
}

export function getPilotHealth(
  actorCtx = { actor: "viewer-local", role: "viewer", token: "" },
) {
  authorizePilot("read", actorCtx, "health");
  const db = openDb();
  const worker = db
    .prepare("SELECT * FROM pilot_worker_state WHERE id = 'singleton'")
    .get();
  const activeCount =
    db
      .prepare(
        "SELECT COUNT(*) AS count FROM pilot_rules WHERE status = 'ACTIVE'",
      )
      .get()?.count ?? 0;
  const pendingOutbox =
    db
      .prepare(
        "SELECT COUNT(*) AS count FROM pilot_notification_intents WHERE state IN ('PENDING', 'HELD', 'FAILED', 'UNKNOWN')",
      )
      .get()?.count ?? 0;
  const unknownOutbox =
    db
      .prepare(
        "SELECT COUNT(*) AS count FROM pilot_notification_intents WHERE state = 'UNKNOWN'",
      )
      .get()?.count ?? 0;

  return {
    success: true,
    service: "HedgeSignal Pilot",
    engineVersion: PILOT_ENGINE_VERSION,
    mode: "SYNTHETIC",
    smtpConfigured: smtpConfigured(),
    worker: {
      status: worker?.last_error
        ? "DEGRADED"
        : (worker?.missed_intervals ?? 0) > 0
          ? "GAP_DISCLOSED"
          : "HEALTHY",
      lastHeartbeatAt: worker?.last_heartbeat_at ?? null,
      lastEvaluationAt: worker?.last_evaluation_at ?? null,
      lastError: worker?.last_error ?? null,
      missedIntervals: worker?.missed_intervals ?? 0,
      startedAt: worker?.started_at ?? null,
    },
    activeRulesCount: activeCount,
    outboxAttentionCount: pendingOutbox,
    unknownNotificationsCount: unknownOutbox,
  };
}

export function getPilotOverview(
  actorCtx = { actor: "viewer-local", role: "viewer", token: "" },
) {
  const health = getPilotHealth(actorCtx);
  const db = openDb();

  const rules = db
    .prepare("SELECT * FROM pilot_rules ORDER BY updated_at DESC")
    .all()
    .map((rule) => {
      const versions = db
        .prepare(
          "SELECT * FROM pilot_rule_versions WHERE rule_id = ? ORDER BY version DESC",
        )
        .all(rule.id)
        .map((v) => ({
          id: v.id,
          version: v.version,
          definition: JSON.parse(v.definition_json),
          summary: v.summary,
          mode: v.mode,
          scheduleSeconds: v.schedule_seconds,
          createdBy: v.created_by,
          approvedBy: v.approved_by,
          approvedAt: v.approved_at,
          createdAt: v.created_at,
        }));

      const latestEval = db
        .prepare(
          `SELECT * FROM pilot_evaluations
           WHERE rule_id = ?
           ORDER BY evaluated_at DESC LIMIT 1`,
        )
        .get(rule.id);

      return {
        id: rule.id,
        name: rule.name,
        scenario: rule.scenario,
        instrument: rule.instrument,
        status: rule.status,
        latestVersion: rule.latest_version,
        activeVersion: rule.active_version,
        owner: rule.owner,
        updatedAt: rule.updated_at,
        versions,
        latestEvaluation: latestEval
          ? {
              id: latestEval.id,
              ruleVersion: latestEval.rule_version,
              evaluatedAt: latestEval.evaluated_at,
              outcome: latestEval.outcome,
              shouldEmit: Boolean(latestEval.should_emit),
              reason: latestEval.reason,
              engineVersion: latestEval.engine_version,
              diagnostics: JSON.parse(latestEval.diagnostics_json),
            }
          : null,
      };
    });

  const observations = db
    .prepare(
      "SELECT * FROM pilot_observations ORDER BY received_at DESC LIMIT 30",
    )
    .all()
    .map(mapObservationRow);

  const events = db
    .prepare(
      "SELECT * FROM pilot_trigger_events ORDER BY triggered_at DESC LIMIT 30",
    )
    .all()
    .map((e) => {
      const notifications = db
        .prepare(
          "SELECT * FROM pilot_notification_intents WHERE event_id = ? ORDER BY created_at ASC",
        )
        .all(e.id)
        .map((n) => ({
          id: n.id,
          recipient: n.recipient,
          state: n.state,
          attemptsCount: n.attempts_count,
          lastError: n.last_error,
          updatedAt: n.updated_at,
          attempts: db
            .prepare(
              "SELECT attempt_no, started_at, completed_at, state, provider_reference, safe_error FROM pilot_notification_attempts WHERE intent_id = ? ORDER BY attempt_no ASC",
            )
            .all(n.id),
        }));

      return {
        id: e.id,
        evaluationId: e.evaluation_id,
        ruleId: e.rule_id,
        ruleVersion: e.rule_version,
        ruleName: e.rule_name,
        instrument: e.instrument,
        triggeredAt: e.triggered_at,
        mode: e.mode,
        evidence: JSON.parse(e.evidence_json),
        notifications,
      };
    });

  const evaluations = db
    .prepare(
      "SELECT * FROM pilot_evaluations ORDER BY evaluated_at DESC LIMIT 25",
    )
    .all()
    .map((ev) => ({
      id: ev.id,
      ruleId: ev.rule_id,
      ruleVersion: ev.rule_version,
      evaluatedAt: ev.evaluated_at,
      outcome: ev.outcome,
      shouldEmit: Boolean(ev.should_emit),
      reason: ev.reason,
      engineVersion: ev.engine_version,
    }));

  const audit = db
    .prepare(
      "SELECT * FROM pilot_audit_events ORDER BY created_at DESC LIMIT 30",
    )
    .all()
    .map((a) => ({
      id: a.id,
      actor: a.actor,
      role: a.role,
      action: a.action,
      target: a.target,
      outcome: a.outcome,
      details: a.safe_details,
      createdAt: a.created_at,
    }));

  return {
    ...health,
    defaultRecipient: alertEmail() || "pilot-alerts@example.com",
    rules,
    observations,
    events,
    evaluations,
    audit,
  };
}
