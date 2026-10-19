// src/api.ts
// Frontend client for Yahoo Finance live data API
import type { Bar } from "./types";
import { generateBars } from "./fixtures";

export interface LiveInstrument {
  id: string;
  symbol: string;
  label: string;
  short: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;
  currency: string;
  updatedAt: string;
}

export interface LiveCurve {
  updatedAt: string;
  structure: "backwardation" | "contango" | "flat";
  promptSpread: number;
  fullSpread: number;
  contracts: LiveInstrument[];
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
  ask: number;
  last: number | null;
  mark: number | null;
  iv: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  volume: number;
  oi: number;
}

export interface LiveOptionsData {
  underlying: string;
  underlyingPrice: number;
  snapshot: string;
  expiries: LiveExpiry[];
  currentExpiry: string;
  strikes: number[];
  quotes: LiveQuote[];
}

const BASE_URL = "/api";

export async function fetchLiveInstruments(): Promise<LiveInstrument[]> {
  try {
    const res = await fetch(`${BASE_URL}/instruments`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.success && Array.isArray(data.instruments)) {
      return data.instruments;
    }
  } catch (err) {
    console.warn("[API] Instruments fallback to static fixtures:", err);
  }
  return [
    {
      id: "brent-dec26",
      symbol: "BZ=F",
      label: "Brent · Dec 2026",
      short: "Dec 26",
      price: 109.3,
      change: -0.48,
      changePercent: -0.44,
      high: 110.25,
      low: 106.82,
      volume: 24357,
      currency: "USD",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "brent-jan27",
      symbol: "BZF27.NYM",
      label: "Brent · Jan 2027",
      short: "Jan 27",
      price: 106.14,
      change: -0.32,
      changePercent: -0.3,
      high: 107.0,
      low: 105.4,
      volume: 12050,
      currency: "USD",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "brent-feb27",
      symbol: "BZG27.NYM",
      label: "Brent · Feb 2027",
      short: "Feb 27",
      price: 103.21,
      change: -0.25,
      changePercent: -0.24,
      high: 104.1,
      low: 102.8,
      volume: 8740,
      currency: "USD",
      updatedAt: new Date().toISOString(),
    },
  ];
}

export async function fetchLiveBars(
  instrument: string,
  timeframe: "5m" | "15m" | "1h" = "5m",
  range = "5d",
): Promise<Bar[]> {
  try {
    const res = await fetch(
      `${BASE_URL}/bars?instrument=${encodeURIComponent(instrument)}&timeframe=${timeframe}&range=${range}`,
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.success && Array.isArray(data.bars) && data.bars.length > 0) {
      return data.bars;
    }
  } catch (err) {
    console.warn(`[API] Bars fallback for ${instrument}:`, err);
  }
  return generateBars(instrument, timeframe);
}

export async function fetchLiveCurve(): Promise<LiveCurve | null> {
  try {
    const res = await fetch(`${BASE_URL}/curve`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.success && data.curve) {
      return data.curve;
    }
  } catch (err) {
    console.warn("[API] Curve fallback:", err);
  }
  return null;
}

export async function fetchLiveOptions(
  symbol = "BNO",
  date: string | null = null,
): Promise<LiveOptionsData | null> {
  try {
    let url = `${BASE_URL}/options?symbol=${encodeURIComponent(symbol)}`;
    if (date) url += `&date=${encodeURIComponent(date)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.success) {
      return data;
    }
  } catch (err) {
    console.warn(`[API] Options fallback for ${symbol}:`, err);
  }
  return null;
}

export async function checkLiveHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/health`);
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === "ok";
  } catch {
    return false;
  }
}
