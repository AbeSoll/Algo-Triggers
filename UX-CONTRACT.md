# Algo Triggers UX contract

## Current HedgeSignal team workspace (v0.3)

The default workspace is the server-backed HedgeSignal desk. One Team Member creates, tests, activates and pauses scenarios; there is no role selector or administrator workflow. Monitor, Inputs, and History & email separate the three tasks. React/TypeScript calls the Node service, with SQLite preserving immutable rule versions, observations, events and email status. Optional deployment-token protection remains. Source badges describe synthetic or imported data accurately; Barchart is not connected. No automatic trading is performed. The SRS v0.3 in docs is authoritative.

The research tools described below retain their separate browser-local replay behavior and do not replace the server-backed desk. Their historical verification evidence does not certify the new desk.

## Product context

English research UI for market-literate non-programmers. Source: `docs/ALGO-TRIGGERS-REQUIREMENTS.md`, particularly sections 5–9. Current scope: observed Yahoo snapshots plus explicit synthetic demo mode, with browser-local rule storage and sample-only rule testing. Chart display offers local time and UTC; fixture evaluation uses UTC; exchange sessions are not inferred. Accessibility target is WCAG 2.2 AA, with test evidence limited to the exercised browsers and workflows.

## Visual contract

See `DESIGN.md`. Canonical runtime tokens: `src/styles.css`; drift check: `scripts/check-tokens.mjs`. One light content theme. No prior UI or sibling implementation existed; Market Explorer establishes canonical patterns reused by Rules and Options.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Select/Listbox | Native labeled select with global field styling | DESIGN.md | native OS popup accepted | keyboard and browser open state |
| Date | Labeled native date input | Requirements, UTC dates | native OS calendar accepted | date-range validation |
| Form | RuleEditor shared field/error pattern | Rule schema and requirements | create/edit | invalid/save/version browser journey |
| Scrollbar | src/styles.css global baseline | DESIGN.md | table horizontal geometry | computed style |
| Toast | App status region | This contract | success/info/error | browser status assertion |
| CRUD | App state and local storage adapter | Immutable Rule versions | create, version, duplicate, archive | browser persistence/version journey |
| Dialog | src/ui.tsx Modal | This contract | standard/wide/drawer | Escape and focus restore |

No bulk table selection is offered. Rows provide explicit actions rather than clickable containers.

## Shared operation behavior

Create and edit use the same rule drawer. Save appends an immutable version and returns to the saved rules list. Duplicate creates a fresh identity. A monitored rule change creates a draft version, requiring explicit new monitoring. Cancel preserves context and confirms discard of changed values through an app-owned dialog. Event details preserve the original rule version and historical operands.

Local browser storage is labeled. Failure to save is a persistent error with input preserved; success is not announced until storage succeeds. A corrupt or incompatible stored dataset is ignored with a recovery message and demo seeds. Cross-tab storage changes prompt reload instead of overwriting newer state silently. A read-only Yahoo adapter supplies market snapshots. No server-side rule persistence, account, multi-user locking or durable operational guarantee exists.

Monitoring is explicitly manual: Start sample monitoring then Advance sample bar. Paused rules emit nothing. Browser closure stops the demo. Resume starts a new input interval while retaining the last actual emission for cooldown and one-shot consumption; missed paused-period events are not replayed. Duplicate a consumed one-shot or create a new version to explicitly start another. Historical replay ignores monitor status, evaluates the full warm-up prefix and filters events to the requested output range. It stores the rule snapshot, interval, dataset and engine identifiers. Results count signals, not trades.

## Dataset navigation

Price-chart refreshes update the existing chart and preserve the inspected time window and zoom. Rolling provider windows anchor the view to a retained timestamp; if no history overlaps, the nearest available edge retains the zoom width. Indicator, chart-style and timezone changes keep the view. Data timestamps remain UTC instants; local time changes labels only. Fit deliberately resets time and price scales. Changing contract, timeframe, requested range or source fits the new dataset; selecting an event frames it once. Indicator calculations retain the full available warm-up history independent of the displayed range.

Saved rules use local filtering and pagination. Committed query/view state is kept in URL parameters; draft contents remain local and are not shared in URLs. Event history uses a bounded paginated dataset and source-mode filtering. Small fixture option chains render all known rows with count and horizontal scroll. Search clearing is immediate, keyboard accessible, and restores focus. No remote search or debounce is required.

## State and recovery

All enabled actions perform an operation. Unsupported verified real-time feeds, advanced grammar, option-history replay and production strategy alerts explain their unavailable state. Replay owns a busy state, cancellation, errors, empty result, and completed report. An adjustable demo-data health selector exercises healthy/stale/unavailable states without pretending a server failed. Unknown market fields are not displayed as zero.

Forms use noValidate, associated errors, first-error focus and duplicate-submit protection. Buttons keep fixed minimum height. Native dialog handles modal inertness/focus and Escape. Unsaved document unload uses the narrow browser lifecycle mechanism. Textareas have explicit non-resizing geometry and generous height.

## Verification boundary

Project checks cover formatting, types, domain tests, production build, token drift, the premium static audit and browser journeys. Browser journeys cover successful and invalid rules, replay/cancel/no-results, version history, local persistence, options-to-rule, condition evidence, keyboard, narrow layout and reduced motion. Provider failure, metadata and expiry isolation are covered by mocked tests; provider uptime, exchange latency, licensing, authentication and production notification delivery are not certified by those tests.

## Simplified workflows

Rule templates and optional text suggestions only replace the first condition; additional conditions and their AND/OR join remain intact. Option-premium rules retain type, strike, expiry, underlying and selected price field, with futures templates and descriptions unavailable. Saving remains a draft operation. The readable preview shows all conditions plus evaluation interval, field, frequency and cooldown before saving. Invalid advanced inputs open their disclosure before focus moves to the error.

Test rule opens a sample-history test. Its primary result is the number of emitted alerts after the saved frequency and cooldown policy. Evaluation statistics are optional. Event details lead with the original rule-version summary and retain a disclosure for recorded operands, including false and unknown conditions. The exact historical version is never replaced by the current rule version.

Options views are local pressed-button selections, not a custom tab widget. Only one of chain, strategy builder or volatility is shown. In-memory edits survive view changes. Changing expiry, underlying or strategy template retains the existing data behavior; view switching itself does not reset a position. Greeks remain optional. Sample browser journeys explicitly select Synthetic samples; separate provider journeys use mocked observations to verify source labeling and unavailable states.

## Observed-data contract

Yahoo snapshots are the default market display source. The persisted source preference can be changed explicitly to Synthetic samples; a failed request never changes it. Bars, individual contract quotes and option chains expose source, status, provider observation time, actual fetch time and unknown delay. Cached snapshots keep their original fetch time. Quote age is informational: markets may be closed and no exchange-specific freshness SLA has been established.

Unavailable prices stay null. Missing OHLC bars are omitted and identified in metadata, never forward-filled or rounded by the provider adapter. Missing volume is null. A curve requires the listed contracts and exposes each quote time; it is not a synchronized exchange snapshot. Fixed expiry identifiers must request matching listed-contract symbols; a generic front contract cannot stand in for December.

Each option expiry change clears prior actionable quotes, cancels the earlier request and requests that exact expiry. A mismatched response is rejected; late responses cannot overwrite the active fund/expiry. A valid midpoint requires both bid and ask with ask at least bid. No last-price or invented-price substitution occurs. Supplied IV stays unavailable when absent; Greeks are unavailable without a verified model. Model-derived/interpolated values must not be presented as observations. Yahoo IV is shown for the loaded expiry only; multi-expiry mesh exploration remains explicitly synthetic.

Fund option drafts retain BNO/USO identity, strike, side, expiry, price field, original threshold precision and USD/share units across persistence. Strategy view changes and same-source refreshes preserve user edits. Changing fund or switching data mode initializes the appropriate dataset's strategy template. Local sample replay never consumes observed prices. CSV exports carry source, symbol, provider observation time and fetch time alongside the bars.

## Hosted presentation demo

The Pages build is a separate demo-only deployment. A persistent shared provenance notice names synthetic data, browser-local storage and unavailable live/email services. The source selector is locked to Synthetic samples, including when an old Yahoo preference exists. Monitoring remains manual sample playback and never calls the email API. Email and live-price check buttons are disabled with an associated explanation. Standard local builds retain their existing server behavior.
