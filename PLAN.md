# Payroll Web App — Plan

## Vision

An end-to-end payroll web application for the Indian market.

**Primary user:** the HR/payroll manager at a mid-size company (≈50–500 employees) — someone juggling compliance deadlines, employee queries, multi-level approvals, and zero tolerance for errors in people's pay.

## Product Thesis

**Payroll as a continuously-reconciled readiness score, not a monthly fire drill.**

The core insight: payroll isn't really a *calculation* problem — every competitor already does the math. It's a **data supply-chain problem**. The payroll manager is held 100% accountable for an output they control maybe 40% of. Every input — resignations, CTC revisions, attendance — arrives late, wrong, or not at all, from people and systems they can't command, against a deadline that never moves.

**Our wedge: own the upstream data supply chain — the part every Indian payroll competitor treats as someone else's problem.**

## Differentiating Features

These came from inverting real user pain, not from copying competitors.

1. **Payroll Readiness Score (keystone)** — A single live % on the home screen, continuously reconciled, that decomposes into exactly what's blocking 100% (e.g. "3 exits pending F&F · 18 unconfirmed CTC changes · attendance stale 5 days"). The monthly "run" becomes confirming a green gauge, not racing a cliff-edge. Features 2–5 are its live inputs.
2. **Data Freshness Vitals** — A live "last synced" pulse for every upstream source (biometric, leave, finance). Stale = amber, dead = red — never a fake green checkmark.
3. **The Change Handshake** — Any CTC/structure edit from Finance/HR fires a "N records changed since last run" diff into payroll with a sign-off gate. Nothing reaches a payslip without acknowledged review.
4. **Lifecycle-to-Payroll Clock** — A resignation becomes an escalating countdown ("F&F pending · 2 days to run · notice waiver UNCONFIRMED"), not a buried notification.
5. **Pre-Flight Checklist** — "Run Payroll" is blocked until preflight passes: attendance synced, no pending exits, no unacknowledged CTC changes. A pilot's-checklist model.

## Validated Pain Points (the "why")

1. **The Accountability Gap** — Exits forwarded to payroll at the last minute; F&F settlements blocked on decisions owned by HR (e.g. notice-period waiver).
2. **Silent Changes** — CTC/increment revisions happen in Finance and never reach payroll; the manager finds out from an employee complaint.
3. **Data Holes** — Biometric/leave sync fails and the gap lands directly on LOP-sensitive payslips.

## Research Approach

- **Competitor study (parity baseline):** Study the top 5 Indian payroll apps to build a *table-stakes checklist* — statutory compliance, payslips, basic integrations, etc. This is the floor, not the differentiation.
- **Differentiation (the moat):** Comes from solving the data-supply-chain pain above, which competitors largely ignore.

## Market Context (research: 2026-06-09)

- **Market:** India payroll services ~USD 1.78B (2025) → ~USD 1.91B (2026), ~7.4% CAGR to USD 2.74B by 2031. The **SMB segment grows fastest (~16.4% CAGR)** — our 50–500-emp wedge sits in the hottest slice. Automation adoption ~67% (2024) heading past 85%, so parity is table-stakes and differentiation decides winners.
- **Competitors:** RazorpayX (instant disbursal, SMB), Keka (mid-market, fast-growth), greytHR (compliance-heavy), Zoho Payroll (cheapest, Zoho-native), Darwinbox/PeopleStrong/ZingHR (enterprise). **Pricing band ₹40–150/emp/mo.** Onboarding: SMB days–2wk, mid-market 3–6wk.
- **Confirmed whitespace:** every incumbent competes on calculation + compliance + disbursal; **none own the upstream data supply chain** — validating our readiness-score thesis.
- **Table-stakes floor we must hit:** auto PF/ESI/TDS/PT, payslips, multi-state, biometric/HRMS integration, fast disbursal, days-not-weeks onboarding.
- _Full analysis: `_bmad-output/planning-artifacts/market-research-2026-06-09.md`_

## Domain Context — Compliance (research: 2026-06-09)

- **Four Labour Codes are now IN FORCE (effective 21 Nov 2025)** — but detailed Central/State rules are still landing through 2026. **Build the compliance engine as rules-versioned & state-aware, not a hard-coded 2025 snapshot.**
- **50% Wage Rule:** basic pay (incl. DA) must be ≥50% of CTC → mass salary-structure redesign needed now. **A guided restructure + impact-preview tool is a strong acquisition hook.**
- **Final settlement within 2 working days** of separation → makes the Lifecycle-to-Payroll Clock a *legal* feature, not just UX. Late F&F is now a breach.
- **Digital record mandate** (wage/attendance/PF/ESI/LWF, month-wise, employee-wise) → directly validates Data Freshness Vitals as audit-ready compliance.
- **Key deadlines** to drive the Readiness Score countdown: PF/ESI by 15th, TDS by 7th (Mar: 30 Apr), PT per-state. Gratuity now vests for fixed-term staff at 1 yr; **Form 16 → Form 130.**
- _Full analysis: `_bmad-output/planning-artifacts/domain-research-2026-06-09.md`_

## Build Status — Hero-Screen Prototype (2026-06-09)

**Shipped: a runnable, interactive prototype of the Payroll Readiness Score dashboard** —
delivering on Next Step #3 below. This is the validation/demo centerpiece, not a production
payroll engine.

- **Location:** `app/index.html` — single self-contained file (HTML + CSS + JS), zero
  dependencies, no build step. Open in any browser (`start app/index.html`).
- **What it demonstrates:**
  - Live **Payroll Readiness Score** gauge that animates from blocked → 100% as inputs clear.
  - **Pre-Flight Checklist** of real blockers (pending F&F exits, unconfirmed CTC changes,
    stale attendance, PF challan) — each resolvable; "Run Payroll" stays locked until 100%.
  - **Data Freshness Vitals** (eSSL biometric / HRMS CSV / Tally) with stale/amber/live pulses.
  - **Lifecycle-to-Payroll Clock** — live countdown to the legal 2-working-day F&F deadline.
  - **The two North-Star numbers on screen:** first-pass accuracy (99.6% / ≥99.5% target) and
    a live **errors-prevented** counter (the supply-chain thesis made visible).
- **Scope honesty:** mock data; no real PF/ESI/TDS engine, no live integrations, no auth/DB.
  Those are deliberately out of this 30-minute build.
- **Tracked in:** `CLAUDE.md` (run instructions + conventions).

### Next build steps (post-prototype)
1. ~~Replace mock blockers with a real data model~~ + state-aware compliance rules engine. **Data model: started** — see Build Status (2026-06-11); compliance rules engine still pending.
2. Wire one real integration end-to-end (start with eSSL/ZKTeco biometric push or Tally).
3. ~~Add auth + employee read-only payslip/F&F-status portal~~ ✅ **prototype done** (Epic 5, localStorage-backed).

## Build Status — Epics & First Real Backend Slice (2026-06-11)

The prototype expanded across all six planned epics (still vanilla HTML/CSS/JS in `app/`,
localStorage-backed), and the **first vertical slice has now moved off localStorage onto a real
database**, signing off the production-stack decision in `architecture.md` §2.

- **Epic delivery (prototype):** ~22 of 27 stories done across Epics 1–6 — readiness dashboard
  (complete), compliance engine (complete), restructuring assistant, onboarding/TTFP, employee
  portal, integrations. Tracked in `_bmad-output/implementation_artifacts/sprint-status.yaml`.
- **First production slice — employee master (`server/`):** a **Node/TS + PostgreSQL 16** backend
  (Express, `pg`, plain SQL migrations, Docker Compose), replacing the localStorage path for
  employee import. Proves the production stack on one slice:
  - **Tenant isolation via Postgres Row-Level Security** (app connects as a non-superuser role so
    RLS actually applies — superusers bypass it).
  - **Integer-paise money** everywhere (no float), per architecture §4.
  - **Append-only import audit log**, zod request validation, fail-closed tenant context.
  - `app/import.html` now writes to the API, with a transparent **localStorage fallback** so the
    offline demo still runs. Setup + API docs in `server/README.md`.
- **Scope honesty:** only the employee-master slice is on Postgres; payslips, compliance,
  readiness, and the portal remain localStorage-backed. **No React yet** (the prototype HTML calls
  the API directly), and **no auth/session** — tenant comes from a header for the demo.

### Next backend steps
1. Migrate a second slice (payslips) to exercise read-heavy, compliance-derived data.
2. Real auth/session so tenant context comes from a logged-in user, not an `X-Tenant-Id` header.
3. Stand up the React + TypeScript front-end (architecture §2) and retire the direct-from-HTML calls.

## Next Steps (product)

1. **Validate the pain with real managers** — interview 5–8 HR/payroll managers at 50–500-person Indian firms; confirm the accountability-gap pattern and rank the 5 features by willingness-to-pay. **Use `app/index.html` as the interview centerpiece.**
2. **Map the integration surface** — the moat depends on connecting to biometric vendors, HRMS, and finance/ERP systems. Catalog the top integrations and assess feasibility before committing to the readiness-score positioning.
3. ~~**Prototype the Readiness Score UI**~~ ✅ **Done** — see Build Status above (`app/index.html`).

---

_Full brainstorming session: `_bmad-output/brainstorming/brainstorming-session-2026-06-09-19-20.md`_
