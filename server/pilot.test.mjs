import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { beforeEach, describe, expect, it } from "vitest";
import { makeDefaultSeedPilotRule } from "../src/pilotDomain.ts";

function freshDbPath() {
  return path.join(
    mkdtempSync(path.join(tmpdir(), "hedgesignal-pilot-")),
    "pilot.sqlite",
  );
}

process.env.DESK_DB = freshDbPath();
process.env.SMTP_HOST = "";
process.env.SMTP_USER = "";
process.env.SMTP_PASS = "";
process.env.ALERT_TO = "pilot-alerts@example.com";
process.env.PILOT_TOKEN = "";

const { resetDbForTests } = await import("./db.mjs");
const {
  activatePilotRule,
  capturePilotObservation,
  getPilotOverview,
  pausePilotRule,
  pilotWorkerTick,
  reconcilePilotNotification,
  retryPilotNotification,
  runPilotRuleTests,
  savePilotRuleVersion,
} = await import("./pilotService.mjs");
const { handleApiRequest } = await import("./apiHandler.mjs");

function invokeApi({ method = "GET", url, headers = {}, body = undefined }) {
  return new Promise((resolve, reject) => {
    const payload = body !== undefined ? JSON.stringify(body) : "";
    const req = Readable.from(payload ? [Buffer.from(payload)] : []);
    req.method = method;
    req.url = url;
    req.headers = {
      "content-type": "application/json",
      ...headers,
    };
    let statusCode = 200;
    const chunks = [];
    const res = {
      writeHead(code) {
        statusCode = code;
      },
      end(data) {
        if (data) chunks.push(Buffer.from(data));
        const text = Buffer.concat(chunks).toString("utf8");
        resolve({ status: statusCode, json: text ? JSON.parse(text) : null });
      },
    };
    handleApiRequest(req, res).catch(reject);
  });
}

describe("HedgeSignal pilot service & API (SRS v0.2)", () => {
  beforeEach(() => {
    resetDbForTests();
    process.env.DESK_DB = freshDbPath();
    process.env.PILOT_TOKEN = "";
  });

  it("seeds BR-EX-01, runs controlled tests, activates, emits once per logical key, and preserves v1 evidence after v2 edit (TC-006, TC-007, TC-017)", async () => {
    const initial = getPilotOverview({
      actor: "trader-1",
      role: "trader",
      token: "",
    });
    expect(initial.rules).toHaveLength(1);
    const seedRule = initial.rules[0];
    expect(seedRule.id).toBe("pilot-rule-br-ex-01");

    const tests = runPilotRuleTests(
      { ruleId: seedRule.id, version: 1 },
      { actor: "trader-1", role: "trader", token: "" },
    );
    expect(tests.suite.allPassed).toBe(true);

    // Approver activates v1
    const activated = activatePilotRule(
      { ruleId: seedRule.id, expectedVersion: 1 },
      { actor: "approver-1", role: "approver", token: "" },
    );
    expect(activated.status).toBe("ACTIVE");

    // Capture fresh synthetic observation at 08:00, evaluate at 08:02
    capturePilotObservation(
      {
        sourceId: "synthetic-desk",
        instrument: "brent-dec26",
        fieldId: "reference_price",
        valueDecimal: "74.25",
        unit: "USD/bbl",
        observedAt: "2026-11-09T08:00:00.000Z",
        receivedAt: "2026-11-09T08:00:02.000Z",
        mode: "SYNTHETIC",
      },
      { actor: "trader-1", role: "trader", token: "" },
    );

    const tick1 = await pilotWorkerTick({
      evaluationTimeIso: "2026-11-09T08:02:00.000Z",
      logicalPrefix: "slot-0802",
      sendFn: async ({ subject, text }) => {
        expect(subject).toContain("PILOT / TEST ALERT");
        expect(text).toContain("74.25");
        return { status: "sent", detail: "msg-id-001" };
      },
    });
    expect(tick1.emittedCount).toBe(1);

    // TC-007: Retrying the exact same logical evaluation slot after worker restart emits zero duplicates
    const tickDuplicate = await pilotWorkerTick({
      evaluationTimeIso: "2026-11-09T08:02:00.000Z",
      logicalPrefix: "slot-0802",
    });
    expect(tickDuplicate.emittedCount).toBe(0);
    expect(tickDuplicate.evaluations[0].deduplicated).toBe(true);

    // TC-006: Edit rule to v2 (threshold 60.00) and verify historical v1 event still retains v1 evidence (80.00)
    const v2Def = makeDefaultSeedPilotRule();
    v2Def.conditions[0].thresholdDecimal = "60.00";
    const savedV2 = savePilotRuleVersion(
      { ruleId: seedRule.id, name: "BR-EX-01 Tightened", definition: v2Def },
      { actor: "trader-1", role: "trader", token: "" },
    );
    expect(savedV2.version).toBe(2);

    const afterEdit = getPilotOverview({
      actor: "trader-1",
      role: "trader",
      token: "",
    });
    expect(afterEdit.events).toHaveLength(1);
    expect(afterEdit.events[0].ruleVersion).toBe(1);
    expect(afterEdit.events[0].evidence.diagnostics[0].thresholdDecimal).toBe(
      "80.00",
    );
    expect(afterEdit.events[0].notifications[0].state).toBe("ACCEPTED");
  });

  it("blocks stale version activation when concurrent edit occurred after preview (TC-011)", () => {
    const v2Def = makeDefaultSeedPilotRule();
    v2Def.conditions[0].thresholdDecimal = "78.50";
    savePilotRuleVersion(
      { ruleId: "pilot-rule-br-ex-01", name: "Edited rule", definition: v2Def },
      { actor: "trader-2", role: "trader", token: "" },
    );

    expect(() =>
      activatePilotRule(
        { ruleId: "pilot-rule-br-ex-01", expectedVersion: 1 },
        { actor: "approver-1", role: "approver", token: "" },
      ),
    ).toThrow(/Rule changed after preview/);
  });

  it("handles UNKNOWN timeout outcomes safely, blocking retry until support reconciles (TC-008, TC-009)", async () => {
    activatePilotRule(
      { ruleId: "pilot-rule-br-ex-01", expectedVersion: 1 },
      { actor: "approver-1", role: "approver", token: "" },
    );
    capturePilotObservation({
      sourceId: "synthetic-desk",
      instrument: "brent-dec26",
      fieldId: "reference_price",
      valueDecimal: "73.10",
      unit: "USD/bbl",
      observedAt: new Date(Date.now() - 10_000).toISOString(),
      mode: "SYNTHETIC",
    });

    await pilotWorkerTick({
      logicalPrefix: "timeout-slot",
      sendFn: async () => {
        throw new Error("ESOCKETTIMEDOUT after DATA handoff");
      },
    });

    const overview1 = getPilotOverview();
    const event = overview1.events[0];
    expect(event).toBeDefined();
    const intent = event.notifications[0];
    expect(intent.state).toBe("UNKNOWN");

    // Blind retry must be blocked while UNKNOWN
    await expect(
      retryPilotNotification({ intentId: intent.id }),
    ).rejects.toThrow(/Reconcile outcome before retrying/);

    // Support reconciles as AUTHORISE_RETRY, then retries successfully
    const reconciled = reconcilePilotNotification({
      intentId: intent.id,
      resolution: "AUTHORISE_RETRY",
      note: "Checked mail gateway logs; message not queued.",
    });
    expect(reconciled.state).toBe("FAILED");

    const retried = await retryPilotNotification(
      { intentId: intent.id },
      { actor: "support-1", role: "support", token: "" },
      async () => ({ status: "sent", detail: "gateway-msg-202" }),
    );
    expect(retried.state).toBe("ACCEPTED");

    const afterPause = pausePilotRule(
      { ruleId: "pilot-rule-br-ex-01" },
      { actor: "approver-1", role: "approver", token: "" },
    );
    expect(afterPause.status).toBe("PAUSED");
  });

  it("allows the shared team workflow and retains optional token protection with audit trail (TC-010)", async () => {
    // Same actor may configure and activate; supplied legacy role has no authority.
    const allowed = await invokeApi({
      method: "POST",
      url: "/api/pilot/rules/activate",
      headers: { "x-pilot-role": "viewer", "x-pilot-actor": "team-alice" },
      body: { ruleId: "pilot-rule-br-ex-01", expectedVersion: 1 },
    });
    expect(allowed.status).toBe(200);
    // Strict token enforcement when PILOT_TOKEN is configured -> 401
    process.env.PILOT_TOKEN = "secret-pilot-token";
    const unauth = await invokeApi({
      method: "GET",
      url: "/api/pilot/overview",
      headers: { "x-pilot-role": "viewer" },
    });
    expect(unauth.status).toBe(401);
    expect(unauth.json.code).toBe("UNAUTHENTICATED");

    const authed = await invokeApi({
      method: "GET",
      url: "/api/pilot/overview",
      headers: {
        "x-pilot-role": "admin",
        authorization: "Bearer secret-pilot-token",
      },
    });
    expect(authed.status).toBe(200);
    expect(
      authed.json.audit.some(
        (entry) => entry.outcome === "DENIED" && entry.role === "team_member",
      ),
    ).toBe(true);
  });

  it("discloses worker monitoring gaps after restart without fabricating catch-up emails (FR-025, TC-012)", async () => {
    const startIso = "2026-11-09T09:00:00.000Z";
    await pilotWorkerTick({
      evaluationTimeIso: startIso,
      expectedIntervalMs: 60_000,
    });
    // Jump ahead 10 minutes (missed ~9 intervals)
    await pilotWorkerTick({
      evaluationTimeIso: "2026-11-09T09:10:00.000Z",
      expectedIntervalMs: 60_000,
    });

    const health = await invokeApi({
      method: "GET",
      url: "/api/health/monitoring",
      headers: { "x-pilot-role": "support" },
    });
    expect(health.status).toBe(200);
    expect(health.json.worker.status).toBe("GAP_DISCLOSED");
    expect(health.json.worker.missedIntervals).toBeGreaterThanOrEqual(8);
  });
});
