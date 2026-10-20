// server/apiHandler.mjs
import { URL } from "node:url";
import {
  getBars,
  getInstruments,
  getFuturesCurve,
  getOptionsData,
  INSTRUMENT_MAP,
} from "./yahooService.mjs";

function sendJson(res, data, status = 200) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Cache-Control": "no-cache",
  });
  res.end(body);
}

function sendError(res, message, status = 503) {
  sendJson(
    res,
    {
      error: message,
      success: false,
      meta: {
        source: "yahoo",
        status: "unavailable",
        observedAt: null,
        fetchedAt: null,
        delay: "unverified",
      },
    },
    status,
  );
}

export async function handleApiRequest(req, res) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    res.end();
    return true;
  }

  const reqUrl = req.url || "";
  const parsed = new URL(reqUrl, "http://localhost");
  const pathname = parsed.pathname;

  try {
    // Health check
    if (pathname === "/api/health" || pathname === "/api/health/") {
      sendJson(res, {
        status: "ok",
        provider: "yahoo-finance",
        providerConnectivity: "not-checked",
        timestamp: Date.now(),
        isoTime: new Date().toISOString(),
      });
      return true;
    }

    // List Instruments with current quotes
    if (pathname === "/api/instruments" || pathname === "/api/instruments/") {
      const data = await getInstruments();
      sendJson(res, { success: true, count: data.length, instruments: data });
      return true;
    }

    // Forward futures curve
    if (pathname === "/api/curve" || pathname === "/api/curve/") {
      const data = await getFuturesCurve();
      sendJson(res, { success: true, curve: data });
      return true;
    }

    // OHLCV Bars
    if (pathname === "/api/bars" || pathname === "/api/bars/") {
      const instrument = parsed.searchParams.get("instrument") || "brent-dec26";
      const timeframe = parsed.searchParams.get("timeframe") || "5m";
      const range = parsed.searchParams.get("range") || "5d";

      const data = await getBars(instrument, timeframe, range);
      sendJson(res, {
        success: true,
        instrument,
        timeframe,
        range,
        count: data.bars.length,
        ...data,
      });
      return true;
    }

    // Options chain and Greeks
    if (pathname === "/api/options" || pathname === "/api/options/") {
      const symbol = parsed.searchParams.get("symbol") || "BNO";
      const date = parsed.searchParams.get("date") || null;

      const data = await getOptionsData(symbol, date);
      sendJson(res, { success: true, ...data });
      return true;
    }

    // Provider status summary
    if (pathname === "/api/status" || pathname === "/api/status/") {
      sendJson(res, {
        success: true,
        provider: "Yahoo Finance snapshots",
        instruments: Object.keys(INSTRUMENT_MAP),
        cacheTtlSeconds: 15,
        providerConnectivity: "not-checked",
        timestamp: new Date().toISOString(),
      });
      return true;
    }

    return false;
  } catch (err) {
    console.error(`[API Error] ${pathname}:`, err);
    sendError(res, err.message || "Market data unavailable.", 503);
    return true;
  }
}
