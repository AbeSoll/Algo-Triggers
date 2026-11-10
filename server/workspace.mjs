// Durable server copy of the Rules & alerts workspace (rules, events, saved reports).
// Single local workspace, optimistic revision check. Set WORKSPACE_SYNC=off to disable.
import { openDb } from "./db.mjs";

const MAX_BYTES = 4_000_000;
const enabled = () => (process.env.WORKSPACE_SYNC || "on") !== "off";

function fail(status, message, current) {
  const error = new Error(message);
  error.status = status;
  if (current) error.current = current;
  return error;
}

export function getWorkspace() {
  if (!enabled()) return { enabled: false, revision: 0, store: null };
  const row = openDb()
    .prepare(
      "SELECT revision, body, updated_at FROM workspace_snapshot WHERE id = 1",
    )
    .get();
  if (!row) return { enabled: true, revision: 0, store: null };
  return {
    enabled: true,
    revision: row.revision,
    store: JSON.parse(row.body),
    updatedAt: row.updated_at,
  };
}

export function saveWorkspace(body) {
  if (!enabled()) return { enabled: false, success: true };
  const store = body?.store;
  const ok =
    Number.isInteger(body?.revision) &&
    body.revision >= 0 &&
    store &&
    typeof store === "object" &&
    store.schema === 1 &&
    Array.isArray(store.rules) &&
    Array.isArray(store.events) &&
    Array.isArray(store.runs);
  if (!ok) throw fail(422, "Workspace data is not in the expected format.");
  const text = JSON.stringify(store);
  if (text.length > MAX_BYTES) throw fail(413, "Workspace data is too large.");
  const db = openDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    const row = db
      .prepare("SELECT revision FROM workspace_snapshot WHERE id = 1")
      .get();
    if (row && body.revision < row.revision) {
      db.exec("ROLLBACK");
      throw fail(409, "The server holds a newer workspace. Reload first.", {
        revision: row.revision,
      });
    }
    db.prepare(
      `INSERT INTO workspace_snapshot (id, revision, body, updated_at)
       VALUES (1, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET revision = excluded.revision,
         body = excluded.body, updated_at = excluded.updated_at`,
    ).run(body.revision, text, new Date().toISOString());
    db.exec("COMMIT");
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      /* already rolled back */
    }
    throw error;
  }
  return { enabled: true, success: true, revision: body.revision };
}
