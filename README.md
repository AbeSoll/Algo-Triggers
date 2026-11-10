# HedgeSignal — Algo Triggers

Internal Brent hedging-condition monitoring and email alerts for a small team. The default desk has one Team Member workflow, without administrator or approval roles. It does not execute trades.

## Run locally

Requires Node.js 22.12+ and npm (validated with Node.js 24).

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Monitor contains scenarios and controlled tests; Inputs records observations; History & email preserves event evidence and delivery status. React/TypeScript uses the Node service and SQLite. Immutable rule versions, exact decimal evaluation, freshness/unit checks and optional `PILOT_TOKEN` deployment protection remain. Existing `pilot_*` schema/API names are compatibility identifiers, not separate product roles.

Email requires an explicitly configured SMTP service. Held, accepted and delivered are not interchangeable: SMTP acceptance alone does not prove inbox delivery. Keep credentials in the local environment, never in source control.

## Current documentation

- [SRS and system design v0.3](docs/HedgeSignal-SRS-v03.md), including actors, use cases, DFDs, flowcharts, ERD, EERD and sequence diagram.
- [Project report and Agile plan v0.3](docs/HedgeSignal-Project-Report-v03.md).
- [Barchart data decision](docs/BARCHART-DATA-DECISION.md).

The older v0.2 files are historical. The current baseline has one Team Member and no administrator workflow.

## Data boundaries

Synthetic and imported observations retain honest source labels. Barchart is not connected. Automated website extraction needs an authorized interface and verified instrument/field coverage. Polling a delayed source cannot make its data real-time. The proposed RAM-only acquisition mode is not implemented: the current desk keeps durable observation and event evidence.

Research tools remain separate from the desk. Yahoo snapshots may be unavailable or delayed; no synthetic substitution occurs in Yahoo mode. BNO/USO options are fund options in USD/share, not ICE Brent futures options. Research rule replay uses synthetic data and browser-local state. No licensed ICE feed is implied.

## Validation

```sh
npm run typecheck
npm test
npm run build
npm run check:tokens
npm run format:check
npm run test:e2e
```

The browser suite uses an isolated in-memory database with SMTP disabled. The latest validation includes 66 unit/service tests and a manual browser journey through creation, controlled testing, activation, invalid-unit rejection, input recording and held email evidence. The automated Edge suite could not be launched because automatic approval review reached its usage limit; it is not reported as passing.

A static build needs a same-origin API deployment; `vite preview` alone does not supply the backend. No public deployment was performed as part of the v0.3 update.

## GitHub Pages presentation demo

The private source repository verifies and builds the demo on pushes to `main`. The public `AbeSoll/Algo-Triggers-demo` repository contains only generated website files and serves `https://AbeSoll.github.io/Algo-Triggers-demo/`. The source repository remains private. Deployment to the public repository is a separate publish step; a source push alone does not update the public site.

`npm.cmd run build:pages` builds with `/Algo-Triggers-demo/` asset paths and locks all views to Synthetic samples. `npm.cmd run test:pages` verifies the built site. Copy only the resulting `dist` contents into the public demo repository, retain `.nojekyll`, commit and push its `main` branch. GitHub Pages serves that branch's root. Never copy `.env`, local databases, server modules or source-repository history.

The standard `npm.cmd run dev` and `npm.cmd run build` retain server-backed functionality. The hosted demo never calls the Yahoo/email API; email and live checks are visibly unavailable. Rules, tests and manual sample monitoring stay local to each browser. The compiled frontend is publicly accessible; this is not a private production desk.
