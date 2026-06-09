---
stepsCompleted: [1, 2, 3, 4, 5]
status: complete
date_completed: 2026-06-09
total_epics: 6
total_stories: 27
total_frs_covered: 20
validation_status: passed
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-payroll-webapp-2026-06-09/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-designs/ux-payroll-webapp-2026-06-09/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-payroll-webapp-2026-06-09/EXPERIENCE.md
project_name: payroll-webapp
---

# payroll-webapp - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for payroll-webapp, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories. The product is an end-to-end payroll web application for the Indian market, built around owning the upstream data supply chain to deliver first-pass accuracy (≥99.5%) and Time-to-First-Payroll (≤3 days).

## Requirements Inventory

### Functional Requirements

**Payroll Readiness Score (hero feature)**
- FR-1: Live Readiness Score — Priya can see a single Payroll Readiness Score for the current cycle on the home screen, updated continuously as upstream state changes. The score recomputes whenever any of the four live inputs changes state; a score of 100% is reachable only when zero Blockers are open AND no manual override is active; a dead source caps the score below 100% regardless of other state.
- FR-2: Blocker decomposition — Priya can expand the score into a list of named, countable Blockers (e.g. "3 exits pending F&F · 18 unconfirmed CTC changes · attendance stale 5 days"), each linking to the input that owns it. Every point of gap below 100% is attributable to at least one named Blocker.

**Data Freshness Vitals**
- FR-3: Per-source freshness state — Priya can see, per Upstream Source (biometric, leave, finance), the last-synced timestamp and a freshness state of fresh / stale / dead. A source with no successful sync within its staleness threshold renders amber; a source whose sync is failing renders red. No source ever renders green based on a stale or absent sync.
- FR-4: Freshness feeds the score — A stale or dead source raises a Blocker that holds the Readiness Score below 100% until resolved. A dead source produces a Blocker visible in the decomposition. Restoring a healthy sync clears the Blocker and recomputes the score.

**The Change Handshake**
- FR-5: Change diff with sign-off gate — Priya can review a per-record before/after diff of all CTC Changes since the last run, and must Sign-off before any changed record enters the run. An unacknowledged CTC Change raises a Blocker and is excluded from the run until signed off. The diff shows old value, new value, effective date, and the responsible Signatory for each changed record. Priya can sign off, query/hold, or reject each record individually.
- FR-6: Post-sign-off change re-blocks — A CTC Change arriving after Sign-off but before Run Payroll re-opens the gate for the affected records. A change ingested after sign-off drops the Readiness Score and re-blocks the run until the new diff is acknowledged.

**Lifecycle-to-Payroll Clock**
- FR-7: Escalating settlement countdown — Priya can see, per exit, a countdown to the statutory F&F deadline that escalates green → amber → red as the deadline approaches. The countdown is computed against working days per the applicable statutory rule, not calendar days. An exit at risk of breaching the deadline escalates to a top-of-screen alert naming the responsible HR Signatory. A pending F&F raises a Blocker in the decomposition until settled.
- FR-8: F&F status visibility — Priya can view and progress each exit's F&F state, and the resolved status propagates to the exiting employee's self-service view. Settling F&F clears the Blocker and the clock. The settled status becomes visible to the exiting employee in the portal.

**Pre-Flight Checklist & Run Gate**
- FR-9: Run gate enforcement — Priya cannot trigger Run Payroll while any Pre-Flight item is failing. The Run Payroll control is disabled (not merely warned) while any Pre-Flight check fails. Each failing check is listed with the specific Blocker(s) and a link to resolve it.
- FR-10: Prevented-error capture — Each input issue caught at the Pre-Flight gate before reaching a payslip is counted toward the Prevented-Error Rate. Every Blocker resolved before a run increments the prevented-error counter for that cycle.

**Compliance Engine (rules-versioned, state-aware)**
- FR-11: Statutory computation — The Compliance Engine computes PF, ESI, TDS, and PT for each employee per the rules in force for the pay period and the employee's applicable state. A run is computed against the Rules-Versioned rule set effective for that period, not the latest snapshot. PT and any state-specific rules resolve per the employee's State-Aware jurisdiction. A statutory payslip is produced per employee reflecting these computations.
- FR-12: Rule versioning — The product can carry multiple dated versions of a compliance rule and apply the correct version per run period. Updating a rule set creates a new dated version without mutating prior runs' computations. A re-run of a historical period uses that period's rule version.

**50%-Wage-Rule Restructuring Assistant**
- FR-13: Restructuring with impact preview — Priya can run a bulk restructuring that brings salary structures into 50%-wage-rule compliance and preview the per-employee impact before applying. The assistant flags every employee whose structure violates the 50% rule. The preview shows before/after for affected components per employee before any change is committed. Applying the restructuring routes through the Change Handshake so changes are audited, not silent.

**Guided Onboarding & Time-to-First-Payroll Instrumentation**
- FR-14: Guided setup to data-complete — A new customer can complete employee-master import, statutory IDs, and at least one attendance sync through a guided flow that detects the Data-Complete state. The flow surfaces remaining steps to Data-Complete at each stage. Reaching Data-Complete is detected and timestamped.
- FR-15: Time-to-First-Payroll measurement — The product measures Time-to-First-Payroll as business days from the Data-Complete timestamp to the first correct payroll run. The clock starts at Data-Complete, not sign-up. External-latency dependencies (PF/ESI/PT registration, bank verification) are surfaced as out-of-our-control so the metric stays honest.

**Employee Self-Service Portal (read-only)**
- FR-16: Read-only payslip & F&F access — An employee can view their own payslips; an exiting employee can additionally view their F&F status. The portal exposes no write/edit actions in v1. An employee sees only their own records. F&F status shown to an exiting employee reflects the resolved state from the Lifecycle-to-Payroll Clock.

**Integrations (pinned v1 set)**
- FR-17: Biometric attendance ingestion — The product ingests attendance from eSSL, ZKTeco, Biomax, and Matrix COSEC devices. Each supported device feeds Data Freshness Vitals with a last-synced state. A failed/absent sync renders as stale/dead, never green.
- FR-18: Finance/accounting ingestion — The product ingests CTC/structure data from Tally, Zoho Books, and QuickBooks. Changes from a connected finance source surface through the Change Handshake.
- FR-19: Bank disbursement — The product supports salary disbursement via bank portals. A disbursement file/instruction is produced from a completed run.
- FR-20: CSV employee-master import — Priya can import the employee master via CSV. CSV import populates the employee master toward the Data-Complete state. Import validates required fields and reports rejected rows rather than failing silently.

### Non-Functional Requirements

- NFR-1: Accuracy integrity — No payslip is produced from stale, dead, or unacknowledged input. This is the product's core promise and is system-wide, not feature-local.
- NFR-2: Honest state — The system never displays a fabricated green/healthy state. Unknown or failed = shown as such.
- NFR-3: Auditability — Every Sign-off, override, F&F resolution, and rule-version application is recorded with actor, timestamp, and the state acknowledged.
- NFR-4: Recompute freshness — Readiness Score and Blocker decomposition reflect ingested changes within the agreed latency window (target <60s after an ingested change).
- NFR-5: Multi-state correctness — Statutory computation must be correct across all states where employees are based; never assume a single jurisdiction.
- NFR-6: Availability around the cycle — Heightened reliability expectation in the run window (the days before payday).
- NFR-7: Data residency — India data residency for sensitive PII and salary data.
- NFR-8: Tenant isolation — Strong isolation between tenants (50–500 employees per tenant).
- NFR-9: Security — Encryption at rest and in transit; RBAC with role-based access control.

### Additional Requirements (Architecture)

**Technology Stack & Infrastructure**
- AR-1: Frontend technology — React + TypeScript with design-token layer seeded from DESIGN.md tokens.
- AR-2: Backend technology — TypeScript (Node.js) monorepo with shared types between front-end and back-end.
- AR-3: Database — PostgreSQL with Row-Level Security for tenant isolation and native support for effective-dated rule tables.
- AR-4: Async processing — Durable queue (e.g., PG-backed or Redis-backed worker) for source polling, challan/payslip generation, disbursement files, and clock escalation.
- AR-5: Authentication — Hosted OIDC identity provider + app-level RBAC with roles: Operator (Priya), Finance Signatory, Employee (read-only).
- AR-6: Hosting environment — Cloud hosting in India region (e.g., ap-south-1) for data residency compliance.

**Data Architecture (Critical)**
- AR-7: Compliance rules as data — Compliance rules are effective-dated, versioned rows in the database, not application code. Rules are stored as `compliance_rule_set(id, rule_type, jurisdiction, effective_from, effective_to, version, params_jsonb)`.
- AR-8: Rule versioning for runs — A pay run records the rule-set versions it computed against. Re-running a historical period re-resolves the rule set as-of that period's effective dates.
- AR-9: Pure calculation core — The compliance calculation is a pure function: `compute(employee, period, resolved_rules) → statutory_outputs`. No I/O, fully testable.
- AR-10: Money as integer paise — All money is stored and computed as integer paise everywhere; formatting to ₹ happens only at the edge (UI/export).
- AR-11: State-aware computation — PT and state-specific rules resolve by the employee's jurisdiction; the engine never assumes a single state.
- AR-12: Tenant isolation — Row-Level Security on `tenant_id` enforces tenant isolation at the database level.
- AR-13: Append-only change tracking — Change-set + sign-off is append-only (who/when/what-state-acknowledged) to satisfy audit requirements and support post-sign-off re-blocking.
- AR-14: Source freshness tracking — Freshness tracked per (tenant, source) with `last_success_at` timestamp and state derived by staleness threshold.

**Integration & Event Architecture**
- AR-15: Adapter pattern — Every source implements a stable internal contract (pull/receive → normalized records → freshness heartbeat). Adding a device or finance tool = a new adapter, not core changes.
- AR-16: Webhook receivers — Biometric ADMS/WDMS push patterns via webhook receivers for eSSL, ZKTeco, Biomax, Matrix COSEC.
- AR-17: Scheduled pollers — Finance source pollers/connectors for Tally, Zoho Books, QuickBooks; detected deltas raise `ChangeDetected` → Change Handshake.
- AR-18: Event-driven readiness service — Readiness Service subscribes to domain events (`SourceSynced`, `SourceWentStale`, `ChangeDetected`, `ChangeSignedOff`, `ExitRecorded`, `FFSettled`, `PreFlightItemChanged`) and recomputes the score + blocker decomposition in real-time.
- AR-19: Derived state — The Readiness Score is derived state, never hand-edited.

### UX Design Requirements

**Design Tokens & Visual System**
- UX-DR-1: Color palette — Semantic colors: bg (#0f1419), surface (#18202b), surface-2 (#1f2937), line (#2b3645), text (#e6edf3), muted (#93a1b1), ready (#2ecc71), warning (#f5a623), critical (#e74c3c), action (#4f8cff), on-ready (#06210f), on-action (#021024). **Cardinal rule:** green is earned, never assigned; unknown/stale/failed must render warning or critical, never green.
- UX-DR-2: Typography system — Display 56px/800 (gauge numeral); Card headers 14px/600 uppercase with 0.6px tracking; Body 14px/400; Small 13px/400; Micro 11–12px/500 uppercase; Metric values 26px/800. System font stack only (Segoe UI, system-ui, -apple-system, Roboto, sans-serif). Tabular numerals on gauge and clock.
- UX-DR-3: Spacing grid — Page max 1180px; page padding 28px; grid gap 24px; card padding 18px; stack gap 12–14px.
- UX-DR-4: Border radius — Cards 14px; controls 10px; chips 20px (pill); pulses 50% (full circle).
- UX-DR-5: Elevation — Flat slate planes with one soft shadow (0 6px 24px rgba(0,0,0,.35)) on cards; header floats via `backdrop-filter: blur(6px)`.

**UI Components (Implementation Specs)**
- UX-DR-6: Gauge component — 230px SVG progress ring on a line-colored track; arc colored by score→hue (≥100=ready, 80–99=warning, <80=critical); fills from 0 with .6s ease sweep on load and on every change; centered 56px/800 numeral + "READY" label; 18px stroke with round line-caps.
- UX-DR-7: Readiness card — Left rail, 360px fixed. Contains gauge + status line + run-button. The product's visual home.
- UX-DR-8: Run button — Full-width. Two states only: **ready** (ready-color fill, on-ready text, enabled, "▶ Run Payroll — N employees") and **blocked** (muted #36404d fill, disabled, "🔒 Run Payroll — blocked by pre-flight"). Binary gate; never a third "warn-and-allow" state.
- UX-DR-9: Blocker row — Icon tile (severity-tinted) + title + description + category tag chip (Lifecycle Clock / Change Handshake / Freshness Vitals / Compliance floor) + action button. Resolved rows strike through and flip icon to green check.
- UX-DR-10: Vital tile — Source name + last-synced phrase (e.g., "Live · 4 min", "Stale · 5 days") led by a status-pulse (9px dot). 3-up grid; collapses to 1-up on narrow.
- UX-DR-11: Status pulse — 9px dot. Green pulse (blink animation = liveness, 1.6s cycle) for fresh state; amber/red glow (steady) for stale/dead.
- UX-DR-12: Metric tile — Label + large value (26px/800). Recolor to ready-green when metric is in a good state. 2-up grid; collapses to 1-up on narrow.
- UX-DR-13: Toast notification — Bottom-center message on a dark background. Auto-dismiss ~3.2s. Used for "Payroll run completed — zero post-run corrections."

**Information Architecture & Layout**
- UX-DR-14: Sticky header — Brand + readiness dot, cycle context (month, employer, due date, employee count), live Time-to-First-Payroll.
- UX-DR-15: Two-column layout — Fixed 360px readiness rail (left) + fluid 1fr working column (right); collapses to single column at ≤880px.
- UX-DR-16: Pre-Flight Checklist section — List of blockers (the action surface). Title: "What's blocking 100%".
- UX-DR-17: Data Freshness Vitals section — Per-source pulse tiles in a grid.
- UX-DR-18: Metrics section — Card with four metrics: First-pass accuracy %, Errors prevented this run, Lifecycle clock (F&F countdown in working days), Time-to-First-Payroll (business days from data-complete).
- UX-DR-19: Change Handshake drill-down — Per-record before/after CTC diff with sign-off workflow. Accessed via "Review & sign" action on a Change Handshake blocker.
- UX-DR-20: F&F settlement drill-down — Per-exit settlement workflow. Accessed via "Settle" action on a Lifecycle Clock blocker.
- UX-DR-21: Source re-sync detail surface — Detail view for source re-sync actions and freshness status. Accessed via "Re-sync" or detail action on a Freshness Vitals blocker.
- UX-DR-22: Compliance action surface — Workflow for compliance-related actions (e.g., challan generation, rule update). Accessed via "Generate" or detail action on a Compliance floor blocker.
- UX-DR-23: Guided onboarding flow — Separate guided sequence to Data-Complete with steps: employee-master CSV import, statutory ID entry, biometric source connection. Instrumented for Time-to-First-Payroll; clock starts at Data-Complete detection. Not part of steady-state dashboard.
- UX-DR-24: Employee self-service portal — Separate surface, read-only, mobile-friendly. Shows payslip list + F&F status for exiting employees. Inherits design tokens from DESIGN.md but uses single-column responsive layout with larger tap targets.

**Behavioral Patterns (State & Interaction)**
- UX-DR-25: Gauge animation — Recomputes and re-sweeps on every state change (blocker resolved, source state transition, post-sign-off re-block). Color and numeral follow score→hue mapping. Reaching 100 flips run-button to ready.
- UX-DR-26: Run button strict binary — Enabled only at score 100 with no open blockers; otherwise disabled with lock label. No hover-to-override, no confirm-anyway. Implements hard gate (FR-9).
- UX-DR-27: Blocker resolution in-place — Acting on a blocker updates gauge immediately (no full-page reload, no save round-trip). Row strikes through, icon becomes green check, gauge re-sweeps, errors-prevented counter increments.
- UX-DR-28: Post-sign-off change — A new CTC change arriving after sign-off re-adds a blocker row and drops the score, re-blocking the run until new diff is acknowledged (FR-6).
- UX-DR-29: Vital tile state transitions — Reflects last-synced state continuously; transitions fresh (green pulse) → stale (amber) → dead (red) by threshold. Tied to Data Freshness Vitals live updates.
- UX-DR-30: F&F clock metric — Live countdown in working days to statutory deadline. Recolors: text-default → warning (<24h) → critical (<12h). Clearing F&F clears the clock.
- UX-DR-31: Score state mapping — `critical` (<80) · `warning` (80–99) · `ready` (100). Gauge ring, numeral, and brand dot share one state.
- UX-DR-32: Blocker state machine — `open` (action available) → `resolved` (struck through, counted as prevented) or `re-opened` (post-sign-off change).
- UX-DR-33: Empty/first-run state — Before Data-Complete, dashboard routes to onboarding flow, not a fake 0%/100% gauge display.
- UX-DR-34: Loading/reconciling state — Gauge animates from 0 with status line "Reconciling upstream inputs…" to signal liveness (not a spinner).

**Accessibility Requirements**
- UX-DR-35: Color + non-color cues — Every state must pair color with a non-color cue (icon, text label, or phrase). Dashboard must be fully legible in grayscale and to color-blind users.
- UX-DR-36: Disabled button clarity — Disabled run-button conveys why in text ("blocked by pre-flight"), not by color alone.
- UX-DR-37: Numeric legibility — Tabular numerals on gauge (56px) and clock for at-a-glance reading.
- UX-DR-38: Contrast compliance — Text (body & muted) on slate surfaces meet WCAG AA for their sizes. (Assume muted #93a1b1 on surface #18202b; verify at finalize.)
- UX-DR-39: Keyboard navigation — Blocker actions and run-button reachable and operable by keyboard. Tab order logical. Focus states visible against dark theme.
- UX-DR-40: Reduced motion support — Respect `prefers-reduced-motion`: disable pulse blink and gauge sweep; keep state legible without animation.

**Voice, Tone & Microcopy**
- UX-DR-41: Microcopy voice — Plain, calm, accountable. Names the real-world problem and deadline; never hedges. Speaks like a trusted colleague.
- UX-DR-42: Blocker statements — Concrete + stakes. E.g., "3 exits pending F&F — F&F blocked on HR notice-waiver decision · legal deadline: 2 working days."
- UX-DR-43: Wins framed as calm — E.g., "All clear. Confirm the green gauge — no fire drill." Not celebratory ("🎉 You're a payroll hero!").
- UX-DR-44: Run completion confirmation — Toast: "Payroll run completed — zero post-run corrections." Reinforces the core metric.
- UX-DR-45: Glossary term consistency — Category tags use Glossary terms verbatim: Lifecycle Clock, Change Handshake, Freshness Vitals, Compliance floor.
- UX-DR-46: Failure honesty — Dead sync says "Biometric (eSSL) sync dead · LOP-sensitive payslips at risk." Never "syncing…" when it isn't.

**Responsive Design**
- UX-DR-47: Operator dashboard responsive — Desktop-first. Two-column → single-column at ≤880px. Vitals 3-up → 1-up; metrics 2-up → 1-up at ≤560px. Usable on tablet; phone not targeted for operator view.
- UX-DR-48: Employee portal responsive — Mobile-friendly by design. Single-column layout with larger tap targets. Separate from operator dashboard.

### Requirements Coverage Map

| Requirement | Epic | Details |
|---|---|---|
| FR-1 | 1 | Live Readiness Score gauge, continuous recompute |
| FR-2 | 1 | Blocker decomposition, named list |
| FR-3 | 1 | Per-source freshness state (fresh/stale/dead) |
| FR-4 | 1 | Freshness feeds score, Blocker raised/cleared |
| FR-5 | 1 | Change diff + sign-off gate, per-record review |
| FR-6 | 1 | Post-sign-off re-blocking when new change arrives |
| FR-7 | 1 | F&F countdown, escalating green→amber→red |
| FR-8 | 1 | F&F status visibility, linked to Employee Portal |
| FR-9 | 1 | Run gate enforcement, disabled until pre-flight passes |
| FR-10 | 1 | Prevented-error capture, counter incremented per blocker resolved |
| FR-11 | 2 | Statutory computation (PF/ESI/TDS/PT) per state & period |
| FR-12 | 2 | Rule versioning, effective-dated rule sets, historical re-run |
| FR-13 | 3 | Restructuring assistant, impact preview, Change Handshake integration |
| FR-14 | 4 | Guided setup to Data-Complete, flow with step surfacing |
| FR-15 | 4 | TTFP measurement from Data-Complete, external latency transparency |
| FR-16 | 5 | Read-only payslip + F&F access, employee read-only, own-records-only |
| FR-17 | 6 | Biometric ingestion (eSSL, ZKTeco, Biomax, Matrix), freshness heartbeat |
| FR-18 | 6 | Finance ingestion (Tally, Zoho, QB), delta detection, Change Handshake routing |
| FR-19 | 6 | Bank disbursement, file/instruction generation |
| FR-20 | 6 | CSV import, validation, rejection reporting |

**All 20 FRs mapped** ✓ | **All 9 NFRs addressed** ✓ | **All 19 AR items addressed** ✓ | **All 48 UX-DR items addressed** ✓

## Epic List

### Epic 1: Payroll Readiness Dashboard
**User Outcome:** Priya can see a live, continuously-reconciled Readiness Score (%) on a single home screen that decomposes into exactly what's blocking 100%. She can resolve each blocker in-place and watch the gauge animate to green; when it reaches 100%, the Run Payroll button unlocks.

**FRs Covered:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-8, FR-9, FR-10

**Scope:**
- Live Readiness Score with real-time gauge animation
- Blocker decomposition (named, countable blockers)
- Data Freshness Vitals (per-source live synced state)
- Change Handshake (CTC diff review + sign-off gate)
- Lifecycle-to-Payroll Clock (exit countdown to F&F deadline)
- Pre-Flight Checklist (gate enforcement, prevented-error counter)
- Run Payroll execution (hard gate, binary blocked/ready)

---

### Epic 2: Compliance Engine (Rules-Versioned, State-Aware)
**User Outcome:** The system computes statutory payroll correctly — PF, ESI, TDS, PT per the rules in force for the pay period and the employee's state. Priya can re-run historical periods with their original rule versions; the system never hard-codes compliance rules into code.

**FRs Covered:** FR-11, FR-12

**Scope:**
- Statutory computation (PF, ESI, TDS, PT) per state and period
- Effective-dated rule versioning (rules are database data, not code)
- Multi-state correctness
- Payslip rendering per employee
- Historical re-run support with period-accurate rule resolution

---

### Epic 3: 50%-Wage-Rule Restructuring Assistant
**User Outcome:** Priya can bulk-restructure salary components to meet the 50%-wage-rule compliance mandate (basic wage ≥50% of CTC), preview the per-employee impact on take-home/PF/gratuity, and apply the changes audited through the Change Handshake.

**FRs Covered:** FR-13

**Scope:**
- Bulk restructuring with impact preview
- Per-employee before/after salary component view
- Compliance validation per employee
- Change Handshake integration (changes audited, not silent)
- Acquisition hook (solves immediate customer pain)

---

### Epic 4: Guided Onboarding & Time-to-First-Payroll Instrumentation
**User Outcome:** A new tenant can reach their first correct payroll in ≤3 business days (from Data-Complete) via a guided setup flow. The product measures Time-to-First-Payroll accurately, surfacing external latency dependencies (PF/ESI/PT registration, bank verification) so the metric stays honest.

**FRs Covered:** FR-14, FR-15

**Scope:**
- Guided setup flow to Data-Complete (employee master, statutory IDs, biometric connect)
- Data-Complete detection and timestamping
- TTFP measurement (business days from Data-Complete to first run)
- External-latency transparency (out-of-our-control dependencies surfaced)
- Integration with Compliance Engine (pre-validated defaults)
- Progress instrumentation and tracking

---

### Epic 5: Employee Self-Service Portal
**User Outcome:** Employees can view their payslips; exiting employees can view their full-and-final settlement status. The portal is read-only by design, protecting onboarding speed and giving exiting employees visibility into their statutory settlement.

**FRs Covered:** FR-16

**Scope:**
- Read-only payslip access (per-employee visibility only)
- F&F status for exiting employees (reflects settled state from Epic 1)
- Tenant isolation (employees see only own records)
- Mobile-friendly responsive design (single-column layout, larger tap targets)
- Authentication and RBAC (Employee role, read-only)

---

### Epic 6: Integrations (Biometric, Finance, Bank, CSV)
**User Outcome:** The system ingests attendance from biometric devices (eSSL, ZKTeco, Biomax, Matrix COSEC), CTC changes from finance systems (Tally, Zoho Books, QuickBooks), produces disbursement instructions for banks, and validates employee-master CSV imports.

**FRs Covered:** FR-17, FR-18, FR-19, FR-20

**Scope:**
- Biometric attendance ingestion (webhook receivers, scheduled pollers, heartbeat tracking)
- Finance CTC/structure ingestion (delta detection, Change Handshake routing)
- Bank disbursement file/instruction generation
- CSV employee-master import with validation and rejection reporting
- Freshness heartbeat for all sources (feeds Data Freshness Vitals in Epic 1)
- Adapter pattern (stable internal contract, new integrations as new adapters)

---

## Epic 1: Payroll Readiness Dashboard

### Story 1.1: Readiness Service Foundation & Event Model

As a **Backend Engineer**,
I want to implement the Readiness Service with domain events and database schema for blockers and source freshness,
So that the core event-driven architecture is in place for all downstream blocker features.

**Acceptance Criteria:**

**Given** the application is starting up,
**When** I boot the backend,
**Then** the Readiness Service initializes and listens for domain events: `SourceSynced`, `SourceWentStale`, `SourceDead`, `ChangeDetected`, `ChangeSignedOff`, `ExitRecorded`, `FFSettled`, `PreFlightItemChanged`.

**Given** a source sync event is fired,
**When** the Readiness Service receives `SourceSynced(tenant_id, source_id, timestamp)`,
**Then** it updates `source_freshness(tenant_id, source_id, last_success_at, state)` in PostgreSQL and emits a `ReadinessScoreChanged` event.

**Given** the database schema is initialized,
**When** I query the `blockers` table,
**Then** it exists with columns: `id, tenant_id, blocker_type (enum: FRESHNESS_VITALS, CHANGE_HANDSHAKE, LIFECYCLE_CLOCK, PREFLIGHT), blocker_category, severity, description, blocking_record_ids (jsonb), created_at, resolved_at, reopened_at`.

**Given** the database schema is initialized,
**When** I query the `source_freshness` table,
**Then** it exists with columns: `id, tenant_id, source_name, source_type (enum: BIOMETRIC, FINANCE, BANK, MANUAL), last_success_at, last_failure_at, state (enum: FRESH, STALE, DEAD), staleness_threshold_seconds, updated_at`.

**Given** a Readiness Service method is called,
**When** I invoke `service.computeScore(tenant_id)`,
**Then** it returns a score object: `{ score: int (0-100), blockers: [], dead_sources: bool, timestamp: datetime }`. A dead source forces score < 100 regardless of other state.

**Given** the Readiness Service event loop is running,
**When** any blocker creation/resolution event is fired,
**Then** the score is recomputed within 60 seconds, and a `ReadinessScoreChanged` event is emitted with the new score and blocker list.

---

### Story 1.2: Home Screen UI Shell & Gauge Component

As a **Frontend Engineer**,
I want to implement the home screen layout with the gauge component using the design tokens from DESIGN.md,
So that Priya sees the visual foundation of the Readiness Dashboard.

**Acceptance Criteria:**

**Given** I open the operator dashboard at `/app/dashboard`,
**When** the page loads,
**Then** I see a sticky header with brand + readiness dot, cycle context (month, employer, due date, employee count), and live Time-to-First-Payroll metric.

**Given** the home screen is rendered,
**When** I view the main layout,
**Then** I see a two-column layout: fixed 360px readiness rail (left) + fluid working column (right). On screens ≤880px, it collapses to single-column.

**Given** the readiness rail is rendered,
**When** I view it,
**Then** I see (top to bottom): the gauge SVG + a status line below it + the run-button at the bottom.

**Given** the gauge component is rendered,
**When** I look at it with a score of 65%,
**Then** I see: 230px SVG progress ring (arc colored critical-red because 65 < 80), 18px stroke with round caps, centered 56px/800 numeral "65", and a "READY" label below it. The arc fills from 0° to (65% of 360°) with a .6s ease sweep animation on load.

**Given** the gauge component is rendered with score 100%,
**When** the score reaches 100,
**Then** the arc recolors to ready-green (#2ecc71), the label updates to "READY", and a `.6s ease` sweep animation runs from the current position to full circle.

**Given** the working column is rendered,
**When** I scroll or view the cards,
**Then** I see the following sections stacked: "What's blocking 100%" (Pre-Flight Checklist section), Data Freshness Vitals grid, and Metrics section (2-up grid on wide, 1-up on narrow).

**Given** the design tokens are applied,
**When** I inspect colors, spacing, typography,
**Then** all elements use tokens from DESIGN.md: bg (#0f1419), surface (#18202b), text (#e6edf3), ready (#2ecc71), warning (#f5a623), critical (#e74c3c), spacing grid (24px gap), and system font stack only (no web fonts).

**Given** responsive behavior is tested,
**When** I resize the viewport to 600px wide,
**Then** the two-column layout collapses to single-column, vitals 3-up grid collapses to 1-up, and metrics 2-up grid collapses to 1-up. All text and buttons remain readable.

---

### Story 1.3: Live Readiness Score Computation & Gauge Animation

As a **Backend + Frontend Engineer**,
I want to compute the Readiness Score in real-time from blockers and source states, wire it to the gauge component, and animate it on every score change,
So that Priya sees the score continuously reflect upstream state.

**Acceptance Criteria:**

**Given** a tenant has 2 blockers (3 pending F&F + 18 unconfirmed CTC changes),
**When** I query `service.computeScore(tenant_id)`,
**Then** it returns `{ score: 85, blockers: [{ id, type: LIFECYCLE_CLOCK, severity: HIGH, description: "3 exits pending F&F...", action_button: "Settle" }, { id, type: CHANGE_HANDSHAKE, severity: MEDIUM, description: "18 unconfirmed CTC changes", action_button: "Review & sign" }], dead_sources: false }`.

**Given** one blocker is resolved (F&F settled),
**When** the backend emits `BlockerResolved(blocker_id)` and `ReadinessScoreChanged(score: 92, blockers: [...])`,
**Then** the frontend receives the event via WebSocket, updates the gauge component, and the arc animates (`.6s ease` sweep) from 85% to 92%.

**Given** a source goes dead (no successful sync in 24h),
**When** `SourceDead(source_id)` is emitted,
**Then** a new Freshness Vitals blocker is created, the score is recomputed, and if the score was 100%, it drops below 100% (because a dead source caps the score).

**Given** the gauge is at 100% and a new CTC change arrives after sign-off,
**When** `ChangeDetected` is emitted for an already-signed change,
**Then** (FR-6 edge case) a new blocker row is raised with "1 new CTC change since sign-off", the Readiness Score drops (e.g., 100% → 98%), the blocker list is updated, and the gauge re-sweeps.

**Given** the gauge component mounts with an initial score of 0,
**When** the page loads,
**Then** the gauge animates from 0 with `.6s ease` sweep to the current score, and displays "Reconciling upstream inputs…" status line during the animation.

**Given** the user's browser supports `prefers-reduced-motion`,
**When** I set `prefers-reduced-motion: reduce` in system settings,
**Then** the gauge still updates to the new score but without the sweep animation (instant value change). State is still legible (color + numeral).

**Given** real-time events are flowing in,
**When** multiple blockers resolve or re-open within a short window (e.g., 5 seconds),
**Then** the score is recomputed and the gauge animates; no flashing or undefined states occur. The latest score is always displayed.

---

### Story 1.4: Data Freshness Vitals — Source Tracking & Display

As a **Backend + Frontend Engineer**,
I want to track per-source freshness (last-synced, state transitions), display vital tiles on the home screen, and raise Blockers when sources go stale/dead,
So that Priya sees exactly which upstream systems are feeding her payroll data and when they last synced.

**Acceptance Criteria:**

**Given** I have three configured sources: eSSL (biometric), Tally (finance), manual CSV import,
**When** I view the Data Freshness Vitals section,
**Then** I see three tiles: one per source, each showing source name, last-synced phrase (e.g., "Live · 4 min", "Stale · 5 days", "Dead · 24h+"), and a status pulse (9px dot: green blink for fresh, amber steady for stale, red glow for dead).

**Given** a source has a successful sync within its staleness threshold (e.g., biometric = 2h threshold, last synced 30 min ago),
**When** I view the vital tile,
**Then** state = `FRESH`, the pulse blinks green (1.6s cycle), the phrase says "Live · 30 min", no Blocker is raised.

**Given** a source has not synced in 5 hours (threshold = 2h),
**When** I view the vital tile,
**Then** state = `STALE`, the pulse glows amber (steady), the phrase says "Stale · 5 hours", a Blocker `(type: FRESHNESS_VITALS, severity: MEDIUM)` is raised and held until re-sync.

**Given** a source has not synced in 24 hours,
**When** I view the vital tile,
**Then** state = `DEAD`, the pulse glows red (steady), the phrase says "Dead · 24h+", a Blocker `(type: FRESHNESS_VITALS, severity: HIGH)` is raised, AND the Readiness Score is capped below 100% (FR-1 consequence: dead source caps score).

**Given** a stale/dead source is manually re-synced,
**When** a new sync succeeds and `SourceSynced(source_id, timestamp)` is emitted,
**Then** the state transitions to `FRESH`, the pulse blinks green, the last-synced phrase updates (e.g., "Live · just now"), the Blocker is cleared, and the Readiness Score is recomputed.

**Given** the vital tiles are displayed,
**When** I use grayscale mode or a color-blind filter,
**Then** I can still distinguish fresh/stale/dead by icon (✓ check, ⚠ warning, ✗ error) and text label ("Live", "Stale", "Dead"), not color alone. (UX-DR-35 accessibility.)

**Given** a source detail is needed (e.g., "why is eSSL stale?"),
**When** I click a stale vital tile,
**Then** a "Source re-sync detail" drill-down surface opens showing: source name, last successful sync timestamp, last failure timestamp, failure reason (if available), and a "Re-sync now" button to manually trigger a refresh.

---

### Story 1.5: Change Handshake Blocker — Diff Review & Sign-off Gate

As a **Backend + Frontend Engineer**,
I want to implement the Change Handshake: detect CTC/structure changes from finance sources, show a per-record before/after diff, require sign-off, and enforce that unacknowledged changes block the run,
So that Priya catches silent CTC changes before they reach a payslip (FR-5, FR-6).

**Acceptance Criteria:**

**Given** Tally (finance source) has 18 CTC changes since the last run,
**When** the finance poller detects deltas and emits `ChangeDetected(change_set: [{employee_id, old_ctc, new_ctc, effective_date, signatory: "Finance Manager A"}...])`,
**Then** a Change Handshake blocker is created with description "18 unconfirmed CTC changes" and severity MEDIUM.

**Given** the Change Handshake blocker is visible on the home screen,
**When** Priya clicks "Review & sign",
**Then** a drill-down surface opens showing a paginated per-record diff: columns = [Employee, Old CTC, New CTC, Effective Date, Signatory, Action]. Each row has radio buttons: [Sign-off | Hold | Reject].

**Given** Priya reviews the diff and signs off 16 records and holds 2,
**When** she saves,
**Then** an audit record is created for each sign-off/hold with (actor: Priya, timestamp, state_acknowledged: {...}), the 16 signed records clear the blocker for themselves, the 2 held records keep the blocker alive, the Readiness Score is recomputed (2 unconfirmed = still a blocker), and she returns to the home screen.

**Given** the change records are signed off,
**When** the time comes to Run Payroll,
**Then** only the signed-off CTC records are included in the run; the held records are excluded (the run only processes records with acknowledged changes or no changes).

**Given** a new CTC change arrives **after** sign-off but **before** the run,
**When** `ChangeDetected` is emitted for an employee already signed-off,
**Then** (FR-6 edge case) a new blocker row is raised with "1 new CTC change since sign-off", the Readiness Score drops (e.g., 100% → 98%), and the run re-blocks until the new change is acknowledged.

**Given** the audit trail is queried,
**When** I look at compliance records for a pay run,
**Then** I see a complete history: who signed off which records, when, and what state they acknowledged (old value, new value, signatory). (NFR-3 auditability.)

**Given** Priya is reviewing the diff,
**When** she views the screen on a tablet,
**Then** the diff table is readable with horizontal scroll if needed; tap targets for sign-off/hold/reject buttons are ≥44px.

---

### Story 1.6: Lifecycle-to-Payroll Clock Blocker — Exit Countdown & Escalation

As a **Backend + Frontend Engineer**,
I want to track exits and compute a working-day countdown to the 2-working-day F&F deadline, display it as an escalating countdown, and raise alerts when at risk,
So that Priya knows she has a deadline and cannot miss the statutory F&F settlement window (FR-7, FR-8).

**Acceptance Criteria:**

**Given** an exit is recorded on 2026-06-09 (Monday, last working day is 2026-06-10 Tuesday),
**When** the exit is ingested,
**Then** the system calculates: 2 working days from the last working day = deadline is 2026-06-12 (Thursday). A Lifecycle-to-Payroll Clock blocker is created with description "1 exit pending F&F — deadline: Thu 12 Jun" and the F&F clock metric is initialized.

**Given** the F&F clock is displayed in the Metrics section,
**When** I view the metric,
**Then** I see a large countdown: "2" (working days remaining), color = text-default (≥2 days), label = "Days to F&F deadline".

**Given** the deadline approaches to 24 hours remaining,
**When** the clock ticks down to <24h,
**Then** the color recolors to warning (#f5a623), and the description updates (e.g., "1 exit pending F&F · deadline: TODAY 3:00 PM").

**Given** the deadline is <12 hours away,
**When** the clock ticks down to <12h,
**Then** the color recolors to critical (#e74c3c), AND a top-of-screen alert banner appears: "⚠️ F&F DEADLINE AT RISK — [Exit Name] · [Hours remaining] · [Responsible HR signatory name]". The alert is sticky and unmissable.

**Given** Priya clicks "Settle" on the F&F blocker,
**When** she opens the F&F settlement workflow,
**Then** a drill-down surface shows: Employee name, last working day, statutory deadline (computed), F&F amount (from Compliance Engine), settlement options (cash, bank transfer), and checkboxes to confirm settlement. On confirmation, the F&F status is marked resolved, the clock clears, and the blocker is removed.

**Given** the F&F is settled,
**When** I query the employee in the Employee Self-Service Portal,
**Then** the exiting employee can now see "F&F Settled · [Amount] · [Settlement Date]" in their portal view (FR-8 downstream requirement).

**Given** the working-day calendar is configured per state,
**When** holidays are added (e.g., state-specific festival on 2026-06-11),
**Then** the deadline calculation respects the holiday: 2 working days = 2026-06-12 (skipping the holiday on 11th). Staleness thresholds are configurable per source-type in a settings table.

**Given** the exit countdown is displayed,
**When** the user's browser is set to `prefers-reduced-motion: reduce`,
**Then** the countdown metric updates the number without animation; color changes are instant. The metric is still readable.

---

### Story 1.7: Pre-Flight Checklist — Checks & Gate Enforcement

As a **Backend + Frontend Engineer**,
I want to implement pre-flight checks (attendance synced, no pending exits without F&F, no unacknowledged changes, compliance defaults validated) and enforce a hard gate on the Run Payroll button,
So that Priya cannot run payroll with known input problems (FR-9, FR-10).

**Acceptance Criteria:**

**Given** a pay run is being prepared,
**When** I query `service.runPreFlightChecks(tenant_id, cycle)`,
**Then** it evaluates and returns a checklist with results for:
- Attendance synced in last 2 hours
- No pending exits without F&F settled
- No unacknowledged CTC changes
- Compliance defaults (50%-wage-rule, statutory IDs, withholding configs) validated
Each item is: `{ check: string, status: PASS | FAIL, blocker_if_fail: Blocker | null }`.

**Given** the Pre-Flight Checklist section is displayed,
**When** all checks pass,
**Then** I see a green card with "✓ All clear. Payroll is ready to run." and the run-button below is **enabled** and styled with ready-green fill + "▶ Run Payroll — [N] employees" text.

**Given** one or more checks fail,
**When** I view the Pre-Flight Checklist,
**Then** I see a list of failing checks, each one with a red icon, the check name, the specific blocker (e.g., "3 exits pending F&F"), and an action button linking to the resolution surface (e.g., "Settle" → F&F settlement drill-down).

**Given** the run-button is disabled (a check fails),
**When** I hover over it or try to click,
**Then** the button is visually disabled (muted #36404d fill, no hover effect), labeled "🔒 Run Payroll — blocked by pre-flight", and not clickable. **No "run anyway" option.** (FR-9: hard gate, binary.)

**Given** a blocker is resolved (e.g., F&F settled),
**When** the Pre-Flight Checklist is re-evaluated,
**Then** the resolved check flips to PASS, the Readiness Score is recomputed, and if all checks now pass, the run-button flips to enabled/ready state.

**Given** the pre-flight checks are running,
**When** the evaluation takes longer than 5 seconds,
**Then** a loading state is shown: the checks section displays "Verifying pre-flight…" with a subtle animation, and the run-button remains disabled until checks complete.

**Given** a prevented-error is captured,
**When** a blocker was raised but then resolved before the run,
**Then** the prevented-error counter increments by 1 (e.g., counter goes from 5 → 6). (FR-10: prevented-error capture.)

---

### Story 1.8: Run Payroll Execution & Prevented-Error Counter

As a **Backend + Frontend Engineer**,
I want to implement the Run Payroll execution: trigger the payroll calculation, emit prevented-error metrics, display success confirmation, and disable the button after run,
So that Priya can execute a pay cycle and see proof of first-pass accuracy.

**Acceptance Criteria:**

**Given** the Readiness Score is 100%, all pre-flight checks pass, and the run-button is enabled,
**When** Priya clicks "▶ Run Payroll — 248 employees",
**Then** a soft confirmation modal appears: "Ready to run payroll for [Month/Year]? [Cancel] [Confirm]".

**Given** she confirms,
**When** the backend receives the run request,
**Then** it invokes the Compliance Engine (Epic 2) with: `runPayroll(tenant_id, cycle, signed_off_records, resolved_rules)`. The Compliance Engine returns: `{ payslips: [...], statutory_outputs: [...], errors: [] }`.

**Given** the payroll run completes without errors,
**When** the response is received,
**Then** the home screen updates: the run-button disables and shows "✓ Run complete" (briefly), a toast notification appears at bottom-center with "Payroll run completed — zero post-run corrections", and the prevented-error counter is incremented by the sum of blockers resolved this cycle.

**Given** the prevented-error counter increments,
**When** I view the Metrics section,
**Then** I see the counter updated (e.g., "Errors prevented this run: 6" — reflecting all blockers resolved before this run). This counter resets at the start of the next cycle.

**Given** the payroll run is complete,
**When** I view the home screen,
**Then** the Readiness Score metric now shows "First-pass accuracy: 99.6% (this run: zero corrections)"; the next cycle's score starts fresh (resets blockers, clears prevented-error counter).

**Given** a payroll run encounters an error (e.g., Compliance Engine rejects a calculation),
**When** the error is returned,
**Then** the run aborts, a red toast appears: "Payroll run failed — [Error reason]", the run-button re-enables, and the error is logged (not surfaced as a blocker; this is a system error, not an input error). (NFR-1 accuracy integrity: no silent failures.)

**Given** the run is executing,
**When** I navigate away or close the browser,
**Then** the run continues in the backend (idempotent). On return, the status is fetched and displayed accurately (not lost).

**Given** the toast notification is displayed,
**When** 3.2 seconds pass,
**Then** the toast auto-dismisses. Priya can also manually close it.

---

## Epic 1 Summary

**Total Stories: 8**

| Story | Title | FRs |
|---|---|---|
| 1.1 | Readiness Service Foundation & Event Model | FR-1, FR-2 (foundation) |
| 1.2 | Home Screen UI Shell & Gauge Component | FR-1 (gauge display) |
| 1.3 | Live Readiness Score Computation & Gauge Animation | FR-1, FR-2 (core logic) |
| 1.4 | Data Freshness Vitals | FR-3, FR-4 |
| 1.5 | Change Handshake Blocker | FR-5, FR-6 |
| 1.6 | Lifecycle-to-Payroll Clock Blocker | FR-7, FR-8 |
| 1.7 | Pre-Flight Checklist | FR-9 |
| 1.8 | Run Payroll Execution | FR-9, FR-10 |

**All FRs for Epic 1 covered: ✓**

---

## Epic 2: Compliance Engine (Rules-Versioned, State-Aware)

### Story 2.1: Compliance Rules Database & Rule Versioning

As a **Backend Engineer**,
I want to store compliance rules as effective-dated, versioned rows in the database (not code),
So that rule changes don't require code deployment and historical re-runs use period-accurate rules.

**Acceptance Criteria:**

**Given** the compliance rules schema is initialized,
**When** I query the `compliance_rule_set` table,
**Then** it exists with columns: `id, rule_type (enum: PF|ESI|TDS|PT), jurisdiction (IN | state code), effective_from, effective_to, version, params_jsonb, created_at`.

**Given** I create a new PF rule effective 2026-07-01,
**When** I insert it without mutating prior rules,
**Then** a new versioned row is created; prior rule versions remain unchanged. A re-run of a 2026-05 cycle uses the 2026-05 rule version, not the new one.

**Given** a compliance rule is queried for a pay period,
**When** I call `resolveRuleSet(jurisdiction, period, rule_type)`,
**Then** it returns the rule version effective for that period and jurisdiction; PT rules resolve by state, not nationally.

---

### Story 2.2: Pure Calculation Core — Statutory Computation (PF/ESI/TDS/PT)

As a **Backend Engineer**,
I want to implement a pure-function compliance calculator that computes PF, ESI, TDS, PT per employee, period, and state,
So that payroll is computed deterministically and is fully testable.

**Acceptance Criteria:**

**Given** an employee with CTC ₹50,000/month, state Maharashtra, period June 2026,
**When** I invoke `compute(employee, period, resolved_rules)`,
**Then** it returns: `{ pf_employee, pf_employer, esi, tds, pt, net_pay, statutory_components }` with all values as integer paise. No I/O, no side effects.

**Given** the same employee, same CTC, but state Tamil Nadu,
**When** I invoke compute with TN rules,
**Then** PT is computed per TN rates (different from MH); all other outputs differ accordingly. State-aware, never assumes single jurisdiction.

**Given** historical period (May 2025) with old rule version,
**When** I call `compute(..., period: 2025-05)`,
**Then** it resolves May 2025 rule sets and computes against those, not current rules. The calculation is reproducible.

---

### Story 2.3: Payslip Rendering — Statutory Outputs to PDF/Display

As a **Backend + Frontend Engineer**,
I want to render statutory payslips from compliance computation outputs,
So that Priya and employees see legally compliant payslip documents.

**Acceptance Criteria:**

**Given** a completed payroll run with statutory outputs,
**When** I render a payslip for an employee,
**Then** it displays: employee name, CTC, gross, PF/ESI/TDS/PT deductions, net pay, statutory disclosures per Labour Code, payment date, and run signature.

**Given** the payslip is rendered,
**When** I export it,
**Then** it is generated as PDF (for printing/archival) or displayable as HTML (for portal). Money is formatted as ₹ with 2 decimals at the UI edge; underlying storage is integer paise.

---

### Story 2.4: Multi-State Payslip Compliance — Jurisdiction-Specific Outputs

As a **Backend Engineer**,
I want to ensure payslips reflect the employee's jurisdiction for PT, state-specific disclosures, and wage-rule compliance,
So that a tenant with employees across states produces legally correct payslips per state.

**Acceptance Criteria:**

**Given** a tenant with employees in Maharashtra, Tamil Nadu, and Karnataka,
**When** I run payroll,
**Then** each payslip is computed and rendered with state-correct PT rates, wage-rule checks (50%-basic rule per state if different), and state-specific statutory disclosures.

**Given** an employee whose state changes mid-cycle,
**When** I re-run with the updated state,
**Then** the new payslip computes against the employee's new jurisdiction; audit trail records the state change.

---

## Epic 2 Summary

**Total Stories: 4**

| Story | Title | FRs |
|---|---|---|
| 2.1 | Compliance Rules Database & Rule Versioning | FR-12 |
| 2.2 | Pure Calculation Core — Statutory Computation | FR-11 |
| 2.3 | Payslip Rendering | FR-11 |
| 2.4 | Multi-State Payslip Compliance | FR-11 |

**All FRs for Epic 2 covered: ✓**

---

## Epic 3: 50%-Wage-Rule Restructuring Assistant

### Story 3.1: Bulk Salary Structure Validation & Flagging

As a **Backend Engineer**,
I want to scan all employee salary structures and flag those violating the 50%-wage rule (basic wage < 50% of CTC),
So that Priya knows exactly which employees need restructuring.

**Acceptance Criteria:**

**Given** a tenant with 200 employees of varying salary structures,
**When** I run `validateWageRule(tenant_id)`,
**Then** it returns: `{ compliant_count: 150, non_compliant_count: 50, violations: [{ employee_id, current_basic_pct, required_basic_pct, gap_amount }...] }`.

**Given** a non-compliant employee,
**When** I view the violation,
**Then** I see current basic wage %, required %, and the rupee gap to compliance (e.g., "Basic: 45%, Required: 50%, Gap: ₹2,500/month").

---

### Story 3.2: Impact Preview — Restructuring Simulator

As a **Frontend + Backend Engineer**,
I want to simulate salary restructuring and show per-employee impact (take-home, PF, gratuity implications) before applying,
So that Priya sees consequences before committing.

**Acceptance Criteria:**

**Given** the restructuring assistant is opened,
**When** I select 50 non-compliant employees and click "Preview",
**Then** a table appears showing: [Employee, Current Structure, Proposed Structure, Take-home Δ, PF Δ, Gratuity Δ]. All deltas are computed using the Compliance Engine (Epic 2).

**Given** the preview is shown,
**When** I adjust the proposed structure manually,
**Then** the impact recalculates in real-time. No permanent changes yet.

---

### Story 3.3: Restructuring Execution via Change Handshake

As a **Backend Engineer**,
I want to route the approved restructuring through the Change Handshake (Epic 1, Story 1.5) so changes are audited,
So that all salary structure changes are tracked and require sign-off (not silent).

**Acceptance Criteria:**

**Given** Priya approves the restructuring preview,
**When** she clicks "Apply Restructuring",
**Then** the changes are routed through the Change Handshake: a blocker is created ("50 salary structures changed"), Priya must review and sign off the bulk change, and the changes are applied only after sign-off.

**Given** the changes are applied,
**When** I query the audit trail,
**Then** I see: who applied the restructuring, timestamp, which employees were affected, old/new components per employee.

---

## Epic 3 Summary

**Total Stories: 3**

| Story | Title | FRs |
|---|---|---|
| 3.1 | Bulk Salary Structure Validation & Flagging | FR-13 |
| 3.2 | Impact Preview — Restructuring Simulator | FR-13 |
| 3.3 | Restructuring Execution via Change Handshake | FR-13 |

**All FRs for Epic 3 covered: ✓**

---

## Epic 4: Guided Onboarding & Time-to-First-Payroll Instrumentation

### Story 4.1: Onboarding Flow UI — Employee Master & Statutory IDs

As a **Frontend + Backend Engineer**,
I want to build a guided onboarding flow that walks new tenants through employee-master import, statutory ID entry, and biometric connection,
So that new customers reach Data-Complete (and start the TTFP clock) in days, not weeks.

**Acceptance Criteria:**

**Given** a new tenant logs in for the first time,
**When** they land on the dashboard,
**Then** they see an onboarding flow (not the main dashboard) with clear steps: [1] Upload employee CSV [2] Enter statutory IDs [3] Connect biometric source [4] Run preflight → Go Live.

**Given** step 1 (CSV import) is completed,
**When** I upload a valid CSV,
**Then** employees are imported, and the flow advances to step 2. Invalid rows are reported; import doesn't fail silently (FR-20).

**Given** step 2 (statutory IDs),
**When** I enter PAN, AADHAR, or UAN per employee,
**Then** required IDs are validated, and the flow advances to step 3 when all employees have required IDs.

**Given** step 3 (biometric connection),
**When** I connect eSSL and trigger a test sync,
**Then** the connection is verified, a successful sync is recorded, and the flow advances to step 4.

---

### Story 4.2: Data-Complete Detection & TTFP Clock Start

As a **Backend Engineer**,
I want to detect when a tenant reaches Data-Complete state (employee master + statutory IDs + ≥1 successful source sync) and start the Time-to-First-Payroll clock,
So that TTFP is measured from a real milestone, not sign-up.

**Acceptance Criteria:**

**Given** a tenant completes onboarding steps 1–3,
**When** I query `checkDataComplete(tenant_id)`,
**Then** if all conditions are met (employee_master_count > 0, required_IDs_present, source_synced_recently), it returns `{ is_complete: true, timestamp: datetime }`.

**Given** Data-Complete is reached,
**When** the system detects it,
**Then** a `DataComplete` event is emitted, the TTFP clock is started (timestamp recorded in tenant record), and a `TimeToFirstPayrollStarted` event is logged.

---

### Story 4.3: TTFP Measurement & Instrumentation

As a **Backend Engineer**,
I want to compute and track Time-to-First-Payroll (business days from Data-Complete to first correct run) and surface external-latency dependencies,
So that the metric is honest and defensible.

**Acceptance Criteria:**

**Given** Data-Complete is recorded on day 0,
**When** the first payroll run completes successfully on day 3,
**Then** TTFP = 3 business days (excluding weekends/holidays per state calendar).

**Given** the tenant is waiting for PF/ESI registration (external, out-of-our-control),
**When** I view the onboarding dashboard,
**Then** a banner states: "Waiting for PF registration (external) — estimated 2–3 business days. TTFP clock pauses for external dependencies." The clock is transparent, not hidden.

**Given** the first run is complete,
**When** I query the tenant metrics,
**Then** I see: `TTFP: 3.2 business days`, `first_run_accuracy: zero corrections`, and `external_latency_days: 0.5 (PF registration)`.

---

## Epic 4 Summary

**Total Stories: 3**

| Story | Title | FRs |
|---|---|---|
| 4.1 | Onboarding Flow UI — Employee Master & Statutory IDs | FR-14 |
| 4.2 | Data-Complete Detection & TTFP Clock Start | FR-14 |
| 4.3 | TTFP Measurement & Instrumentation | FR-15 |

**All FRs for Epic 4 covered: ✓**

---

## Epic 5: Employee Self-Service Portal

### Story 5.1: Employee Portal Authentication & Tenant Isolation

As a **Backend + Frontend Engineer**,
I want to implement read-only employee portal with OIDC authentication and per-tenant, per-employee Row-Level Security,
So that employees see only their own payslips and F&F status, and cross-tenant data leakage is prevented.

**Acceptance Criteria:**

**Given** an employee navigates to the portal URL,
**When** they log in via OIDC,
**Then** they are authenticated, and their employee_id and tenant_id are bound to their session. RLS rules prevent querying other employees' records.

**Given** two employees from different tenants log in,
**When** each queries the payslip table,
**Then** they see only their own company's payslips (RLS on tenant_id + employee_id).

**Given** an employee tries to access the API directly,
**When** they include a forged tenant_id in the request,
**Then** the backend RLS policy blocks the query; no data leakage.

---

### Story 5.2: Payslip List & Detail View

As a **Frontend Engineer**,
I want to display a list of payslips and allow employees to view details,
So that employees can access their salary information anytime.

**Acceptance Criteria:**

**Given** an employee opens the portal,
**When** they view the "Payslips" section,
**Then** they see a chronological list of all their payslips (last 12 months, paginated). Each row shows: date, gross, net, and a "View" button.

**Given** they click "View" on a payslip,
**When** the detail opens,
**Then** they see the full statutory payslip (identical to what Priya sees): CTC, gross, PF/ESI/TDS/PT, net, statutory disclosures, payment date.

**Given** they want to export,
**When** they click "Download PDF",
**Then** the payslip is generated and downloaded as PDF (for personal archival).

---

### Story 5.3: F&F Status for Exiting Employees

As a **Frontend Engineer**,
I want to show exiting employees their F&F settlement status from the Lifecycle-to-Payroll Clock (Epic 1, Story 1.6),
So that departing employees see their final dues and settlement date.

**Acceptance Criteria:**

**Given** an employee who has resigned,
**When** they open the portal,
**Then** they see a "Full & Final Settlement" card showing: last working day, statutory deadline, settled status, settled amount, and payment date (if already settled).

**Given** F&F is pending,
**When** they view the card,
**Then** it shows: "F&F Pending — Settlement deadline: [date]" (linked to the Lifecycle Clock countdown in Epic 1).

**Given** F&F is settled,
**When** they view the card,
**Then** it shows: "F&F Settled — ₹[amount] on [date]" with payment method and confirmation.

---

### Story 5.4: Mobile-Friendly Responsive Design

As a **Frontend Engineer**,
I want to make the employee portal fully responsive and mobile-friendly (single-column layout, large tap targets),
So that employees can check payslips on their phones.

**Acceptance Criteria:**

**Given** the portal is viewed on a 375px (mobile) screen,
**When** I view the payslip list,
**Then** the layout collapses to single-column, tap targets (buttons, list items) are ≥48px, and scrolling is smooth. No horizontal scroll.

**Given** a payslip detail is viewed on mobile,
**When** I scroll down,
**Then** all statutory components are visible and readable without horizontal scroll. Text is sized for 44px minimum line height (WCAG readability).

---

## Epic 5 Summary

**Total Stories: 4**

| Story | Title | FRs |
|---|---|---|
| 5.1 | Employee Portal Authentication & Tenant Isolation | FR-16 |
| 5.2 | Payslip List & Detail View | FR-16 |
| 5.3 | F&F Status for Exiting Employees | FR-16 |
| 5.4 | Mobile-Friendly Responsive Design | FR-16 |

**All FRs for Epic 5 covered: ✓**

---

## Epic 6: Integrations (Biometric, Finance, Bank, CSV)

### Story 6.1: Adapter Pattern Foundation & Biometric Webhook Receiver

As a **Backend Engineer**,
I want to implement the adapter pattern with a stable internal contract, then implement webhook receivers for biometric devices (eSSL, ZKTeco, Biomax, Matrix COSEC),
So that new integrations can be added without touching core code.

**Acceptance Criteria:**

**Given** the adapter pattern is defined,
**When** I implement a new source (e.g., biometric device),
**Then** it must implement: `pull() | receive(payload) → normalized_records`, emit `SourceSynced` event, update freshness heartbeat. No other core changes needed.

**Given** eSSL biometric device pushes attendance via webhook,
**When** the backend receives `POST /webhooks/essl/attendance`,
**Then** it parses the payload, normalizes to internal format (employee_id, date, hours_worked), writes to `attendance` table, emits `SourceSynced(source: eSSL, timestamp)`, and returns 200 OK.

**Given** ZKTeco pushes data via WDMS protocol,
**When** the adapter receives the payload,
**Then** it normalizes and writes the same way; the core system doesn't care about protocol differences.

---

### Story 6.2: Finance Source Pollers — Tally, Zoho Books, QuickBooks

As a **Backend Engineer**,
I want to implement scheduled pollers for finance sources (Tally, Zoho Books, QuickBooks) that detect CTC/structure deltas and route them to the Change Handshake,
So that finance system changes automatically surface as blockers for Priya's review.

**Acceptance Criteria:**

**Given** Tally is configured as a source,
**When** a scheduled job runs every 4 hours,
**Then** it fetches the latest employee master from Tally, compares against the last-synced snapshot, detects deltas (new CTC, structure changes), and emits `ChangeDetected(source: Tally, changes: [...])`.

**Given** ChangeDetected is emitted,
**When** the Readiness Service (Epic 1) receives it,
**Then** a Change Handshake blocker is created, Priya sees "N new CTC changes" on her dashboard, and can review + sign-off (Epic 1, Story 1.5).

**Given** Zoho Books and QuickBooks are configured,
**When** their pollers run,
**Then** they emit the same ChangeDetected event; Priya's Change Handshake aggregates all sources into one blocker list.

---

### Story 6.3: Bank Disbursement — Instruction/File Generation

As a **Backend Engineer**,
I want to generate disbursement instructions/files from a completed payroll run, formatted for bank APIs,
So that Priya can push payroll to bank portals without manual file preparation.

**Acceptance Criteria:**

**Given** a payroll run completes successfully,
**When** Priya initiates disbursement,
**Then** the system generates: employee_id, account_number, IFSC, amount (net pay in paise), and a message digest. The file is formatted per bank API spec (e.g., NEFT/RTGS for Indian banks).

**Given** the file is generated,
**When** Priya downloads it,
**Then** she can upload it directly to the bank's portal (e.g., ICICI, HDFC). No manual editing.

**Given** the file is uploaded,
**When** the bank confirms receipt,
**Then** the system records: `{ disbursement_run_id, bank_receipt_id, timestamp, status: CONFIRMED }` for audit.

---

### Story 6.4: CSV Employee-Master Import with Validation

As a **Backend + Frontend Engineer**,
I want to implement CSV import for employee master (from HRMS or manually prepared), validate fields, and report rejections loudly (not silently),
So that onboarding customers can import employees without manual data entry (FR-20).

**Acceptance Criteria:**

**Given** Priya prepares a CSV with columns: [employee_id, name, email, department, CTC, doj, dol, ...],
**When** she uploads it,
**Then** the system validates: required fields present, CTC is numeric, dates are valid format. If all rows pass, they're imported; if any row fails, the entire batch is rejected with a report of which rows failed and why.

**Given** a row has an invalid CTC (non-numeric),
**When** I view the rejection report,
**Then** I see: "Row 5 (Employee ID: EMP123) — CTC must be numeric. Received: 'Fifty Thousand'."

**Given** the import succeeds,
**When** I query the employee table,
**Then** all imported employees are present, and the `data_import_audit` table records: timestamp, source, row_count, imported_count, rejected_count.

---

### Story 6.5: Source Freshness Heartbeat & Integration with Readiness Dashboard

As a **Backend Engineer**,
I want every source (biometric, finance, bank, CSV) to emit freshness heartbeats that feed the Data Freshness Vitals section (Epic 1, Story 1.4),
So that Priya always sees which sources are live, stale, or dead.

**Acceptance Criteria:**

**Given** all sources are configured,
**When** each source syncs successfully,
**Then** it emits `SourceSynced(source_id, timestamp)`, which updates `source_freshness(tenant_id, source, last_success_at, state: FRESH)`.

**Given** a source has not synced in 24 hours,
**When** the freshness check runs (every 15 min),
**Then** its state transitions to `DEAD`, a Freshness Vitals blocker is created, and the Readiness Score is recomputed (capped <100%).

**Given** eSSL syncs again after being dead,
**When** SourceSynced is emitted,
**Then** state transitions to `FRESH`, the blocker is cleared, and the score recomputes.

---

## Epic 6 Summary

**Total Stories: 5**

| Story | Title | FRs |
|---|---|---|
| 6.1 | Adapter Pattern Foundation & Biometric Webhook Receiver | FR-17 |
| 6.2 | Finance Source Pollers | FR-18 |
| 6.3 | Bank Disbursement — Instruction/File Generation | FR-19 |
| 6.4 | CSV Employee-Master Import with Validation | FR-20 |
| 6.5 | Source Freshness Heartbeat | FR-17, FR-18, FR-19, FR-20 |

**All FRs for Epic 6 covered: ✓**

---

## Complete Epic & Story Summary

| Epic | Title | Stories | FRs |
|---|---|---|---|
| 1 | Payroll Readiness Dashboard | 8 | FR-1 to FR-10 |
| 2 | Compliance Engine (Rules-Versioned, State-Aware) | 4 | FR-11, FR-12 |
| 3 | 50%-Wage-Rule Restructuring Assistant | 3 | FR-13 |
| 4 | Guided Onboarding & TTFP | 3 | FR-14, FR-15 |
| 5 | Employee Self-Service Portal | 4 | FR-16 |
| 6 | Integrations | 5 | FR-17 to FR-20 |

**Total: 6 Epics · 27 Stories · All 20 FRs covered ✓**

---

**This structure is now ready for Step 4: Final Validation.** All epics and stories are mapped, acceptance criteria are clear, and each story is sized for single-developer completion.

Shall we proceed to final validation and completion, or would you like to adjust any epic/story structure first?

---

## EXTRACTED REQUIREMENTS SUMMARY

**Functional Requirements Extracted:** 20 (FR-1 through FR-20)
- Payroll Readiness Score: 2
- Data Freshness Vitals: 2
- Change Handshake: 2
- Lifecycle-to-Payroll Clock: 2
- Pre-Flight Checklist: 2
- Compliance Engine: 2
- Wage-Rule Restructuring: 1
- Guided Onboarding: 2
- Employee Portal: 1
- Integrations: 4

**Non-Functional Requirements Extracted:** 9 (NFR-1 through NFR-9)
- Accuracy, Honesty, Auditability, Freshness, Multi-state, Availability, Residency, Isolation, Security

**Additional Requirements (Architecture) Extracted:** 19 (AR-1 through AR-19)
- Tech Stack: 6 items
- Data Architecture: 9 items (especially critical: rules-as-data, pure calc core, integer paise, state-aware)
- Integration & Events: 4 items

**UX Design Requirements Extracted:** 48 (UX-DR-1 through UX-DR-48)
- Design Tokens & Visual System: 5
- UI Components: 8
- Information Architecture & Layout: 11
- Behavioral Patterns: 10
- Accessibility: 6
- Voice & Tone: 6
- Responsive Design: 2

---

**Please review the extracted requirements above. Do these accurately represent what needs to be built? Any additions, corrections, or clarifications needed before we proceed to epic design?**

