// Mock provider observations for deterministic UI tests; never used by the application.
export const firstExpiry = "2026-11-20";
export const secondExpiry = "2026-12-18";
export const thirdExpiry = "2027-01-15";
export const meta = {
  source: "yahoo",
  status: "available",
  symbol: "BNO",
  observedAt: "2026-10-19T14:00:00Z",
  fetchedAt: "2026-10-20T10:00:00Z",
  delay: "unverified",
};
export function options(expiry = firstExpiry, value = 1.1) {
  return {
    success: true,
    underlying: "BNO",
    underlyingPrice: 67.123456,
    currentExpiry: expiry,
    expiries: [firstExpiry, secondExpiry, thirdExpiry].map((id, index) => ({
      id,
      timestamp: Date.parse(`${id}T00:00:00Z`) / 1000,
      label: ["20 Nov 2026", "18 Dec 2026", "15 Jan 2027"][index],
      underlying: "BNO",
      reference: "BNO",
      future: 67.123456,
      days: [32, 60, 88][index],
    })),
    strikes: [66, 67, 68],
    quotes: [66, 67, 68].flatMap((strike) =>
      ["call", "put"].map((type) => ({
        type,
        strike,
        expiry,
        bid: value,
        ask: value + 0.2,
        last: value + 0.05,
        mark: value + 0.1,
        iv: 31.2345,
        delta: null,
        gamma: null,
        theta: null,
        vega: null,
        volume: null,
        oi: null,
        lastTradeAt: "2026-10-19T13:00:00Z",
      })),
    ),
    meta,
    greekSource: "unavailable",
    greekNote: "No verified model.",
    quoteTimeNote: "Not supplied.",
  };
}
export function bars() {
  const origin = Date.parse("2026-10-19T10:00:00Z");
  return {
    success: true,
    meta: {
      ...meta,
      symbol: "BZZ26.NYM",
      observedAt: new Date(origin + 79 * 300000).toISOString(),
    },
    bars: Array.from({ length: 80 }, (_, i) => ({
      time: origin + i * 300000,
      open: 81 + i * 0.01,
      high: 82 + i * 0.01,
      low: 80 + i * 0.01,
      close: 81.123456 + i * 0.01,
      volume: null,
    })),
  };
}
