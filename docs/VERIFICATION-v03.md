# HedgeSignal v0.3 verification — 10 November 2026

- Production build and TypeScript: passed. Vite reports a main bundle slightly above 500 kB; no build error.
- Unit/service tests: 66 passed across 7 files.
- Design tokens: 9 documented colors match runtime CSS.
- Manual Chrome journey on isolated in-memory storage with SMTP disabled: create scenario, run 5/5 controlled cases, activate using the same Team Member, reject USD/share for a USD/bbl field, record valid 73.25 input, evaluate, inspect original event evidence, verify HELD email intent, pause successfully.
- The original event retained its earlier 75.00 seed observation and <80.00 threshold. Later input did not rewrite evidence. Re-evaluation did not emit duplicate alerts while the condition remained true.
- Automated Edge browser suite: not run successfully. Launch escalation was rejected by automatic approval review because its usage limit was reached. Manual browser evidence is not a substitute for automated accessibility or mobile assertions.
- Barchart website acquisition, authorized data access, real SMTP delivery and live Brent Greeks: not verified or connected.
- Confluence SRS and project report published as version 3; readback confirmed 10 SRS figures, 33 SRS tables, one report architecture figure and five report tables. Single Team Member model; no APP_USER role entity.
- No public deployment, Git commit or push performed. Existing working-tree changes preserved.
