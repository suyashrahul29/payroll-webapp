---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-payroll-webapp-2026-06-09/prd.md
  - _bmad-output/planning-artifacts/ux-designs/ux-payroll-webapp-2026-06-09/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-payroll-webapp-2026-06-09/EXPERIENCE.md
  - _bmad-output/planning-artifacts/briefs/brief-payroll-webapp-2026-06-09/brief.md
  - CLAUDE.md
workflowType: 'architecture'
project_name: 'payroll-webapp'
user_name: 'Suyash'
date: '2026-06-09'
authoring_note: 'Drafted under an explicit user time-box. Architectural decisions were driven from the finalized PRD, UX spines, and CLAUDE.md conventions rather than the skill''s step-by-step collaborative elicitation. [ASSUMPTION]/[DECISION — confirm] tags mark calls that warrant the user''s sign-off.'
status: draft
---

# Architecture Decision Document — payroll-webapp

_Drafted from finalized PRD + UX spines under a time-box. The collaborative step-gates were compressed; every consequential choice is tagged `[DECISION — confirm]` for your review._

## 1. Context & Driving Forces

This architecture serves an **India-only, multi-tenant payroll SaaS** for 50–500-employee firms. The architecture is shaped less by payroll *math* (table stakes) and more by the product thesis: **owning the upstream data supply chain** so the two North-Star numbers — first-pass accuracy (≥99.5%) and Time-to-First-Payroll (≤3 business days) — are structural outcomes.

**The forces that actually drive the design:**

| Force | Architectural consequence |
|---|---|
| Money + statutory liability | Strong consistency, integer-minor-unit money, full audit trail, no float, no eventual-consistency on a pay run. |
| **Rules-versioned, state-aware compliance** (PRD §4.6, §12) | Effective-dated rule sets; a run computes against the rule version in force *for its period and state* — never a code snapshot. This is the crown-jewel subsystem. |
| Continuously-reconciled Readiness Score (PRD §4.1) | Event-driven recomputation off source/change/lifecycle events, not a nightly batch. |
| Data-supply-chain ownership (Freshness Vitals, Change Handshake) | Per-source ingestion adapters with heartbeat/freshness tracking; append-only change-set + sign-off audit log. |
| Pinned integrations (biometric, finance, bank, CSV) | Adapter pattern with a stable internal contract; webhook receivers (biometric ADMS/WDMS) + scheduled pollers (finance). |
| Sensitive PII + salary, India | India data residency, tenant isolation, encryption at rest/in transit, RBAC. |
| 2-working-day F&F clock (PRD §4.4) | Working-day-aware scheduling + escalation jobs. |

## 2. Tech Stack `[DECISION — confirm]`

> **This is the #1 call that needs your sign-off.** The prototype at `app/index.html` is deliberately zero-dependency vanilla HTML/CSS/JS, and CLAUDE.md says not to add tooling "without a deliberate reason." A production multi-tenant payroll app *is* that deliberate reason — auth, integrations, money, audit, RBAC exceed what a single static file can carry. Recommendation below; reject any line and I'll revise.

| Layer | Recommendation | Why |
|---|---|---|
| **Prototype/demo** | **Keep vanilla** `app/index.html` as-is | It's the validation/sales artifact; fast-to-run is its value. Do not retrofit a framework into it. |
| **Production front-end** | **React + TypeScript**, design-token layer seeded from `DESIGN.md` | The dashboard is state-dense (gauge, live blockers, pulses); component model fits. DESIGN.md tokens port directly to CSS variables / a token file. |
| **Backend** | **TypeScript (Node)** monorepo, shared types front↔back | Shared FR/domain types reduce drift; single-language team velocity for a startup. *Alternative considered: Python/Django for the compliance core — note in §9.* |
| **Database** | **PostgreSQL** | Relational integrity for money, row-level security for tenancy, native support for effective-dated/temporal rule tables, strong consistency. |
| **Async/jobs** | A durable queue (e.g. PG-backed or Redis-backed worker) | Source polling, challan/payslip generation, disbursement files, clock escalation. |
| **Auth** | Hosted identity (OIDC) + app RBAC | Don't hand-roll auth for a product holding salary data. |
| **Hosting** | Cloud, **India region** (e.g. ap-south-1) | Data residency. |

`[ASSUMPTION]` Node/TS over Python is a velocity call, not a hard requirement — flagged for your preference. The compliance engine is isolated enough to be a separate service in any language if you prefer Python there.

## 3. System Components (logical)

```
┌─────────────────────────────────────────────────────────────┐
│  Operator Dashboard (React)        Employee Portal (React)    │
│  — Readiness Score, blockers       — read-only payslip / F&F  │
└───────────────┬─────────────────────────────┬────────────────┘
                │  API (REST/typed)            │
┌───────────────▼──────────────────────────────▼────────────────┐
│                      Application / API layer                    │
│  Auth+RBAC · Tenant context · Readiness Service                 │
├─────────────────────────────────────────────────────────────────┤
│  Domain services:                                               │
│   • Readiness Service   — computes score from live inputs       │
│   • Change Handshake    — change-set + sign-off (append-only)   │
│   • Lifecycle Clock     — exit→countdown, working-day aware     │
│   • Pre-Flight/Run Gate — binary gate, prevented-error counter  │
│   • Compliance Engine   — rules-versioned, state-aware calc     │
│   • Onboarding/TTFP     — data-complete detection + clock       │
├─────────────────────────────────────────────────────────────────┤
│  Ingestion adapters (freshness-tracked):                        │
│   biometric(eSSL,ZKTeco,Biomax,Matrix) · finance(Tally,Zoho,QB) │
│   · bank disbursement · CSV employee-master import              │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL (RLS, effective-dated)  ·  Job queue  ·  Audit log  │
└─────────────────────────────────────────────────────────────────┘
```

**Readiness Service** is the heart: it subscribes to domain events (`SourceSynced`, `SourceWentStale`, `ChangeDetected`, `ChangeSignedOff`, `ExitRecorded`, `FFSettled`, `PreFlightItemChanged`) and recomputes the score + blocker decomposition. The score is derived state, never hand-edited.

## 4. Data Architecture — the compliance engine `[DECISION — confirm]`

The single most important data decision. **Compliance rules are effective-dated, versioned rows — not application code.**

- `compliance_rule_set(id, rule_type [PF|ESI|TDS|PT], jurisdiction [IN | state], effective_from, effective_to, version, params_jsonb)`
- A pay run records `(period, rule_set_version[])` it computed against. Re-running a historical period re-resolves the rule set *as-of* that period (PRD FR-12, OQ-3).
- The calculation core is a **pure function**: `compute(employee, period, resolved_rules) → statutory_outputs`. No I/O, fully testable — this is what makes ≥99.5% accuracy engineerable.
- **Money is integer paise** everywhere; formatting to ₹ happens only at the edge.
- **State-aware**: PT and state-specific rules resolve by the employee's jurisdiction; the engine never assumes a single state.

Other key data shapes:
- **Tenant isolation** via Postgres Row-Level Security on `tenant_id`.
- **Change-set + sign-off** is append-only (who/when/what-state-acknowledged) — satisfies audit + the post-sign-off re-block (FR-6).
- **Source freshness** stored per `(tenant, source)` with `last_success_at`, `state` derived by threshold → feeds Freshness Vitals.

## 5. Integration Architecture

- **Adapter pattern**: every source implements a stable internal contract (`pull/receive → normalized records → freshness heartbeat`). Adding a device or finance tool = a new adapter, not core changes — this is the mitigation for the integration-creep risk (PRD §14) paired with the pinned-set discipline.
- **Biometric**: webhook receivers for ADMS/WDMS push + REST patterns (eSSL, ZKTeco, Biomax, Matrix COSEC).
- **Finance**: scheduled pollers / connectors (Tally, Zoho Books, QuickBooks); detected deltas raise `ChangeDetected` → Change Handshake.
- **Bank disbursement**: produce a disbursement instruction/file from a completed run (integration surface, not a payout-rails build — PRD FR-19/§5).
- **CSV import**: validated employee-master ingestion toward Data-Complete; rejects bad rows loudly (FR-20).

## 6. Cross-Cutting NFRs (architectural)

- **Accuracy integrity**: no payslip computed from stale/dead/unacknowledged input — enforced at the Run Gate, not in UI.
- **Honest state**: freshness derived from real heartbeats; a source is never reported green without a successful recent sync.
- **Auditability**: append-only audit for sign-offs, overrides, F&F resolutions, rule-version applications.
- **Security**: encryption at rest + in transit; RBAC roles — Operator (Priya), Finance Signatory, Employee (read-only); least privilege; India data residency.
- **Reliability around the cycle**: heightened availability in the pre-payday window; jobs idempotent and retryable.
- **Performance**: Readiness recompute target <60s after an ingested change (PRD OQ-5).

## 7. Key Decisions Needing Your Sign-off

> **Update 2026-06-11:** Decision #1 (production stack) is **signed off and proven** — a Node/TS +
> PostgreSQL backend now backs the first vertical slice (**employee master**) in `server/`,
> demonstrating tenant isolation via RLS, integer-paise money, and an append-only audit log.
> See `server/README.md`. The `app/` prototype remains localStorage-backed for all other slices.

1. **`[SIGNED OFF — 2026-06-11]` Production stack** — React+TS front-end, Node/TS backend, PostgreSQL. (§2) — *first slice (employee master) implemented in `server/`.* React front-end still pending; the prototype HTML calls the API directly for now.
2. **`[DECISION]` Compliance engine as effective-dated rule data + pure calc core** (§4) — recommended strongly; confirm the "rules are data, not code" stance and whether historical re-run is v1 (OQ-3).
3. **`[DECISION]` Keep the vanilla prototype frozen** as the demo, build production separately — vs. evolving the single file (not recommended past demo).
4. **`[ASSUMPTION]` Node/TS vs Python for the compliance core** — confirm preference.
5. **`[ASSUMPTION]` Hosted OIDC auth** rather than self-built.

## 8. Out of Architectural Scope (v1)

Bidirectional HRMS sync · multi-country/multi-currency · gig payout rails · enterprise multi-entity configs · employee write-paths (portal read-only). Mirrors PRD §5 non-goals.

## 9. Alternatives Considered (brief)

- **Python/Django for the whole backend** — strong for the compliance math and data tooling; rejected as default only to keep one language across the stack, but a defensible swap for the Compliance Engine service specifically.
- **NoSQL primary store** — rejected; money + statutory integrity want relational constraints and transactions.
- **Nightly batch reconciliation** — rejected; contradicts the "continuously-reconciled" thesis. Event-driven recompute is core.
- **Evolving `app/index.html` into the product** — rejected past the demo; a single static file can't carry auth, tenancy, integrations, and audit.
