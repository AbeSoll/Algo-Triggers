# Frontend demo test matrix

Prepared: 19 October 2026. Scope: the connected synthetic frontend demo. Requirements IDs refer to `ALGO-TRIGGERS-REQUIREMENTS.md`. Stack, environment and risk ownership are recorded in `../.agents/qa-project-context.md`.

This is a test design, not a pass report. A case is complete only when an actual test or browser observation is recorded in the implementation validation report with its result. At preparation, the domain test file was present; browser tests and final integration were still being implemented.

## Critical domain and evidence cases

| ID | Risk / requirement | Meaningful input and action | Expected evidence | Layer |
|---|---|---|---|---|
| D01 | Strict comparison, RB-03 | Close values 84.99, 85.00, 85.01 around threshold 85 | Equality emits no above/below event; compare original values, not display-rounded prices | Unit |
| D02 | Cross semantics, RB-03 | 84.99, 85.00, 85.01, 85.02, 84.99, 85.01; zero cooldown | Exactly 2 crosses above; first eligible observation cannot invent a crossing | Unit |
| D03 | Missing prior input, RB-03 | Valid → missing → above threshold | No cross over an absent immediate prior eligible observation; diagnostics say unknown | Unit |
| D04 | SMA/EMA correctness, ME-02 | Short known vectors; SMA/EMA period 3; invalid zero/fractional periods | SMA includes current completed close; EMA seeds from first 3-bar SMA; no pre-warm-up value; invalid periods rejected | Unit |
| D05 | Percentage reference, RB-03 | 100 → 98 and 100 → 97.99 with below -2%; zero/missing reference | Exactly -2% does not satisfy strict below; nonpositive/missing reference yields unknown | Unit |
| D06 | Three-valued truth, RB-04 | true/false/unknown in both AND and OR | False dominates AND, true dominates OR; only final true can emit; every condition diagnostic preserved | Unit |
| D07 | Frequency versus predicate, RB-05 | Repeated true updates and false-to-true group transitions | Once-per-bar, transition and one-shot behave independently of standing/crossing predicate; no first-sample fabricated transition | Unit |
| D08 | Cooldown, RB-05 | True every minute, 2-minute cooldown | Emission at minute 0, 2, 4; suppressed minute 1 does not move the cooldown origin | Unit |
| D09 | Causality, ME-04 / BT-04 | Evaluate prefix, then append future bars | Earlier MA values, diagnostics and event IDs unchanged | Unit |
| D10 | Stable input identity, BT-04 | Duplicate timestamps and out-of-order bars | Deterministic sorting/deduplication policy; no double events; unchanged source input | Unit |
| D11 | Unsupported option history, OL-03 | Replay an option premium rule with only futures OHLC fixtures | Explicit unavailable/error reason; no substituted futures-derived option prices | Unit + browser |
| D12 | Honest parser, RB-02 | “Brent rises 2%”, “put hits $2”, mixed families and nested text | Clarification/error preserves text; no guessed reference or strike and no hidden activation | Unit + browser |
| D13 | Stored version identity, SR-02 / BT-04 | Save v1, replay it, change threshold into v2 | v1 expression/settings/events stay unchanged; report opens v1 evidence after refresh | Browser |
| D14 | Replay interval/warm-up, BT-01 / BT-04 | Select output range starting after indicator seed and with cooldown history before start | Seed uses pre-range data; only in-range events/denominators count; report stores range, timeframe, dataset, engine and snapshot | Unit + browser |
| D15 | Summary denominator, BT-02 | Warm-up exclusions; 0 events; 1 event; several events | Total/eligible/excluded periods visible; period percentage uses eligible periods; mean gap unavailable below 2 events; no profitability metrics | Unit + browser |

## Connected workflow and lifecycle cases

| ID | Risk / requirement | Action | Expected evidence | Layer |
|---|---|---|---|---|
| W01 | Main journey, RB / BT / EV | Market chart → Create rule → review → save → replay → inspect event | Same specific contract, timeframe, threshold, rule version and event bar throughout; chart and diagnostics reconcile | Browser |
| W02 | Invalid save, RB-05 | Empty name, invalid periods, nonnumeric threshold or invalid range | Associated field error, focus moves to first invalid field, user input remains, no saved version | Browser |
| W03 | Duplicate/version, SR-01 | Duplicate a rule; edit original separately | New rule ID; independent history; edit appends exactly one version; duplicate-submit protection | Browser |
| W04 | Unsaved change, shared workspace | Modify draft then Cancel, Escape or navigate | App-owned discard confirmation; keep editing preserves draft; discard returns to context; no accidental overwrite | Browser |
| W05 | Replay cancel, BT-01 | Run replay; cancel while busy | Progress visible; duplicate run blocked; canceled state visible; no completed report/events published | Browser |
| W06 | Replay no result, BT-01 | Use an unreachable threshold | Completed report with 0 signals and correct denominator; meaningful empty state; no invented events | Browser |
| W07 | Demo monitoring, EV-03 | Start demo monitoring, advance bars, pause, advance again | Explicit manual simulation; only monitored version emits; paused rule emits no new events; resume has documented state | Browser |
| W08 | Monitor edit, SR-02 / EV-03 | Edit an actively demo-monitored version | New draft version requires explicit monitoring; old events retain original version | Browser |
| W09 | Event filters, EV-02 | Set source/rule/instrument/date filters; open event then close | Filters and pagination retained; URL restores committed state; inspected event belongs to original rule version | Browser |
| W10 | Persistence, SR-02 / EV-01 | Save rule and result, refresh | Local data and immutable evidence restored; browser-local boundary remains visible | Browser |
| W11 | Storage failure, state recovery | Simulate storage write failure and corrupt/incompatible JSON | Persistent actionable error; no false success; unsaved inputs retained; corrupt input recovers visibly to demo seeds | Browser |
| W12 | Cross-tab conflict | Open two tabs, save in one then attempt stale save in other | Reload/conflict prompt; no silent overwrite of newer local data | Browser |
| W13 | Synthetic boundary, all views | Visit all workspaces and dialogs; change health | Synthetic label/timestamp/UTC/provider explanation persist; stale/unavailable changes are truthful; no “live ICE” claim | Browser + review |
| W14 | Instrument/timeframe context, ME-01 | Switch Dec/Jan/Feb and 5m/15m/1h; inspect event | Fixtures and indicators regenerate consistently; saved rule retains its chosen timeframe; old event does not use current unrelated chart context | Browser |
| W15 | Data unavailable | Select unavailable health; attempt new replay/monitor operation | Unsupported operation disabled or explicit reason given; prior stored report remains inspectable with original provenance | Browser |

## Options, curve and surface cases

| ID | Risk / requirement | Action | Expected evidence | Layer |
|---|---|---|---|---|
| O01 | Exact option field, OL-01 / OL-03 | Choose put/call, expiry, strike, bid then ask and Create rule | Draft retains exact type/expiry/strike/actual futures reference and selected field; no bid-to-mark fallback | Browser |
| O02 | Quote validity, OL-02 | Inspect missing side/crossed quote and regular bid/ask | Spread = ask − bid; mark exists only for two valid sides; missing/unsupported value is not 0 | Unit or deterministic review |
| O03 | Signed option premium, ST-01 / ST-03 | Long call + short higher-strike call with explicit quantities | Every signed leg shown; net USD/bbl reconciles; positive debit and negative credit correctly labeled; cash premium only if multiplier defined | Unit + browser |
| O04 | Vertical validation, ST-02 | Change one leg to another expiry/type/underlying or equal strike | Invalid vertical blocked with reason; unlike contracts not silently aggregated | Unit + browser |
| O05 | Collar exposure, ST-02 | Select collar template; alter underlying exposure | Underlying displayed separately from option premium; net delta includes declared futures exposure; no spot/futures substitution | Unit + browser |
| O06 | Greek units, ST-03 | Compare per-leg and aggregate delta/gamma/theta/vega | Signed sums reconcile on stated compatible basis; theta per day and vega per volatility point; absent multiplier prevents false cash exposure claim | Unit + browser |
| O07 | Strategy/surface IV, VS-01 | Inspect strategy and surface | No meaningless strategy-IV sum; observed synthetic IV points separate from interpolation; axes identify strike/moneyness, expiry/time and IV units | Review + browser |
| O08 | Surface access, VS-01 / VS-02 | Rotate/zoom/select point with pointer and keyboard; use table alternative | Point inspection gives original quote and timestamp; useful table/text survives rendering failure; unsupported gap is a hole | Browser |
| O09 | Signed curve spread, FC-01 / FC-02 | Select near and far contracts; reverse leg order | Formula near − far and exact legs visible; price/timestamp reconcile; contango/backwardation refers to the selected ordered pair | Unit + browser |
| O10 | Unsupported production alert, RB-06 | Attempt strategy/spread/surface production monitoring | Explicit unavailable reason unless genuinely implemented and tested; no save that silently turns it into a single-price rule | Browser |

## Interaction, accessibility and layout cases

| ID | Risk | Action | Expected evidence | Layer |
|---|---|---|---|---|
| A01 | Keyboard journey | Keyboard only: navigation → rule form → save → replay → event → close | Visible focus, logical order, accessible names; no trap outside intentional dialog; focus restored on close | Browser + manual observation |
| A02 | Dialog focus | Open editor/detail/discard dialog; press Tab, Shift+Tab and Escape | Background inert, correct dialog name, focus retained and restored; nested confirmation does not leak focus | Browser |
| A03 | Canvas alternative | Inspect chart controls and accessible data/table | All primary chart actions keyboard-operable; price/event evidence available without canvas reading | Browser |
| A04 | Narrow viewport | 390px width, then 1440px desktop; open long diagnostics/options | No page overflow; localized table scrolling; controls readable; actions reachable; context preserved | Browser screenshot + geometry |
| A05 | Accessibility scan | Scan all workspaces and editor/detail dialogs | Record actual axe results; fix critical/serious findings; scan alone does not prove WCAG conformance | Browser |
| A06 | Reduced motion / forced colors | Enable reduced motion; inspect system contrast mode where supported | Motion stops; focus and status remain visible; text/icon labels supplement color | Browser + review |
| A07 | Busy/error/empty states | Run/cancel, clear search, no events, unavailable data, invalid save | Button geometry stable; status announced; actionable error retained; clear search restores focus | Browser |
| A08 | Design consistency | Compare shared controls, token drift and all three workspaces | Canonical CSS tokens, matching form/button/modal/scroll behavior; no one-off action patterns | Static audit + screenshots |

## Validation record requirements

Record the actual check command, date, outcome, case count if reported, browser/runtime and useful artifact paths. Link browser screenshots only after reviewing them. Explicitly name checks that could not run and why.

Minimum local delivery sequence: formatting check, token consistency, type check, domain tests, production build, static premium audit, browser primary journeys, keyboard/narrow/reduced-motion observations. A defect fix should rerun the relevant check; do not repeatedly broaden a passing suite without a changed risk.

Frontend completion does not establish server durability, production notification delivery, market-data entitlements, exchange conventions, account security, strategy suitability or trading performance.
