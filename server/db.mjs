import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  makeDefaultSeedPilotRule,
  summarizePilotRule,
} from "../src/pilotDomain.ts";

let db;

function ensureSeedPilotData(database) {
  const existing = database
    .prepare("SELECT COUNT(*) AS count FROM pilot_rules")
    .get();
  if (existing && existing.count > 0) return;

  const now = new Date().toISOString();
  const observedAt = new Date(Date.now() - 120_000).toISOString();
  const def = makeDefaultSeedPilotRule();
  const ruleId = "pilot-rule-br-ex-01";
  const versionId = "pilot-rv-br-ex-01-v1";
  const summary = summarizePilotRule(def);

  database.exec("BEGIN IMMEDIATE");
  try {
    database
      .prepare(
        `INSERT INTO pilot_rules (
          id, name, scenario, instrument, status, latest_version, active_version, owner, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'VALIDATED', 1, NULL, 'trading-pilot', ?, ?)`,
      )
      .run(ruleId, def.scenario, def.scenario, def.instrument, now, now);

    database
      .prepare(
        `INSERT INTO pilot_rule_versions (
          id, rule_id, version, definition_json, summary, mode, schedule_seconds,
          trigger_policy_json, recipients_json, created_by, approved_by, approved_at, created_at
        ) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, 'trader-demo', NULL, NULL, ?)`,
      )
      .run(
        versionId,
        ruleId,
        JSON.stringify(def),
        summary,
        def.mode,
        def.scheduleSeconds,
        JSON.stringify(def.triggerPolicy),
        JSON.stringify(def.recipients),
        now,
      );

    database
      .prepare(
        `INSERT INTO pilot_observations (
          id, source_id, instrument, field_id, specialization, value_decimal, unit,
          observed_at, received_at, mode, quality, quarantine_reason
        ) VALUES (?, 'synthetic-seed-fixture', 'brent-dec26', 'reference_price', 'MARKET', '75.00', 'USD/bbl', ?, ?, 'SYNTHETIC', 'VALID', NULL)`,
      )
      .run(crypto.randomUUID(), observedAt, now);

    database
      .prepare(
        `INSERT INTO pilot_worker_state (
          id, last_heartbeat_at, last_evaluation_at, last_error, missed_intervals, started_at
        ) VALUES ('singleton', ?, NULL, NULL, 0, ?)`,
      )
      .run(now, now);

    database
      .prepare(
        `INSERT INTO pilot_audit_events (
          id, actor, role, action, target, outcome, safe_details, created_at
        ) VALUES (?, 'system-seed', 'admin', 'SEED_PILOT_BASELINE', ?, 'ALLOWED', 'Initialised BR-EX-01 synthetic pilot scenario and observation.', ?)`,
      )
      .run(crypto.randomUUID(), `${ruleId}:v1`, now);

    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

export function openDb() {
  if (db) return db;
  const file =
    process.env.DESK_DB || path.join(process.cwd(), "data", "desk.sqlite");
  if (file !== ":memory:")
    fs.mkdirSync(path.dirname(file), { recursive: true });
  db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS watches (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      status TEXT NOT NULL,
      cursor_time INTEGER NOT NULL,
      rule_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS alert_events (
      id TEXT PRIMARY KEY,
      watch_id TEXT NOT NULL,
      event_time INTEGER NOT NULL,
      summary TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT NOT NULL,
      detail TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    -- HedgeSignal SRS v0.2 relational pilot store (Section 6.5)
    CREATE TABLE IF NOT EXISTS pilot_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      scenario TEXT NOT NULL,
      instrument TEXT NOT NULL,
      status TEXT NOT NULL,
      latest_version INTEGER NOT NULL,
      active_version INTEGER,
      owner TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pilot_rule_versions (
      id TEXT PRIMARY KEY,
      rule_id TEXT NOT NULL REFERENCES pilot_rules(id),
      version INTEGER NOT NULL,
      definition_json TEXT NOT NULL,
      summary TEXT NOT NULL,
      mode TEXT NOT NULL,
      schedule_seconds INTEGER NOT NULL,
      trigger_policy_json TEXT NOT NULL,
      recipients_json TEXT NOT NULL,
      created_by TEXT NOT NULL,
      approved_by TEXT,
      approved_at TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(rule_id, version)
    );

    CREATE TABLE IF NOT EXISTS pilot_observations (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      instrument TEXT,
      field_id TEXT NOT NULL,
      specialization TEXT NOT NULL,
      value_decimal TEXT NOT NULL,
      unit TEXT NOT NULL,
      observed_at TEXT NOT NULL,
      received_at TEXT NOT NULL,
      mode TEXT NOT NULL,
      quality TEXT NOT NULL,
      quarantine_reason TEXT
    );

    CREATE TABLE IF NOT EXISTS pilot_evaluations (
      id TEXT PRIMARY KEY,
      rule_id TEXT NOT NULL REFERENCES pilot_rules(id),
      rule_version_id TEXT NOT NULL REFERENCES pilot_rule_versions(id),
      rule_version INTEGER NOT NULL,
      logical_key TEXT NOT NULL UNIQUE,
      scheduled_at TEXT NOT NULL,
      evaluated_at TEXT NOT NULL,
      outcome TEXT NOT NULL,
      should_emit INTEGER NOT NULL,
      reason TEXT NOT NULL,
      engine_version TEXT NOT NULL,
      diagnostics_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pilot_evaluation_inputs (
      evaluation_id TEXT NOT NULL REFERENCES pilot_evaluations(id),
      observation_id TEXT NOT NULL REFERENCES pilot_observations(id),
      field_id TEXT NOT NULL,
      value_snapshot TEXT NOT NULL,
      unit TEXT NOT NULL,
      observed_at TEXT NOT NULL,
      quality TEXT NOT NULL,
      PRIMARY KEY (evaluation_id, observation_id)
    );

    CREATE TABLE IF NOT EXISTS pilot_trigger_events (
      id TEXT PRIMARY KEY,
      evaluation_id TEXT NOT NULL UNIQUE REFERENCES pilot_evaluations(id),
      event_key TEXT NOT NULL UNIQUE,
      rule_id TEXT NOT NULL REFERENCES pilot_rules(id),
      rule_version_id TEXT NOT NULL REFERENCES pilot_rule_versions(id),
      rule_version INTEGER NOT NULL,
      rule_name TEXT NOT NULL,
      instrument TEXT NOT NULL,
      triggered_at TEXT NOT NULL,
      mode TEXT NOT NULL,
      evidence_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pilot_notification_intents (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES pilot_trigger_events(id),
      channel TEXT NOT NULL,
      recipient TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      idempotency_key TEXT NOT NULL UNIQUE,
      state TEXT NOT NULL,
      attempts_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      updated_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pilot_notification_attempts (
      id TEXT PRIMARY KEY,
      intent_id TEXT NOT NULL REFERENCES pilot_notification_intents(id),
      attempt_no INTEGER NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT NOT NULL,
      state TEXT NOT NULL,
      provider_reference TEXT,
      safe_error TEXT,
      UNIQUE(intent_id, attempt_no)
    );

    CREATE TABLE IF NOT EXISTS pilot_audit_events (
      id TEXT PRIMARY KEY,
      actor TEXT NOT NULL,
      role TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT NOT NULL,
      outcome TEXT NOT NULL,
      safe_details TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pilot_worker_state (
      id TEXT PRIMARY KEY,
      last_heartbeat_at TEXT NOT NULL,
      last_evaluation_at TEXT,
      last_error TEXT,
      missed_intervals INTEGER NOT NULL DEFAULT 0,
      started_at TEXT NOT NULL
    );
  `);
  ensureSeedPilotData(db);
  return db;
}

export function resetDbForTests() {
  if (db) {
    db.close();
    db = null;
  }
}
