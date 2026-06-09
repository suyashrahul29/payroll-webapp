---
title: 'Redesign frontend to match light-theme color system'
type: 'feature'
created: '2026-06-09'
status: 'done'
baseline_commit: '842ec985196c827ad8cf03193e6f83a5cf13a91f'
context: ['colours.md.txt', 'app/index.html']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The frontend currently uses a dark-theme color palette (#0f1419 bg, #e6edf3 text) that does not match the light-theme color system defined in `colours.md.txt` (white bg, navy/teal primary, dark text). This mismatch breaks visual consistency and doesn't follow the established design system.

**Approach:** Update `app/index.html` CSS to replace all dark-theme colors with their light-theme equivalents from the color system, ensuring semantic color mappings are preserved and WCAG AA contrast requirements are met.

## Boundaries & Constraints

**Always:**
- Use exact hex values from `colours.md.txt` (primary #1E3A5F, accent #0D9488, bg #FFFFFF, surface #F5F7FA, text #1F2937, text-muted #6B7280, success #16A34A, warning #D97706, error #DC2626)
- Maintain WCAG AA contrast (≥4.5:1 body text, ≥3:1 large text/UI)
- White text only on primary (#1E3A5F), accent (#0D9488), and status fills
- Reserve red (#DC2626) strictly for errors and overdue states
- Preserve zero-dependency front-end convention (no new dependencies)
- Keep HTML structure unchanged — CSS-only changes

**Ask First:**
- If HTML structural changes are needed
- If additional status colors beyond success/warning/error are required

**Never:**
- Introduce colors not in the system
- Change HTML markup or add elements
- Modify file organization or add build steps

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Light theme rendered | Page loads in browser | All UI elements use light theme colors; text is readable against backgrounds | N/A |
| Color contrast check | Button with teal background and white text | Contrast ratio ≥ 3:1 for large UI | N/A |
| Status states rendered | Blocker with red icon, green success, amber warning | Colors render correctly per semantic meaning; no color outside the system | N/A |
| Dark mode regression | User opens DevTools | No --dark-* variables or dark-mode logic is introduced | N/A |

</frozen-after-approval>

## Code Map

- `app/index.html` — single file containing all CSS; update `:root` variables and all color references

## Tasks & Acceptance

**Execution:**

- [x] `app/index.html` — Update `:root` CSS variables and all color references to light-theme palette — Ensures entire UI uses new color system; replaces dark theme with light theme
- [x] `app/index.html` — Update SVG gauge track color to light gray (#E5E7EB) — Ensures SVG elements match light-theme color system

**Color Mapping Reference:**
- `--bg`: #0f1419 → #FFFFFF (page background)
- `--panel`: #18202b → #F5F7FA (card/surface)
- `--panel-2`: #1f2937 → #F5F7FA (nested surfaces, same as panel)
- `--txt`: #e6edf3 → #1F2937 (primary text)
- `--muted`: #93a1b1 → #6B7280 (secondary text)
- `--green`: #2ecc71 → #16A34A (success/fresh)
- `--amber`: #f5a623 → #D97706 (warning/pending)
- `--red`: #e74c3c → #DC2626 (error/overdue)
- `--blue`: #4f8cff → #0D9488 (accent/action)
- `--on-ready`: #06210f → #FFFFFF (text on green)
- `--on-action`: #021024 → #FFFFFF (text on teal/blue)

**Acceptance Criteria:**
- Given the page is loaded in a modern browser, when the CSS is applied, then all backgrounds render as light colors (white or light gray), all text is dark or navy, all buttons and interactive elements use teal (#0D9488) or green (#16A34A) appropriately, and status colors (success/warning/error) match the system exactly
- Given a button with a colored background, when inspected for contrast, then the text-on-color contrast meets WCAG AA standards (≥3:1 for large text)
- Given the page is viewed at multiple viewport sizes, when responsive behavior is tested, then colors remain consistent and readable on mobile and desktop

## Design Notes

The light theme creates high contrast with dark navy (#1E3A5F) and teal (#0D9488) accents on white/light-gray surfaces. Key decisions:

1. **Text on fills:** Buttons and interactive elements with colored backgrounds use white text (e.g., teal button "Resolve" → white text). This is explicitly required by `colours.md.txt`.

2. **Surface tiers:** Card backgrounds (#F5F7FA) and nested surfaces (vitals, metrics) both use the same light gray to maintain visual hierarchy through borders and spacing, not color depth.

3. **Status colors:** Green (#16A34A) for success, orange (#D97706) for warning, red (#DC2626) for error. Muted background tints use reduced opacity (e.g., `rgba(220, 38, 38, 0.15)` for error backgrounds).

4. **Body background:** Pure white (#FFFFFF) with optional subtle radial gradient (if radial gradient from original design is retained, adjust colors appropriately).

## Verification

**Manual checks (if no CLI):**
- Load `app/index.html` in browser and visually inspect: background is white, cards are light gray, text is dark gray or navy
- Check button colors: "Run Payroll" button is green with white text; "Resolve" buttons are teal with white text
- Verify status indicators: green pulse for live, orange for stale, red for dead (in vitals and timeline)
- Test on mobile (375px viewport) and desktop (1440px) to ensure colors remain consistent across responsive layouts
- Inspect contrast using browser DevTools or a contrast checker tool (e.g., WebAIM) to confirm WCAG AA compliance

## Suggested Review Order

**CSS Root Variables & Light-Theme Palette**

- All color variables updated from dark-theme hex values to light-theme equivalents matching `colours.md.txt` spec.
  [`app/index.html:8-21`](../../app/index.html#L8)

**Body & Header Backgrounds**

- Body background changed from dark gradient to pure white (#FFFFFF); header background from dark transparent to light.
  [`app/index.html:26`](../../app/index.html#L26)
- Header background changed to light rgba to work with white page background.
  [`app/index.html:33`](../../app/index.html#L33)

**Button States & Interactive Elements**

- Run button (ready state): changed to green background with white text; blocked state to light gray.
  [`app/index.html:61-63`](../../app/index.html#L61)
- Blocker action buttons: changed to teal background with white text for all interactive CTA.
  [`app/index.html:75`](../../app/index.html#L75)
- Form submit buttons: changed to teal with white text; input backgrounds to light gray.
  [`app/index.html:163-168`](../../app/index.html#L163)

**Status Background Tints**

- Icon backgrounds for error/warning/success states: updated rgba values to work with light backgrounds.
  [`app/index.html:69-70`](../../app/index.html#L69)
- Diff table old/new backgrounds: adjusted to light theme with lower opacity for subtle contrast.
  [`app/index.html:138-139`](../../app/index.html#L138)

**Toast & Notification Elements**

- Toast notification: changed from dark theme styling to white text on green background.
  [`app/index.html:102`](../../app/index.html#L102)
- Prevented counter badge: white text on green with adjusted shadow.
  [`app/index.html:108`](../../app/index.html#L108)

**SVG & Gauge Elements**

- Gauge track circle: changed from dark navy (#243042) to light gray (#E5E7EB) for light theme.
  [`app/index.html:238`](../../app/index.html#L238)

**Shadow & Visual Depth**

- Shadow opacity reduced from 0.35 to 0.08 for lighter visual depth in light theme.
  [`app/index.html:20`](../../app/index.html#L20)

**Login Screen & Forms**

- Login screen background from dark gradient to plain white; login form inputs to very light background.
  [`app/index.html:151`](../../app/index.html#L151)
- Login form focus styling: adjusted focus ring color to match teal accent.
  [`app/index.html:164`](../../app/index.html#L164)

**Logout Button**

- Header logout button: changed from dark rgba to light gray backgrounds for light theme.
  [`app/index.html:170-171`](../../app/index.html#L170)
