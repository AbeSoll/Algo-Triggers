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

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => {
      chunks.push(chunk);
      const size = chunks.reduce((total, part) => total + part.length, 0);
      if (size > 1_000_000) reject(new Error("Request body is too large."));
    });
    req.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8");
      if (!text) return resolve({});
      try {
        resolve(JSON.parse(text));
      } catch {
        reject(new Error("Request body must be JSON."));
      }
    });
    req.on("error", reject);
  });
}

async function handleDesk(req, res, parsed) {
  const desk = await import("./desk.mjs");
  const pathname = parsed.pathname.replace(/\/$/, "") || "/";
  if (req.method === "GET" && pathname === "/api/desk") {
    sendJson(res, desk.listDesk());
    return true;
  }
  if (req.method === "POST" && pathname === "/api/desk/watches") {
    const body = await readJson(req);
    sendJson(
      res,
      await desk.armWatch({
        rule: body.rule,
        email: body.email,
        active: body.active !== false,
      }),
    );
    return true;
  }
  if (req.method === "POST" && pathname === "/api/desk/watches/pause") {
    const body = await readJson(req);
    sendJson(res, desk.pauseWatch(body));
    return true;
  }
  if (req.method === "POST" && pathname === "/api/desk/test-email") {
    const body = await readJson(req);
    sendJson(res, await desk.sendTestEmail(body.email));
    return true;
  }
  if (req.method === "POST" && pathname === "/api/desk/tick") {
    sendJson(res, await desk.tick());
    return true;
  }
  return false;
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

let deskReady = null;
function ensureDesk() {
  if (process.env.VITEST) return;
  if (!deskReady) {
    deskReady = import("./desk.mjs")
      .then((desk) => desk.startDesk())
      .catch((error) => console.error("[desk] failed to start", error));
  }
}

export async function handleApiRequest(req, res) {
  ensureDesk();
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

    if (pathname.startsWith("/api/desk")) {
      try {
        return await handleDesk(req, res, parsed);
      } catch (error) {
        sendJson(
          res,
          {
            success: false,
            error:
              error instanceof Error ? error.message : "Desk request failed.",
          },
          400,
        );
        return true;
      }
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
