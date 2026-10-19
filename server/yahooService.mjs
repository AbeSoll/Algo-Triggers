// server/yahooService.mjs
// Yahoo Finance data provider for Algo-Triggers

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// Instrument mapping
export const INSTRUMENT_MAP = {
  'brent-dec26': {
    id: 'brent-dec26',
    symbol: 'BZ=F',
    label: 'Brent · Dec 2026 (BZ=F)',
    short: 'Dec 26',
    fallbackPrice: 109.3,
  },
  'brent-jan27': {
    id: 'brent-jan27',
    symbol: 'BZF27.NYM',
    label: 'Brent · Jan 2027 (BZF27)',
    short: 'Jan 27',
    fallbackPrice: 106.14,
  },
  'brent-feb27': {
    id: 'brent-feb27',
    symbol: 'BZG27.NYM',
    label: 'Brent · Feb 2027 (BZG27)',
    short: 'Feb 27',
    fallbackPrice: 103.21,
  },
  'wti-dec26': {
    id: 'wti-dec26',
    symbol: 'CL=F',
    label: 'WTI Crude · Dec 2026 (CL=F)',
    short: 'WTI Dec 26',
    fallbackPrice: 98.56,
  },
};

// In-memory cache
const cache = new Map();
function getCached(key, maxAgeMs) {
  const item = cache.get(key);
  if (item && Date.now() - item.timestamp < maxAgeMs) {
    return item.data;
  }
  return null;
}
function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

// Cookie & Crumb manager for Yahoo Finance v7 endpoints
let cachedCookie = null;
let cachedCrumb = null;
let cookieCrumbExpires = 0;

async function getCookieAndCrumb() {
  if (cachedCookie && cachedCrumb && Date.now() < cookieCrumbExpires) {
    return { cookie: cachedCookie, crumb: cachedCrumb };
  }

  try {
    const fcRes = await fetch('https://fc.yahoo.com', {
      headers: { 'User-Agent': USER_AGENT },
    });
    const setCookie = fcRes.headers.get('set-cookie');
    if (!setCookie) throw new Error('No cookie returned from fc.yahoo.com');

    const cookie = setCookie.split(';')[0];
    const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
      headers: {
        'User-Agent': USER_AGENT,
        Cookie: cookie,
      },
    });

    if (!crumbRes.ok) throw new Error(`Crumb fetch failed with status ${crumbRes.status}`);
    const crumb = (await crumbRes.text()).trim();

    cachedCookie = cookie;
    cachedCrumb = crumb;
    cookieCrumbExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    return { cookie, crumb };
  } catch (err) {
    console.warn('[YahooService] Failed to obtain cookie/crumb, fallback mode active:', err.message);
    return { cookie: null, crumb: null };
  }
}

/**
 * Fetch raw chart data from Yahoo Finance
 */
export async function fetchYahooChart(symbol, range = '5d', interval = '5m') {
  const cacheKey = `chart:${symbol}:${range}:${interval}`;
  const cached = getCached(cacheKey, 15000); // 15 seconds
  if (cached) return cached;

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`;
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!res.ok) {
    throw new Error(`Yahoo Finance chart HTTP ${res.status} for ${symbol}`);
  }

  const json = await res.json();
  const result = json.chart?.result?.[0];
  if (!result) throw new Error(`No chart data returned for ${symbol}`);

  setCache(cacheKey, result);
  return result;
}

/**
 * Convert Yahoo Finance chart result into strictly increasing Bar[]
 */
export function formatBarsFromChart(chartResult) {
  const timestamps = chartResult.timestamp || [];
  const quote = chartResult.indicators?.quote?.[0] || {};
  const opens = quote.open || [];
  const highs = quote.high || [];
  const lows = quote.low || [];
  const closes = quote.close || [];
  const volumes = quote.volume || [];

  const bars = [];
  let lastClose = chartResult.meta?.regularMarketPrice || 100;

  for (let i = 0; i < timestamps.length; i++) {
    const rawTime = timestamps[i];
    if (rawTime == null) continue;
    const time = rawTime * 1000;

    // Filter non-finite numbers
    let c = closes[i];
    let o = opens[i];
    let h = highs[i];
    let l = lows[i];
    let v = volumes[i];

    if (c == null || !Number.isFinite(c)) {
      if (bars.length > 0) c = bars[bars.length - 1].close;
      else c = lastClose;
    }
    if (o == null || !Number.isFinite(o)) o = c;
    if (h == null || !Number.isFinite(h)) h = Math.max(o, c);
    if (l == null || !Number.isFinite(l)) l = Math.min(o, c);
    if (v == null || !Number.isFinite(v)) v = 0;

    // Ensure high >= low and timestamps strictly increasing
    h = Math.max(h, o, c);
    l = Math.min(l, o, c);

    if (bars.length > 0 && time <= bars[bars.length - 1].time) {
      continue;
    }

    bars.push({
      time,
      open: Number(o.toFixed(2)),
      high: Number(h.toFixed(2)),
      low: Number(l.toFixed(2)),
      close: Number(c.toFixed(2)),
      volume: Math.round(v),
    });
    lastClose = c;
  }

  return bars;
}

/**
 * Get OHLCV bars for an instrument or symbol
 */
export async function getBars(instrumentId, timeframe = '5m', range = '5d') {
  const instr = INSTRUMENT_MAP[instrumentId] || { symbol: instrumentId };
  const symbol = instr.symbol;

  // Map timeframe to Yahoo interval
  const intervalMap = {
    '5m': '5m',
    '15m': '15m',
    '1h': '60m',
    '1d': '1d',
  };
  const yInterval = intervalMap[timeframe] || '5m';

  // Map range
  const rangeMap = {
    '1D': '1d',
    '5D': '5d',
    '1M': '1mo',
    '3M': '3mo',
    '1Y': '1y',
  };
  const yRange = rangeMap[range] || range || '5d';

  try {
    const chart = await fetchYahooChart(symbol, yRange, yInterval);
    const bars = formatBarsFromChart(chart);
    if (bars.length > 0) return bars;
  } catch (err) {
    console.warn(`[YahooService] Failed to fetch live bars for ${symbol}:`, err.message);
  }

  // Graceful fallback to synthetic bars if network/Yahoo fails
  return generateFallbackBars(instr, timeframe);
}

/**
 * Generate fallback bars matching instrument parameters
 */
function generateFallbackBars(instr, timeframe) {
  const basePrice = instr.fallbackPrice || 109.3;
  const bars = [];
  const origin = Date.now() - 5 * 86_400_000;
  const stepMs = timeframe === '5m' ? 300_000 : timeframe === '15m' ? 900_000 : 3_600_000;
  const count = timeframe === '5m' ? 400 : timeframe === '15m' ? 200 : 120;

  let current = basePrice;
  for (let i = 0; i < count; i++) {
    const delta = (Math.sin(i / 11) * 0.4 + Math.cos(i / 27) * 0.2 + (Math.random() - 0.5) * 0.15);
    const open = current;
    const close = Number((current + delta).toFixed(2));
    const high = Number((Math.max(open, close) + 0.12).toFixed(2));
    const low = Number((Math.min(open, close) - 0.12).toFixed(2));
    const volume = Math.round(500 + Math.random() * 400);

    bars.push({
      time: origin + i * stepMs,
      open,
      high,
      low,
      close,
      volume,
    });
    current = close;
  }
  return bars;
}

/**
 * Get current instrument overview with live quotes
 */
export async function getInstruments() {
  const cacheKey = 'instruments:list';
  const cached = getCached(cacheKey, 10000); // 10s
  if (cached) return cached;

  const results = [];
  for (const [id, meta] of Object.entries(INSTRUMENT_MAP)) {
    try {
      const chart = await fetchYahooChart(meta.symbol, '1d', '5m');
      const quote = chart.meta || {};
      const price = quote.regularMarketPrice ?? meta.fallbackPrice;
      const prevClose = quote.previousClose ?? quote.chartPreviousClose ?? price;
      const change = Number((price - prevClose).toFixed(2));
      const changePercent = prevClose ? Number(((change / prevClose) * 100).toFixed(2)) : 0;

      results.push({
        id: meta.id,
        symbol: meta.symbol,
        label: meta.label,
        short: meta.short,
        price: Number(price.toFixed(2)),
        change,
        changePercent,
        high: quote.regularMarketDayHigh ? Number(quote.regularMarketDayHigh.toFixed(2)) : price + 0.5,
        low: quote.regularMarketDayLow ? Number(quote.regularMarketDayLow.toFixed(2)) : price - 0.5,
        volume: quote.regularMarketVolume || 0,
        currency: quote.currency || 'USD',
        updatedAt: quote.regularMarketTime ? new Date(quote.regularMarketTime * 1000).toISOString() : new Date().toISOString(),
      });
    } catch (err) {
      results.push({
        id: meta.id,
        symbol: meta.symbol,
        label: meta.label,
        short: meta.short,
        price: meta.fallbackPrice,
        change: 0,
        changePercent: 0,
        high: meta.fallbackPrice + 0.5,
        low: meta.fallbackPrice - 0.5,
        volume: 0,
        currency: 'USD',
        updatedAt: new Date().toISOString(),
      });
    }
  }

  setCache(cacheKey, results);
  return results;
}

/**
 * Get the Brent futures curve across prompt and forward contracts
 */
export async function getFuturesCurve() {
  const cacheKey = 'futures:curve';
  const cached = getCached(cacheKey, 10000);
  if (cached) return cached;

  const instruments = await getInstruments();
  const brentContracts = instruments.filter(
    (i) => i.id === 'brent-dec26' || i.id === 'brent-jan27' || i.id === 'brent-feb27'
  );

  const near = brentContracts[0];
  const deferred1 = brentContracts[1];
  const deferred2 = brentContracts[2];

  const spreadPrompt = near && deferred1 ? Number((near.price - deferred1.price).toFixed(2)) : 0;
  const spreadPromptFar = near && deferred2 ? Number((near.price - deferred2.price).toFixed(2)) : 0;

  const structure = spreadPrompt > 0 ? 'backwardation' : spreadPrompt < 0 ? 'contango' : 'flat';

  const curveData = {
    updatedAt: new Date().toISOString(),
    structure,
    promptSpread: spreadPrompt,
    fullSpread: spreadPromptFar,
    contracts: brentContracts,
  };

  setCache(cacheKey, curveData);
  return curveData;
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
    const isCall = type === 'call';
    return {
      delta: isCall ? (S >= K ? 1 : 0) : S <= K ? -1 : 0,
      gamma: 0,
      theta: 0,
      vega: 0,
    };
  }
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  const nd1 = standardNormalCdf(d1);
  const nd2 = standardNormalCdf(d2);
  const npd1 = standardNormalPdf(d1);

  const isCall = type === 'call';
  const delta = isCall ? nd1 : nd1 - 1;
  const gamma = npd1 / (S * sigma * Math.sqrt(T));
  const vega = (S * Math.sqrt(T) * npd1) / 100;
  const thetaYearly = isCall
    ? -(S * npd1 * sigma) / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * nd2
    : -(S * npd1 * sigma) / (2 * Math.sqrt(T)) + r * K * Math.exp(-r * T) * (1 - nd2);
  const theta = thetaYearly / 365;

  return {
    delta: Number(delta.toFixed(4)),
    gamma: Number(gamma.toFixed(4)),
    theta: Number(theta.toFixed(4)),
    vega: Number(vega.toFixed(4)),
  };
}

/**
 * Fetch options chain from Yahoo Finance (BNO or USO for Oil options)
 */
export async function getOptionsData(symbol = 'BNO', expiryDate = null) {
  const cacheKey = `options:${symbol}:${expiryDate || 'front'}`;
  const cached = getCached(cacheKey, 30000); // 30s
  if (cached) return cached;

  const { cookie, crumb } = await getCookieAndCrumb();
  let url = `https://query2.finance.yahoo.com/v7/finance/options/${encodeURIComponent(symbol)}`;
  const params = [];
  if (expiryDate) params.push(`date=${expiryDate}`);
  if (crumb) params.push(`crumb=${encodeURIComponent(crumb)}`);
  if (params.length > 0) url += `?${params.join('&')}`;

  const headers = { 'User-Agent': USER_AGENT };
  if (cookie) headers.Cookie = cookie;

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Yahoo Finance options HTTP ${res.status}`);
    const json = await res.json();
    const result = json.optionChain?.result?.[0];
    if (!result) throw new Error('No option chain in response');

    const quote = result.quote || {};
    const underlyingPrice = quote.regularMarketPrice || 67.2;
    const expirationDates = result.expirationDates || [];
    const optionsObj = result.options?.[0] || {};
    const rawCalls = optionsObj.calls || [];
    const rawPuts = optionsObj.puts || [];

    // Parse expiries
    const expiries = expirationDates.slice(0, 8).map((exp) => {
      const d = new Date(exp * 1000);
      const days = Math.max(1, Math.round((d.getTime() - Date.now()) / 86_400_000));
      return {
        id: d.toISOString().split('T')[0],
        timestamp: exp,
        label: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        underlying: symbol,
        reference: `${quote.shortName || symbol} ${d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`,
        future: Number(underlyingPrice.toFixed(2)),
        days,
      };
    });

    const currentExpiry = expiries.find((e) => e.timestamp === optionsObj.expirationDate) || expiries[0];
    const T = currentExpiry ? currentExpiry.days / 365 : 30 / 365;
    const riskFreeRate = 0.045; // ~4.5% US Treasury

    // Map strikes
    const allStrikes = Array.from(
      new Set([...rawCalls.map((c) => c.strike), ...rawPuts.map((p) => p.strike)])
    ).sort((a, b) => a - b);

    // Filter strikes near the money for UI readability
    const atmStrikes = allStrikes.filter((k) => Math.abs(k - underlyingPrice) <= underlyingPrice * 0.35);
    const strikesToUse = atmStrikes.length >= 6 ? atmStrikes : allStrikes.slice(0, 16);

    const callsMap = new Map(rawCalls.map((c) => [c.strike, c]));
    const putsMap = new Map(rawPuts.map((p) => [p.strike, p]));

    const quotes = [];
    for (const strike of strikesToUse) {
      for (const type of ['call', 'put']) {
        const raw = type === 'call' ? callsMap.get(strike) : putsMap.get(strike);
        const iv = raw?.impliedVolatility ? Number((raw.impliedVolatility * 100).toFixed(1)) : 28.5;
        const sigma = iv / 100;
        const greeks = computeGreeks(underlyingPrice, strike, T, riskFreeRate, sigma, type);

        const bid = raw?.bid != null && raw.bid > 0 ? Number(raw.bid.toFixed(2)) : null;
        const ask = raw?.ask != null && raw.ask > 0 ? Number(raw.ask.toFixed(2)) : raw?.lastPrice ? Number(raw.lastPrice.toFixed(2)) : 0.05;
        const last = raw?.lastPrice != null ? Number(raw.lastPrice.toFixed(2)) : null;
        const mark = bid != null ? Number(((bid + ask) / 2).toFixed(2)) : ask;

        quotes.push({
          type,
          strike,
          bid,
          ask,
          last,
          mark,
          iv,
          delta: greeks.delta,
          gamma: greeks.gamma,
          theta: greeks.theta,
          vega: greeks.vega,
          volume: raw?.volume || 0,
          oi: raw?.openInterest || 0,
        });
      }
    }

    const output = {
      underlying: symbol,
      underlyingPrice: Number(underlyingPrice.toFixed(2)),
      snapshot: `${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} · ${new Date().toISOString().slice(11, 16)} UTC`,
      expiries,
      currentExpiry: currentExpiry?.id || expiries[0]?.id,
      strikes: strikesToUse,
      quotes,
    };

    setCache(cacheKey, output);
    return output;
  } catch (err) {
    console.warn(`[YahooService] Options fetch error for ${symbol}:`, err.message);
    return getFallbackOptionsData(symbol);
  }
}

/**
 * High-fidelity fallback options data
 */
function getFallbackOptionsData(symbol = 'BNO') {
  const S = 67.2;
  const strikes = [58, 60, 62, 64, 66, 68, 70, 72, 74, 76];
  const expiries = [
    {
      id: '2026-11-20',
      label: '20 Nov 2026',
      underlying: symbol,
      reference: `${symbol} Nov 2026`,
      future: S,
      days: 32,
    },
    {
      id: '2026-12-18',
      label: '18 Dec 2026',
      underlying: symbol,
      reference: `${symbol} Dec 2026`,
      future: S - 0.4,
      days: 60,
    },
  ];

  const quotes = [];
  for (const strike of strikes) {
    for (const type of ['call', 'put']) {
      const dist = strike - S;
      const iv = Number((26.5 + Math.abs(dist) * 0.4).toFixed(1));
      const greeks = computeGreeks(S, strike, 32 / 365, 0.045, iv / 100, type);
      const intrinsic = type === 'call' ? Math.max(0, S - strike) : Math.max(0, strike - S);
      const timeVal = 1.4 * Math.exp(-Math.abs(dist) / 6);
      const mark = Number((intrinsic + timeVal).toFixed(2));
      const spread = 0.12;

      quotes.push({
        type,
        strike,
        bid: Number(Math.max(0.01, mark - spread / 2).toFixed(2)),
        ask: Number((mark + spread / 2).toFixed(2)),
        last: mark,
        mark,
        iv,
        delta: greeks.delta,
        gamma: greeks.gamma,
        theta: greeks.theta,
        vega: greeks.vega,
        volume: Math.round(150 + Math.random() * 200),
        oi: Math.round(1200 + strike * 25),
      });
    }
  }

  return {
    underlying: symbol,
    underlyingPrice: S,
    snapshot: `${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} · ${new Date().toISOString().slice(11, 16)} UTC`,
    expiries,
    currentExpiry: expiries[0].id,
    strikes,
    quotes,
  };
}
