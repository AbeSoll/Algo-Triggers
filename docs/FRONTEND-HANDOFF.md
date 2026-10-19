# Frontend demo handoff

Built on 19 October 2026. This is a runnable local research demo, not an operational trading service.

## Available workflows

- **Market Explorer:** three specific demo contracts; 5m/15m/1h candles or line; 1D/5D range; SMA/EMA periods; keyboard zoom; threshold/event overlays; equivalent recent-bar table; CSV export of all displayed bars. Contract and indicator settings transfer into a rule draft.
- **Futures curve:** sample listed-contract prices, correctly scaled curve, signed near-minus-far value, chronological-pair validation and contract selection.
- **Rules & Alerts:** explicit natural-language templates, visual conditions, one AND/OR group with up to three conditions, strict price/percentage/SMA/EMA comparisons, saved timeframe, cooldown and frequency. Unsupported ambiguous language explains the missing detail.
- **Saved evidence:** create, duplicate and edit as a new immutable rule version; inspect older versions; search and paginate; run/cancel historical replay; reopen the original stored report and inspect diagnostics. Reload preserves browser-local work.
- **Manual monitoring:** pause/resume and step one synthetic 5m bar. Higher-timeframe rules use only completed bars. A new activation/resume establishes a fresh boundary; pre-activation data initializes indicators but consumes neither cooldown nor one-shot state.
- **Options Lab:** eight-strike chain, expiry/side/strike filters, bid/ask/last/midpoint selection, observed quote detail, and metadata-aware premium drafts. A missing side disables midpoint selection for that quote; no silent price fallback.
- **Strategy builder:** vanilla, put spread and long-futures collar templates; signed legs; premium and Greek reconciliation; explicit underlying exposure and incompatible-structure validation.
- **IV surface:** synthetic projected 3D surface, rotation/zoom, selected observed point, quote provenance and accessible table. An interpolated visualization is not an alert input.
- **Shared behavior:** visible synthetic mode, UTC, keyboard focus, app-owned dialogs and unsaved-change confirmation, clear search, stale/unavailable demo states, storage errors, explicit reset and cross-tab conflict notice.

## Honest limits

There is no live ICE feed, real provider health check, account, server database, notification delivery provider or order execution. The synthetic futures fixture is 12–16 October 2026. Options use a separate illustrative snapshot and contract mapping, not verified exchange conventions. Option historical replay, Greek/surface alerts, strategy monitoring, calendar-spread rules, front-month/continuous mappings, nested groups, tags/folders and parameter-comparison reports remain future work. The strategy controls demonstrate exposure, not a production valuation model.

Rules, reports and events are local to this browser. History retains up to 500 events and 20 reports; the complete result remains inside each retained report. Closed browser monitoring does not continue. Client calculations use JavaScript numbers over synthetic inputs; a decimal-aware canonical server evaluator and parity tests are required before operational financial use.

The interface provides accessible semantics and automated checks for the tested flows. Automated scans do not establish complete WCAG conformance or replace assistive-technology/user testing. Native dropdown/date popup rendering follows the installed browser/OS.

## Verification evidence

See `FRONTEND-VERIFICATION.md` for final commands and actual results. Domain tests are under `src/*.test.ts`; browser journeys under `tests/`. `docs/evidence/` contains desktop/mobile images. The premium static report is `docs/premium-audit.json`.

Recommended review order: create a chart rule, run a replay, inspect an event, edit to version two, then inspect the original report. Review the option sign/price-field conventions with the trading team before selecting a data provider.

## Chart attribution

Financial chart rendering uses [TradingView Lightweight Charts](https://github.com/tradingview/lightweight-charts), Apache-2.0. Its chart attribution logo/link remains enabled. Charts do not supply data. Dependency licenses remain available in each installed package and should be reviewed before redistribution/deployment.
