# Market-data provenance and availability

This update separates observed Yahoo snapshots from explicit demo samples. It does not connect rule evaluation or production monitoring to observed prices.

## Data behavior

- **Yahoo snapshots** is the default display mode. Failure shows an unavailable state and retry action. It never generates substitute prices, bars, volume, IV or Greeks.
- **Demo samples** is selected explicitly and persists as a display preference. Existing deterministic fixtures support the original research workflows.
- Each observed resource reports source, status, provider observation time, actual fetch time and unverified delay. Cached data keeps its original fetch time. Quote age is informational; market sessions and a freshness SLA are not inferred.
- Fixed contract mappings request matching listed symbols, including `BZZ26.NYM` for December 2026; `BZ=F` cannot stand in for that fixed contract. Unavailable symbols remain unavailable. Each futures-curve point shows its own quote time.
- Missing or inconsistent OHLC bars are omitted rather than forward-filled. Adapter prices keep source precision; missing volume remains null. CSV exports include provenance.
- BNO/USO are fund-option contexts, with USD/share units. An expiry change clears actionable quotes, cancels superseded work and requests that exact expiry. Wrong-expiry responses are rejected. Midpoint requires valid bid and ask; missing fields never borrow another price field.
- Underlying quote time and option last-trade time are distinguished. Bid/ask observation times are not supplied by the selected endpoint.
- Yahoo Greeks are unavailable without a verified model. Supplied IV can be inspected for the selected expiry. The multi-expiry mesh is demo-only; no term structure is fabricated from a single chain.
- Source changes initialize the appropriate strategy dataset. Switching views or refreshing the same source preserves strategy edits. Option drafts preserve actual fund, side, strike, expiry, field, threshold precision and units through reload.

## Verification and boundaries

The provider tests mock network observations to verify failure, missing values, precision, cache timestamps, exact expiry requests and health-status semantics. Browser tests separately exercise explicit demo mode and mocked Yahoo-mode success, loading, unavailable, retry, stale-response protection, persistence, range/export behavior, accessibility and narrow layout. External provider uptime, exchange latency, licensing and the correctness of vendor observations are not certified by these tests.

The development Vite server mounts `/api`; the standalone API defaults to loopback port 3001. A static production build needs a same-origin API route. Rules, reports and monitoring remain browser-local; all replay and monitoring evidence uses synthetic samples. Historical option replay, production notification delivery and a licensed exchange feed remain outside this change.
