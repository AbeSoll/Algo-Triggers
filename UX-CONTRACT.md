# Algo Triggers UX contract

## Product context

English research UI for market-literate non-programmers. Source: `docs/ALGO-TRIGGERS-REQUIREMENTS.md`, particularly sections 5–9. Current scope: browser-local synthetic demo. UTC is the explicit default display and fixture timezone; exchange sessions are not inferred. Accessibility target is WCAG 2.2 AA, with test evidence limited to the exercised browsers and workflows.

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

Local browser storage is labeled. Failure to save is a persistent error with input preserved; success is not announced until storage succeeds. A corrupt or incompatible stored dataset is ignored with a recovery message and demo seeds. Cross-tab storage changes prompt reload instead of overwriting newer state silently. No backend, account, multi-user locking or durable operational guarantee exists.

Monitoring is explicitly manual: Start demo monitoring then Advance demo bar. Paused rules emit nothing. Browser closure stops the demo. Resume starts a new input interval while retaining the last actual emission for cooldown and one-shot consumption; missed paused-period events are not replayed. Duplicate a consumed one-shot or create a new version to explicitly start another. Historical replay ignores monitor status, evaluates the full warm-up prefix and filters events to the requested output range. It stores the rule snapshot, interval, dataset and engine identifiers. Results count signals, not trades.

## Dataset navigation

Saved rules use local filtering and pagination. Committed query/view state is kept in URL parameters; draft contents remain local and are not shared in URLs. Event history uses a bounded paginated dataset and source-mode filtering. Small fixture option chains render all known rows with count and horizontal scroll. Search clearing is immediate, keyboard accessible, and restores focus. No remote search or debounce is required.

## State and recovery

All enabled actions perform an operation. Unsupported live feeds, advanced grammar, option-history replay and production strategy alerts explain their unavailable state. Replay owns a busy state, cancellation, errors, empty result, and completed report. An adjustable demo-data health selector exercises healthy/stale/unavailable states without pretending a server failed. Unknown market fields are not displayed as zero.

Forms use noValidate, associated errors, first-error focus and duplicate-submit protection. Buttons keep fixed minimum height. Native dialog handles modal inertness/focus and Escape. Unsaved document unload uses the narrow browser lifecycle mechanism. Textareas have explicit non-resizing geometry and generous height.

## Verification boundary

Project checks cover formatting, types, domain tests, production build, token drift, the premium static audit and browser journeys. Browser journeys cover successful and invalid rules, replay/cancel/no-results, version history, local persistence, options-to-rule, condition evidence, keyboard, narrow layout and reduced motion. Server failure, authentication, market-data licensing and production notification delivery are outside the frontend-only scope.
