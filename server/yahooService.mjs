// Yahoo Finance snapshots. Provider failures never generate market observations.
const USER_AGENT = "Mozilla/5.0";
export const INSTRUMENT_MAP = {
  "brent-dec26": {
    id: "brent-dec26",
    symbol: "BZZ26.NYM",
    label: "Brent · Dec 2026",
    short: "Dec 26",
  },
  "brent-jan27": {
    id: "brent-jan27",
    symbol: "BZF27.NYM",
    label: "Brent · Jan 2027",
    short: "Jan 27",
  },
  "brent-feb27": {
    id: "brent-feb27",
    symbol: "BZG27.NYM",
    label: "Brent · Feb 2027",
    short: "Feb 27",
  },
};
const cache = new Map();
export function clearProviderCache() {
  cache.clear();
  cookie = null;
  crumb = null;
}
function getCached(key, age = 15000) {
  const entry = cache.get(key);
  return entry && Date.now() - entry.time < age ? entry.data : null;
}
function setCached(key, data) {
  cache.set(key, { time: Date.now(), data });
  return data;
}
const finite = (value) => typeof value === "number" && Number.isFinite(value);
const numeric = (value) => (finite(value) ? value : null);
const price = (value) => (finite(value) && value >= 0 ? value : null);
const iso = (seconds) =>
  finite(seconds) && seconds > 0
    ? new Date(seconds * 1000).toISOString()
    : null;
const metadata = (
  symbol,
  observedAt = null,
  fetchedAt = new Date().toISOString(),
) => ({
  source: "yahoo",
  symbol,
  observedAt,
  fetchedAt,
  delay: "unverified",
  status: "available",
});
async function providerFetch(url, headers = {}) {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, ...headers },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok)
    throw new Error(`Yahoo Finance unavailable (HTTP ${response.status}).`);
  return response;
}
export async function fetchYahooChart(symbol, range = "5d", interval = "5m") {
  const key = `chart:${symbol}:${range}:${interval}`;
  const cached = getCached(key);
  if (cached) return cached;
  const response = await providerFetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}&includePrePost=false`,
  );
  const json = await response.json();
  const result = json.chart?.result?.[0];
  if (!result || result.meta?.symbol?.toUpperCase() !== symbol.toUpperCase())
    throw new Error("The provider did not return the requested contract.");
  return setCached(key, { ...result, fetchedAt: new Date().toISOString() });
}
/** Preserve source precision. Missing OHLC bars are omitted, never forward-filled. */
export function formatBarsFromChart(result) {
  const quote = result.indicators?.quote?.[0] ?? {};
  const bars = [];
  for (const [index, seconds] of (result.timestamp ?? []).entries()) {
    const values = ["open", "high", "low", "close"].map(
      (field) => quote[field]?.[index],
    );
    if (!finite(seconds) || values.some((value) => !finite(value))) continue;
    const [open, high, low, close] = values;
    const time = seconds * 1000;
    if (
      high < Math.max(open, close) ||
      low > Math.min(open, close) ||
      low > high ||
      (bars.length && time <= bars.at(-1).time)
    )
      continue;
    bars.push({
      time,
      open,
      high,
      low,
      close,
      volume: numeric(quote.volume?.[index]),
    });
  }
  return bars;
}
export async function getBars(instrumentId, timeframe = "5m", range = "5d") {
  const instrument = INSTRUMENT_MAP[instrumentId];
  if (!instrument) throw new Error("Unknown listed contract.");
  const intervals = { "5m": "5m", "15m": "15m", "1h": "60m" };
  if (!intervals[timeframe]) throw new Error("Unsupported timeframe.");
  const ranges = { "1D": "1d", "5D": "5d", "1d": "1d", "5d": "5d" };
  if (!ranges[range]) throw new Error("Unsupported chart range.");
  const result = await fetchYahooChart(
    instrument.symbol,
    ranges[range],
    intervals[timeframe],
  );
  if (result.meta.currency !== "USD")
    throw new Error("USD chart currency unavailable.");
  const bars = formatBarsFromChart(result);
  if (!bars.length)
    throw new Error("No valid bars available for this contract and interval.");
  return {
    bars,
    meta: {
      ...metadata(
        instrument.symbol,
        new Date(bars.at(-1).time).toISOString(),
        result.fetchedAt,
      ),
      omittedBars: (result.timestamp?.length ?? 0) - bars.length,
    },
  };
}
export async function getInstruments() {
  return Promise.all(
    Object.values(INSTRUMENT_MAP).map(async (instrument) => {
      try {
        const chart = await fetchYahooChart(instrument.symbol, "1d", "5m");
        const quote = chart.meta;
        if (!finite(quote.regularMarketPrice) || quote.currency !== "USD")
          throw new Error("Quote price or USD currency unavailable.");
        const previous = numeric(
          quote.previousClose ?? quote.chartPreviousClose,
        );
        const change =
          previous === null ? null : quote.regularMarketPrice - previous;
        return {
          ...instrument,
          price: quote.regularMarketPrice,
          change,
          changePercent:
            previous && change !== null ? (change / previous) * 100 : null,
          high: numeric(quote.regularMarketDayHigh),
          low: numeric(quote.regularMarketDayLow),
          volume: numeric(quote.regularMarketVolume),
          currency: quote.currency,
          meta: metadata(
            instrument.symbol,
            iso(quote.regularMarketTime),
            chart.fetchedAt,
          ),
        };
      } catch {
        return {
          ...instrument,
          price: null,
          change: null,
          changePercent: null,
          high: null,
          low: null,
          volume: null,
          currency: "USD",
          meta: {
            ...metadata(instrument.symbol),
            status: "unavailable",
            fetchedAt: null,
          },
          error: "Contract quote unavailable.",
        };
      }
    }),
  );
}
export async function getFuturesCurve() {
  const contracts = await getInstruments();
  const available = contracts.every((contract) => contract.price !== null);
  const promptSpread = available
    ? contracts[0].price - contracts[1].price
    : null;
  return {
    contracts,
    promptSpread,
    fullSpread: available ? contracts[0].price - contracts[2].price : null,
    structure:
      promptSpread === null
        ? null
        : promptSpread > 0
          ? "backwardation"
          : promptSpread < 0
            ? "contango"
            : "flat",
    meta: {
      ...metadata("Brent listed contracts"),
      status: available ? "available" : "unavailable",
      observedAt: null,
    },
  };
}
let cookie = null;
let crumb = null;
let credentialExpiry = 0;
async function getCookieAndCrumb() {
  if (cookie && crumb && Date.now() < credentialExpiry)
    return { cookie, crumb };
  try {
    // The cookie handshake can supply a session cookie with a non-200 body.
    const response = await fetch("https://fc.yahoo.com", {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });
    const value = response.headers.get("set-cookie");
    if (!value) return {};
    cookie = value.split(";")[0];
    crumb = (
      await (
        await providerFetch(
          "https://query2.finance.yahoo.com/v1/test/getcrumb",
          { Cookie: cookie },
        )
      ).text()
    ).trim();
    credentialExpiry = Date.now() + 3600000;
    return { cookie, crumb };
  } catch {
    return {};
  }
}
// Black-Scholes formulas for Greeks
function standardNormalCdf(x) {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.SQRT2;
  const t = 1.0 / (1.0 + p * absX);
  const y =
    1.0 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return 0.5 * (1.0 + sign * y);
}

function standardNormalPdf(x) {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

export function computeGreeks(S, K, T, r, sigma, type) {
  if (T <= 0.0001 || sigma <= 0.001 || S <= 0 || K <= 0) {
    const isCall = type === "call";
    return {
      delta: isCall ? (S >= K ? 1 : 0) : S <= K ? -1 : 0,
      gamma: 0,
      theta: 0,
      vega: 0,
    };
  }
  const d1 =
    (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  const nd1 = standardNormalCdf(d1);
  const nd2 = standardNormalCdf(d2);
  const npd1 = standardNormalPdf(d1);

  const isCall = type === "call";
  const delta = isCall ? nd1 : nd1 - 1;
  const gamma = npd1 / (S * sigma * Math.sqrt(T));
  const vega = (S * Math.sqrt(T) * npd1) / 100;
  const thetaYearly = isCall
    ? -(S * npd1 * sigma) / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * nd2
    : -(S * npd1 * sigma) / (2 * Math.sqrt(T)) +
      r * K * Math.exp(-r * T) * (1 - nd2);
  const theta = thetaYearly / 365;

  return {
    delta: Number(delta.toFixed(4)),
    gamma: Number(gamma.toFixed(4)),
    theta: Number(theta.toFixed(4)),
    vega: Number(vega.toFixed(4)),
  };
}

/** Fetch one actual expiry. Unavailable fields stay null; no synthetic quote substitution. */
export async function getOptionsData(symbol = "BNO", expiryDate = null) {
  if (!["BNO", "USO"].includes(symbol))
    throw new Error("Unsupported oil fund.");
  let requested = null;
  if (expiryDate !== null) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(expiryDate)))
      throw new Error("Expiry must be YYYY-MM-DD.");
    requested = Date.parse(`${expiryDate}T00:00:00Z`) / 1000;
    if (!finite(requested) || iso(requested)?.slice(0, 10) !== expiryDate)
      throw new Error("Invalid option expiry.");
  }
  const key = `options:${symbol}:${expiryDate ?? "front"}`;
  const cached = getCached(key, 30000);
  if (cached) return cached;
  const auth = await getCookieAndCrumb();
  const params = new URLSearchParams();
  if (requested !== null) params.set("date", String(requested));
  if (auth.crumb) params.set("crumb", auth.crumb);
  const response = await providerFetch(
    `https://query2.finance.yahoo.com/v7/finance/options/${symbol}?${params}`,
    auth.cookie ? { Cookie: auth.cookie } : {},
  );
  const result = (await response.json()).optionChain?.result?.[0];
  const chain = result?.options?.[0];
  if (!result || !chain || result.quote?.symbol !== symbol)
    throw new Error("Requested option chain unavailable.");
  const actualExpiry = iso(chain.expirationDate)?.slice(0, 10);
  if (
    !actualExpiry ||
    (requested !== null && chain.expirationDate !== requested)
  )
    throw new Error("Provider returned a different option expiry.");
  const underlyingPrice = price(result.quote.regularMarketPrice);
  if (underlyingPrice === null || result.quote.currency !== "USD")
    throw new Error("Option underlying price or USD currency unavailable.");
  const fetchedAt = new Date().toISOString();
  const expiries = (result.expirationDates ?? [])
    .filter(finite)
    .map((seconds) => ({
      id: iso(seconds).slice(0, 10),
      timestamp: seconds,
      label: new Date(seconds * 1000).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }),
      underlying: symbol,
      reference: symbol,
      future: underlyingPrice,
      days: Math.max(0, (seconds * 1000 - Date.now()) / 86400000),
    }));
  if (!expiries.some((expiry) => expiry.id === actualExpiry))
    throw new Error("Expiry metadata unavailable.");
  const quotes = [];
  for (const [type, rawQuotes] of [
    ["call", chain.calls],
    ["put", chain.puts],
  ]) {
    for (const raw of rawQuotes ?? []) {
      if (!finite(raw.strike)) continue;
      const bid = price(raw.bid),
        ask = price(raw.ask);
      const validMarket = bid !== null && ask !== null && ask >= bid;
      quotes.push({
        type,
        strike: raw.strike,
        bid,
        ask,
        last: price(raw.lastPrice),
        mark: validMarket ? (bid + ask) / 2 : null,
        iv:
          finite(raw.impliedVolatility) && raw.impliedVolatility > 0
            ? raw.impliedVolatility * 100
            : null,
        delta: null,
        gamma: null,
        theta: null,
        vega: null,
        volume: numeric(raw.volume),
        oi: numeric(raw.openInterest),
        lastTradeAt: iso(raw.lastTradeDate),
        expiry: actualExpiry,
      });
    }
  }
  if (!quotes.length) throw new Error("No option observations available.");
  const strikes = [...new Set(quotes.map((quote) => quote.strike))].sort(
    (a, b) => a - b,
  );
  return setCached(key, {
    underlying: symbol,
    underlyingPrice,
    expiries,
    currentExpiry: actualExpiry,
    strikes,
    quotes,
    meta: metadata(symbol, iso(result.quote.regularMarketTime), fetchedAt),
    greekSource: "unavailable",
    greekNote: "Greeks unavailable: no verified pricing model configured.",
    quoteTimeNote:
      "Bid/ask observation times are not supplied by this endpoint.",
  });
}
