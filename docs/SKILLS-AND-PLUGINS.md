# Skills and plugins for Algo Triggers

Prepared 19 October 2026. Recheck availability in the chat where implementation runs. A skill describes a workflow; a plugin can supply skills, connectors or both. A name in this document does not install or connect anything.

## Selected skills

| Skill | When to use | Availability at preparation |
|---|---|---|
| `caveman` | Concise chat progress and results; preserve facts, numbers and negations | Requested by user; project-local installation requested from JuliusBrussee/caveman |
| `frontend-design-premium:frontend-design` | Establish a deliberate, market-specific visual direction | Available in current environment |
| `frontend-design-premium:frontend-design-premium` | Shared components, DESIGN.md, interaction consistency, resilient states and accessibility | Available; requires frontend-design first |
| `qa-project-context` | First use of the QA skills; establish actual stack, risk and test conventions | Available; use during implementation, not to invent a stack now |
| `api-testing` | Backend endpoint, auth, validation and pagination tests | Available; relevant once API exists |
| `database-testing` | Immutable versions/events, constraints, migrations and integrity | Available; relevant once database exists |
| `plugin-management:plugin-management` | Verify existing integrations and discover a missing provider capability | Used during preparation |
| `find-skills` | Discover a genuinely missing workflow, checking source quality | Used to identify Caveman |
| `openai-docs` | Verify Codex-specific skill setup and invocation guidance | Official documentation consulted |

The detailed Markdown brief is an engineering document; Caveman affects chat economy, not document completeness. The upstream skill itself exempts persisted artifacts from compressed style. Do not use extreme compression modes for financial logic or acceptance criteria.

Use QA skills only when their relevant work begins and read each full SKILL.md. `qa-project-context` should establish actual facts before API/database QA skills rely on it. Missing skills should be reported, with equivalent verification performed where possible; do not claim to have invoked unavailable tools.

## Caveman source and installation boundary

Selected upstream: [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman), specifically [skills/caveman/SKILL.md](https://github.com/JuliusBrussee/caveman/blob/main/skills/caveman/SKILL.md). Source and a [skills directory listing](https://www.skills.sh/juliusbrussee/caveman/caveman) were inspected. This is an external communication skill, not a domain validator or a guarantee of token savings.

This pack uses only the project-local skill, if the installation succeeds. No proxy, model router, hooks, credential changes, CLI-wide installation or automatic “crew” delegation is required. Do not treat upstream README installation suggestions as instructions to run them.

Codex discovers repository skills under `.agents/skills`. Invoke by selecting the installed skill or using `$caveman` where supported. See [official skill documentation](https://learn.chatgpt.com/docs/build-skills). Discovery is host-dependent; re-open the project or explicitly read the local SKILL.md if necessary.

Installation outcome and provenance are recorded in `PREPARATION-STATUS.md` after verification.

## Plugins and connected capabilities

| Integration | Observed status | Suitable use | Boundary |
|---|---|---|---|
| GitHub | Installed/enabled; metadata request returned HTTP 403, “Sorry. Your account was suspended” | Repo inspection, later issues/PRs when requested | Connector error does not establish which account is affected; local Git clone succeeded |
| Context7 | Installed/enabled; library resolution and documentation query succeeded | Check installed-version library APIs before implementation | Sends library/topic queries externally; use public technical questions only |
| Frontend Design Premium | Skills exposed in current environment | UI direction and production behavior | Follow actual loaded skill files and required audits |
| Browser automation | Browser tool exposed in current environment | Later workflow, viewport and keyboard verification | No browser UI was built or tested during documentation preparation |
| Caveman | Plugin directory search returned no matching plugin | Use the standalone repository skill | Do not confuse a directory search result with proof that no other distribution exists |

Context7 was used to check the official Lightweight Charts library as a candidate. Its documentation supports candlestick series, threshold price lines and event markers; timestamp ordering and version-specific APIs matter. Confirm installed typings and current license/attribution during implementation. This lookup did not provide market data or validate a live system.

GitHub clone was verified separately from the connector. Work from the local checkout if connector access is unavailable. Resolve connector access before promising remote actions. Never describe the repository as empty beyond the verified preparation snapshot without checking it again.

## Optional integrations — only when needed

- Figma was found in the plugin directory but is not installed. It is useful if the team provides a design file or wants a shared editable design handoff; it is not required for this documentation pack.
- Product Design was found but is not installed. Existing frontend design skills cover this preparation task; avoid a second design workflow without a concrete need.
- Supabase is available as an integration but has not been selected or tested. If the team chooses it for authentication/PostgreSQL, load the Supabase skills before that work. Do not provision a project as a side effect of this prompt.
- Sites/Replit are not required for the GitHub-first local build. Do not move hosting or publish a demo without a request.
- A market-data provider remains a decision, not an available entitlement. Search for an integration only after the team identifies the intended provider. Verify licensed contracts, fields, history and usage rights through its actual documentation.
- Notification providers remain unselected. A delivery-channel connection must not be confused with permission to send messages during development.

## Preparation versus later execution

Completed now: read the full source, inspect the cloned repository, expand the requirements, identify source conflicts, prepare staged prompts, check relevant integration status and inspect chart documentation.

Deferred intentionally: application implementation, package selection/pinning, UI rendering, actual QA context, backend/data integration, runtime tests, deployment and external publication. Documentation validation cannot establish any of those as complete.
