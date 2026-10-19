# Frontend verification

Verified locally on 19 October 2026 with Node.js 24.19.0 and Microsoft Edge on Windows.

| Check | Actual result |
|---|---|
| `npm run format:check` | Passed for source, tests, configuration and scripts |
| `npm run typecheck` | Passed |
| `npm test` | 36 domain/monitor tests passed across two files |
| Complete Playwright suite | 17 browser journeys passed; zero skipped or failed |
| Axe WCAG A/AA scans inside browser suite | Zero violations on tested Market Explorer, Options ladder and IV-surface states |
| `npm run build` | Production build passed; price workspace and lazy Options bundle generated |
| `npm run check:tokens` | Nine color tokens match DESIGN.md and runtime CSS |
| Frontend Design Premium strict audit | Zero errors, warnings or unresolved ownership findings |
| `designmd lint DESIGN.md` | Zero errors; seven orphaned-token warnings from prose/CSS-owned tokens not referenced by frontmatter component recipes |
| `npm audit` | Zero reported vulnerabilities |
| Source whitespace/anti-pattern inspection | No product native alert/confirm/prompt calls, false `href="#"` links or unhandled static audit findings |

The token linter's seven warnings are informational for this ownership model: runtime CSS is canonical and the dedicated token check verifies exact values. They are preserved in `design-lint.json`, not hidden.

## Browser coverage

- Chart/curve selection, chart-to-rule indicator periods and saved timeframe.
- Create and invalid fields; explicit clarification for ambiguous natural language.
- Replay completion, cancellation and event diagnostics.
- Editing to a new immutable version, older-version access and reload persistence.
- Original saved-report dates/timeframe preserved after chart context changes.
- Search/no-results/clear, stale data and restore.
- Option expiry/underlying/ask-field transfer, unavailable bid/last/midpoint actions.
- Collar futures exposure, signed reconciliation and invalid put-vertical validation.
- Surface rotation/zoom/reset, observed-point selection, expiry filtering and table alternative.
- Desktop 1440px and narrow 390px; keyboard Escape and reduced motion; no page-level horizontal overflow.
- Corrupt/invalid stored evidence recovery and storage-write failure preserving the draft.
- New one-shot activation, no second emission, pause/resume preserving consumption.
- Cooldown retained across pause/resume, including the exact next eligible bar.
- EMA warm-up parity between 5D and 1D display ranges.

## Evidence and limits

Machine-readable reports: `browser-results.json`, `premium-audit.json`, `design-lint.json` and `npm-audit.json`. Screenshots: `evidence/market-desktop.png`, `market-mobile.png`, `options-desktop.png`, `surface-desktop.png`.

The dev preview was observed in the in-app browser. Native contract selector open state was inspected. Automated scans and selected browser journeys are not complete assistive-technology certification, production load testing or proof of market-data accuracy. No server, real feed, options-history provider or external delivery integration was tested.

Git history records publication of the frontend and subsequent UI refinements. The previously published requirements and frontend commits are preserved.

## Pre-push refresh for the UI refinements

Type checks, all 36 calculation tests and the production build passed again. The default four-worker browser run passed 15 journeys; two accessibility/browser journeys exceeded their 30-second timeout. Both passed when rerun individually with one worker (5.4 and 4.8 seconds). All 17 scenarios therefore passed across the refresh and targeted rerun; the parallel run itself was not an all-pass result. The original machine-readable report above is retained as evidence of the initial frontend verification.
