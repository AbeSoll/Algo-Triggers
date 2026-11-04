import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  clearProviderCache,
  estimateGreeks,
  formatBarsFromChart,
  getBars,
  getInstruments,
  getOptionsData,
} from "./yahooService.mjs";
import { handleApiRequest } from "./apiHandler.mjs";

const first = Date.parse("2026-11-20T00:00:00Z") / 1000;
const second = Date.parse("2026-12-18T00:00:00Z") / 1000;
function optionPayload(expiry = first) {
  return {
    optionChain: {
      result: [
        {
          quote: {
            symbol: "BNO",
            currency: "USD",
            regularMarketPrice: 67.123456,
            regularMarketTime: 1792454400,
          },
          expirationDates: [first, second],
          options: [
            {
              expirationDate: expiry,
              calls: [
                {
                  strike: 66,
                  bid: 1.112345,
                  ask: 1.234567,
                  lastPrice: 1.2,
                  impliedVolatility: 0.312345,
                  lastTradeDate: 1792454300,
                },
                { strike: 68, lastPrice: 0.5 },
              ],
              puts: [{ strike: 66, bid: 2, ask: 1, lastPrice: 1.1 }],
            },
          ],
        },
      ],
    },
  };
}
function optionFetch(payload = optionPayload()) {
  return vi.fn(async (url) => {
    if (String(url).includes("fc.yahoo.com"))
      return new Response("", {
        headers: { "set-cookie": "test=local; Path=/" },
      });
    if (String(url).includes("getcrumb")) return new Response("test-crumb");
    return Response.json(payload);
  });
}
beforeEach(() => {
  clearProviderCache();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("observed market data boundary", () => {
  it("does not fill gaps, fabricate volume, or round source prices", () => {
    const bars = formatBarsFromChart({
      timestamp: [1, 2, 3],
      indicators: {
        quote: [
          {
            open: [1.123456, null, 2],
            high: [1.3, null, 2.5],
            low: [1, null, 1.9],
            close: [1.234567, null, 2.123456],
            volume: [null, null, 10],
          },
        ],
      },
    });
    expect(bars).toHaveLength(2);
    expect(bars[0]).toMatchObject({ close: 1.234567, volume: null });
    expect(bars[1].time).toBe(3000);
  });
  it("returns failure instead of generated bars when the provider fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Offline")));
    await expect(getBars("brent-dec26")).rejects.toThrow("Offline");
    const instruments = await getInstruments();
    expect(
      instruments.every(
        (item) =>
          item.price === null &&
          item.meta.status === "unavailable" &&
          item.meta.observedAt === null &&
          item.meta.fetchedAt === null,
      ),
    ).toBe(true);
  });
  it("rejects generic or mismatched symbols for an explicitly listed contract", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ chart: { result: [{ meta: { symbol: "BZ=F" } }] } }),
      ),
    );
    await expect(getBars("brent-dec26")).rejects.toThrow("requested contract");
  });
  it("keeps source bar time separate from fetch time and reuses the original cache timestamp", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-20T10:00:00Z"));
    const fetcher = vi.fn(async () =>
      Response.json({
        chart: {
          result: [
            {
              meta: { symbol: "BZZ26.NYM", currency: "USD" },
              timestamp: [1792454400],
              indicators: {
                quote: [
                  {
                    open: [81.123456],
                    high: [82],
                    low: [80],
                    close: [81.654321],
                  },
                ],
              },
            },
          ],
        },
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    const a = await getBars("brent-dec26");
    vi.setSystemTime(new Date("2026-10-20T10:00:05Z"));
    const b = await getBars("brent-dec26");
    expect(a.meta.fetchedAt).toBe(b.meta.fetchedAt);
    expect(a.meta.observedAt).not.toBe(a.meta.fetchedAt);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(a.bars[0].close).toBe(81.654321);
  });
  it("keeps missing prices and missing IV unavailable, and estimates Greeks only from supplied IV", async () => {
    vi.stubGlobal("fetch", optionFetch());
    const data = await getOptionsData("BNO");
    const missing = data.quotes.find((quote) => quote.strike === 68);
    expect(missing).toMatchObject({
      bid: null,
      ask: null,
      mark: null,
      last: 0.5,
      iv: null,
      delta: null,
      volume: null,
    });
    expect(data.quotes.find((quote) => quote.type === "put")).toMatchObject({
      mark: null,
      delta: null,
    });
    expect(data.quotes[0].bid).toBe(1.112345);
    expect(data.quotes[0].iv).toBeCloseTo(31.2345);
    expect(data.quotes[0].lastTradeAt).toBe(
      new Date(1792454300000).toISOString(),
    );
    expect(data.meta.source).toBe("yahoo");
    const expiryStillAhead = Date.parse("2026-11-20T00:00:00Z") > Date.now();
    if (expiryStillAhead) {
      expect(data.greekSource).toBe("black-scholes");
      expect(data.quotes[0].delta).toBeGreaterThan(0);
      expect(data.quotes[0].delta).toBeLessThan(1);
    }
  });
  it("estimates a call delta from Yahoo IV without treating it as an exchange print", () => {
    const greeks = estimateGreeks(
      67.123456,
      66,
      31.2345,
      "2026-11-20",
      "call",
      Date.parse("2026-10-20T00:00:00Z"),
    );
    expect(greeks.delta).toBeGreaterThan(0.5);
    expect(greeks.delta).toBeLessThan(1);
    expect(greeks.gamma).toBeGreaterThan(0);
    expect(greeks.vega).toBeGreaterThan(0);
    expect(greeks.theta).toBeLessThan(0);
    expect(
      estimateGreeks(
        67,
        66,
        null,
        "2026-11-20",
        "call",
        Date.parse("2026-10-20T00:00:00Z"),
      ).delta,
    ).toBeNull();
  });
  it("requests and caches each expiry separately", async () => {
    const fetcher = optionFetch();
    fetcher.mockImplementation(async (url) => {
      if (String(url).includes("fc.yahoo.com"))
        return new Response("", { headers: { "set-cookie": "test=local" } });
      if (String(url).includes("getcrumb")) return new Response("test");
      const date = new URL(url).searchParams.get("date");
      return Response.json(optionPayload(date ? Number(date) : first));
    });
    vi.stubGlobal("fetch", fetcher);
    const a = await getOptionsData("BNO", "2026-11-20");
    const b = await getOptionsData("BNO", "2026-12-18");
    expect(a.currentExpiry).toBe("2026-11-20");
    expect(b.currentExpiry).toBe("2026-12-18");
    expect(
      fetcher.mock.calls.some(([url]) =>
        String(url).includes(`date=${second}`),
      ),
    ).toBe(true);
    await getOptionsData("BNO", "2026-12-18");
    expect(fetcher).toHaveBeenCalledTimes(4);
  });
  it("rejects a response for the wrong requested expiry and invalid calendar dates", async () => {
    vi.stubGlobal("fetch", optionFetch());
    await expect(getOptionsData("BNO", "2026-12-18")).rejects.toThrow(
      "different option expiry",
    );
    await expect(getOptionsData("BNO", "2026-02-30")).rejects.toThrow(
      "Invalid option expiry",
    );
  });
  it("does not claim provider connectivity in a local health check", async () => {
    let body;
    await handleApiRequest(
      { method: "GET", url: "/api/health" },
      {
        writeHead() {},
        end(value) {
          body = JSON.parse(value);
        },
      },
    );
    expect(body.providerConnectivity).toBe("not-checked");
    expect(body.live).toBeUndefined();
  });
  it("sends an unavailable response when a market request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Offline")));
    let status, body;
    await handleApiRequest(
      { method: "GET", url: "/api/bars" },
      {
        writeHead(value) {
          status = value;
        },
        end(value) {
          body = JSON.parse(value);
        },
      },
    );
    expect(status).toBe(503);
    expect(body.success).toBe(false);
    expect(body.bars).toBeUndefined();
    expect(body.meta.status).toBe("unavailable");
  });
});
