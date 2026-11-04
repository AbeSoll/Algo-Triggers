import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

process.env.DESK_DB = path.join(
  mkdtempSync(path.join(tmpdir(), "algo-desk-")),
  "desk.sqlite",
);
process.env.SMTP_HOST = "";
process.env.SMTP_USER = "";
process.env.SMTP_PASS = "";
process.env.ALERT_TO = "alerts@example.com";

const { armWatch, listDesk, sendTestEmail, tick } = await import("./desk.mjs");

const rule = {
  id: "rule-email",
  version: 1,
  name: "Brent crosses 10",
  instrument: "brent-dec26",
  join: "AND",
  conditions: [
    {
      id: "price-1",
      metric: "price",
      operator: "crosses_above",
      threshold: 10,
      period: 20,
      slowPeriod: 50,
      windowBars: 12,
    },
  ],
  cooldownMinutes: 0,
  frequency: "crossing",
  status: "monitoring",
  createdAt: "2026-10-25T00:00:00.000Z",
  timeframe: "5m",
};

const bar = (time, close) => ({
  time,
  open: close,
  high: close,
  low: close,
  close,
  volume: null,
});

describe("email desk", () => {
  it("arms without emailing the bars that already happened", async () => {
    const history = [bar(1_000, 9), bar(2_000, 11)];
    const armed = await armWatch({
      rule,
      loadBars: async () => history,
    });
    expect(armed.email).toBe("alerts@example.com");
    expect(armed.smtpConfigured).toBe(false);
    const quiet = await tick(async () => history);
    expect(quiet.emitted).toBe(0);
  });

  it("stores a new crossing for the test inbox until SMTP is configured", async () => {
    const next = [bar(1_000, 9), bar(2_000, 11), bar(3_000, 9), bar(4_000, 12)];
    const result = await tick(async () => next);
    expect(result.emitted).toBe(1);
    const desk = listDesk();
    expect(desk.deliveries[0]).toMatchObject({
      email: "alerts@example.com",
      status: "held",
    });
    expect(desk.deliveries[0].subject).toContain("Brent crosses 10");
  });

  it("saves a test email in the outbox when Gmail is not configured", async () => {
    const test = await sendTestEmail();
    expect(test.status).toBe("held");
    expect(test.message).toContain("alerts@example.com");
  });

  it("rejects an option rule instead of inventing option history", async () => {
    await expect(
      armWatch({
        rule: {
          ...rule,
          id: "opt",
          conditions: [{ ...rule.conditions[0], metric: "option_premium" }],
        },
        loadBars: async () => [],
      }),
    ).rejects.toThrow("option history");
  });
});
