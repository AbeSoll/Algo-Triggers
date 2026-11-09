# HedgeSignal: Algorithmic Hedging Trigger and Alert System

## Project Report and Agile Development Plan

**Document ID:** HS-PRJ-001  
**Version:** 0.2 — working draft  
**Prepared:** 5 November 2026  
**Classification:** Treat as internal working material; confirm the organisation's official classification before distribution.  
**Business sponsor, product owner and technical owner:** To be assigned  
**Status:** For stakeholder review; no business rule, budget, infrastructure choice or deployment is approved by this draft.

## Document control

| Version | Date | Description | Author / approval |
|---|---|---|---|
| 0.2 | 5 November 2026 | Revised project report and delivery plan | Prepared for review; approvals pending |

The proposed working name **HedgeSignal** is subject to departmental approval. This report and the companion Software Requirements Specification and System Design document (SRS) form a single documentation set. The SRS is the detailed source of truth for requirements, calculation semantics, interfaces, data and acceptance tests; this report provides project context, delivery and governance. Where the two differ, record the conflict and resolve it with the business owner rather than silently selecting one.

### Status language

- **Business need:** a proposed capability or condition that requires confirmation by its accountable business owner.
- **Proposed:** a recommended project choice in this draft, subject to review.
- **To be confirmed (TBC):** information needed from an accountable owner before the relevant feature or gate can be signed off.
- **Later:** a candidate capability outside the proposed first alert pilot, not a committed delivery.

Commercial options, estimates and schedule targets must be verified with their owners. They are not quotations, approved budgets, current entitlements or evidence of availability.

Planning has identified a possible 31 December 2026 test target, a FY2027 pilot execution phase and paper hedging as an earlier stretch objective. The fiscal-year labels, scope and schedule require sponsor clarification. This report proposes an alert pilot as an initial delivery slice; official milestones remain subject to confirmation.

## Contents

1. Executive summary
2. Project background and problem
3. Objectives, outcomes and success measures
4. Stakeholders and responsibilities
5. Scope and phased delivery
6. Current and proposed business processes
7. Feasibility and option assessment
8. Solution architecture and technology recommendation
9. Data sourcing, ownership and governance
10. Human-centred design approach
11. Agile SDLC and work management
12. Delivery schedule and Gantt chart
13. Resource, budget and procurement plan
14. Risk, issue, assumption and dependency register
15. Quality assurance, acceptance and pilot evaluation
16. Deployment, support and maintenance
17. Governance, decisions and approvals
18. Immediate work plan
19. Appendices: glossary, references and open questions

## 1. Executive summary

The department is exploring whether a simple system can monitor agreed hedging conditions and inform traders when those conditions are met. Market-data access and storage are important dependencies. The longer-term vision includes a no-code Brent futures and options research, monitoring and alert dashboard, with forecasting to be considered separately.

The proposed first deliverable is a **controlled alert pilot**: authorised users configure or select a business-approved scenario; the system evaluates permitted, identifiable input data; it records and explains a triggered event; and it sends a test email for human review. The scope does not place, route or execute a trade. A trader remains responsible for any subsequent decision outside the system. Paper-trading and automatic execution require separate scope, methods, approvals and controls.

The immediate work is to confirm the first end-to-end business scenario, source data and access rights, users, and success criteria. In parallel, two developers can establish a small modular application using React and TypeScript for the interface, Python and FastAPI for the API and evaluation service, and PostgreSQL for durable records. The suggested architecture is designed to run against synthetic or permitted test inputs initially and to connect to an approved data and email provider later.

The schedule in this document aims at a review by 31 December 2026, subject to sponsor confirmation. It is an **indicative target**, not an approved promise. Delivery depends on the scenario owner, infrastructure approval, staffing and data rights. If external dependencies are not ready, an appropriately labelled synthetic-data demonstration can still be reviewed, but it is not an operational market-monitoring pilot.

## 2. Project background and problem

The business wishes to reduce repetitive manual monitoring of hedging indicators and improve the consistency and traceability of signals. Candidate conditions involve hedge volume, WAPL, prices, option premiums and volatility. WAPL and the exact rules, data feeds and permissions require business confirmation.

The longer-term product vision includes three connected workspaces — Rules & Alerts, Market Explorer and Options Lab — with natural-language rule entry, historical replay, futures and options analytics. This is a useful long-term vision. Implementing it in full as a first release would require significant additional data, methodology, design and testing; its broader functions are therefore retained as candidates for later prioritisation.

### 2.1 Long-term frontend vision retained for prioritisation

The full source vision comprises connected Rules & Alerts, Market Explorer and Options Lab workspaces. Candidate capabilities include plain-language entry with clarification and editable structured rules; price, percentage, technical-indicator and option/strategy conditions; AND/OR grouping and configurable timing/cooldown; saved and versioned rules; historical trigger replay with event diagnostics; futures candles and moving averages, listed-contract curve and calendar spreads; options chain and premium/Greeks, vertical spreads and collars; and implied-volatility visualisation with an accessible alternative. The source also distinguishes alert replay from any hypothetical trading strategy with entry, exit, sizing, execution and cost assumptions. Later prioritisation, data availability and business approval determine whether and when each capability is built; the proposed narrow pilot is not a decision to discard that vision.

### Problem statement

Traders need a consistent way to monitor selected business conditions and review the evidence behind a signal. Manual checking can take attention and makes it harder to reconstruct the data and rule version used at a specific time. At present, the desired inputs, formulas, ownership, timing, delivery process and data permissions need confirmation before an automated signal can be trusted.

### Opportunity and constraints

The opportunity is to test whether a simple, explainable workflow reduces monitoring effort and produces a reproducible record. Constraints include limited development capacity, the need for authorised data, enterprise infrastructure and security approval, the quality and freshness of input data, and the time required for a business owner to validate the financial logic. Financial outcomes, trading profitability and operational readiness are not assumed.

## 3. Objectives, outcomes and success measures

### 3.1 Objectives

1. Agree and document at least one complete hedging scenario, including inputs, units, rule conditions, timing and expected results.
2. Build a prototype that evaluates the agreed scenario deterministically using explicitly labelled synthetic, replayed, manual or otherwise permitted test data.
3. Record the evidence for each event, including rule version, input values, timestamps and source/mode.
4. Send a test email through an approved channel and present the recorded notification outcome without claiming inbox delivery unless verified.
5. Obtain user feedback and determine whether further investment in a controlled operational pilot or additional features is justified.

These are proposed objectives. Scenario selection, quantitative targets and sign-off belong to the product owner and business sponsor.

### 3.2 Proposed pilot evaluation

| Measure | How to assess | Proposed acceptance basis / owner |
|---|---|---|
| Rule correctness | Compare a business-approved table of input cases and expected results with actual evaluation results, including boundary and missing-data cases | All agreed critical cases pass; trading owner approves the case set and results |
| Reproducibility | Repeat a test using the same rule version, inputs and evaluation context | Same recorded outcome and explainable input evidence; technical and business reviewers verify |
| Alert workflow | Exercise triggered, non-triggered and failed notification scenarios with a controlled recipient | Event is recorded; delivery state is reported honestly; designated recipient confirms test reception where applicable |
| Usability | Observe intended users completing agreed monitoring, event-review and pause tasks | Record completion, difficulties and changes; set any numerical target with the business owner before formal UAT |
| Data integrity | Inspect mode, source, instrument, unit, timestamps and stale/missing-data behaviour | No input is represented as live or current without supporting evidence; critical issues are resolved before pilot approval |
| Operational readiness | Review access, logging, backup/restore, monitoring and support ownership | Required gate items signed off for the intended environment; no claim of production readiness from a demo |

These measures are proposed and must be baselined. A trigger frequency is not a measure of trading profit, and a successful test email is not a delivery service-level guarantee.

## 4. Stakeholders and responsibilities

Actual names and decision rights must be confirmed. One person may hold more than one role; separation of duties should follow corporate policy.

| Role | Main responsibility |
|---|---|
| Executive sponsor / manager | Confirm objectives, priority, budget, target and go/no-go decisions |
| Product owner / trading business owner | Select scenario, define expected behaviour and accept the business result |
| Trader / analyst | Explain current workflow, validate terms and participate in usability and UAT sessions |
| Developers — proposed: Solehin and/or Harith | Design and implement agreed functionality, maintain tests and document technical decisions |
| Trading Digital / infrastructure team | Confirm available hosting, integration options, platform support and operational handover |
| Market-data owner / procurement | Verify permitted source, field coverage, rights, costs, retention and commercial terms |
| Information security / enterprise architecture | Review authentication, authorisation, data handling, vendor use and deployment controls |
| Email / identity administrator | Approve sender, recipients, integration permissions and operational limits |
| Support / operations owner | Own monitoring, incidents, backups, restoration and maintenance after handover |
| Independent reviewer or UAT lead, if assigned | Review evidence, defects and acceptance recommendation |

### Proposed decision matrix

| Decision | Recommender | Accountable approver |
|---|---|---|
| Pilot business scenario and expected results | Trading users and developer | Product owner |
| Data source, rights and contract | Data owner / procurement | Designated market-data authority |
| Hosting, architecture and vendor | Technical owner, Trading Digital | IT / enterprise authority under policy |
| Production or operational pilot release | Technical owner and UAT lead | Sponsor with required business, IT and security approvals |
| Change to a live rule | Rule owner and authorised administrator | Role defined by approved access policy |

## 5. Scope and phased delivery

### 5.1 Proposed scope of the first controlled alert pilot

- Identify an agreed business scenario and model each input with an instrument or business context, unit, source and timestamp as applicable.
- Accept an approved form of test data: synthetic fixtures, controlled replay, permissioned manual entry or an approved import. An actual connector is included only when access and rights are confirmed.
- Allow authorised users to review a structured representation of the supported rule, its version, status and data mode. Configuration breadth is limited to what the selected scenario needs.
- Evaluate the scenario in a background service at the approved cadence and only when required data meets agreed quality and freshness requirements.
- Record the evaluation and triggered event with enough evidence for review. Produce an email test alert and keep notification attempts and their states distinct from trigger events.
- Provide a compact monitoring view, event details, basic error states, pause/resume controls, role-based access and an audit trail appropriate for the pilot.
- Test business cases, boundary cases, missing/stale input, repeated evaluations, notification failures and basic usability.

The precise rule, trigger frequency, recipients, data retention, permitted user actions and acceptance thresholds remain open. The SRS records these as pending rather than filling them with assumed trading semantics.

### 5.2 Explicit exclusions from this pilot

- Real order entry, order routing, execution or integration with brokers, counterparties or exchanges for trading.
- Automatic trading decisions or a claim that a signal is a recommendation to trade.
- Production financial return, profit and loss, or trading performance claims inferred from trigger counts.
- Forecasting models or machine-learning predictions.
- A complete natural-language parser, advanced charting, full futures curve analytics, options ladder/Greeks, strategy builder and 3D volatility surface, unless separately prioritised and agreed.
- Paper trade simulation, historical strategy profitability and position management without a separately defined method and approval.

Historical event replay on controlled test cases may be useful for verification, but it is not necessarily a full backtesting product or an estimate of profitability.

### 5.3 Indicative phases

| Phase | Purpose | Gate to next phase |
|---|---|---|
| Discovery and feasibility | Agree scenario, data, stakeholders, initial requirements and architecture | Product owner and technical stakeholders review scope and dependencies |
| Controlled alert pilot | Demonstrate a reproducible rule, evidence and email using permitted data | Business cases, usability, security and operational checks reviewed |
| Operational monitoring, if approved | Monitor entitled data in a supported environment with accountable ownership | Formal data, security, support, reliability and release approvals |
| Paper-trading study, if approved | Evaluate simulation with explicit entry, exit, sizing, costs, execution and market assumptions | Separate methodology and business approval |
| Forecasting or automatic execution, if ever approved | Investigate additional models or trading integration | Separate business case, governance, architecture and risk assessment |

These are proposed project stages; the sponsor must confirm their relationship to the official programme phases.

## 6. Current and proposed business processes

### 6.1 Current process — to validate

The current process may involve consulting several business and market sources and applying hedging conditions. The exact sequence, tools, handoffs, checks and pain points need to be documented with the trading team. Do not assume all current activity is manual or that any named spreadsheet is an authoritative source without owner confirmation.

### 6.2 Proposed pilot process

1. The product owner selects a scenario and approves a written rule and worked cases.
2. The technical team records the rule as a versioned configuration and maps each input to an approved source and quality policy.
3. An authorised user reviews the instrument, conditions, data mode, recipients and summary before activating the pilot rule.
4. The background process obtains or receives the permitted input, validates the data and evaluates the rule at the agreed time.
5. When conditions are met according to the approved trigger policy, the system records the event and queues a test notification.
6. The system records each notification attempt and its known outcome. The user reviews the event and decides any subsequent action independently.
7. Users or operators investigate unavailable or stale inputs, failures and unexpected results; changes are controlled and auditable.

The detailed context diagram, DFDs, use cases, rule states and data model are maintained in the companion SRS.

## 7. Feasibility and option assessment

### 7.1 Technical feasibility

A small web application can implement rule evaluation, event records and email using established frameworks. Technical feasibility is conditional on obtaining a complete rule, suitable authorised data, secure hosting and appropriate operational support. An external platform can simplify hosting, but it does not remove the need to validate financial logic or data rights.

### 7.2 Operational feasibility

The system should fit an existing trader workflow and make conditions and data health understandable. Confirm user availability for requirements workshops, UAT and support handover. Alerts must not create unnecessary noise; cadence, repeat behaviour and recipients require business decisions.

### 7.3 Financial feasibility

The manager has indicated potential infrastructure, storage and maintenance funding, but an approved amount, cost owner and procurement route are not known. Costs may be dominated by licensed market data, enterprise infrastructure and operations rather than application code alone. Obtain current internal and vendor quotations before deciding. The cost model in Section 13 distinguishes one-off and recurring items.

### 7.4 Schedule feasibility

The proposed eight-week plan can deliver a controlled demonstration if the scenario and needed resources are available early. An operational monitoring pilot additionally depends on entitlements, enterprise approvals and service readiness; these may extend the schedule. Track the critical path weekly and revise dates when dependencies change.

### 7.5 Platform options

| Option | Advantages | Constraints / next action |
|---|---|---|
| Approved existing Trading Digital capability | May reuse corporate hosting, identity, support and data agreements | Confirm actual technical fit, ownership, access, storage and cost; no current entitlement is assumed |
| Company-approved environment with React, FastAPI and PostgreSQL | Clear separation of business logic and adapters; operational control | Requires an assigned infrastructure and support owner |
| Managed PostgreSQL / Supabase, subject to approval | May reduce database and authentication administration | Requires vendor, data-location, security, contract, backup and operational approval; not an automatic corporate fit |
| External managed platform/feed | May supply useful market and platform features | Confirm scope, price, rights, integration and exit arrangements before any procurement |

Trading Digital, Bloomberg BQuant and B-PIPE are possible options for assessment. Confirm current capabilities, limitations, costs and entitlements directly with their owners. A market-data feed does not by itself supply application logic, operating support or execution approval.

## 8. Solution architecture and technology recommendation

### 8.1 Proposed stack

| Layer | Proposed technology | Reason and decision boundary |
|---|---|---|
| User interface | React, TypeScript and Vite | Familiar modular web UI suitable for a compact dashboard; confirm with team capability |
| Application API | Python and FastAPI | Typed request validation, API documentation and access to Python calculation tools |
| Rule/evaluation domain | Python modules with explicit input/output contracts | Business rules are testable separately from the interface and data providers |
| Durable storage | PostgreSQL, company hosted or managed if approved | Structured relationships, transactions and audit records; deployment owner remains TBC |
| Worker/scheduling | Separate background process in the approved runtime | Evaluation and notifications continue independently of an open browser; exact scheduler TBC |
| Market data | Replaceable provider adapter(s) | Supports synthetic and permissioned sources without coupling domain logic to a vendor |
| Email | Approved corporate mail service adapter | Enables controlled pilot messaging; mailbox and sender permissions TBC |
| Delivery and quality | Git, automated tests and controlled environments | Versioning, repeatable checks and change review |

Use a modular application rather than multiple independently deployed services at the outset. The exact package versions, hosting topology, API contracts, database schema and schedule mechanism must be decided and tested during implementation. A framework does not guarantee security or correct calculations.

### 8.2 High-level architecture

```text
Authorised trader / analyst
         |
         v
React dashboard: rules, data status, events, notification status
         |
         v
FastAPI application: authentication, authorisation and use cases
         |
         +----> Rule domain: validated scenario and evaluation
         +----> PostgreSQL: rule versions, inputs, events and audit
         +----> Data adapter: synthetic / approved input source
         +----> Email adapter: approved corporate email service
         |
Background worker: collect / validate, evaluate, queue and retry
         |
Operational logs, monitoring, backup and support procedures
```

The domain layer must not depend on a screen, data vendor or email service. Instrument identity, units, as-of time, evaluation time and data mode must remain explicit across the boundaries. A failure to obtain valid inputs should be visible and must not silently produce a false signal.

### 8.3 Security and deployment assumptions

Use enterprise-approved identity where practical, least-privilege access, encrypted connections, protected secrets and separate development and pilot environments. The organisation must approve data classification, hosting, retention, backup/restore, logging, vendor use and operational access. Do not embed credentials in a browser or repository. An operational release needs a named owner and tested recovery procedures.

## 9. Data sourcing, ownership and governance

### 9.1 Data strategy

1. Create a field-by-field inventory for the chosen scenario, including business meaning, source, contract/tenor, unit, time, frequency, permissions, quality and owner.
2. Develop with synthetic cases or permitted test data and label them clearly in the interface and event evidence.
3. Investigate available internal spreadsheets and Trading Digital/Bloomberg arrangements with their owners; do not assume access or rights.
4. Assess providers for the exact futures and options fields required, their history, delays, API availability, commercial terms, automated use, storage and redistribution rights.
5. Map and test each field before enabling operational monitoring. Record data lineage and versions as required by the SRS.

Public Brent spot data can support generic technical experimentation but is not a substitute for a specific futures contract, option premium or volatility. Publicly visible delayed prices do not automatically grant rights to collect, store or use them for business alerts. Yahoo's applicable terms and provider rights require review before any business use. Confirm contracts with the market-data and legal/procurement owners.

Candidate sources to assess include a PCHP spreadsheet for volume and WAPL, calculated or Barchart volatility, and Barchart swap reference and option prices. Verify field definitions, permission for automated and commercial use, the particular instrument and contract, update frequency, retention and current pricing before relying on them. “Calculated” volatility requires a separately approved model, inputs and conventions. WAP/WAPL meaning and any difference between them need business confirmation.

### 9.2 Minimum data controls

- Distinguish source observation time, receipt time and evaluation time; display time zone explicitly.
- Define valid instrument, expiry, price field, units, precision and update cadence.
- Define a freshness limit and behaviour for missing, inconsistent, stale or unavailable data with the business owner.
- Keep demo, replay and live/authorised modes visibly distinct.
- Retain an evidence snapshot and rule version for each event in accordance with approved retention and licensing.
- Record data ingestion errors and provider incidents; define the responsible operator.

### 9.3 Email and event ownership

The event is a business record; an email is one delivery attempt. The interface should distinguish pending, accepted by provider, failure and unknown outcome. A provider acceptance is not proof of inbox delivery. Pilot recipients, sender identity, retry policy and handling of sensitive content require business and IT approval.

## 10. Human-centred design approach

The pilot should minimise unnecessary work while retaining essential context and controls. The proposed primary screen displays a scenario summary, input values and freshness, rule state and recent events. Users can open an event to inspect why it triggered, and use a separate review step before activating a rule. Show a clear text label alongside colour; use readable numbers and units. Preserve user input on validation or network errors and explain how to recover.

Plain-language explanations and connected workflows support a usable design. Natural-language parsing, advanced research panels and complex analytics are not needed to prove the first business scenario. A supported structured form and a clear rule summary provide a simpler initial workflow. Ambiguous financial terms must be resolved with the business owner, not guessed.

Arrange short sessions with intended traders: observe the user review a scenario, inspect the current data state, explain a trigger, identify a notification failure and pause a rule. Record task outcomes and difficulties, then agree changes. Verify keyboard operation, focus visibility, labels, contrast and layout in the actual implementation. The SRS contains detailed user-interface and acceptance requirements.

## 11. Agile SDLC and work management

### 11.1 Delivery method

Use short iterations with a prioritised backlog and a working increment at each review. Documentation is developed early enough to expose key business and security decisions, then revised when evidence changes. The aim is to avoid both starting implementation with undefined trading semantics and waiting for every future feature to be specified before testing the first scenario.

### 11.2 Proposed cadence

- **Planning:** at the start of each iteration, select a small goal and agreed backlog items.
- **Coordination:** brief check-ins during development; immediately surface blocked data or approvals.
- **Review:** demonstrate real completed behaviour and review results with trading users and stakeholders.
- **Retrospective:** identify process improvements and assign actions.
- **Backlog refinement:** update requirements, acceptance criteria, dependencies and estimates as understanding improves.

### 11.3 Initial backlog

| Priority | Epic / work item | Output | Dependency |
|---|---|---|---|
| P0 | Confirm scenario and business rules | Approved scenario description and expected-case table | Product owner and trading input |
| P0 | Inventory data and rights | Field map, sources, quality policy and entitlement questions | Data owner |
| P0 | Design pilot workflow and architecture | SRS baseline, diagrams, wireframes and design decisions | Scenario and technical review |
| P0 | Build deterministic evaluator and event evidence | Tested rule evaluation with controlled inputs | Approved semantics |
| P0 | Implement monitoring view and pause/review flow | User-reviewed working screen | Authorised role model |
| P0 | Send and record test emails | Email adapter, event/notification states and failure handling | Approved mail channel and recipient |
| P0 | Complete pilot validation and handover | UAT evidence, risk review and support plan | Scenario, test environment and reviewers |
| Later | Market Explorer, Options Lab and advanced analytics | Separate prioritised scope | Data and methodology decisions |
| Later | Paper trading / forecasting / execution | Separate business case and controls | Explicit approvals |

### 11.4 Definition of ready and done

**Ready:** an item has an owner, clear outcome, acceptance criteria, relevant inputs, known dependencies and a manageable scope. Financial calculations have approved worked examples before implementation.

**Done:** code and configuration are reviewed; relevant tests pass; data and error states are truthful; security and access checks apply; documentation and traceability are updated; the feature is demonstrated and its acceptance evidence recorded. Work blocked by an external decision remains open, not marked complete by assumption.

## 12. Delivery schedule and Gantt chart

### 12.1 Planning assumptions

The indicative target date of 31 December 2026 must be confirmed by the sponsor. The schedule below starts 5 November 2026 and is indicative calendar planning, not a commitment that staff or infrastructure are available. Weeks are planning buckets, not claims about public holidays or actual working capacity.

| Bucket | Dates (2026) |
|---|---|
| W1 | 5–11 November |
| W2 | 12–18 November |
| W3 | 19–25 November |
| W4 | 26 November–2 December |
| W5 | 3–9 December |
| W6 | 10–16 December |
| W7 | 17–23 December |
| W8 | 24–31 December |

**Legend:** █ planned activity; ◆ review or milestone. Tasks may overlap where their dependencies permit.

| Activity | W1 | W2 | W3 | W4 | W5 | W6 | W7 | W8 | Dependency / output |
|---|---|---|---|---|---|---|---|---|---|
| Stakeholder interviews and scenario selection | █ | █ |  |  |  |  |  |  | Product owner confirms first scenario |
| Data inventory, rights and infrastructure assessment | █ | █ | █ | █ | █ |  |  |  | Data and platform owners; may remain critical path |
| SRS, design and business examples | █ | █ | █ |  |  |  |  |  | Baseline reviewed; update through project |
| UX wireframe and user review |  | █ | █ |  |  |  |  |  | Intended users review main workflow |
| Environment, repository and quality setup |  | █ | █ |  |  |  |  |  | Approved access and development tools |
| Evaluator and controlled test fixtures |  |  | █ | █ | █ |  |  |  | Approved rule and worked examples |
| Data import / approved adapter |  |  | █ | █ | █ | █ |  |  | Dependent on permitted data and interface |
| Dashboard, event history and pause controls |  |  |  | █ | █ | █ |  |  | Stable API and rule states |
| Email integration and failure handling |  |  |  | █ | █ | █ |  |  | Approved sender, service and recipient |
| Integration, security and operational checks |  |  |  |  | █ | █ | █ |  | Environment and policies available |
| Business UAT and usability sessions |  |  |  |  |  | █ | █ |  | Reviewed test cases and user availability |
| Defect resolution, evidence and handover |  |  |  |  |  |  | █ | █ | Prioritised defects, owners and support plan |
| Scope and scenario baseline |  | ◆ |  |  |  |  |  |  | Business review |
| Working controlled-data demonstration |  |  |  | ◆ |  |  |  |  | Demonstration, not operational approval |
| Pilot review and recommendation |  |  |  |  |  |  |  | ◆ | Business and technical decision |

### 12.2 Milestones and gates

| Milestone | Indicative date | Entry evidence / decision |
|---|---|---|
| M1: agreed scope and first scenario | End W2 | Owner, rule description, worked cases, exclusions, acceptance approach and open questions |
| M2: controlled demonstration | End W4 | Rule evaluates labelled fixtures and records evidence; limitations visible |
| M3: integrated candidate | End W6 | Reviewable workflow, events, test alert path and initial technical checks |
| M4: pilot decision | End W8 | UAT outcome, unresolved defects, data/operational readiness and next-phase recommendation |

**Critical path:** business scenario and expected results → rule implementation and controlled-data verification → integrated event/email workflow → business UAT → pilot decision. An authorised market-data source and operational hosting form parallel gates for any market-connected or operational pilot. If they miss the plan, rebaseline the affected milestone; do not call synthetic demonstration results live monitoring.

## 13. Resource, budget and procurement plan

### 13.1 People and effort

The manager has suggested Solehin or Harith may develop the system. Their availability, experience, assigned roles and capacity have not been confirmed. A viable plan also needs business, market-data, IT/security and operations time. Estimate work in person-days after backlog refinement, record availability and holidays with the team, and include review and contingency capacity.

| Resource | Planning basis | Status |
|---|---|---|
| Application developers | Estimate frontend, backend, testing, integration and documentation effort from backlog | TBC |
| Trading subject-matter expert / product owner | Workshops, worked examples, reviews and UAT | TBC |
| Infrastructure, security and identity support | Environment setup, reviews and release support | TBC |
| Market-data owner / procurement | Rights, technical evaluation and commercial review | TBC |
| Support / operations | Monitoring, backup, incidents and maintenance | TBC |

### 13.2 Cost model — complete with quotations

| Cost category | One-off | Recurring | Information needed |
|---|---|---|---|
| Development and internal staff | Setup and initial build effort | Change and support effort | Team capacity, rates and accounting treatment |
| Hosting and compute | Setup / provisioning where applicable | Compute, network and environment costs | Approved platform and workload estimates |
| Database, storage and backups | Initial setup / migration | Capacity, retention, backup and recovery | Expected data volume and recovery objectives |
| Market data and history | Connection / onboarding if applicable | Subscription, exchange and usage fees | Exact fields, rights, history, users and provider quotation |
| Email delivery | Setup and approval | Mailbox or provider charges if applicable | Corporate service and volume |
| Security, monitoring and support | Review and setup | Monitoring, support, maintenance and upgrades | Service ownership and policy |
| Contingency | To be estimated | To be estimated | Sponsor-approved risk allowance |

**Total estimated cost of ownership = one-off costs + recurring costs over the agreed planning period + approved contingency.** No financial total is inserted because the inputs are not yet confirmed. Compare at least the company-approved internal platform and a managed alternative using consistent coverage, support, data rights and recovery assumptions. Current quotations and internal estimates must be obtained before budgeting.

## 14. Risk, issue, assumption and dependency register

Assess likelihood and impact with project owners; the ratings below are initial qualitative proposals and require review.

| ID | Type | Description and impact | Initial priority | Response / owner to assign |
|---|---|---|---|---|
| R01 | Risk | Rule or financial term is ambiguous, leading to an incorrect signal | High | Obtain written definition and independently reviewed boundary cases; trading owner |
| R02 | Risk | Exact market-data fields or rights are unavailable, delayed or too costly | High | Inventory fields and rights early; use labelled fixtures for development; data owner |
| R03 | Risk | Stale or missing data produces misleading monitoring | High | Define freshness and fail-safe behaviour; show data status; technical and business owners |
| R04 | Risk | A notification is delayed, duplicated, rejected or accepted without delivery | High | Durable event, attempt status, controlled retries and operational review; technical owner |
| R05 | Risk | Users mistake a test signal for a live recommendation or trade | High | Label mode and scope, explain data and keep execution outside pilot; product owner |
| R06 | Risk | Hosting, vendor or identity approval delays delivery | High | Engage IT and security early; establish approved fallback; project manager |
| R07 | Risk | Developer and business reviewer capacity is insufficient | Medium | Confirm capacity, narrow backlog and rebaseline schedule; sponsor |
| R08 | Risk | Rule changes destroy historical interpretability | High | Immutable versioned rules, event evidence and change audit; technical owner |
| R09 | Risk | Loss of data or lack of support interrupts a pilot | Medium | Assign operator, backups, restore test, monitoring and incident procedure |
| R10 | Risk | Scope expands to full analytics, paper trading or execution | High | Use change control and separate phase gates; product owner |
| A01 | Assumption | One business scenario can represent an end-to-end pilot | TBC | Confirm with trading owner |
| A02 | Assumption | An approved email channel and recipient are available | TBC | Confirm with IT and business |
| D01 | Dependency | Business owner approves scenario, input definitions and examples | Critical | Assign owner and decision date |
| D02 | Dependency | Data owner confirms entitlement, coverage and retention | Critical for connected pilot | Assign owner and decision date |
| D03 | Dependency | IT approves hosting, identity and any external service | Critical for hosted pilot | Assign owner and decision date |
| I01 | Open issue | Pilot scope and 31 December target have not been formally confirmed | Open | Sponsor decision |

Update owners, status, due dates and mitigation evidence at each review. Escalate critical unresolved dependencies before they affect the release gate.

## 15. Quality assurance, acceptance and pilot evaluation

### 15.1 Test approach

- **Business rule tests:** normal, boundary, equality, negative and missing-input examples agreed by the trading owner; test relevant units and rounding only after the convention is defined.
- **Integration tests:** controlled data input, persistence, event creation, email submission and visible status using test services.
- **Resilience tests:** stale data, unavailable source, duplicate evaluation, service restart, notification failure and recovery.
- **Access and audit tests:** role restrictions, rule version history and evidence access in the chosen environment.
- **Usability and accessibility:** realistic task observation plus keyboard, labels, focus, contrast and applicable screen-size checks.
- **Operational checks:** logs, alerting, backup and a restore test where the pilot environment requires them.

Test cases, expected outcomes, evidence and requirement traceability belong in the SRS and test records. Do not expose sensitive data to an unapproved test environment.

### 15.2 Pilot exit criteria

The proposed exit criteria are:

1. The selected scenario and business test examples have an identified approver and documented outcome.
2. All agreed critical test cases pass or have a documented, accepted disposition.
3. The result can be traced to its rule version, data inputs, timestamps and mode.
4. Trigger and email statuses are distinct and failures are visible to the user/operator.
5. The user can recognise an unavailable or stale source, and the agreed rule response is tested.
6. Intended users have reviewed the workflow and critical usability issues have owners and decisions.
7. Required data rights, security, operational support, backup and environment approvals match the actual proposed use.
8. Open defects, exclusions, limitations and the decision to proceed, extend or stop are recorded.

These are proposed criteria for review. A synthetic demonstration can meet a subset, but cannot satisfy live-data entitlement or operational-service gates merely by passing tests.

### 15.3 Review outputs

Produce a pilot results note containing test coverage, actual outcomes, known defects, user feedback, data mode and limitations, ongoing cost estimate, operating ownership and a recommendation. The sponsor determines whether to proceed to a further phase.

## 16. Deployment, support and maintenance

### 16.1 Environments and release

Maintain separate development/test and pilot environments where practical and according to policy. Store configuration and secrets using approved mechanisms. Before release, document the version, migration, configuration, owners, rollback method, data source, recipients and validation evidence. No deployment or access grant is authorised by this document alone.

### 16.2 Proposed runbook topics

1. Daily or agreed checks of worker health, source freshness, failed evaluations and notifications.
2. Incident detection, triage, escalation contacts and business communication.
3. Safe pause and recovery procedures after feed, service or email failure.
4. Backup frequency, retention, restore procedure and recovery test results, based on approved recovery objectives.
5. Account provisioning/revocation, access review and secret rotation.
6. Software and dependency updates, security patches and regression testing.
7. Rule change review, approval, versioning and historical evidence preservation.
8. Capacity, storage growth, usage and cost monitoring.
9. Vendor and data-licence renewal, and a documented exit/portability plan.

Assign an operational owner and support hours before an operational pilot begins. The service's actual availability and response commitments must be agreed; the draft does not imply 24-hour support.

## 17. Governance, decisions and approvals

### 17.1 Change control

Record each material change with its requestor, reason, affected requirements, data and risk impact, decision, approver and version. The product owner prioritises business changes; financial methodology, security, data rights and deployment changes require their respective owners. Keep prior rule versions and historical evidence intact. Review backlog and scope at each sprint review.

### 17.2 Decision register

| ID | Decision required | Owner to confirm | Needed before |
|---|---|---|---|
| DEC-01 | Name, scope and intended pilot users | Sponsor / product owner | Scope baseline |
| DEC-02 | First scenario, exact rule logic and expected cases | Trading business owner | Rule implementation |
| DEC-03 | Data fields, source, rights, freshness and retention | Market-data owner and business owner | Connected monitoring |
| DEC-04 | Hosting, identity, database and security architecture | IT / security / technical owner | Hosted pilot |
| DEC-05 | Sender, recipients, notification behaviour and retry rules | Business owner and email administrator | Email pilot |
| DEC-06 | Success targets, UAT sign-off and pilot date | Sponsor and product owner | Formal acceptance |
| DEC-07 | Support, recovery and cost owner | Operations and sponsor | Operational release |
| DEC-08 | Whether to pursue paper trading or other later capabilities | Sponsor with trading and risk stakeholders | Next-phase initiation |

### 17.3 Sign-off record

| Role | Name | Decision / comments | Date |
|---|---|---|---|
| Sponsor | Pending | Pending | Pending |
| Product / trading owner | Pending | Pending | Pending |
| Technical owner | Pending | Pending | Pending |
| Market-data owner | Pending | Pending | Pending |
| IT / security / operations | Pending | Pending | Pending |

## 18. Immediate work plan

1. Review this report and companion SRS with the manager and trading representative; confirm scope and owners.
2. Run a scenario workshop: select one actual use case and document every input, formula, timing, threshold, action and exception with worked examples.
3. Complete the field-level data inventory, including source, rights, availability, quality, timestamps, units and owner.
4. Confirm whether approved corporate infrastructure, identity and email can be used, and who will maintain them.
5. Convert agreed requirements and acceptance cases into a prioritised backlog and update the Gantt based on real capacity.
6. Produce a low-fidelity screen and walk it through with intended users.
7. Implement the first controlled-data vertical slice only after the relevant scenario semantics are approved; maintain the SRS and decision register as work progresses.

## 19. Appendices

### A. Glossary

| Term | Working meaning |
|---|---|
| Business scenario | A specific hedging monitoring use case with defined inputs, conditions and intended response |
| Rule version | An identifiable, immutable representation of the configuration used for an evaluation |
| Evaluation | Applying the approved rule to a defined set of input observations at a specified time |
| Trigger event | A recorded result when the approved event conditions and frequency policy are met |
| Notification attempt | An attempt to inform a recipient about an event; distinct from the event itself |
| Synthetic data | Artificial values created for testing and labelled so they are not mistaken for market observations |
| Replay | Re-evaluating a rule against a specified, time-ordered dataset under documented conditions |
| Paper trading | A simulated trade workflow requiring explicit assumptions; separate from an alert |
| WAPL | Business term whose expansion, formula, population, period and units require confirmation |
| OVML | Bloomberg option valuation functionality; required fields and rights need confirmation |

### B. Technical references

| Reference | Use and limitations |
|---|---|
| [React documentation](https://react.dev/learn) and [FastAPI documentation](https://fastapi.tiangolo.com/) | Framework reference; version and deployment choices remain to be confirmed |
| [Supabase production checklist](https://supabase.com/docs/guides/deployment/going-into-prod) | Managed-platform security and production considerations; corporate approval still required |
| [US EIA Open Data](https://www.eia.gov/opendata/) | Example public data for technical exploration; not evidence of suitable futures/options coverage |
| [ICE market data](https://www.ice.com/oil) and [ICE data services](https://www.ice.com/fixed-income-data-services/data-and-analytics/proprietary-data) | Market-data context; licensing and exact product coverage must be confirmed |
| [Yahoo terms of service](https://legal.yahoo.com/us/en/yahoo/terms/otos/index.html) | Review applicable restrictions before any business use |
| [Microsoft Graph email processing](https://learn.microsoft.com/en-us/graph/outlook-things-to-know-about-send-mail) | Distinguishes mail submission and downstream processing; corporate approval is still needed |

### C. Open questions for workshops

1. Which one or two scenarios demonstrate the business value and who approves them?
2. What do hedge volume, WAPL, swap reference, option premium and volatility mean in the selected scenario, including units, instruments and calculation time?
3. Are conditions combined with AND, OR, stages or alternative scenarios? What happens at equality and when a value is missing?
4. Is the rule evaluated on each update, at a scheduled time, at a completed bar or by another defined policy? What constitutes a new trigger and reset?
5. What exact data is available, authorised, timely and affordable? Can it be stored, replayed and used for automated alerts?
6. Who can create, approve, activate, pause, change and view a rule? Who receives alerts and who supports the service?
7. Is the December milestone for a synthetic demonstration, an authorised-data pilot or paper trading?
8. What are the acceptance targets, environment requirements, budget authority and post-pilot decision process?
