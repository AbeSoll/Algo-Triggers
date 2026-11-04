import { replay, summarize } from "../src/domain.ts";
import { openDb } from "./db.mjs";
import { loadEnv } from "./env.mjs";
import { alertEmail, deliver, smtpConfigured } from "./mailer.mjs";
import { getBars, INSTRUMENT_MAP } from "./yahooService.mjs";

loadEnv();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let timer = null;

async function defaultLoadBars(rule) {
  const data = await getBars(rule.instrument, rule.timeframe || "5m", "5d");
  return data.bars;
}

function watchId(rule) {
  return `${rule.id}:v${rule.version}`;
}

function publicWatch(row) {
  const rule = JSON.parse(row.rule_json);
  return {
    id: row.id,
    email: row.email,
    status: row.status,
    cursorTime: row.cursor_time,
    ruleName: rule.name,
    instrument: rule.instrument,
    summary: summarize(rule),
  };
}

export function listDesk() {
  const db = openDb();
  const watches = db
    .prepare("SELECT * FROM watches ORDER BY updated_at DESC")
    .all()
    .map(publicWatch);
  const deliveries = db
    .prepare(
      "SELECT id, event_id, email, subject, status, detail, attempts, created_at FROM deliveries ORDER BY id DESC LIMIT 20",
    )
    .all();
  return {
    success: true,
    email: alertEmail(),
    smtpConfigured: smtpConfigured(),
    watches,
    deliveries,
    message: smtpConfigured()
      ? `Email alerts go to ${alertEmail()}.`
      : `Alerts are addressed to ${alertEmail()}. They stay in the outbox until SMTP_USER and SMTP_PASS are set in .env.`,
  };
}

function assertRule(rule) {
  if (!rule || typeof rule.id !== "string" || !Number.isInteger(rule.version))
    throw new Error("A saved rule id and version are required.");
  if (!INSTRUMENT_MAP[rule.instrument])
    throw new Error("Email watches cover the three listed Brent contracts.");
  if (!Array.isArray(rule.conditions) || rule.conditions.length === 0)
    throw new Error("Add a condition before arming an email watch.");
  if (
    rule.conditions.some((condition) => condition.metric === "option_premium")
  )
    throw new Error(
      "Option premium watches need an option history stream. Futures rules can email now.",
    );
  if (!["crossing", "bar", "once"].includes(rule.frequency))
    throw new Error("Unsupported alert frequency.");
}

export async function armWatch({
  rule,
  email = alertEmail(),
  active = true,
  loadBars = defaultLoadBars,
}) {
  assertRule(rule);
  const to = String(email || alertEmail()).trim();
  if (!EMAIL_RE.test(to)) throw new Error("Enter a valid alert email address.");
  let cursor = Date.now();
  if (active) {
    try {
      const bars = await loadBars(rule);
      if (bars.length) cursor = bars[bars.length - 1].time;
    } catch {
      cursor = Date.now();
    }
  }
  const db = openDb();
  const id = watchId(rule);
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO watches (id, email, status, cursor_time, rule_json, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       email = excluded.email,
       status = excluded.status,
       cursor_time = excluded.cursor_time,
       rule_json = excluded.rule_json,
       updated_at = excluded.updated_at`,
  ).run(id, to, active ? "armed" : "paused", cursor, JSON.stringify(rule), now);
  const row = db.prepare("SELECT * FROM watches WHERE id = ?").get(id);
  return {
    success: true,
    watch: publicWatch(row),
    smtpConfigured: smtpConfigured(),
    email: to,
    message: active
      ? smtpConfigured()
        ? `Watching Yahoo for “${rule.name}”. A new hit emails ${to}. This does not place a trade.`
        : `Watching Yahoo for “${rule.name}”. Messages for ${to} wait in the outbox until Gmail SMTP is set in .env.`
      : `Email watch paused for “${rule.name}”.`,
  };
}

export function pauseWatch({ ruleId, version }) {
  const db = openDb();
  const id = `${ruleId}:v${version}`;
  const row = db.prepare("SELECT * FROM watches WHERE id = ?").get(id);
  if (!row) return { success: true, message: "No email watch was armed." };
  db.prepare(
    "UPDATE watches SET status = 'paused', updated_at = ? WHERE id = ?",
  ).run(new Date().toISOString(), id);
  return { success: true, message: "Email watch paused." };
}

async function recordDelivery(eventId, email, subject, body) {
  const db = openDb();
  const result = deliver({ to: email, subject, text: body });
  const sent = await result;
  db.prepare(
    `INSERT INTO deliveries (event_id, email, subject, body, status, detail, attempts, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
  ).run(
    eventId,
    email,
    subject,
    body,
    sent.status,
    sent.detail.slice(0, 300),
    new Date().toISOString(),
  );
  return sent.status;
}

export async function sendTestEmail(email = alertEmail()) {
  const to = String(email || alertEmail()).trim();
  if (!EMAIL_RE.test(to)) throw new Error("Enter a valid alert email address.");
  const subject = "Algo-Triggers test email";
  const body = [
    "This is a test from your Algo-Triggers desk.",
    "If you received it, price alerts to this address can be delivered.",
    "The desk does not place trades.",
  ].join("\n");
  const status = await recordDelivery("test", to, subject, body);
  return {
    success: true,
    status,
    email: to,
    message:
      status === "sent"
        ? `Test email sent to ${to}.`
        : status === "held"
          ? `Test message saved for ${to}. Add SMTP_USER and SMTP_PASS to .env, then press Check prices now to send the outbox.`
          : `Test email to ${to} failed. Check the Gmail app password in .env.`,
  };
}

async function retryOutbox() {
  if (!smtpConfigured()) return 0;
  const db = openDb();
  const waiting = db
    .prepare(
      "SELECT * FROM deliveries WHERE status != 'sent' AND attempts < 3 ORDER BY id ASC LIMIT 10",
    )
    .all();
  let sent = 0;
  for (const row of waiting) {
    const result = await deliver({
      to: row.email,
      subject: row.subject,
      text: row.body,
    });
    db.prepare(
      "UPDATE deliveries SET status = ?, detail = ?, attempts = attempts + 1 WHERE id = ?",
    ).run(result.status, result.detail.slice(0, 300), row.id);
    if (result.status === "sent") sent += 1;
  }
  return sent;
}

export async function tick(loadBars = defaultLoadBars) {
  const db = openDb();
  const watches = db
    .prepare("SELECT * FROM watches WHERE status = 'armed'")
    .all();
  let emitted = 0;
  for (const watch of watches) {
    const rule = JSON.parse(watch.rule_json);
    let bars;
    try {
      bars = await loadBars(rule);
    } catch (error) {
      console.error(
        `[desk] ${rule.name}:`,
        error instanceof Error ? error.message : error,
      );
      continue;
    }
    if (!bars.length) continue;
    const latest = bars[bars.length - 1].time;
    if (latest <= watch.cursor_time) continue;
    let result;
    try {
      result = replay(rule, bars, "historical");
    } catch (error) {
      console.error(
        `[desk] ${rule.name}:`,
        error instanceof Error ? error.message : error,
      );
      continue;
    }
    const novel = result.events.filter(
      (event) => event.time > watch.cursor_time,
    );
    for (const event of novel) {
      const existing = db
        .prepare("SELECT id FROM alert_events WHERE id = ?")
        .get(event.id);
      if (existing) continue;
      const summary = summarize(rule);
      db.prepare(
        `INSERT INTO alert_events (id, watch_id, event_time, summary, payload_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(
        event.id,
        watch.id,
        event.time,
        summary,
        JSON.stringify(event),
        new Date().toISOString(),
      );
      const when = new Date(event.time).toISOString();
      const subject = `Algo-Triggers: ${rule.name}`;
      const body = [
        summary,
        `Contract: ${INSTRUMENT_MAP[rule.instrument]?.label || rule.instrument}`,
        `Bar close: ${event.price}`,
        `Bar time (UTC): ${when}`,
        "Source: Yahoo price snapshot checked by the local desk.",
        "This is an alert, not an order.",
      ].join("\n");
      await recordDelivery(event.id, watch.email, subject, body);
      emitted += 1;
    }
    db.prepare(
      "UPDATE watches SET cursor_time = ?, updated_at = ? WHERE id = ?",
    ).run(latest, new Date().toISOString(), watch.id);
  }
  const resent = await retryOutbox();
  return {
    success: true,
    emitted,
    resent,
    message:
      emitted > 0
        ? `${emitted} new alert${emitted === 1 ? "" : "s"} addressed to ${alertEmail()}.`
        : resent > 0
          ? `No new price hit. Sent ${resent} waiting email${resent === 1 ? "" : "s"}.`
          : watches.length
            ? "Checked Yahoo. No new alert since the watch was armed."
            : "No email watch is armed. Press Monitor demo on a futures rule first.",
  };
}

export function startDesk() {
  if (timer || process.env.VITEST) return;
  timer = setInterval(() => {
    tick().catch((error) => console.error("[desk]", error));
  }, 60_000);
  timer.unref?.();
  setTimeout(() => {
    tick().catch((error) => console.error("[desk]", error));
  }, 4_000).unref?.();
}
