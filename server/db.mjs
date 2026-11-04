import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

let db;

export function openDb() {
  if (db) return db;
  const file =
    process.env.DESK_DB || path.join(process.cwd(), "data", "desk.sqlite");
  if (file !== ":memory:")
    fs.mkdirSync(path.dirname(file), { recursive: true });
  db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
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
  `);
  return db;
}

export function resetDbForTests() {
  if (db) {
    db.close();
    db = null;
  }
}
