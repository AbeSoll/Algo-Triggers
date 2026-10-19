# Algo Triggers QA project context

Last inspected: 19 October 2026. Scope: the first browser-local frontend demo. This file records the repository inspected during implementation; the validation report records executed checks separately.

## Product

Algo Triggers is an internal research UI for non-programmers to define, replay and inspect Brent futures signals, with a synthetic options research workspace. The current release uses deterministic fixtures and browser storage; it does not monitor an entitled market feed or execute trades.

Critical journeys:

1. Inspect a specific futures contract, timeframe and chart, then carry its context into a structured rule draft.
2. Convert a supported natural-language template into an editable proposal; ambiguous text shows a clarification instead of guessed settings.
3. Validate and save a rule, edit it into a new immutable version, and inspect an older version without changing its evidence.
4. Run a historical fixture replay over an explicit interval, cancel it, or inspect a completed report and its event operands.
5. Start explicitly labeled demo monitoring, advance a demo bar, then pause and verify no new demo events are emitted.
6. Refresh the browser and recover saved rules, versions and event provenance from local storage; report storage failures without claiming success.
7. Inspect synthetic option bid/ask/last/mark fields, construct signed strategy legs, and create an option-field rule while unsupported historical replay remains unavailable.
8. Operate the primary journeys by keyboard and at narrow widths, with a useful chart/surface data alternative.

Product requirements: `docs/ALGO-TRIGGERS-REQUIREMENTS.md`. Interaction decisions: `UX-CONTRACT.md`. Visual system: `DESIGN.md`.

## Tech Stack

One frontend application; no monorepo.

| Layer | Detected implementation |
|---|---|
| UI | React 19.3.1 and React DOM 19.3.1, TypeScript 5.9.3 |
| Tooling | Vite 7.3.7, `vite.config.ts`, `tsconfig.json` |
| Market chart | Lightweight Charts 5.2.1 |
| Icons | lucide-react |
| Styling | Shared CSS tokens and component classes; `src/styles.css` owns runtime design values |
| Domain | Closed-bar fixture evaluator in `src/domain.ts`; synthetic fixtures in `src/fixtures.ts` |
| Persistence | Browser-local storage; no database or shared server persistence |
| Backend/API/cache/ORM | None implemented in this frontend phase |
| Hosting/CDN/monitoring | No deployed service or monitoring system verified |

Versions above come from the inspected `package-lock.json`; dependency ranges are in `package.json`.

## Test Stack

| Level | Framework and version | Configuration and location | Inspection state |
|---|---|---|---|
| Unit/domain | Vitest 5.0.5 | `npm test`; co-located `src/domain.test.ts`; Vite configuration | Domain suite present; execution results are not asserted by this context file |
| Browser/E2E | Playwright 1.64.1 | `playwright.config.ts`; `tests/frontend.spec.ts`; configured Edge channel at 1440 × 1000 | Five initial browser journeys present at inspection; actual results belong in the validation report |
| Accessibility | axe-core Playwright 4.14.0 | Browser integration package installed | Complements manual keyboard, focus and canvas-alternative checks |
| Types/build | TypeScript 5.9.3 and Vite 7.3.7 | `npm run typecheck`, `npm run build` | Commands defined |
| Formatting | Prettier 3.9.10 | `npm run format:check` | Command defined |
| Token consistency | Project-specific script specified in design contract | `scripts/check-tokens.mjs` | Script present; actual execution belongs in final validation |
| API/database | None | No backend or database in this phase | Outside current scope |

`docs/TEST-MATRIX.md` maps risk to meaningful tests and explicitly distinguishes planned cases from executed evidence.

## CI/CD

No CI workflow, deployment pipeline or release gate was detected at this inspection. The local Playwright configuration retains traces on failure and writes list/HTML reports; the suite writes selected screenshots under `docs/evidence/`. Artifact configuration is not evidence of a completed run. A local successful build is not a deployed or production-ready service. Before sharing a release, run the type, format, unit, production-build and browser checks and record commands, actual outcomes and limitations. Do not invent coverage, screenshots, trace artifacts or passing browser results.

## Environments

| Environment | State and data |
|---|---|
| Local development | Vite configured for `http://127.0.0.1:5173`; a configured URL does not establish that the server is running |
| Local preview | `npm run preview`; run after a production build, with the actual bound URL recorded |
| Test browser | Isolated synthetic fixtures and browser-local storage; no external market account required |
| Staging/production | Not configured or verified |

Fixture time and displayed timestamps use UTC. Exchange calendars, market sessions, entitlements and historical point-in-time availability are not inferred from fixture dates. Healthy/stale/unavailable demo states must keep their synthetic identity visible. Browser closure stops manual demo monitoring.

## Quality Goals

The team has not supplied coverage or duration targets. The following are proposed phase acceptance thresholds, not achieved measurements:

- Zero failed critical domain cases for strict crossing/equality, warm-up, unknown truth, cooldown, deduplication, causality and option-history refusal.
- Zero known critical or serious automated accessibility violations in exercised primary screens, plus keyboard completion of all 5 core rule/replay journeys.
- Zero page-level horizontal overflow at 390px and 1440px viewport widths; dense tables may scroll inside their labeled wrappers.
- Zero changed historical reports or events after editing a rule version.
- Zero success messages for failed storage writes, canceled jobs or unavailable production capabilities.
- Zero flaky cases across 3 consecutive runs of the small deterministic browser smoke suite before delivery, where the runtime supports those runs.
- Initial feedback budgets: unit suite under 3 minutes, browser smoke suite under 15 minutes; measure on the actual environment.

No coverage percentage has been agreed or measured. Financial semantics and primary user flows take priority over arbitrary coverage counts.

## Risk Areas

Impact and likelihood use a 1–3 scale; score is their product. Critical: 6–9; important: 3–4; monitor: 2; backlog: 1. Likelihood is an engineering assessment for this new implementation, not incident history.

| Area | Risk Level | Business Impact | Notes |
|---|---|---|---|
| Crossing and emission semantics | Critical, 3 × 3 = 9 | Misleading signal counts and research conclusions | Strict equality, prior observation, group transition, cooldown boundary, one-shot and once-per-bar need distinct cases |
| Rule versions and replay evidence | Critical, 3 × 3 = 9 | A result could appear to support a rule it never tested | Keep rule snapshots, settings, dataset and engine IDs immutable; inspect old evidence after edit and refresh |
| Option fields, signs and units | Critical, 3 × 3 = 9 | Bid/ask confusion or reversed long/short valuation changes financial meaning | No field fallback; reconcile signed legs, debit/credit, per-bbl versus cash, theta/day and vega/volatility-point |
| Synthetic/live distinction | Critical, 3 × 2 = 6 | A demo could be mistaken for live operational monitoring | Persistent synthetic labeling; manual advance only; no market-entitlement, trade execution or delivery claim |
| Replay lifecycle and storage errors | Important, 2 × 2 = 4 | Lost work or invalid completed reports | Cancel cannot publish completed evidence; failed writes preserve inputs; corrupt storage recovers visibly |
| Chart context and future leakage | Critical, 3 × 2 = 6 | Wrong contract/timeframe evidence or hindsight bias | Chart, rule and report must agree; future bars cannot alter earlier results |
| Keyboard/dialog/narrow layout | Important, 2 × 2 = 4 | Users cannot finish core workflows or inspect evidence | Dialog focus, Escape, error associations, table scroll and text alternatives require browser checks |
| Surface interpretation | Important, 3 × 1 = 3 | Model-generated interpolation can appear observed | Label synthetic observed points, units and fallback; do not invent strategy IV or option history |

## Team

The human team size, QA headcount, developer-to-QA ratio and delivery methodology have not been supplied. They remain unknown; no staffing model is inferred. For this assisted frontend phase, implementation agents own domain and UI validation, and the human product team reviews methodology decisions and release scope. This is not evidence of a staffed operational QA function.

## Conventions

- Unit tests use co-located `*.test.ts` files for domain behavior. Prefer short known vectors and explicit expected operands to snapshots of implementation output.
- Browser tests should use semantic `getByRole` and `getByLabel` queries with explicit names; these assert accessibility alongside behavior. Add kebab-case `data-testid` only for repeated data cells or chart evidence with no stable semantic name.
- Use isolated storage per browser test and deterministic fixture dates. Do not use a real feed, live clock or privileged accounts as test prerequisites.
- Preserve state/provenance through test actions: save → edit → old version → replay → refresh. Do not substitute assertions that only check a toast.
- Test healthy, stale and unavailable demo data states independently. Missing values are unknown, not zero.
- Replays use closed bars and full warm-up prefixes before filtering output intervals. No option history may be synthesized from futures bars.
- No automatic pushes, deployments, external notifications or trade actions are part of these QA checks.
- Branch and review policy has not been supplied. Inspect current Git changes before modifying files and report actual local validation results separately.
