---
title: payroll-webapp
status: final
created: 2026-06-09
updated: 2026-06-09
---

# PRD: payroll-webapp
*Working title — confirm.*

## 0. Document Purpose

This PRD is for the product team, downstream BMad workflow owners (UX, Architecture, Epics & Stories), and stakeholders evaluating the build. It builds directly on the final product brief (`_bmad-output/planning-artifacts/briefs/brief-payroll-webapp-2026-06-09/brief.md`) and its referenced market and domain research — it does not duplicate them. Vocabulary is Glossary-anchored (§3); features are grouped with globally-numbered FRs nested under them (§4); inferences are tagged `[ASSUMPTION]` inline and indexed in §9. Technology and mechanism choices are deliberately excluded here — they belong in the architecture artifact and the run `addendum.md`. This draft was produced via Fast path under a user time-box; `[ASSUMPTION]` tags mark every inference that needs the user's confirmation.

## 1. Vision

Payroll for a mid-size Indian company is run by one person — Priya, the HR/payroll manager — who is held 100% accountable for an output she controls maybe 40% of. Every competitor already does the payroll *math* correctly; none own the **upstream data supply chain** — the late exits, silent CTC changes, and stale attendance feeds where real-world errors actually originate. This product reframes payroll as a **continuously-reconciled readiness score, not a monthly fire drill**: the home screen is a single live percentage that decomposes into exactly what is blocking a correct run.

Two numbers define everything we build and sell: **first-pass payroll accuracy** (pay runs completed with zero post-run corrections) and **Time-to-First-Payroll** (business days from data-complete to a correct first run). Accuracy is the promise Priya is judged on; we make it a structural outcome by catching bad inputs at a pre-flight gate before they reach a payslip. Time-to-First-Payroll is the buying decision; incumbents take 3–6 weeks to go live, and we get a customer to their first *correct* payroll within days of their data being complete.

The timing is the opening: India's Four Labour Codes went into force on 21 Nov 2025 (rules finalizing through 2026), forcing nearly every mid-size employer to restructure salaries, settle final dues within two working days, and keep fully digital records — shifting the compliance ground under every incumbent at once. In 2–3 years, "we run on the readiness score" is how mid-size India describes trusting its payroll numbers, and the freshness-and-handshake backbone becomes the platform for adjacent compliance and people-data workflows.

## 2. Target User

### 2.1 Jobs To Be Done

- **(Functional)** Run an accurate monthly payroll on a deadline that never moves, despite inputs I don't command.
- **(Functional)** Know — before I run — whether my data is complete and trustworthy, and exactly what is blocking 100%.
- **(Functional)** Settle a departing employee's full-and-final dues within the legally mandated 2 working days.
- **(Emotional)** Walk into the run with confidence instead of dread; trust the number I'm signing off on.
- **(Social)** Be seen as in-control and compliant by the CFO and by employees who query their pay.
- **(Functional)** Get onto a new payroll system and produce a correct first run in days, not weeks.

### 2.2 Non-Users (v1)

- Enterprise (500+ employee) payroll teams with multi-entity, multi-country, or deeply customized configs.
- Gig/contractor payout operators (different payout-rails problem and buyer).
- Companies wanting a full HRMS suite (performance, engagement, recruiting) as the primary system of record.
- Finance/HR contributors and the CFO are **participants** in specific flows (Change Handshake sign-off, switch approval) but are not the daily operator; employees are **read-only** consumers, not users who transact.

### 2.3 Key User Journeys

- **UJ-1. Priya confirms a green gauge instead of racing a cliff.**
  - **Persona + context:** Priya, sole payroll manager at a 220-person manufacturing firm, accountable for zero-error pay on the 28th.
  - **Entry state:** Authenticated on web, mid-month. Opens the workspace home screen.
  - **Path:** Sees the Payroll Readiness Score at 91%. Taps the decomposition: *"3 exits pending F&F · 18 unconfirmed CTC changes · attendance stale 5 days."* Works each blocker down over the following days.
  - **Climax:** On the 27th the gauge reads 100% with no manual override; the Run Payroll control is unblocked.
  - **Resolution:** She runs payroll in minutes and trusts it. No post-run correction follows.

- **UJ-2. A silent CTC change is caught before it becomes a wrong payslip.**
  - **Persona + context:** Finance raised 18 employees' CTC mid-cycle and, as always, didn't tell payroll.
  - **Entry state:** Priya opens the workspace; the Change Handshake has fired a diff.
  - **Path:** She sees *"18 records changed since last run"* with a per-record before/after diff and the originating signatory. She reviews, queries two, and signs off the rest.
  - **Climax:** The acknowledged changes flow into the run; the two queried records stay blocked until resolved.
  - **Resolution:** The run reflects reality. The prevented-error counter increments by the count she caught. **Edge case:** if a change arrives *after* sign-off but before run, the gauge drops and the run re-blocks until the new diff is acknowledged.

- **UJ-3. An exit becomes a countdown, not a buried notification.**
  - **Persona + context:** An employee resigns on the 3rd; their last working day triggers the statutory 2-working-day settlement deadline.
  - **Entry state:** The resignation enters via CSV import or manual entry.
  - **Path:** The Lifecycle-to-Payroll Clock starts an escalating countdown on the home screen, tied to the legal deadline. As HR-owned decisions (notice-period waiver) stall, the clock escalates amber → red.
  - **Climax:** Priya completes F&F before the deadline; the clock clears.
  - **Resolution:** The departing employee sees their settled F&F status in the self-service portal. **Edge case:** if the deadline is at risk, the item escalates to a top-of-screen alert with the responsible HR signatory named.

- **UJ-4. A new customer reaches a correct first payroll in days.**
  - **Persona + context:** Priya's company just switched from a 4-week-onboarding incumbent.
  - **Entry state:** Fresh tenant. Guided onboarding flow.
  - **Path:** She imports the employee master via CSV, supplies statutory IDs, connects one biometric source, and runs the 50%-wage-rule restructuring assistant to bring salary structures into Labour-Code compliance with an impact preview.
  - **Climax:** Data-complete is reached; the Time-to-First-Payroll clock starts and pre-validated compliance defaults carry her to a passing pre-flight.
  - **Resolution:** First correct payroll runs within the target window. **Edge case:** external latency (PF/ESI/PT registration, bank verification) is surfaced as an out-of-our-control dependency so the clock and the SLA stay honest.

## 3. Glossary

- **Payroll Readiness Score** — A single live percentage on the home screen expressing how ready the current pay cycle is to run correctly. Decomposes into named, countable blockers. Reaches 100% only when all blockers clear with no manual override.
- **Blocker** — A discrete, named input problem that holds the Readiness Score below 100% (e.g. a pending F&F, an unacknowledged CTC change, a stale attendance feed). Each maps to one of the four live inputs.
- **Data Freshness Vitals** — The live "last synced" status per upstream source (biometric, leave, finance). State is one of: fresh (green), stale (amber), dead (red). Never displays a fabricated green.
- **Upstream Source** — An external system feeding payroll inputs: a biometric device, a leave/attendance system, a finance/accounting system, or a CSV import.
- **The Change Handshake** — The mechanism by which any CTC or salary-structure edit originating outside payroll fires a diff with a sign-off gate into payroll. No changed record reaches a payslip without acknowledged review.
- **CTC Change** — A revision to an employee's cost-to-company or salary structure originating from Finance/HR.
- **Signatory** — A Finance/HR contributor accountable for a CTC Change, named on the Change Handshake diff.
- **Sign-off** — An explicit, audited acknowledgement by Priya (or a delegate) that a changed record has been reviewed and accepted into the run.
- **Lifecycle-to-Payroll Clock** — An escalating countdown that begins when a resignation/exit is recorded, tied to the statutory final-settlement deadline.
- **Full-and-Final Settlement (F&F)** — The final dues owed to a departing employee, legally due within 2 working days under the Labour Codes.
- **Pre-Flight Checklist** — The gate that must pass before the Run Payroll control unblocks: attendance synced, no pending exits, no unacknowledged CTC Changes, plus compliance defaults validated.
- **Run Payroll** — The action that executes a pay cycle. Blocked until the Pre-Flight Checklist passes.
- **First-Pass Payroll Accuracy** — % of pay runs completed with zero post-run corrections.
- **Prevented-Error Rate** — Count of input issues caught at the Pre-Flight gate before reaching a payslip.
- **Time-to-First-Payroll** — Median business days from **Data-Complete** to first correct payroll run.
- **Data-Complete** — The state where employee master + statutory IDs + at least one attendance sync are present. The Time-to-First-Payroll clock starts here, not at sign-up.
- **Compliance Engine** — The rules-versioned, state-aware engine computing PF, ESI, TDS, PT, and statutory payslip outputs.
- **Rules-Versioned** — Compliance rules are stored as dated, versioned rule sets so a run is computed against the rules in force for its period, never a hard-coded snapshot.
- **State-Aware** — Compliance computation respects per-Indian-state variation (notably PT and state-specific rules).
- **50%-Wage-Rule Restructuring Assistant** — A tool that restructures salary components so basic wage ≥50% of CTC per the Labour Codes, with an impact preview per employee. Doubles as the onboarding/acquisition hook.
- **Employee Self-Service Portal** — A read-only surface where employees view payslips and (for exiting employees) F&F status.

## 4. Features

### 4.1 Payroll Readiness Score (hero)

**Description:** The workspace home screen is a single live Payroll Readiness Score — a continuously-reconciled percentage that decomposes into exactly the Blockers holding it below 100%. It is computed from the four live inputs (§4.2–4.5). The monthly "run" becomes confirming a green gauge rather than racing a cliff. Realizes UJ-1.

**Functional Requirements:**

#### FR-1: Live Readiness Score

Priya can see a single Payroll Readiness Score for the current cycle on the home screen, updated continuously as upstream state changes. Realizes UJ-1.

**Consequences (testable):**
- The score recomputes whenever any of the four live inputs changes state (new Blocker, cleared Blocker, freshness transition).
- A score of 100% is reachable only when zero Blockers are open AND no manual override is active.
- The score is never displayed as 100% while any source is in `dead` state. [ASSUMPTION: a dead source caps the score below 100% regardless of other state.]

#### FR-2: Blocker decomposition

Priya can expand the score into a list of named, countable Blockers (e.g. "3 exits pending F&F · 18 unconfirmed CTC changes · attendance stale 5 days"), each linking to the input that owns it.

**Consequences (testable):**
- Every point of gap below 100% is attributable to at least one named Blocker; there are no unexplained deductions.
- Each Blocker links to its owning feature surface (§4.2–4.5) for resolution.

**Feature-specific NFRs:**
- Score and decomposition reflect upstream changes within a freshness window. [ASSUMPTION: near-real-time, target <60s after an ingested change — confirm acceptable latency.]

### 4.2 Data Freshness Vitals

**Description:** A live "last synced" pulse per Upstream Source — biometric, leave, finance. Fresh = green, stale = amber, dead = red. The product never displays a fabricated green checkmark; an unknown or failed sync is shown honestly. Realizes UJ-1.

**Functional Requirements:**

#### FR-3: Per-source freshness state

Priya can see, per Upstream Source, the last-synced timestamp and a freshness state of fresh / stale / dead.

**Consequences (testable):**
- A source with no successful sync within its staleness threshold renders amber; a source whose sync is failing renders red.
- No source ever renders green based on a stale or absent sync. [ASSUMPTION: staleness thresholds are per-source-type and configurable — defaults TBD with design partners.]

#### FR-4: Freshness feeds the score

A stale or dead source raises a Blocker that holds the Readiness Score below 100% until resolved.

**Consequences (testable):**
- A `dead` source produces a Blocker visible in the §4.1 decomposition.
- Restoring a healthy sync clears the Blocker and recomputes the score.

### 4.3 The Change Handshake

**Description:** Any CTC Change or salary-structure edit originating from Finance/HR fires a "N records changed since last run" diff into payroll with a Sign-off gate. Nothing reaches a payslip without acknowledged review. Each diff names the originating Signatory. Realizes UJ-2.

**Functional Requirements:**

#### FR-5: Change diff with sign-off gate

Priya can review a per-record before/after diff of all CTC Changes since the last run, and must Sign-off before any changed record enters the run. Realizes UJ-2.

**Consequences (testable):**
- An unacknowledged CTC Change raises a Blocker and is excluded from the run until signed off.
- The diff shows old value, new value, effective date, and the responsible Signatory for each changed record.
- Priya can sign off, query/hold, or reject each record individually.

#### FR-6: Post-sign-off change re-blocks

A CTC Change arriving after Sign-off but before Run Payroll re-opens the gate for the affected records.

**Consequences (testable):**
- A change ingested after sign-off drops the Readiness Score and re-blocks the run until the new diff is acknowledged. Realizes UJ-2 (edge case).

**Feature-specific NFRs:**
- Every Sign-off, hold, and rejection is recorded with actor, timestamp, and the record state acknowledged (see Audit Trail, §10).

### 4.4 Lifecycle-to-Payroll Clock

**Description:** A recorded resignation/exit becomes an escalating countdown on the home screen, tied to the statutory 2-working-day F&F deadline — not a buried notification. As HR-owned decisions stall, the clock escalates. Realizes UJ-3.

**Functional Requirements:**

#### FR-7: Escalating settlement countdown

Priya can see, per exit, a countdown to the statutory F&F deadline that escalates green → amber → red as the deadline approaches. Realizes UJ-3.

**Consequences (testable):**
- The countdown is computed against working days per the applicable statutory rule, not calendar days. [ASSUMPTION: working-day calendar is configurable per state/employer holiday list.]
- An exit at risk of breaching the deadline escalates to a top-of-screen alert naming the responsible HR Signatory.
- A pending F&F raises a Blocker in the §4.1 decomposition until settled.

#### FR-8: F&F status visibility

Priya can view and progress each exit's F&F state, and the resolved status propagates to the exiting employee's self-service view (§4.9).

**Consequences (testable):**
- Settling F&F clears the Blocker and the clock.
- The settled status becomes visible to the exiting employee in the portal. Realizes UJ-3.

### 4.5 Pre-Flight Checklist & Run Gate

**Description:** "Run Payroll" is blocked until the Pre-Flight Checklist passes — attendance synced, no pending exits, no unacknowledged CTC Changes, compliance defaults validated. A pilot's-checklist model: the structural enforcement that converts the Readiness Score into a hard gate. Realizes UJ-1.

**Functional Requirements:**

#### FR-9: Run gate enforcement

Priya cannot trigger Run Payroll while any Pre-Flight item is failing.

**Consequences (testable):**
- The Run Payroll control is disabled (not merely warned) while any Pre-Flight check fails.
- Each failing check is listed with the specific Blocker(s) and a link to resolve it.

#### FR-10: Prevented-error capture

Each input issue caught at the Pre-Flight gate before reaching a payslip is counted toward the Prevented-Error Rate.

**Consequences (testable):**
- Every Blocker resolved before a run increments the prevented-error counter for that cycle. Validates SM-3.
- The cycle's prevented-error count is reportable (the proof-of-thesis demo stat).

**Notes:**
- [NOTE FOR PM] Whether an override path exists for a manager who insists on running with a known Blocker is an open question (OQ-1). Default stance: no silent override; any override is explicit, audited, and caps the Readiness Score below 100%.

### 4.6 Compliance Engine (rules-versioned, state-aware)

**Description:** The table-stakes compliance floor — PF, ESI, TDS, PT, statutory payslips, multi-state — built as a Rules-Versioned, State-Aware engine, because the Labour Code rules are still landing through 2026 and must not be hard-coded to a 2025 snapshot.

**Functional Requirements:**

#### FR-11: Statutory computation

The Compliance Engine computes PF, ESI, TDS, and PT for each employee per the rules in force for the pay period and the employee's applicable state.

**Consequences (testable):**
- A run is computed against the Rules-Versioned rule set effective for that period, not the latest snapshot.
- PT and any state-specific rules resolve per the employee's State-Aware jurisdiction.
- A statutory payslip is produced per employee reflecting these computations.

#### FR-12: Rule versioning

The product can carry multiple dated versions of a compliance rule and apply the correct version per run period.

**Consequences (testable):**
- Updating a rule set creates a new dated version without mutating prior runs' computations.
- A re-run of a historical period uses that period's rule version. [ASSUMPTION: historical re-run is in scope for v1 — confirm.]

**Feature-specific NFRs:**
- Multi-state support covers the states where design-partner employees are based at minimum; the engine must not assume a single state.

### 4.7 50%-Wage-Rule Restructuring Assistant

**Description:** A guided assistant that restructures salary components so basic wage ≥50% of CTC per the Labour Codes, with a per-employee impact preview (take-home, PF, gratuity implications). Every mid-size employer needs this right now, so it doubles as the onboarding/acquisition hook. Realizes UJ-4.

**Functional Requirements:**

#### FR-13: Restructuring with impact preview

Priya can run a bulk restructuring that brings salary structures into 50%-wage-rule compliance and preview the per-employee impact before applying.

**Consequences (testable):**
- The assistant flags every employee whose structure violates the 50% rule.
- The preview shows before/after for affected components per employee before any change is committed.
- Applying the restructuring routes through the Change Handshake (§4.3) so changes are audited, not silent. [ASSUMPTION: restructuring output is itself a tracked change set.]

### 4.8 Guided Onboarding & Time-to-First-Payroll Instrumentation

**Description:** A guided setup flow that takes a new tenant from empty to a correct first payroll, instrumented to measure Time-to-First-Payroll. The clock starts at Data-Complete, never at sign-up, because that measures our product and not the customer's data-gathering speed. Pre-validated compliance defaults reduce setup time. Realizes UJ-4.

**Functional Requirements:**

#### FR-14: Guided setup to data-complete

A new customer can complete employee-master import, statutory IDs, and at least one attendance sync through a guided flow that detects the Data-Complete state.

**Consequences (testable):**
- The flow surfaces remaining steps to Data-Complete at each stage.
- Reaching Data-Complete is detected and timestamped.

#### FR-15: Time-to-First-Payroll measurement

The product measures Time-to-First-Payroll as business days from the Data-Complete timestamp to the first correct payroll run. Validates SM-2.

**Consequences (testable):**
- The clock starts at Data-Complete, not sign-up.
- External-latency dependencies (PF/ESI/PT registration, bank verification) are surfaced as out-of-our-control so the metric stays honest. Realizes UJ-4 (edge case).

### 4.9 Employee Self-Service Portal (read-only)

**Description:** A deliberately read-only surface where employees view their payslips, and exiting employees view their F&F status. Read-only by design to protect onboarding speed and avoid reopening scope; it fits the digital-records mandate and gives the exiting employee visibility into their statutory settlement.

**Functional Requirements:**

#### FR-16: Read-only payslip & F&F access

An employee can view their own payslips; an exiting employee can additionally view their F&F status.

**Consequences (testable):**
- The portal exposes no write/edit actions in v1.
- An employee sees only their own records.
- F&F status shown to an exiting employee reflects the resolved state from §4.4 (FR-8).

### 4.10 Integrations (pinned v1 set)

**Description:** Concrete, pinned v1 integrations — not "the most common ones." Biometric sources feed attendance; finance/accounting sources feed CTC Changes; bank portals handle disbursement; CSV handles employee-master import.

**Functional Requirements:**

#### FR-17: Biometric attendance ingestion

The product ingests attendance from eSSL, ZKTeco, Biomax, and Matrix COSEC devices.

**Consequences (testable):**
- Each supported device feeds Data Freshness Vitals (§4.2) with a last-synced state.
- A failed/absent sync renders as stale/dead, never green. [ASSUMPTION: device transport patterns (ADMS/WDMS push + REST-webhook) are an architecture concern; captured in addendum.]

#### FR-18: Finance/accounting ingestion

The product ingests CTC/structure data from Tally, Zoho Books, and QuickBooks.

**Consequences (testable):**
- Changes from a connected finance source surface through the Change Handshake (§4.3).

#### FR-19: Bank disbursement

The product supports salary disbursement via bank portals. [ASSUMPTION: specific bank set to be pinned with design partners; treated as integration surface, not a payout-rails build.]

**Consequences (testable):**
- A disbursement file/instruction is produced from a completed run.

#### FR-20: CSV employee-master import

Priya can import the employee master via CSV.

**Consequences (testable):**
- CSV import populates the employee master toward the Data-Complete state (§4.8).
- Import validates required fields and reports rejected rows rather than failing silently.

**Notes:**
- [NON-GOAL for MVP] Deep bidirectional HRMS sync — CSV import is the only HRMS data path in v1.

## 5. Non-Goals (Explicit)

- **Not a full HRMS suite.** No performance, engagement, or recruiting modules. We are payroll-first.
- **Not a bidirectional HRMS sync platform.** CSV employee-master import is in; two-way live sync with competitor HRMS is out — this is the integration trap that reopens scope mid-build.
- **Not multi-country / multi-currency.** India-only is a deliberate moat; compliance depth is the point. A design partner with an overseas subsidiary cannot reopen this in v1.
- **Not a gig/contractor payout rail.** Different payout problem, different buyer — not merely "later."
- **Not an enterprise (500+) configuration platform.** No multi-entity / heavily-customized enterprise configs in v1.
- **Not a calculation-differentiated product.** We do not win on better math; we win on owning the input supply chain. The math is table stakes.

## 6. MVP Scope

### 6.1 In Scope

- Payroll Readiness Score home screen + its four live inputs: Data Freshness Vitals, The Change Handshake, Lifecycle-to-Payroll Clock, Pre-Flight Checklist (§4.1–4.5).
- Compliance floor: PF, ESI, TDS, PT, statutory payslips, multi-state — as a Rules-Versioned, State-Aware Compliance Engine (§4.6).
- 50%-Wage-Rule Restructuring Assistant with impact preview — the onboarding/acquisition hook (§4.7).
- Guided onboarding flow instrumented for Time-to-First-Payroll, clock from Data-Complete (§4.8).
- Employee Self-Service Portal, read-only: payslips + F&F status (§4.9).
- Pinned v1 integrations: eSSL / ZKTeco / Biomax / Matrix COSEC (biometric), Tally / Zoho Books / QuickBooks (finance), bank portals (disbursement), CSV employee-master import (§4.10).

### 6.2 Out of Scope for MVP

- Full HRMS suite — see §5. *(v2+)*
- Deep bidirectional HRMS sync — CSV import only in v1. *(v2+)* [NOTE FOR PM: emotionally load-bearing for any design partner already on an HRMS; revisit if timeline permits, but holding the line protects the build.]
- Multi-country / multi-currency — deliberate, not deferred.
- Gig/contractor payout rails — different buyer.
- Enterprise (500+) configs and the long-tail of every integration.
- Employee write/self-service transactions (declarations, reimbursements, profile edits) — portal is read-only in v1. *(v2 candidate)*

## 7. Success Metrics

**Primary**

- **SM-1: First-Pass Payroll Accuracy** — % of pay runs completed with zero post-run corrections. Target **≥99.5% at v1, ≥99.9% at maturity**. Validates FR-5, FR-9, FR-11. *This is the number we sell.*
- **SM-2: Time-to-First-Payroll** — median business days from Data-Complete to first correct payroll run. Target **≤3 business days**; beats the 3–6 week mid-market norm. Validates FR-14, FR-15.

**Secondary**

- **SM-3: Prevented-Error Rate** — count of input issues (stale attendance, unacknowledged CTC, pending F&F) caught at the Pre-Flight gate before reaching a payslip. Target: trend up and demoable per cycle. Validates FR-10. *Proof-of-thesis demo stat — a number no incumbent can report.*
- **SM-4: Clean run rate** — % of cycles where the Readiness Score reaches 100% before run with no manual override, run over run. Validates FR-1, FR-9.
- **SM-5: Supply-chain leading indicators** — reduction in last-minute exits and unacknowledged CTC changes reaching a payslip. Validates FR-5, FR-7.
- **SM-6: Retention / monthly active runs** — a manager who trusts the gauge keeps running on it. [ASSUMPTION: exact definition TBD.]
- **SM-7: Business** — design-partner conversions, then paid logos in the 50–500-emp band at the ₹40–150/emp/mo market rate. [ASSUMPTION.]

**Counter-metrics (do not optimize)**

- **SM-C1: Raw correction rate** — must NOT be driven down by suppressing surfaced-but-ignored input errors. We measure first-pass accuracy and prevented-error separately precisely so we don't get penalized for input errors we surfaced that the user ignored, nor claim no credit for errors we prevented. Counterbalances SM-1.
- **SM-C2: Time-to-First-Payroll gaming** — must NOT be improved by starting the clock late or quietly relaxing what "correct" means. The clock starts at Data-Complete and "correct" means zero post-run corrections. Counterbalances SM-2.
- **SM-C3: Onboarding speed at the cost of scope** — must NOT be improved by silently shipping write features into the read-only portal or skipping the Change Handshake. Counterbalances SM-2.

## 8. Open Questions

1. **OQ-1 (phase-blocker candidate):** Does an explicit, audited override exist for a manager who insists on running with a known Blocker, or is the gate absolute? Default stance: no silent override; explicit override caps the score <100% and is audited. (Relates to FR-9, FR-10.)
2. **OQ-2:** Per-source staleness thresholds and the working-day/holiday calendar source — configurable defaults to be set with design partners. (FR-3, FR-7.)
3. **OQ-3:** Is historical-period re-run (with that period's rule version) in v1 scope, or v2? (FR-12.)
4. **OQ-4:** Final Time-to-First-Payroll SLA — working target ≤3 business days; to be pinned with design partners. (SM-2.)
5. **OQ-5:** Acceptable Readiness Score recompute latency after an ingested change. (FR-1, FR-2.)
6. **OQ-6:** Pinned bank set for disbursement. (FR-19.)
7. **OQ-7:** Delegation model — can Priya delegate Sign-off, and to whom? (FR-5.)

## 9. Assumptions Index

- §4.1 / FR-1 — A `dead` source caps the Readiness Score below 100% regardless of other state.
- §4.1 — Readiness Score recompute target latency <60s after an ingested change.
- §4.2 / FR-3 — Staleness thresholds are per-source-type and configurable; defaults TBD.
- §4.4 / FR-7 — Working-day/holiday calendar is configurable per state/employer.
- §4.6 / FR-12 — Historical-period re-run is in v1 scope.
- §4.7 / FR-13 — Restructuring output is itself a tracked change set routed through the Change Handshake.
- §4.10 / FR-17 — Device transport patterns (ADMS/WDMS push + REST-webhook) are an architecture concern, captured in addendum.
- §4.10 / FR-19 — Specific bank set to be pinned with design partners; disbursement is an integration surface, not a payout-rails build.
- §7 / SM-6, SM-7 — Retention definition and business-metric targets TBD.
- Incumbent onboarding benchmark (3–6 weeks) inherited from brief `[ASSUMPTION]`.

---

## 10. Cross-Cutting NFRs

- **Accuracy integrity.** No payslip is produced from stale, dead, or unacknowledged input. This is the product's core promise (FR-4, FR-5, FR-9) and is system-wide, not feature-local.
- **Honest state.** The system never displays a fabricated green/healthy state. Unknown or failed = shown as such.
- **Auditability.** Every Sign-off, override, F&F resolution, and rule-version application is recorded with actor, timestamp, and the state acknowledged (see §11 Audit Trail).
- **Recompute freshness.** Readiness Score and Blocker decomposition reflect ingested changes within the agreed latency window (OQ-5).
- **Multi-state correctness.** Statutory computation must be correct across all states where employees are based; never assume a single jurisdiction.
- **Availability around the cycle.** Heightened reliability expectation in the run window (the days before payday). [ASSUMPTION: specific SLA TBD.]

## 11. Why Now

India's Four Labour Codes went into force on **21 Nov 2025**, with rules finalizing through 2026. This forces nearly every mid-size employer to: restructure salaries to the **50% wage rule**; settle final dues within **2 working days**; and keep **fully digital records**. The compliance ground is shifting under every incumbent simultaneously — a rare opening for an entrant that treats accuracy and fast, correct onboarding as the product, not a feature. The restructuring requirement in particular is a universal, time-sensitive need that doubles as our acquisition hook (§4.7). Building against a hard-coded 2025 snapshot would be obsolete on arrival — hence the Rules-Versioned engine (§4.6).

## 12. Compliance & Regulatory

- **Statutory scope (v1):** PF, ESI, TDS, PT, statutory payslips, multi-state — via the Rules-Versioned, State-Aware Compliance Engine (§4.6).
- **Four Labour Codes:** 50%-wage-rule salary structure (§4.7); 2-working-day F&F settlement (§4.4); digital-records mandate (supports the read-only portal, §4.9).
- **Rules-versioning is a compliance requirement, not an optimization:** rules are still landing through 2026; a run must compute against the rules in force for its period. [NOTE FOR PM] Source-of-truth and update cadence for statutory rule sets is an operational dependency to define before build (relates to OQ-3).

## 13. Constraints & Guardrails

- **Privacy / data governance.** The product holds sensitive PII and salary data for 50–500 employees per tenant. Tenant isolation and least-privilege access are assumed baseline. [ASSUMPTION: India data-residency expectations apply; confirm with design partners.]
- **Read-only employee surface (v1).** A deliberate guardrail: the portal exposes no write path, bounding the attack/scope surface and protecting onboarding speed (§4.9).
- **No silent overrides.** Any deviation from a passing Pre-Flight is explicit and audited (OQ-1).

## 14. Risks & Mitigations

- **Integration breadth creep** — the pinned-set discipline (§4.10) and the bidirectional-sync non-goal (§5) are the mitigation; resist "just one more device."
- **Statutory churn through 2026** — Rules-Versioned engine (§4.6) absorbs rule changes without code-level snapshots; needs a defined rule-update operational process (§12).
- **SLA falsifiability** — Time-to-First-Payroll measured from Data-Complete with external latency surfaced (FR-15) keeps the headline metric honest and defensible.
- **Manager ignores surfaced Blockers** — separating First-Pass Accuracy from Prevented-Error Rate (SM-1 vs SM-3, SM-C1) prevents both unfair penalty and false credit.
