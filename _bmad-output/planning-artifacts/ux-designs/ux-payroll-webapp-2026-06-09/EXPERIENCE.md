---
title: payroll-webapp — Experience & Behavior
status: final
created: 2026-06-09
updated: 2026-06-09
sources:
  - ../../prds/prd-payroll-webapp-2026-06-09/prd.md
  - ../../../../app/index.html
design: ./DESIGN.md
---

# payroll-webapp — Experience & Behavior

> Experience owns *how it works* — IA, behavior, states, interactions, accessibility, flows.
> Visual identity (tokens, color, type, components' looks) lives in `DESIGN.md`; this doc references its tokens by name as `{colors.x}`, `{components.y}`.
> Both spines win on conflict with any mock or import. Glossary terms (PRD §3) are used verbatim.

## Foundation

- **Form-factor:** Web, **desktop-first**. The operator (Priya) works from a desk dashboard at `{spacing.page-max}`. There is no native app and no mobile-first claim in v1.
- **UI system:** None — hand-built, zero-dependency HTML/CSS/JS (project convention). No framework, no component library. DESIGN.md tokens are the system.
- **Primary surface:** the **Payroll Readiness Score** dashboard (the home screen). Everything else is reached from a blocker or a nav affordance off it.
- **Secondary surface:** the read-only **Employee Self-Service Portal** — a separate, lighter, mobile-friendly surface for a different audience. It inherits DESIGN.md tokens; its layout is the one responsive exception (see Responsive & Platform). [ASSUMPTION: portal is a distinct authenticated surface, not a tab inside Priya's dashboard.]

## Information Architecture

The dashboard is a single screen of stacked, equal-citizen cards — there is no deep navigation; the product's value is *seeing everything reconcile in one view*.

**Operator dashboard (home):**
1. **Header** (sticky) — brand + readiness dot, cycle context (month, employer, due date, employee count), live Time-to-First-Payroll.
2. **Readiness rail** (left, fixed 360px) — the `{components.gauge}`, status line, and the `{components.run-button}`.
3. **Working column** (right, fluid):
   - **Pre-Flight Checklist / "What's blocking 100%"** — the Blocker list (the action surface).
   - **Data Freshness Vitals** — per-source pulse tiles.
   - **The two numbers we live by** — First-pass accuracy, Errors prevented this run, Lifecycle clock, Time-to-First-Payroll.

**Surfaces reached from a Blocker** (drill-downs — layout deferred to spine tables, not mocked in v1):
- **Change Handshake review** — per-record before/after CTC diff with sign-off (from the "Review & sign" action). Realizes PRD FR-5.
- **F&F settlement** — per-exit settlement workflow (from "Settle"). Realizes FR-8.
- **Source re-sync / freshness detail** — (from "Re-sync"). Realizes FR-3.
- **Compliance action** — e.g. challan generation (from "Generate"). Realizes FR-11.

**Onboarding flow** — a separate guided sequence to Data-Complete (FR-14), instrumented for Time-to-First-Payroll. Not part of the steady-state dashboard IA.

**Employee portal** — read-only payslip list + (for exiting employees) F&F status. Realizes FR-16.

*IA closure:* every PRD stated need has a surface; every surface has a journey that lands there (UJ-1 home, UJ-2 Change Handshake, UJ-3 Lifecycle clock + portal, UJ-4 onboarding). Drill-down surfaces are named and behavior-specified here; their visual layout is intentionally left to spine + build, flagged for mock-on-request.

## Voice and Tone

Microcopy is **plain, calm, and accountable** — it names the real-world problem and the deadline, never hedges. It speaks the way a trusted colleague briefs you.

- **State the blocker concretely, with the stakes:** *"3 exits pending F&F — F&F blocked on HR notice-waiver decision · legal deadline: 2 working days."* Always: what, why, and the consequence.
- **Frame the win as calm, not celebratory:** *"All clear. Confirm the green gauge — no fire drill."* Not "🎉 You're a payroll hero!"
- **Confirmation reinforces the core promise:** the run toast reads *"Payroll run completed — zero post-run corrections"* — it sells the metric back to the user.
- **Category tags use Glossary terms verbatim:** Lifecycle Clock, Change Handshake, Freshness Vitals, Compliance floor.
- Honesty in failure states: a dead sync says *"Biometric (eSSL) sync dead · LOP-sensitive payslips at risk"* — never "syncing…" when it isn't.

## Component Patterns (behavioral)

*Visual specs are in DESIGN.md; this is behavior.*

- **`{components.gauge}`** — recomputes and re-sweeps on every state change (blocker resolved, source state change, post-sign-off re-block). Color and numeral follow score→hue. Reaching 100 flips the run-button to ready. Realizes FR-1.
- **`{components.run-button}`** — strictly binary: enabled only at score 100 with no open blocker; otherwise disabled with a lock label. No hover-to-override, no confirm-anyway. Implements the hard gate (FR-9). [ASSUMPTION carried from PRD OQ-1: no silent override path in v1.]
- **`{components.blocker-row}`** — each row's action resolves *that* blocker's drill-down; on resolution the row strikes through, its icon becomes a green check, the gauge re-sweeps, and the Errors-prevented counter increments by one (FR-10). A new incoming change re-adds a row and drops the score (FR-6).
- **`{components.vital-tile}`** — reflects last-synced state per source continuously; transitions fresh→stale→dead by threshold (FR-3, FR-4).
- **F&F clock metric** — live countdown in working days to the statutory deadline; recolors `{colors.text}` → `{colors.warning}` (<24h) → `{colors.critical}` (<12h). Realizes FR-7.

## State Patterns

- **Score states:** `critical` (<80) · `warning` (80–99) · `ready` (100). The whole gauge cluster (ring, numeral, brand dot) shares one state.
- **Source states:** `fresh` (green pulse, animated) · `stale` (amber) · `dead` (red). No fourth "assumed-ok" state.
- **Blocker states:** `open` (action available) · `resolved` (struck through, counted as prevented) · `re-opened` (a post-sign-off change, FR-6).
- **Run-gate states:** `blocked` (default whenever any blocker is open) · `ready` (all clear). Binary.
- **Empty/first-run state:** before Data-Complete, the dashboard shows the onboarding path, not a fake 0%/100%. [ASSUMPTION: pre-data dashboard routes to onboarding rather than rendering an empty gauge.]
- **Loading/reconciling state:** gauge animates from 0 with status line "Reconciling upstream inputs…" — liveness, not a spinner.

## Interaction Primitives

- **Resolve-in-place:** acting on a blocker updates the gauge immediately; no full-page reload, no "save" round-trip in the demo model.
- **Animated reconciliation:** gauge `.6s` sweep, green pulse blink (`1.6s`), ticking clock — motion exists to signal the system is *live*, never as ornament.
- **One-tap run** when ready; disabled and unmistakable when not.
- **Toast confirmation** on run completion; auto-dismiss ~3.2s.

## Accessibility Floor

The entire model leans on red/amber/green — so color **must never be the only signal**:

- Every state pairs color with a **non-color cue**: an icon, a text label, and (for sources) a phrase ("Stale · 5 days", "Live · 4 min"). The dashboard must be fully legible in grayscale and to color-blind users. *(This is a hard requirement, not a nicety — it is the one place the design's strength is also its risk.)*
- Disabled run-button conveys *why* in text, not by color alone.
- Tabular numerals + sufficient size on the gauge (56px) and clock for at-a-glance reading.
- Target contrast: text/`{colors.text}` and muted/`{colors.muted}` on slate surfaces meet WCAG AA for their sizes. [ASSUMPTION: verify `{colors.muted}` #93a1b1 on `{colors.surface}` for small text at finalize — likely AA-large only; promote muted weight where it carries essential meaning.]
- Keyboard: blocker actions and run-button are reachable and operable by keyboard; focus states visible against the dark theme.
- Respect `prefers-reduced-motion` — disable pulse/sweep, keep state legible without animation.

## Key Flows

- **KF-1. Priya works the gauge to green (realizes UJ-1).**
  Opens the dashboard mid-month → gauge sweeps to 82%, amber → reads the decomposition: 4 blockers across Lifecycle Clock, Change Handshake, Freshness Vitals, Compliance → resolves each from its row → **climax:** the last resolution sweeps the gauge to 100 green, the run-button flips to "▶ Run Payroll — 248 employees" → she runs it → toast: "zero post-run corrections."

- **KF-2. Catching the silent CTC change (realizes UJ-2).**
  A "18 unconfirmed CTC changes" blocker sits amber, tagged Change Handshake → "Review & sign" opens the per-record before/after diff with the originating Signatory named → she signs off most, holds two → **climax:** acknowledged records clear the blocker and increment Errors-prevented; the two holds keep the gauge below 100 until resolved. **Edge:** a change arriving after sign-off re-opens a row and drops the score (FR-6).

- **KF-3. The F&F countdown (realizes UJ-3).**
  An exit posts a "3 exits pending F&F" red blocker; the Lifecycle clock metric ticks down in working days, recoloring as the statutory 2-day deadline nears → "Settle" opens the F&F workflow → **climax:** settling clears the blocker and the clock, and the settled status propagates to the exiting employee's portal view.

- **KF-4. First correct payroll, fast (realizes UJ-4).**
  New tenant enters guided onboarding → CSV employee-master import + statutory IDs + one biometric connect → **climax:** Data-Complete detected, the Time-to-First-Payroll clock starts (header shows "2.1 business days from data-complete"), pre-validated compliance defaults carry her toward a passing pre-flight → first correct run inside the target window. External latency (PF/ESI/PT, bank verification) shown as out-of-our-control so the metric stays honest.

## Inspiration & Anti-patterns

- **Inspiration:** aircraft cockpit / mission-control readiness boards; a single authoritative gauge; status pulses that read at a glance.
- **Anti-patterns:** light pastel HR dashboards; celebratory/gamified payroll; grey enterprise spreadsheets; any UI that shows a green it hasn't earned, or a "run anyway" escape hatch on the gate.

## Responsive & Platform

- **Operator dashboard:** desktop-first. Two-column → single-column at ≤880px; vitals 3-up → 1-up and metrics 2-up → 1-up at ≤560px. Usable on a tablet in a pinch; phone is not a target for the operator view.
- **Employee portal (the responsive exception):** must be **mobile-friendly** — employees check payslips/F&F on a phone. Inherits DESIGN.md tokens but uses a single-column, larger-tap-target layout. [ASSUMPTION: portal layout designed in a follow-up UX pass; v1 spec here is behavioral only — read-only, own-records-only, F&F status for exiting employees.]
