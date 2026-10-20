// Frontend client for observed Yahoo Finance snapshots; demo data is selected explicitly.
import type { Bar } from "./types";

export type MarketMode = "yahoo" | "demo";
export interface DataMeta {
  source: "yahoo";
  status: "available" | "unavailable";
  symbol?: string;
  fetchedAt: string | null;
  observedAt: string | null;
  delay: "unverified";
  omittedBars?: number;
}
export const unavailableMeta = (): DataMeta => ({
  source: "yahoo",
  status: "unavailable",
  fetchedAt: null,
  observedAt: null,
  delay: "unverified",
});
export interface MarketResult<T> {
  data: T | null;
  meta: DataMeta;
  error: string | null;
}
export interface LiveInstrument {
  id: string;
  symbol: string;
  label: string;
  short: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  currency: string;
  meta: DataMeta;
}
export interface LiveExpiry {
  id: string;
  timestamp: number;
  label: string;
  underlying: string;
  reference: string;
  future: number;
  days: number;
}
export interface LiveQuote {
  type: "call" | "put";
  strike: number;
  bid: number | null;
  ask: number | null;
  last: number | null;
  mark: number | null;
  iv: number | null;
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
  volume: number | null;
  oi: number | null;
  lastTradeAt?: string | null;
  expiry?: string;
}
export interface LiveOptionsData {
  underlying: string;
  underlyingPrice: number;
  expiries: LiveExpiry[];
  currentExpiry: string;
  strikes: number[];
  quotes: LiveQuote[];
  meta: DataMeta;
  greekSource: "unavailable";
  greekNote: string;
  quoteTimeNote: string;
}
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const validMeta = (meta: DataMeta) =>
  meta?.source === "yahoo" &&
  meta.status === "available" &&
  !!meta.fetchedAt &&
  Number.isFinite(Date.parse(meta.fetchedAt)) &&
  (meta.observedAt === null ||
    (typeof meta.observedAt === "string" &&
      Number.isFinite(Date.parse(meta.observedAt))));
async function read(path: string, signal?: AbortSignal, timeout = 12000) {
  const response = await fetch(`/api/${path}`, {
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(timeout)])
      : AbortSignal.timeout(timeout),
  });
  const payload = await response.json();
  if (!response.ok || payload.success !== true)
    throw new Error(payload.error ?? "Yahoo Finance data unavailable.");
  return payload;
}
export async function fetchLiveInstruments(
  signal?: AbortSignal,
): Promise<LiveInstrument[]> {
  try {
    const payload = await read("instruments", signal);
    return Array.isArray(payload.instruments)
      ? payload.instruments.filter(
          (item: LiveInstrument) =>
            typeof item.id === "string" &&
            typeof item.symbol === "string" &&
            item.currency === "USD" &&
            ((item.price === null && item.meta?.status === "unavailable") ||
              (finite(item.price) && validMeta(item.meta))),
        )
      : [];
  } catch {
    return [];
  }
}
export async function fetchLiveBars(
  instrument: string,
  timeframe: "5m" | "15m" | "1h" = "5m",
  range = "5d",
  signal?: AbortSignal,
): Promise<MarketResult<Bar[]>> {
  try {
    const payload = await read(
      `bars?instrument=${encodeURIComponent(instrument)}&timeframe=${timeframe}&range=${encodeURIComponent(range)}`,
      signal,
    );
    if (
      !validMeta(payload.meta) ||
      !Array.isArray(payload.bars) ||
      !payload.bars.length ||
      !payload.bars.every(
        (bar: Bar, index: number) =>
          [bar.time, bar.open, bar.high, bar.low, bar.close].every(finite) &&
          (index === 0 || bar.time > payload.bars[index - 1].time),
      )
    )
      throw new Error("Valid observed chart bars unavailable.");
    return { data: payload.bars, meta: payload.meta, error: null };
  } catch (error) {
    return {
      data: null,
      meta: unavailableMeta(),
      error: error instanceof Error ? error.message : "Chart data unavailable.",
    };
  }
}
export async function fetchLiveOptions(
  symbol = "BNO",
  date: string | null = null,
  signal?: AbortSignal,
): Promise<MarketResult<LiveOptionsData>> {
  try {
    const payload = await read(
      `options?symbol=${encodeURIComponent(symbol)}${date ? `&date=${encodeURIComponent(date)}` : ""}`,
      signal,
      30000,
    );
    if (
      !validMeta(payload.meta) ||
      payload.underlying !== symbol ||
      !finite(payload.underlyingPrice) ||
      !Array.isArray(payload.expiries) ||
      !payload.expiries.length ||
      !Array.isArray(payload.quotes) ||
      !Array.isArray(payload.strikes) ||
      !payload.quotes.length ||
      (date && payload.currentExpiry !== date) ||
      !payload.quotes.every(
        (quote: LiveQuote) =>
          finite(quote.strike) &&
          quote.expiry === payload.currentExpiry &&
          [
            quote.bid,
            quote.ask,
            quote.last,
            quote.mark,
            quote.iv,
            quote.delta,
            quote.gamma,
            quote.theta,
            quote.vega,
            quote.volume,
            quote.oi,
          ].every((value) => value === null || finite(value)),
      )
    )
      throw new Error("Requested expiry snapshot unavailable.");
    return { data: payload, meta: payload.meta, error: null };
  } catch (error) {
    return {
      data: null,
      meta: unavailableMeta(),
      error:
        error instanceof Error ? error.message : "Option data unavailable.",
    };
  }
}
