---
title: "Product Brief: payroll-webapp"
status: final
created: 2026-06-09
updated: 2026-06-09
author: Suyash
---

# Product Brief: payroll-webapp

## Executive Summary

An end-to-end payroll web application for the Indian market, built for the HR/payroll manager at a mid-size company (50–500 employees) — the person held 100% accountable for an output they control maybe 40% of. Every competitor already does the payroll *math*; none own the **upstream data supply chain** (late exits, silent CTC changes, stale attendance) where the errors actually originate. Our product reframes payroll as a **continuously-reconciled readiness score, not a monthly fire drill.**

Two numbers define everything we build and everything we sell: **Payroll Accuracy** and **Time-to-First-Payroll**. These are simultaneously our core success metrics *and* our headline selling points. Accuracy is the promise the payroll manager is judged on — we make a high **first-pass accuracy rate** (pay runs completed with zero post-run corrections) a structural outcome, not a hope, by catching bad inputs at a pre-flight gate before they reach a payslip. Time-to-First-Payroll is the buying decision — incumbents take weeks to go live; we get a customer to their first *correct* payroll within days of their data being complete. Every feature in this brief exists to move one or both numbers.

**Why now:** India's Four Labour Codes went into force on 21 Nov 2025 (rules still finalizing through 2026), forcing nearly every mid-size employer to restructure salaries (50% wage rule), settle final dues within two working days, and keep fully digital records. The compliance ground is shifting under every incumbent at once — a rare opening for a new entrant that treats accuracy and fast, correct onboarding as the product, not a feature.

## The Problem

The payroll manager (call her Priya) is accountable for zero-error pay on a deadline that never moves, fed by inputs she cannot command:

1. **The Accountability Gap** — Exits land on payroll at the last minute; F&F settlements stall on decisions owned by HR (e.g. notice-period waiver). Under the new codes, final settlement is now legally due within **2 working days** — late F&F is a compliance breach, not just a bad look.
2. **Silent Changes** — CTC/increment revisions happen in Finance and never reach payroll. Priya finds out from an employee complaint *after* the run.
3. **Data Holes** — Biometric/leave sync silently fails; the gap lands directly on loss-of-pay-sensitive payslips.

The cost of the status quo is measured in exactly the two numbers we optimize: **accuracy** (every silent input becomes a wrong payslip, a correction cycle, eroded trust) and **time** — both the monthly cliff-edge scramble and the weeks it takes just to get onto a new system. [ASSUMPTION] Mid-market incumbents (Keka, HROne) take 3–6 weeks to go live; that onboarding tax keeps frustrated managers stuck on tools that ignore the supply-chain problem.

## The Solution

A payroll workspace whose home screen is a single live **Payroll Readiness Score** — a continuously-reconciled percentage that decomposes into exactly what's blocking 100% (e.g. *"3 exits pending F&F · 18 unconfirmed CTC changes · attendance stale 5 days"*). The monthly "run" becomes confirming a green gauge, not racing a cliff. Its live inputs:

- **Data Freshness Vitals** — a live "last synced" pulse per upstream source (biometric, leave, finance). Stale = amber, dead = red. Never a fake green checkmark.
- **The Change Handshake** — any CTC/structure edit from Finance/HR fires a "N records changed since last run" diff into payroll with a sign-off gate. Nothing reaches a payslip without acknowledged review.
- **Lifecycle-to-Payroll Clock** — a resignation becomes an escalating countdown tied to the 2-day settlement law, not a buried notification.
- **Pre-Flight Checklist** — "Run Payroll" is blocked until preflight passes: attendance synced, no pending exits, no unacknowledged CTC changes. A pilot's-checklist model.

Underneath sits a **table-stakes compliance floor** (PF, ESI, TDS, PT, payslips, multi-state, biometric/HRMS integration) built as a **rules-versioned, state-aware engine** — because the Labour Code rules are still landing and cannot be hard-coded to a 2025 snapshot.

## What Makes This Different — Accuracy and Time as the Moat

Our two metrics are not dashboards we report after the fact; they are the product's two unfair advantages, made tangible to a buyer in the first five minutes.

**1. Payroll Accuracy — designed-in, not hoped-for.**
Competitors guarantee the *calculation* is right; we guarantee the *inputs* are right, which is where real-world errors actually come from. The Readiness Score, Change Handshake, and Freshness Vitals make it structurally hard to run payroll on stale or unacknowledged data. The selling line: *"Every other tool checks your math. We check the things your math can't see."* We measure accuracy as **two distinct numbers**, because raw correction rate would penalize us for input errors we surfaced but the user ignored — and let us claim no credit for errors we prevented:

- **First-pass payroll accuracy** — % of pay runs completed with **zero post-run corrections**. Target **≥99.5% at v1, ≥99.9% at maturity**. *This is the number we sell* ("vs. your prior tool" stays the marketing frame; the buildable target is the first-pass %, since "near-zero" can't be engineered against).
- **Prevented-error rate** — count of input issues (stale attendance, unacknowledged CTC, pending F&F) caught at the Pre-Flight gate *before* they reached a payslip. *This is the demo's hero stat and the proof of the supply-chain thesis — a number no incumbent can even report.*

**2. Time-to-First-Payroll — the onboarding wedge.**
Where mid-market incumbents take 3–6 weeks to go live, we make a correct first run dramatically faster — guided setup, the 50%-wage-rule restructuring assistant as an *acquisition hook* (every employer needs it right now), and pre-validated compliance defaults. Fast onboarding is also a *trust* signal: a tool that gets you to a correct first payroll quickly is a tool you believe in.

**Working target: first correct payroll within 3 business days of *data-complete*** — final SLA to be set with design partners. The clock boundary is the whole ballgame: we start it at **data-complete** (employee master + statutory IDs + at least one attendance sync), **not at sign-up**. Starting at sign-up would measure the customer's data-gathering speed, not our product; and a sub-day promise isn't credible in India where PF/ESI/PT registration and bank verification carry external latency we don't control. State the boundary or the SLA is unfalsifiable.

These compound: fast time-to-first-payroll gets them in; sustained accuracy keeps them. Neither is a claim a calculation-first incumbent can copy without rebuilding around the data supply chain — which their architectures treat as someone else's problem.

## Who This Serves

**Primary — the HR/payroll manager (Priya)** at a 50–500-employee Indian firm. Juggles compliance deadlines, employee queries, multi-level approvals, and zero tolerance for pay errors. Success for her: she walks into the 28th with a green gauge and no surprises, and she trusts the number. She is the buyer's champion and the daily user.

**Secondary:**
- **Finance/HR contributors** — the source of silent CTC changes, pulled into the Change Handshake as accountable signatories.
- **Business owner / CFO** — signs off on the switch; feels the cost of errors and slow onboarding.
- **Employees (self-service)** — via the v1 read-only payslip + F&F-status portal (see Scope). The **exiting employee** is the implicit beneficiary of the Lifecycle-to-Payroll Clock: the 2-day settlement law exists to protect *them*, which sharpens the compliance story from "manager convenience" to "statutory right."

## Success Criteria

**North-Star metrics (also our two selling points):**
- **First-pass payroll accuracy** — % of pay runs completed with zero post-run corrections. Target **≥99.5% (v1) → ≥99.9% (maturity)**. Paired with **prevented-error rate** (input issues caught at Pre-Flight before reaching a payslip) as the proof-of-thesis demo stat.
- **Time-to-First-Payroll** — median business days from **data-complete** (employee master + statutory IDs + ≥1 attendance sync) to first *correct* payroll run. Working target **≤3 business days**; beats the 3–6 week mid-market norm. Clock starts at data-complete, not sign-up.

**Supporting signals:**
- Readiness Score reaches 100% before run with no manual override, run over run.
- Reduction in last-minute exits and unacknowledged CTC changes reaching a payslip (the supply-chain leading indicators).
- [ASSUMPTION] Retention / monthly active runs — a manager who trusts the gauge keeps running on it.
- [ASSUMPTION] Business: design-partner conversions, then paid logos in the 50–500-emp band at the ₹40–150/emp/mo market rate.

## Scope

**In (v1):**
- Payroll Readiness Score home screen + its four live inputs (Freshness Vitals, Change Handshake, Lifecycle Clock, Pre-Flight Checklist).
- Compliance floor: PF, ESI, TDS, PT, payslips, multi-state — as a rules-versioned, state-aware engine.
- 50%-wage-rule restructuring + impact-preview assistant (the onboarding/acquisition hook).
- Guided fast onboarding flow instrumented for Time-to-First-Payroll (clock from data-complete).
- **Employee self-service portal (read-only): payslips + F&F status.** Decided *in* for v1 — it's a natural fit with the new codes' digital-records mandate and the 2-day F&F pressure, and gives the exiting employee visibility into their statutory settlement. Deliberately read-only to protect onboarding speed.
- **Concrete v1 integrations** (pinned, not "most common"): biometric — **eSSL, ZKTeco, Biomax, Matrix COSEC** (ADMS/WDMS push + REST-webhook patterns); finance/accounting — **Tally, Zoho Books, QuickBooks**; bank portals for disbursement; **CSV employee-master import** for HRMS data.

**Out (explicitly, for v1):**
- Full unified HRMS suite (performance, engagement, recruiting) — we are payroll-first, not an HRMS.
- **Deep bidirectional HRMS sync** — CSV employee-master import is *in*; two-way live sync with competitor HRMS is *out*. (Avoids the integration-trap that reopens scope mid-build.)
- **Multi-country / multi-currency payroll** — India-only is a *deliberate moat*; the compliance depth is the point. Stated so a design partner with an overseas subsidiary can't reopen it.
- **Gig/contractor payout rails** (à la RazorpayX) — a different payout-rails problem and a different buyer, not merely "later."
- Enterprise (500+) configurations and the long-tail of every integration. [ASSUMPTION]

## Vision

In 2–3 years, payroll for mid-size India is a solved, quiet, green-gauge problem — and "we run on the readiness score" is how managers describe trusting their numbers. Owning the data supply chain becomes the platform: the same freshness-and-handshake backbone that guarantees accurate pay extends to adjacent compliance and people-data workflows. We become the category that competes on **getting it right, fast** — the two numbers no incumbent built their architecture to win.

---
_Primary inputs: `PLAN.md`, `_bmad-output/planning-artifacts/market-research-2026-06-09.md`, `_bmad-output/planning-artifacts/domain-research-2026-06-09.md`_
