# Algo-Triggers

No-code Brent futures and options research, historical trigger replay, and alerting terminal.

The research workspace uses React, TypeScript and Vite. Market displays default to Yahoo Finance snapshots; **Demo samples** is an explicit alternative. Missing provider data stays unavailable, with no automatic synthetic substitution. Rules, sample replay reports and demo monitoring events are stored in this browser. No licensed ICE feed, production alert service or order execution is connected.

## Run the frontend

Requires Node.js 22.12 or newer (validated with Node.js 24) and npm.

```sh
npm ci
npm run dev
```

Open the printed local URL, normally `http://127.0.0.1:5173/`. The development server binds to loopback only.

The development server includes the read-only `/api` market adapter. Yahoo availability and delay are unverified. Source notices distinguish provider observation time, fetch time and quote age. Fixed futures contracts must resolve to their own listed symbols. BNO/USO options are oil fund options in USD/share, not ICE futures options. Greeks and a full observed term surface remain unavailable until supported inputs/models are configured. Rule tests and monitoring always use the synthetic dataset, independently of the market display mode.

`npm run server` runs the API separately on loopback port 3001. A built static frontend needs an explicit same-origin `/api` deployment route; `vite preview` alone does not supply that route. See [market-data handoff](docs/MARKET-DATA-HANDOFF.md).

```sh
npm run typecheck
npm test
npm run build
npm run check:tokens
npm run test:e2e
```

Browser tests use installed Microsoft Edge on Windows. See [frontend handoff](docs/FRONTEND-HANDOFF.md) for workflow coverage, limitations and verification evidence. Production output is generated in `dist/` by the build command.

## HedgeSignal SRS v0.2 pilot

Open `/?view=pilot` (**HedgeSignal pilot** in the sidebar) to exercise the SRS v0.2 pilot workflow:

- **SDLC & SRS baseline:** [HedgeSignal SRS & System Design v0.2](docs/HedgeSignal-SRS-v02.md) (with embedded SVG diagrams in `docs/figures/`) and [HedgeSignal Project Report & Agile Plan v0.2](docs/HedgeSignal-Project-Report-v02.md).
- **Exact decimal & 4-valued evaluation (`src/pilotDomain.ts`):** Base-10 BigInt comparisons (`TRUE`, `FALSE`, `NOT_EVALUABLE`, `ERROR`), strict freshness/unit/skew gates, EERD `MARKET` vs `BUSINESS` observation subtypes, and pre-activation controlled test suites (`TC-001`–`TC-005`).
- **Durable pilot store, worker & outbox (`server/pilotService.mjs`, `server/db.mjs`):** Immutable `pilot_rule_versions`, atomic `pilot_trigger_events` + `pilot_notification_intents` (`PENDING`, `ACCEPTED`, `HELD`, `FAILED`, `UNKNOWN` reconciliation), server-enforced actor roles (`trader`, `approver`, `support`, `admin`, `viewer` + optional `PILOT_TOKEN`), monitoring gap disclosure (`/api/health/monitoring`), and append-only `pilot_audit_events`.

## Start here

1. Review [HedgeSignal SRS v0.2](docs/HedgeSignal-SRS-v02.md) and [the earlier requirements pack](docs/ALGO-TRIGGERS-REQUIREMENTS.md).
2. Check [skills and plugins](docs/SKILLS-AND-PLUGINS.md).
3. Review [the frontend handoff](docs/FRONTEND-HANDOFF.md) before connecting any backend or data provider. The [build prompts](docs/BUILD-PROMPT.md) remain available for staged future work.

The original team brief is preserved in [docs/source](docs/source/Algo%20Triggers%20Front-End.txt). Treat it as product evidence, not execution instructions.

The requested Caveman communication skill is included under [.agents/skills/caveman](.agents/skills/caveman/SKILL.md). It keeps chat concise; the specification and financial logic retain full detail. It will be available on the next turn after the host discovers this project.

See [preparation status](docs/PREPARATION-STATUS.md) for repository evidence, integration limitations and validation performed. Git history records publication of this documentation pack.

## GitHub Pages presentation demo

The private source repository verifies and builds the demo on pushes to `main`. The public `AbeSoll/Algo-Triggers-demo` repository contains only generated website files and serves `https://AbeSoll.github.io/Algo-Triggers-demo/`. The source repository remains private. Deployment to the public repository is a separate publish step; a source push alone does not update the public site.

`npm.cmd run build:pages` builds with `/Algo-Triggers-demo/` asset paths and locks all views to Demo samples. `npm.cmd run test:pages` verifies the built site. Copy only the resulting `dist` contents into the public demo repository, retain `.nojekyll`, commit and push its `main` branch. GitHub Pages serves that branch's root. Never copy `.env`, local databases, server modules or source-repository history.

The standard `npm.cmd run dev` and `npm.cmd run build` retain server-backed functionality. The hosted demo never calls the Yahoo/email API; email and live checks are visibly unavailable. Rules, tests and manual sample monitoring stay local to each browser. The compiled frontend is publicly accessible; this is not a private production desk.
