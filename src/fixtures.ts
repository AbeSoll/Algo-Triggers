import type { Bar, Rule } from "./types";

export const instruments = [
  { id: "brent-dec26", label: "Brent · Dec 2026", short: "Dec 26", offset: 0 },
  {
    id: "brent-jan27",
    label: "Brent · Jan 2027",
    short: "Jan 27",
    offset: -0.36,
  },
  {
    id: "brent-feb27",
    label: "Brent · Feb 2027",
    short: "Feb 27",
    offset: -0.64,
  },
];

/** Synthetic deterministic observations, not actual exchange prices or session calendars. */
export function generateBars(
  instrument: string,
  timeframe: "5m" | "15m" | "1h",
): Bar[] {
  const contract = instruments.find((item) => item.id === instrument);
  if (!contract) throw new Error("Select one of the supported demo contracts.");
  const source: Bar[] = [];
  const origin = Date.UTC(2026, 9, 12, 7);
  let previous = 81.74 + contract.offset;
  for (let day = 0; day < 5; day += 1) {
    for (let slot = 0; slot < 144; slot += 1) {
      const index = day * 144 + slot;
      const close =
        82.32 +
        contract.offset +
        day * 0.095 +
        Math.sin(index / 23) * 0.77 +
        Math.sin(index / 7.6) * 0.23 +
        Math.cos(index / 43) * 0.19 +
        Math.sin(index / 2.8) * 0.035;
      const open = previous;
      const wick = 0.035 + (1 + Math.sin(index * 1.7)) * 0.025;
      source.push({
        time: origin + day * 86_400_000 + slot * 300_000,
        open,
        close,
        high: Math.max(open, close) + wick,
        low: Math.min(open, close) - wick * 0.88,
        volume: Math.round(
          460 + (1 + Math.sin(index / 9)) * 340 + Math.abs(close - open) * 2400,
        ),
      });
      previous = close;
    }
  }
  const size = timeframe === "5m" ? 1 : timeframe === "15m" ? 3 : 12;
  const bars: Bar[] = [];
  for (let index = 0; index < source.length; index += size) {
    const group = source.slice(index, index + size);
    bars.push({
      time: group[group.length - 1].time,
      open: group[0].open,
      close: group[group.length - 1].close,
      high: Math.max(...group.map((bar) => bar.high)),
      low: Math.min(...group.map((bar) => bar.low)),
      volume: group.reduce((total, bar) => total + bar.volume, 0),
    });
  }
  return bars;
}

export const seedRules: Rule[] = [
  {
    id: "rule-brent-breakout",
    version: 1,
    name: "Brent breaks $82.50",
    instrument: "brent-dec26",
    join: "AND",
    conditions: [
      {
        id: "price-1",
        metric: "price",
        operator: "crosses_above",
        threshold: 82.5,
        period: 20,
        slowPeriod: 50,
        windowBars: 12,
      },
    ],
    cooldownMinutes: 30,
    frequency: "crossing",
    status: "monitoring",
    createdAt: "2026-10-12T07:00:00.000Z",
  },
  {
    id: "rule-trend",
    version: 1,
    name: "Momentum turns higher",
    instrument: "brent-dec26",
    join: "AND",
    conditions: [
      {
        id: "trend-1",
        metric: "sma_cross",
        operator: "crosses_above",
        threshold: 0,
        period: 9,
        slowPeriod: 21,
        windowBars: 12,
      },
    ],
    cooldownMinutes: 60,
    frequency: "crossing",
    status: "monitoring",
    createdAt: "2026-10-12T08:15:00.000Z",
  },
  {
    id: "rule-pullback",
    version: 1,
    name: "January pullback watch",
    instrument: "brent-jan27",
    join: "AND",
    conditions: [
      {
        id: "move-1",
        metric: "percent_change",
        operator: "below",
        threshold: -0.5,
        period: 20,
        slowPeriod: 50,
        windowBars: 12,
      },
    ],
    cooldownMinutes: 60,
    frequency: "crossing",
    status: "draft",
    createdAt: "2026-10-13T09:30:00.000Z",
  },
];
