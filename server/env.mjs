import fs from "node:fs";
import path from "node:path";

let initialEnvKeys = null;
let lastMtimeMs = -1;

/** Load `.env` without overriding variables already set in the process. */
export function loadEnv() {
  if (!initialEnvKeys) {
    initialEnvKeys = new Set(Object.keys(process.env));
  }
  const file = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(file)) return;
  const stat = fs.statSync(file);
  if (stat.mtimeMs === lastMtimeMs) return;
  lastMtimeMs = stat.mtimeMs;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    )
      value = value.slice(1, -1);
    if (!initialEnvKeys.has(key)) process.env[key] = value;
  }
}
