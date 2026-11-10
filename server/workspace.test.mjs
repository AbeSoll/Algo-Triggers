import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

process.env.DESK_DB = path.join(
  mkdtempSync(path.join(tmpdir(), "algo-ws-")),
  "desk.sqlite",
);
delete process.env.WORKSPACE_SYNC;
const { getWorkspace, saveWorkspace } = await import("./workspace.mjs");
const store = (n) => ({
  schema: 1,
  revision: n,
  rules: [],
  events: [],
  runs: [],
});

describe("workspace snapshot", () => {
  it("starts empty", () => {
    expect(getWorkspace()).toMatchObject({
      enabled: true,
      revision: 0,
      store: null,
    });
  });
  it("saves and reloads the newest revision", () => {
    saveWorkspace({ revision: 1, store: store(1) });
    saveWorkspace({
      revision: 2,
      store: { ...store(2), rules: [{ id: "r" }] },
    });
    const got = getWorkspace();
    expect(got.revision).toBe(2);
    expect(got.store.rules).toHaveLength(1);
  });
  it("rejects an older revision with 409", () => {
    try {
      saveWorkspace({ revision: 1, store: store(1) });
      throw new Error("should have failed");
    } catch (e) {
      expect(e.status).toBe(409);
    }
    expect(getWorkspace().revision).toBe(2);
  });
  it("rejects malformed data with 422", () => {
    try {
      saveWorkspace({ revision: 5, store: { schema: 9 } });
      throw new Error("should have failed");
    } catch (e) {
      expect(e.status).toBe(422);
    }
  });
});
