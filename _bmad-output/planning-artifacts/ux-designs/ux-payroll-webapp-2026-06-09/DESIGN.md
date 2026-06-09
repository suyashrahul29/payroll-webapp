---
title: payroll-webapp — Visual Identity
status: final
created: 2026-06-09
updated: 2026-06-09
sources:
  - ../../prds/prd-payroll-webapp-2026-06-09/prd.md
  - ../../../../app/index.html
colors:
  bg: "#0f1419"
  surface: "#18202b"
  surface-2: "#1f2937"
  line: "#2b3645"
  text: "#e6edf3"
  muted: "#93a1b1"
  ready: "#2ecc71"
  warning: "#f5a623"
  critical: "#e74c3c"
  action: "#4f8cff"
  on-ready: "#06210f"
  on-action: "#021024"
typography:
  font-family: "\"Segoe UI\", system-ui, -apple-system, Roboto, sans-serif"
  display: "56px / 800"
  h-card: "14px / 600 / uppercase / 0.6px tracking"
  body: "14px / 400"
  small: "13px / 400"
  micro: "11px-12px / 500 / uppercase"
  numeric: "tabular-nums (gauge, clock, metrics)"
rounded:
  card: "14px"
  control: "10px"
  chip: "20px"
  pulse: "50%"
spacing:
  page-max: "1180px"
  page-pad: "28px"
  grid-gap: "24px"
  card-pad: "18px"
  stack-gap: "12px-14px"
components:
  - gauge
  - readiness-card
  - blocker-row
  - vital-tile
  - metric-tile
  - run-button
  - status-pulse
  - toast
---

# payroll-webapp — Visual Identity

> Visual identity owns *how it looks*. Behavior, IA, states, and flows live in `EXPERIENCE.md`.
> Both spines win on conflict with any mock or import. EXPERIENCE.md references these tokens by name as `{colors.ready}` etc.
> Tokens and base patterns are extracted from the canonical prototype at `app/index.html`.

## Brand & Style

A **control-room for payroll**. The product reframes a monthly fire-drill as a calm, continuously-reconciled readiness check — so the identity is a dark cockpit dashboard, not a cheerful SaaS marketing surface. The mood is **trustworthy, instrument-grade, quietly alive**. Priya should feel she is reading a flight deck she can rely on, not racing a deadline.

Voice of the visuals: confident and literal. Nothing decorative competes with state. The single most important brand promise — *"every other tool checks your math; we check the things your math can't see"* — is expressed visually by making **system state the loudest thing on screen**: the gauge, the pulses, the countdown.

**Anti-references:** light/pastel HR-SaaS dashboards; celebratory confetti UI; dense enterprise-grey spreadsheets; anything that shows a green checkmark it can't justify.

## Colors

The palette is **semantic before it is aesthetic**. Four hues carry the entire readiness language; everything else is neutral slate so state reads instantly.

| Token | Hex | Meaning — used *only* for this |
|---|---|---|
| `{colors.bg}` | `#0f1419` | App background (deep slate + subtle radial highlight at 70% -10%) |
| `{colors.surface}` | `#18202b` | Card surface |
| `{colors.surface-2}` | `#1f2937` | Nested tile surface (vitals, metrics) |
| `{colors.line}` | `#2b3645` | Borders, dividers, gauge track |
| `{colors.text}` | `#e6edf3` | Primary text |
| `{colors.muted}` | `#93a1b1` | Secondary text, labels, section headers |
| `{colors.ready}` | `#2ecc71` | **Ready / fresh / pass** — score ≥100, live source, resolved blocker |
| `{colors.warning}` | `#f5a623` | **Stale / caution** — score 80–99, aging source, amber clock |
| `{colors.critical}` | `#e74c3c` | **Dead / breach risk** — score <80, dead source, red clock |
| `{colors.action}` | `#4f8cff` | Interactive affordance — resolve buttons, links |
| `{colors.on-ready}` | `#06210f` | Text on a ready (green) fill |
| `{colors.on-action}` | `#021024` | Text on an action (blue) fill |

**The cardinal rule (a visual law, not a preference):** green is *earned*, never assigned. A surface renders `{colors.ready}` only when it is genuinely fresh/passing. Unknown, stale, or failed state must render `{colors.warning}` or `{colors.critical}` — **never** green. This implements PRD §4.2 "never a fake green checkmark" at the pixel level.

Score→hue mapping: `≥100 → ready` · `80–99 → warning` · `<80 → critical`. The gauge ring, the score numeral, and the brand dot all recolor together from this single function.

## Typography

System font stack only — `{typography.font-family}`. No web fonts (honors the zero-dependency front-end convention). Numerals use `tabular-nums` wherever they tick or compare (gauge, F&F clock, metrics).

- **Display / gauge numeral** — `{typography.display}` (56px, weight 800). The score is the largest thing on the page.
- **Card headers** — `{typography.h-card}` — uppercase, 0.6px tracking, `{colors.muted}`. Quiet labels; state is loud, chrome is soft.
- **Body** 14px · **Small** 13px (descriptions, run info) · **Micro** 11–12px uppercase (tags, vital labels).
- Metric values 26px/800; recolor to `{colors.ready}` when a metric is in a good state.

## Layout & Spacing

- Centered column, `{spacing.page-max}` max width, `{spacing.page-pad}` padding.
- **Two-column dashboard**: a fixed `360px` readiness rail (gauge + run button) beside a fluid `1fr` working column (blockers, vitals, metrics). Collapses to single column at ≤880px.
- Card grid gap `{spacing.grid-gap}`; nested tile grids (vitals 3-up, metrics 2-up) gap 12–14px, collapsing to 1-up on narrow.
- Sticky translucent header (blur backdrop) anchors brand + run context (cycle, employee count, current Time-to-First-Payroll).

## Elevation & Depth

Flat slate planes lifted by one soft shadow `0 6px 24px rgba(0,0,0,.35)` on cards. Depth is minimal and consistent — the eye should be pulled by *color state*, not by competing shadows. The header floats above content via `backdrop-filter: blur(6px)` over a translucent bg.

## Shapes

Rounded, calm geometry: cards `{rounded.card}` (14px), controls/tiles `{rounded.control}` (10px), status chips/tags `{rounded.chip}` (pill, 20px), pulses and the brand dot are full circles. The gauge is a 230px ring, 18px stroke, round line-caps.

## Components

- **gauge** — 230px SVG progress ring on a `{colors.line}` track; arc colored by score→hue; fills from 0 with a `.6s ease` sweep on load and on every change. Centered numeral + `READY` label.
- **readiness-card** — the left rail: gauge + status line + run-button. The product's home.
- **run-button** — full-width. Two states only: **ready** (`{colors.ready}` fill, `{colors.on-ready}` text, enabled, "▶ Run Payroll — N employees") and **blocked** (muted `#36404d` fill, disabled, "🔒 Run Payroll — blocked by pre-flight"). Never a third "warn-and-allow" state — the gate is binary by design (PRD FR-9).
- **blocker-row** — icon tile (severity-tinted) + title + description + a category tag chip (Lifecycle Clock / Change Handshake / Freshness Vitals / Compliance floor) + an action button. Resolved rows strike through and flip the icon to a green check.
- **vital-tile** — source name + last-synced phrase led by a `status-pulse`.
- **status-pulse** — 9px dot; green pulses (blink animation = liveness), amber/red glow steady.
- **metric-tile** — label + large value; the two North-Star numbers and the live F&F clock.
- **toast** — bottom-center green confirmation on a completed run ("zero post-run corrections").

## Do's and Don'ts

- **Do** let state be the loudest thing on screen; keep chrome muted slate.
- **Do** pair every color-state with a non-color cue (icon, label, text) — the model must survive color-blindness and grayscale.
- **Do** animate to signal *reconciliation is live* (pulse, gauge sweep, ticking clock).
- **Don't** show green for unknown/stale/failed state — ever.
- **Don't** add a "run anyway" styling to the blocked run-button; the block is the product.
- **Don't** introduce a second accent hue or decorative gradient that competes with the semantic four.
- **Don't** add web fonts, icon libraries, or framework UI kits — zero-dependency is a product value.
