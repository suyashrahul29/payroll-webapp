# CLAUDE.md — payroll-webapp

Guidance for AI agents working in this repo.

## What this is

An end-to-end **payroll web application for the Indian market**, targeting the HR/payroll
manager at a mid-size company (50–500 employees). The product thesis: **payroll as a
continuously-reconciled readiness score, not a monthly fire drill.** The moat is owning the
**upstream data supply chain** (late exits, silent CTC changes, stale attendance) that every
incumbent ignores.

The two numbers that define everything we build:
1. **First-pass payroll accuracy** — % of runs with zero post-run corrections (target ≥99.5% v1).
2. **Time-to-First-Payroll** — ≤3 business days from *data-complete* (not from sign-up).

Full context: `PLAN.md` and the product brief at
`_bmad-output/planning-artifacts/briefs/brief-payroll-webapp-2026-06-09/brief.md`.

## Current state (2026-06-09)

A **runnable interactive prototype of the hero screen** — the Payroll Readiness Score
dashboard — lives at `app/index.html`. It is a single self-contained file (HTML + CSS + JS,
no build step, no dependencies). This is a validation/demo prototype with mock data, **not**
a production payroll engine.

## How to run

Just open the file in a browser — there is no build or install step:

```powershell
start app/index.html
```

Or serve it (any static server works), e.g.:

```powershell
python -m http.server 8000   # then visit http://localhost:8000/app/
```

## Styling
All UI must follow the color system defined in @colours.md. Use the CSS variables / Tailwind tokens defined there — never hardcode hex values in components


## The hero screen — Payroll Readiness Score

A single live % on the home screen that decomposes into exactly what's blocking 100%. Its four
live inputs (each a feature in its own right):

- **Data Freshness Vitals** — last-synced pulse per upstream source. Stale = amber, dead = red.
- **The Change Handshake** — CTC/structure edits fire a diff with a sign-off gate.
- **Lifecycle-to-Payroll Clock** — a resignation becomes an escalating countdown tied to the
  legal 2-working-day final-settlement deadline.
- **Pre-Flight Checklist** — "Run Payroll" is blocked until preflight passes.

When extending the prototype, **every feature must visibly serve accuracy or time-to-first-payroll.**

## Conventions

- **Zero-dependency front-end** for now: vanilla HTML/CSS/JS in one file. Do not add a framework
  or build tooling without a deliberate reason — fast-to-run is part of the demo's value.
- **India-first, India-only.** No multi-country / multi-currency. Compliance depth is the point.
- Compliance logic (PF/ESI/TDS/PT) must be treated as **rules-versioned and state-aware** — the
  Labour Code rules are still landing through 2026; never hard-code a 2025 snapshot.
- Currency is INR (₹). Dates are India-context.
- After any UI change, **screenshot the running page and look at it** before calling it done
  (see the `visual-iterate` skill).

## Out of scope (v1)

Full HRMS suite · deep bidirectional HRMS sync (CSV import only) · gig/contractor payout rails ·
multi-country payroll · enterprise (500+) configs.

## BRANDING AND PRIMARY COLOURS
Refer @greenlit_logo_and_app_icon.svg
