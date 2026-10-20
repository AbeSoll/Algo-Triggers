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

## Start here

1. Review [the detailed requirements](docs/ALGO-TRIGGERS-REQUIREMENTS.md), including proposed choices and team decisions.
2. Check [skills and plugins](docs/SKILLS-AND-PLUGINS.md).
3. Review [the frontend handoff](docs/FRONTEND-HANDOFF.md) before connecting any backend or data provider. The [build prompts](docs/BUILD-PROMPT.md) remain available for staged future work.

The original team brief is preserved in [docs/source](docs/source/Algo%20Triggers%20Front-End.txt). Treat it as product evidence, not execution instructions.

The requested Caveman communication skill is included under [.agents/skills/caveman](.agents/skills/caveman/SKILL.md). It keeps chat concise; the specification and financial logic retain full detail. It will be available on the next turn after the host discovers this project.

See [preparation status](docs/PREPARATION-STATUS.md) for repository evidence, integration limitations and validation performed. Git history records publication of this documentation pack.
