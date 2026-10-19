# Frontend decisions

| Decision | Rationale | Consequence |
|---|---|---|
| React + TypeScript + Vite | Empty app repository; interactive client does not require server rendering | Version lockfile checked in with implementation |
| Light research canvas, dark rail, violet rule context | Separate analytical evidence from navigation and market-direction colors | DESIGN.md and global CSS preserve identity |
| Native select/date popups | Platform ownership is acceptable for this English browser demo | Keyboard and layout verified; no authored popup styling claim |
| Closed-bar evaluation only | Deterministic evidence from fixture OHLC bars | No tick-mode reconstruction |
| Three specific futures contracts | Contract identity is unambiguous | Front-month/continuous methods wait for agreed roll policy |
| Unix milliseconds in domain, seconds at chart boundary | Avoid implicit timestamp shifts | UTC formatting explicit; no invented exchange session |
| Versioned browser-local data | Reviewable workflow without inventing backend readiness | Not multi-user, durable operational storage |
| Manual demo clock | Honest monitoring without a feed or hidden background service | Press Advance demo bar; state is reconstructed from activation boundary |
| Fresh input interval on resume, preserved actual emission state | Paused inputs cannot consume alerts, and resume cannot bypass cooldown or one-shot | Resume is not historical catch-up; duplicate/new version explicitly starts a new one-shot |
| Supplied illustrative option Greeks | Model/exercise conventions are unresolved | No claim of model-derived market analytics |
| Projected SVG volatility surface | Interactive rotation/zoom without WebGL dependency | Accessible point inspector and table remain available |
| Option replay and monitor disabled | No option-level history/stream supplied | Draft premium rules remain useful but cannot fabricate evidence |
| Patched Vitest 5.0.5 | Initial test dependency audit identified advisories | Updated audit reports zero vulnerabilities |

Open operational decisions remain those in requirements section 14: data provider and entitlements, exchange contract conventions, session/roll methods, model/Greek normalization, concurrency, hosting, roles and delivery channels.
