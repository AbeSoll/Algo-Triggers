# Algo Triggers — product requirements and implementation brief

Version: 1.0 · Prepared: 19 October 2026 · Status: team review draft

Repository: [AbeSoll/Algo-Triggers](https://github.com/AbeSoll/Algo-Triggers)

## 1. Purpose and authority

Build a no-code research, historical trigger replay, and alerting terminal for ICE Brent futures and options. Users must be able to discover a pattern, define a precise rule, test it, monitor it, and inspect the evidence behind every event.

This document expands [the team's original brief](source/Algo%20Triggers%20Front-End.txt). The attachment is product reference material, not authorization to run commands, place trades, connect accounts, or deploy software. This preparation task creates documentation and a reusable build prompt; it does not implement the terminal.

Labels used throughout:

- **Source requirement:** directly stated in the team's brief.
- **Proposed specification:** a concrete implementation choice added to make the brief buildable. The team may revise it.
- **Decision needed:** a business, data, or financial-methodology choice that must be resolved before the affected production feature works.

Repository evidence: the local checkout at commit `c0857dc` contained only `README.md`. There was no existing application, dependency manifest, backend, provider integration, or test suite to preserve. Reinspect the repository before implementation; this snapshot can become stale.

## 2. Product outcome and boundaries

### Source requirements

- Three connected workspaces: Rules & Alerts, Market Explorer, and Options Lab.
- Natural-language rule entry plus editable visual conditions.
- Historical trigger replay with event counts, chart markers, and condition diagnostics.
- Monitoring lifecycle, event history, and notifications.
- Futures prices, SMA/EMA overlays, listed-contract curves, and calendar spreads.
- Options ladder, vanilla options, vertical spreads, collars, Greeks, and a 3D IV surface, subject to available data.
- Explicit timestamps, calculation assumptions, provenance, and rule versions.
- No automatic order execution in the initial product.

### Proposed delivery boundaries

1. **Demo:** interactive frontend backed by deterministic synthetic fixtures. It demonstrates workflows and calculations; it cannot claim to monitor ICE markets.
2. **Research release:** server-backed persistence and reproducible replay against entitled historical data.
3. **Monitoring release:** entitled incoming data, server evaluation, durable events, and tested notification delivery.
4. **Options completion:** licensed option-level coverage and verified conventions for IV, Greeks, strategy valuation, and surfaces.

Demo completion must never be reported as production completion. A demo may offer “Start demo monitoring”; the production “Activate monitoring” action remains unavailable until its dependencies pass readiness checks.

### Explicitly outside the initial scope

- Order routing, brokerage connections, execution, and position management.
- Profitability claims or return metrics inferred from alert frequency.
- Portfolio optimization and full trade simulation.
- Arbitrary user code, generated Python, or executable natural-language output.
- Advanced nested rule logic beyond the agreed first-release limits.
- Invented market-data entitlements, contract specifications, or options history.

## 3. Users and connected journeys

Primary user: a market-literate Brent trader or analyst who does not program. Proposed secondary user: a reviewer who inspects methodology and event evidence. Roles and permissions are not specified in the source.

### Journey A — futures price rule

1. Select a specific futures contract and timeframe in Market Explorer.
2. Inspect candles, volume if available, and two moving averages.
3. Select a chart threshold or indicator, then choose “Create rule.”
4. Review prefilled instrument, price field, periods, and timeframe.
5. Configure crossing semantics, evaluation timing, trigger policy, and cooldown.
6. Save a draft and validate it.
7. Select a date range and run historical trigger replay.
8. Open an event; the chart and diagnostics show the exact evidence used.
9. Activate entitled monitoring or explicitly labeled demo monitoring.
10. Pause, revise, and retest without changing older evidence.

### Journey B — options premium rule

1. Select the option expiry and its actual underlying futures reference.
2. Inspect calls and puts around selected strikes.
3. Select one option and choose bid, ask, last, or a supported defined mark.
4. Create a premium or Greek threshold rule.
5. Review quote age, units, calculation source, and available history.
6. Replay only when suitable historical option-level data exists.
7. Monitor only when the required current fields and entitlements exist.

### Journey C — strategy and curve research

Create a calendar spread from two listed contracts, or a vertical/collar from explicit legs. Show the signed formula, timestamps, and inputs. Carry this complete context into a rule. Never replace a strategy value with a single-leg price.

## 4. Release scope and source conflicts

The source's detailed sections describe a broad target. Its MVP table postpones some capabilities that earlier sections describe without a release boundary. Preserve the target while delivering it in stages.

| Capability | First runnable demo | First operational release | Later target |
|---|---|---|---|
| Visual builder and readable summary | Functional fixtures | Validated server schema | Deeper groups and advanced conditions |
| Natural-language input | Explicit supported templates; clarify ambiguity | Parser with schema validation and review | Broader language support |
| Futures rules | Levels, percentage change, SMA/EMA crossing | Entitled data and shared evaluation semantics | High/low, volume, slope, complex combinations |
| Replay | Real deterministic evaluation on fixtures | Versioned historical datasets | Trade simulation and portfolio metrics |
| Saved rules and events | Local demo persistence | Durable server persistence | Rich comparisons and organization |
| Price chart | Candles/line, averages, thresholds, events | Provider-backed data | Bar-by-bar replay tools |
| Futures curve | Synthetic listed expiries and signed spread | Entitled snapshots and basic spread rules | Historical overlays and curve analytics |
| Options ladder | Synthetic chain, field labels, basic metrics | Supported current option data | Advanced filters |
| Strategy builder | Explicit vanilla, vertical and collar legs | Supported valuations and rule evaluation | More structures and scenarios |
| IV surface | Synthetic 3D points with table fallback | Reliable supplied/calculated IV | Historical comparisons, skew/term alerts |
| Notifications | In-app demo events | In-app plus an agreed delivery channel | Routing and more channels |

**Decision needed:** the source body allows a first-version historical curve overlay, while its MVP table defers historical curve analytics. This proposal defers historical overlays beyond the first demo; confirm before declaring the team's MVP complete. Advanced surface rules and full trade simulation are explicitly later work in the source.

## 5. Shared workspace and UI requirements

### Proposed workspace model

The selected context contains instrument/strategy ID, contract expiry, timeframe, visible date range, snapshot/as-of time, data mode, and display timezone. It is shared across relevant panels. A control must explain when it cannot apply to the newly selected instrument.

- Large desktop: three coordinated resizable workspaces where practical.
- Smaller screens: tabs or a stacked layout, preserving context and unsaved drafts.
- Events link to rule version, contract, timestamp, and diagnostics, including after refresh.
- Preserve chart preferences on a compatible contract switch; clear incompatible option/strategy selections explicitly.
- Protect unsaved changes before replacing a draft from another panel.
- Store instants in UTC; display a named timezone. User-local time is a display preference, not the exchange session calendar.
- Separate **mode** (demo/historical/simulated/live) from **quality** (real-time/delayed/stale/unavailable).
- Show provider, last data time, observed age, and market-session status. An open screen is not evidence of a healthy feed.

### UI behavior baseline

Use dense, readable trading tables, tabular numbers, explicit USD/bbl and Greek units, visible focus, and color plus text/icons. Defaults should reveal core fields first; advanced parameters use disclosures.

Every data view needs loading, empty, partial, stale, unavailable, and failed states. Every save or run needs a busy state, duplicate-submit protection, actionable errors, and preserved inputs. An unavailable metric is `Unavailable` or an em dash with a reason, never zero.

Charts need keyboard-accessible controls and a table or textual equivalent. The surface requires a useful fallback when WebGL is unavailable. Aim for WCAG 2.2 AA; verify the actual implemented flows.

## 6. Functional requirements and acceptance criteria

Priority: **P0** core futures journey and truthful data handling; **P1** remaining initial-product modules; **P2** later enhancements. These priorities are proposed scheduling, not removal of source requirements.

### Rules & Alerts

| ID | Priority | Required behavior | Acceptance evidence |
|---|---|---|---|
| RB-01 | P0 | Select specific expiry, front-month mapping, or continuous series with relevant metadata | Selection shows identity, expiry, available fields, mode, and mapping policy |
| RB-02 | P0 | Convert supported natural-language input to editable structured rules | “Brent rises 2%” requests a reference and interval before saving a valid rule |
| RB-03 | P0 | Construct price level, percentage move, and SMA/EMA conditions | Summary and evaluator consume the same structured representation |
| RB-04 | P0 | Combine conditions with visible AND/OR | First version supports a single explicit group; unsupported nested input is rejected, never flattened silently |
| RB-05 | P0 | Configure timeframe, update/bar-close timing, frequency, reset, and cooldown | Preview states all settings and validation blocks incompatible choices |
| RB-06 | P1 | Add option, strategy, spread and supported technical conditions | Each condition exposes field, unit, source, and required coverage |
| SR-01 | P0 | Save, search, edit, duplicate, tag, validate, pause and disable rules | Duplicate creates a new identity; edit creates a new immutable version |
| SR-02 | P0 | Preserve version history and results | Opening an older run shows the older expression and settings |
| SR-03 | P1 | Compare parameter variants | Variants retain independent settings and test provenance |
| BT-01 | P0 | Run historical trigger replay for a valid rule version and date range | Progress, cancellation, no-results, and failures work; no canned counts |
| BT-02 | P0 | Report triggers, event-period percentage, mean gap and distribution | Definitions and denominators match section 8 |
| BT-03 | P0 | Show timeline, markers and full condition evidence | Event opens the matching contract, bar and rule version |
| BT-04 | P0 | Store reproducibility metadata and disclose coverage | Same inputs and engine version reproduce the same event set |
| BT-05 | P2 | Simulate trades only with explicit execution assumptions | Return metrics are absent from alert-only replay |
| EV-01 | P0 | Record historical/demo/live event evidence | Event includes rule version, input times, field values, threshold and final truth result |
| EV-02 | P0 | Filter by date, instrument, rule, type and delivery status | Filters persist across opening and closing a detail view |
| EV-03 | P0 | Pause/resume monitoring and track notifications separately | A failed delivery does not remove or duplicate the detected event |

### Market Explorer

| ID | Priority | Required behavior | Acceptance evidence |
|---|---|---|---|
| ME-01 | P0 | Candles or line; contract, range and timeframe controls; pan/zoom | Visible data and timestamps match selected context |
| ME-02 | P0 | Multiple SMA/EMA overlays with period and input field | Tooltip values equal the rule engine's values on the same data |
| ME-03 | P0 | Thresholds and event markers; create rule from chart | Chart action prefills exact contract, field, timeframe and indicator settings |
| ME-04 | P0 | Historical inspection and event navigation | Future data cannot change an earlier bar's diagnostic result |
| FC-01 | P1 | Plot listed-expiry prices at a selected as-of time | Each point identifies its contract and own quote time |
| FC-02 | P1 | Select two contracts and inspect their signed spread | Formula and leg prices remain visible in the rule draft |
| FC-03 | P1 | Explain contango/backwardation for the selected segment | A mixed curve is not forced into one misleading global label |
| FC-04 | P2 | Compare historical snapshots | Missing contracts and unequal quote ages are visible |

### Options Lab

| ID | Priority | Required behavior | Acceptance evidence |
|---|---|---|---|
| OL-01 | P1 | Calls left, strikes center, puts right; expiry/strike/type filters | Selected option shows its actual underlying futures contract |
| OL-02 | P1 | Bid, ask, last, spread, IV, delta/gamma/theta/vega; optional volume/OI | Missing, stale and unsupported fields are labeled independently |
| OL-03 | P1 | Create a rule from an option row and selected price field | A last-price rule never falls back silently to bid or midpoint |
| ST-01 | P1 | Add/remove signed legs with contract, type, strike, expiry, quantity | Summary describes long/short, units and every leg |
| ST-02 | P1 | Support vanilla, vertical and collar templates | Invalid verticals fail validation; collar underlying exposure is explicit |
| ST-03 | P1 | Aggregate supported premium and Greeks | Breakdown reconciles to each signed leg; incompatible units are blocked |
| VS-01 | P1 | 3D IV surface: strike/moneyness, time to expiry, IV | Rotate/zoom/hover works; timestamp and input quality remain visible |
| VS-02 | P1 | Underlying, snapshot, expiry filters and point inspection | Points link to source quotes; sparse gaps are disclosed |
| VS-03 | P1 | Explain skew, smile and term structure | Help describes the displayed method without claiming a market conclusion |
| VS-04 | P2 | Compare snapshots and create surface-spread rules | Quote selection and synchronization methodology are recorded |

## 7. Precise rule semantics — proposed contract

The source requires transparent calculations but leaves important formulas open. The following is a proposed testable baseline. Demo calculations may use it now; production activation must retain explicit settings and agreed methodology.

### Price and crossing operators

For current value `x[t]`, prior eligible value `x[t-1]`, and a threshold/series `y`:

- Above: `x[t] > y[t]`; below: `x[t] < y[t]`.
- Crosses above: `x[t-1] <= y[t-1] AND x[t] > y[t]`.
- Crosses below: `x[t-1] >= y[t-1] AND x[t] < y[t]`.
- An absent prior eligible observation cannot establish a crossing.
- Equality is not strictly above/below. Inclusive comparisons require separate named operators.
- Evaluate on unrounded source values. Round for display only. If displayed values obscure a crossing, offer more precision.
- “Close above” evaluates completed bars. Tick mode cannot be reconstructed from OHLC bars.

### Percentage and rolling changes

Use `100 * (current - reference) / reference` for an explicitly chosen positive reference. A zero, missing, or nonpositive reference makes this percentage operator unavailable under the proposed convention; use absolute change or an agreed alternative. Never divide silently.

“Falls more than 2%” means change `< -2`, not `<= -2`. A percent change over one hour must identify the same-series reference at/before `t - 1 hour`, within a configured tolerance. Missing coverage yields `unknown`; it must not silently become “since the last available quote.” Session-close references use the selected exchange session definition.

### Indicators

- SMA(N): arithmetic mean of N eligible completed input bars, including the current eligible bar.
- EMA(N): `alpha = 2/(N+1)`; seed with the first N-bar SMA; update recursively using eligible bars. Record the initialization range because it affects results.
- No value before warm-up completes. Fetch pre-range bars to initialize indicators; count only events in the requested output range.
- Periods refer to bars, not calendar days. “20-day SMA” requires the agreed daily session bars.
- Price-versus-MA percentage difference uses `100 * (price - MA) / MA` only for a valid positive MA.
- Future high/low rules compare against the prior N eligible bars, excluding the current bar; define ties explicitly.
- Volume, slope and direction rules remain unsupported until their units, lookback and calculation are specified.

### Conditions and frequency

Use three-valued truth: true, false, unknown. For AND, false dominates; otherwise an unknown input makes the group unknown. For OR, true dominates; otherwise an unknown input makes the group unknown. Only a true final group can trigger. Record which unavailable inputs did or did not affect the final result.

Keep predicate truth separate from event emission:

- **Once per crossing:** emit when the crossing predicate becomes true; rearm after it is false. For a mixed group, define event emission on group false-to-true transitions and require valid prior state.
- **Once per bar:** at most one event per rule version and bar ID, even when multiple updates satisfy the rule.
- **Repeat while true:** emit on eligible evaluations while true, subject to cooldown and deduplication. Do not enable without a clear frequency bound.
- **One-shot:** after the first emission, require explicit reset before further events.
- Cooldown permits the next event when `current_event_time - last_emitted_time >= cooldown`. Suppressed events do not advance this timestamp. Define event-time ordering before supporting late data.
- New activation establishes state from valid observations; it must not fabricate a prior crossing.
- Paused rules emit nothing. Resume does not silently replay missed live events. Explicit catch-up is separate and labeled historical.
- Settings omitted from natural language are exposed as unresolved fields or visible draft defaults. Material trading parameters cannot be silently assumed.

### Market-data quality

Each field has source time, receipt time, provenance, and quality. A configured stale/unsynchronized input yields unknown for predicates that need it. Never replace missing values with zero, forward-fill beyond a declared tolerance, or silently change price fields.

Normalize and deduplicate series by stable identifiers. Define out-of-order and correction handling, market-session gaps, expiry behavior, and recovery before enabling a production feed. A feed recovery must not emit duplicate notifications for an already stored event.

## 8. Replay and audit contract

### Required stored inputs

Rule ID/version/hash; canonical condition tree; resolved contract mappings; provider and immutable dataset revision/checksum; start/end; warm-up interval; timezone/session calendar; price fields; bar definition; indicator methods; evaluation mode; frequency/reset/cooldown; missing/stale policy; engine version; run timestamps; coverage report; warnings; and final run status.

### Summary metric definitions

- Trigger count: emitted events after trigger policy, cooldown and deduplication.
- Trigger-period percentage: eligible periods containing at least one emitted event divided by eligible periods, multiplied by 100. Disclose total periods, eligible periods, excluded periods and exclusion reasons. This is not an evaluation-update percentage.
- Average time between events: arithmetic mean of consecutive event-time gaps after sorting emitted events. Fewer than two events gives unavailable.
- Distribution: event counts by displayed session/day/hour, with timezone stated.
- No total return, drawdown, win rate or profit/loss in alert-only runs.

### Causality and evidence

Use data available at or before each evaluation time. A bar's final high/low/close cannot be used before that bar closes. When historical point-in-time availability is unknown, disclose that the dataset is a revised snapshot rather than claiming exact historical observability.

Run details show every condition, operands, thresholds, units, timestamps, quality, warm-up state, group result, and emission/suppression reason. Canceled or failed runs cannot appear as completed reports. Editing a rule never changes a stored report or emitted event.

## 9. Futures and options conventions

### Futures

Specific contracts, front-month mappings and continuous series are separate instrument types. Resolve front-month at each evaluation time using a versioned roll policy. Record the actual constituent contract on every event. Continuous-series stitching and adjustment methods are named and versioned; the series is not itself a tradable contract.

Proposed first operational scope: specific contracts first. Front-month and continuous-series production activation is gated on agreed roll methodology. Do not silently extend the last contract after expiry.

For a selected calendar spread define `near_price - far_price`, USD/bbl, with the exact two contracts and quote synchronization tolerance. A positive result indicates backwardation for that pair; a negative result indicates contango. “Widens” is ambiguous for signed spreads: request signed increase/decrease or absolute magnitude.

### Options and strategies

- Obtain authoritative contract-to-underlying mapping, exercise style, multiplier, tick size and expiry/calendar conventions from the provider/exchange. The brief does not establish them.
- Bid-ask spread is `ask - bid`; crossed quotes are invalid for an ordinary midpoint mark. Missing one side means midpoint is unavailable.
- A proposed midpoint mark is `(bid + ask)/2` only when both sides are valid and fresh. Alternative marks need a named policy.
- IV and Greeks may be vendor supplied or model calculated. Record origin, model/version, futures reference, input quote, rates, time convention, expiry and computation time. Never present a model output as an observed quote.
- Do not choose an options model merely because it is familiar. Confirm exercise style and valuation convention first.
- IV 35% to 36% is +1 volatility point; relative change is approximately +2.857%. Store units and use separate operators.
- Signed quantity is positive for long and negative for short. Preserve position signs through aggregation.
- Strategy unit premium: sum of signed quantity times leg premium, only for compatible quantities and price units. Cash premium additionally applies the correct leg multiplier. Show these as distinct values.
- Positive signed premium denotes a debit to establish the displayed position; negative denotes credit under this proposal. The marked position value and the entry cashflow sign must be labeled separately.
- Net Greek: sum of signed quantity times each Greek after normalizing its documented units and multiplier basis. Display a leg breakdown. Theta requires a time unit; vega requires per-volatility-point versus per-unit-volatility labeling.
- A vertical requires the same option type, expiry, underlying reference and compatible contract units, with distinct strikes. Template ratios are validated, not inferred.
- A collar must include the underlying position/exposure plus explicit put and call legs. Show the underlying separately from option-only premium and include it where appropriate in net exposure. Do not assume spot physical oil and a futures position are interchangeable.
- There is no default “strategy IV” obtained by adding or averaging leg IVs. Rules must target a specified leg or a separately defined supported measure.
- Surface moneyness requires a named formula and the correct underlying reference for each expiry; proposed display is `strike / futures_reference`. Time to expiry requires a recorded day-count/time basis.
- Observed surface points and interpolated mesh are visibly distinct. Interpolation is for visualization unless a rule explicitly records its methodology. Missing or invalid IV is a hole, not zero.
- Do not synthesize historical option evidence from futures bars. Missing option-level history disables the affected replay with a reason.

## 10. Proposed architecture and data contracts

These are recommendations for an empty repository, not choices made by the team. Before installation, confirm compatibility and current APIs using official documentation/Context7. Pin dependency versions and commit a lockfile; do not invent version numbers in advance.

### Frontend-first prototype

- React + TypeScript + Vite for a straightforward interactive client without an unneeded server-rendering dependency.
- A maintained accessible component system for forms, tabs, dialogs and lists; a centralized theme and shared interaction primitives.
- Lightweight Charts as a candidate for price/indicator/event charts; evaluate its required attribution/license. It is a visualization component, not an entitled market-data feed or an alert engine.
- A separate maintained chart library for curve plots and a WebGL-capable library for the 3D surface, loaded only when needed and with a table fallback. Verify licensing and bundle cost before selection.
- A typed adapter interface with separate fixture and server implementations. No component contains provider credentials or hardcoded market results.
- Deterministic demo fixtures and real local calculations for the supported rule subset. Clearly label demo persistence and allow reset.

### Operational evolution

- A Python service is a proposed option for canonical research/evaluation, with typed schemas and decimal-aware financial values. FastAPI is a candidate, not a required source technology.
- Use a transactional server database for shared rules, immutable versions, runs, events and delivery attempts. Select PostgreSQL for a concurrent team service; SQLite is suitable only for a constrained local prototype with documented limits.
- Run live evaluation and long historical jobs in server workers. Closing the browser must not stop operational monitoring.
- Choose one canonical operational evaluator; any frontend preview must pass parity fixtures before it is described as equivalent. Keep a documented shared schema and engine version.
- Separate market-data ingestion, evaluation, event storage and notification delivery. Persist the event before attempting delivery.
- Verify access rights, user ownership, secret management, allowed origins, quotas, retries and audit retention before a shared deployment. Roles and hosting remain team decisions.

### Minimum entities

| Entity | Minimum content |
|---|---|
| Instrument | Stable ID, category, exchange/provider IDs, expiry, currency, units, futures reference and contract metadata |
| SeriesDefinition | Specific/front-month/continuous type, mapping/roll/adjustment policy and version |
| Observation | Instrument, field values, event/receipt times, source, mode, quality, dataset revision |
| Rule | Stable identity, name, tags, owner if applicable, current draft/version references |
| RuleVersion | Immutable expression, inputs, evaluation/trigger settings, hash, creation time |
| Monitor | Rule version, resolved input selection, lifecycle, last health/state, activation interval |
| BacktestRun | Rule version, dataset, interval, settings, engine, coverage, lifecycle and metrics |
| TriggerEvent | Stable idempotency key, rule version, monitor/run, event time, contract, diagnostics and mode |
| DeliveryAttempt | Event, channel, attempt number, queued/sent/delivered/failed, provider status and retry time |
| Strategy | Versioned signed legs, underlying exposure, units and valuation policy |
| SurfaceSnapshot | As-of time, constituent quotes, calculation method and interpolation metadata |

Proposed rule statuses: draft, valid, invalid, archived. Monitoring is a separate lifecycle: inactive, monitoring, paused, degraded, disabled. Backtest state is separate: queued, running, completed, failed, canceled. “Backtested” is evidence on a version, not a replacement for monitoring status.

### Illustrative rule payload

The instrument ID below is a demo ID, not an asserted exchange symbol. Unresolved market-methodology values must be filled before operational activation.

```json
{
  "schemaVersion": 1,
  "ruleId": "demo-rule-001",
  "version": 1,
  "name": "Brent price crossing",
  "instrument": { "kind": "specific_future", "id": "demo-brent-2026-12" },
  "dataMode": "demo",
  "expression": {
    "kind": "group",
    "operator": "AND",
    "conditions": [{
      "id": "condition-1",
      "kind": "comparison",
      "left": { "metric": "price", "field": "close", "unit": "USD/bbl" },
      "operator": "crosses_above",
      "right": { "constant": "85.00", "unit": "USD/bbl" }
    }]
  },
  "evaluation": {
    "timeframe": "5m",
    "timing": "bar_close",
    "displayTimezone": "UTC",
    "sessionCalendarId": "demo-calendar-v1",
    "missingData": "unknown"
  },
  "trigger": {
    "frequency": "once_per_crossing",
    "reset": "after_false",
    "cooldownSeconds": 300
  },
  "actions": [{ "type": "record_event" }, { "type": "in_app_notification" }]
}
```

Price/threshold decimals are transported as strings in this proposal; validate and compare with a consistent decimal policy. Do not use formatted display text as a calculation input.

### Suggested operational API boundary

This is a proposed contract outline, not implemented endpoints. Define request/response schemas, pagination, errors and ownership in the backend phase.

| Operation | Proposed resource |
|---|---|
| Discover contracts and capabilities | `GET /api/instruments`, `GET /api/capabilities` |
| Fetch bars, curve, chain and surface | `GET /api/market/bars`, `/curve`, `/options`, `/surface` |
| Propose a rule without activating it | `POST /api/rule-proposals` |
| Save rule version, validate and read | `/api/rules`, `/api/rules/{id}/versions`, `/api/rule-versions/{id}/validation` |
| Start/read/cancel replay | `/api/backtests`, `/api/backtests/{id}`, `/api/backtests/{id}/cancel` |
| Activate/pause/resume/disable monitor | `/api/monitors` and explicit lifecycle action endpoints |
| Filter events and inspect evidence | `GET /api/events`, `GET /api/events/{id}` |

Mutating operations need idempotency where retries could duplicate work. Version-sensitive edits need conflict detection. Validation errors must identify the affected field and a correction. Stream/poll job and feed status only through a defined contract.

## 11. Natural-language safety and clarity

Natural language is a rule proposal interface, never direct executable code. A deterministic parser is acceptable for explicitly supported demo templates. Unsupported text must remain editable and explain its limits.

For an LLM-assisted parser, use a strict allowlisted schema, validate units/operators/instruments, reject extraneous actions, and show unresolved fields. The user reviews the complete rule before saving or activating it. Do not execute generated expressions with `eval`, send secrets to a model, or allow the parser to expand into trade execution.

Examples that require clarification: “Brent rises 2%” (reference and interval); “alert on the 20/50 crossover” (direction, SMA/EMA and timeframe); “put hits $2” (contract, bid/ask/last/mark, crossing or standing state); “IV jumps 2%” (volatility points or relative percentage); “spread widens” (signed or absolute change).

## 12. Implementation phases and completion gates

These gates belong to the later build workflow. This documentation task does not launch implementation.

### Phase 0 — inspect and plan

Read current instructions, repository, source, this brief and plugin/skill availability. Record source conflicts and decisions in `docs/DECISIONS.md`; create an execution plan, design direction and test matrix. Preserve existing work. Proceed with explicit demo assumptions while data/production questions remain open. Gate: reviewable plan and design proposal, no application implementation yet.

### Phase 1 — connected frontend demo

Build all three workspaces using synthetic deterministic data, shared context, save/duplicate/version behavior, basic template parsing, functional futures replay, event diagnostics, curve selection, option-to-rule flow, strategy legs and surface interaction. Clearly label anything not yet supported. Gate: runnable demo; primary journey works after refresh; no fake backend success or live monitoring claim.

### Phase 2 — domain engine and server persistence

Introduce canonical schemas/evaluator, transactional persistence, job lifecycle, API validation and contract tests. If the frontend preview remains, verify parity using a common fixture corpus. Gate: immutable versions and reproducible event sets survive restart; no future-data leakage.

### Phase 3 — entitled futures integration and monitoring

Integrate the agreed provider, session metadata and contract mapping. Add feed-health checks, freshness rules, recoverable worker state, idempotent events, pause/resume and notification delivery/retry. Gate: every P0 criterion passes against entitled data; gaps, restarts, late inputs and delivery failure have evidence.

### Phase 4 — production options and volatility

Integrate option-level data, contract references and agreed valuation methods. Verify unit/sign conventions and timestamp alignment; enable only covered historical tests. Gate: P1 acceptance, leg reconciliations, source quote inspection and surface fallback pass.

### Phase 5 — operational release and later features

Verify user access, retention, secrets, dependency licenses, monitoring, backup/recovery and deployment instructions. Add P2 features only when requested. Gate: no unresolved decision blocks an enabled capability; actual test results and known limitations are recorded.

Proposed review cadence: stop after each requested phase and present its concrete outputs. The launch prompt requests Phase 0 only; subsequent phase work needs a new instruction.

## 13. Verification plan

| Area | Meaningful cases |
|---|---|
| Crossings | `84.99, 85.00, 85.01, 85.02, 84.99, 85.01` against 85 emits two crossings before any additional cooldown suppression; equality alone emits none |
| Percentage | 100 to 98 equals -2%; strict “more than 2%” does not trigger; missing/zero reference yields unknown |
| SMA/EMA | Known short vectors, warm-up, seed, timeframe and precision; chart values reconcile to evaluator |
| Trigger policy | Repeated true updates, once-per-bar, reset, exact cooldown boundary, activation and pause/resume |
| Missing data | AND/OR truth tables, stale quote, absent prior sample, session gap, duplicate and late input |
| Causality | Append future bars; earlier event results stay unchanged; incomplete candles are not treated as completed |
| Reproducibility | Same rule/dataset/engine produces identical events; old versions survive edits |
| Futures | Contract switch, expiry, constituent identity at roll, signed spread and unequal quote ages |
| Options | Bid differs from ask trigger; missing bid/ask; invalid quotes; correct underlying reference; volatility-point units |
| Strategies | Long/short sign, debit/credit, multiplier mismatch, vertical validation, collar exposure, leg-to-net reconciliation |
| Surface | Sparse/invalid data, observed versus interpolated points, different expiry references, WebGL fallback |
| Delivery | One stored event through retry/restart; delivery failure visible without losing event evidence |
| UI | Describe → review → save → replay → inspect; chart/chain → rule; loading, error, empty, stale, keyboard and narrow viewport |

Use unit tests for formulas/state machines, integration tests for persistence/jobs/provider adapters, contract tests for API boundaries, and a small browser suite for primary journeys. Do not add tests that only mirror trivial implementation details. Run the repository's actual formatter, typecheck, tests and build after implementation; record outputs honestly.

Proposed performance goals, pending expected workload: nonblocking replay with progress/cancel; virtualize large chains/event lists; load surface code on demand; preserve responsive interactions with 10,000 demo bars and 1,000 saved-rule rows. Measure on an agreed device/browser before calling these guaranteed limits.

## 14. Decisions needed from the team

These questions do not block documentation or an explicitly synthetic demo. They block the affected operational features.

| Decision | Why it matters | Proposed next step |
|---|---|---|
| First deliverable: frontend demo or operational service? | Defines completion and testing | Begin with reviewed frontend demo |
| Data provider, entitlements and permitted storage/display | Governs available fields and deployment | Team supplies provider documentation and access boundary |
| Historical coverage and granularity | Determines which rules can be replayed | Inventory futures and option-level coverage separately |
| Exchange session, timezone, daily-bar conventions | Defines daily changes and indicators | Use provider's documented exchange calendar |
| Front-month roll and continuous adjustment | Can create artificial changes and crossings | Specific contracts first; decide mapping explicitly |
| Supported price fields and mark methodology | Changes triggers and valuation | Show available fields; require explicit choice |
| Options model, exercise style and Greek units | Controls reliable analytics | Confirm contract and vendor conventions |
| Freshness and synchronization tolerances | Prevents incompatible snapshots | Define per data type and timeframe |
| Natural-language templates or LLM provider | Changes scope, privacy and failure modes | Supported templates for first demo |
| Rule grouping complexity in first release | Affects builder/schema/evaluator | Single explicit AND/OR group first |
| Notification channels, delivery target and limits | Defines operational alert behavior | In-app first; agree additional channel |
| Hosting, users, access roles and retention | Defines shared service architecture | Decide before shared operational deployment |
| Collar underlying exposure and quantity conventions | Controls signs and net Greeks | Team confirms actual hedging use case |
| Historical curve overlay in initial scope | Source body/MVP table differ | Review section 4 proposal |

## 15. Source traceability and references

| Team source section | Expanded specification |
|---|---|
| 1–2: vision and no-code logic | Sections 1–5, 7, 11 |
| 3.1: rule builder | RB requirements, sections 7 and 11 |
| 3.2: saved rules | SR requirements and entity/version contracts |
| 3.3: backtesting | BT requirements and sections 8, 13 |
| 3.4: event history | EV requirements and delivery/audit contracts |
| 4.1: chart and averages | ME requirements and indicator semantics |
| 4.2: curve | FC requirements and futures conventions |
| 5.1: ladder | OL requirements and option quote conventions |
| 5.2: strategies | ST requirements and strategy sign/unit rules |
| 5.3: IV surface | VS requirements and surface methodology |
| 6–7: connected workflows/usability | Sections 3, 5, 8, 11 |
| 8–9: MVP and positioning | Sections 2, 4, 12, 14 |

External references checked during preparation:

- [OpenAI: build skills](https://learn.chatgpt.com/docs/build-skills) — invocation, local discovery and distribution; host behavior may evolve.
- [Caveman skill source](https://github.com/JuliusBrussee/caveman/blob/main/skills/caveman/SKILL.md) — communication style; persisted documentation retains full prose.
- [Lightweight Charts documentation](https://tradingview.github.io/lightweight-charts/) and [official source](https://github.com/tradingview/lightweight-charts) — candidate chart capability, not market-data provision. Context7 checked the official library documentation during preparation; verify installed-version typings during implementation.

The formulas and architecture above are proposed engineering contracts derived from the brief, not verified exchange contract terms or investment guidance. Provider/exchange specifications remain required for operational integration.
