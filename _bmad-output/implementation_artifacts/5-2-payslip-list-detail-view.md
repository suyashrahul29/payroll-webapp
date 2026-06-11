---
story_id: 5.2
story_key: 5-2-payslip-list-detail-view
epic: 5
title: Payslip List & Detail View
status: done
created: 2026-06-11
baseline_commit: 7119d75e685107ff2c8201bafd6e3f207367562c
---

# Story 5.2 — Payslip List & Detail View

## Story Statement

As a **Frontend Engineer**,
I want to display a chronological list of payslips (last 12 months) and allow employees to view full statutory details and download PDF,
So that employees can access their salary information and statutory components anytime from the portal.

---

## Acceptance Criteria

**AC-1: Payslip list**
- Given an employee opens the portal and is on the Payslips tab
- When the panel renders
- Then they see a chronological list of all their payslips for the last 12 months, paginated (6 per page). Each row shows: month label, Gross, Net Pay, and a "View" button.

**AC-2: Detail expand**
- Given they click "View" on a payslip row
- When the detail opens (inline expand or modal)
- Then they see the full statutory payslip: employee name, department, month, payment date, Gross Pay, PF deduction, ESI deduction (if applicable), TDS deduction, PT deduction (if applicable), Net Pay, and a statutory disclosures section.

**AC-3: Download PDF**
- Given they click "Download PDF" inside the payslip detail
- When the download action triggers
- Then the payslip renders for print and the browser's Save as PDF dialog opens (using `window.print()` with `@media print` CSS, no external libraries).

**AC-4: Last 12 months filter**
- Given the employee has payslips older than 12 months in the data
- When the list renders
- Then only payslips within the last 12 months are shown. Payslips outside the window are not displayed.

**AC-5: PT field in mock data**
- Given the mock data is updated
- When the portal renders payslip details
- Then each payslip includes a `ptPaise` field (Professional Tax, integer paise), shown in the deductions block if > 0.

**AC-6: Statutory disclosures**
- Given the detail view is open
- When I scroll to the bottom of the payslip
- Then I see a statutory disclosures section with: PF registration number (UAN), ESI number (if applicable), PAN, and a note "This payslip is computer-generated and does not require a signature."

---

## What Already Exists — Read These Before Writing Any Code

**`app/portal.html`** — This is the primary file to modify. It already contains:
- A complete payslip list UI (`renderPayslips()`) with `payslip-row` elements, a "View" button, and an expandable `.payslip-detail` block showing PF/ESI/TDS breakdowns
- Tenant isolation (`verifySession`, `enforceIsolation`) — **do not change this logic**
- Session management (`getSession`, `setSession`, `clearSession`) — **do not change**
- Tab system (`switchTab`, `tab-btn`, `tab-panel`) — extend, do not replace
- `MOCK_EMPLOYEES` data structure — extend with PT and more payslip months
- `paiseToCurrency(paise)` helper for INR formatting (Indian lakh notation) — reuse, do not duplicate
- `formatDate(iso)` helper — reuse
- All CSS design tokens matching `index.html` light theme

**`app/payslip.html`** — The operator's statutory payslip view (built in story 2-3). Study its patterns:
- `@media print` CSS block at lines ~203–241: hides `.no-print`, hides `header.app`, resets margins, sets `@page { size: A4 portrait; margin: 15mm; }`
- `window.print()` is triggered by a button — this exact pattern must be used in portal.html
- Two-column earnings/deductions table layout
- Statutory disclosures grid (`.statutory-grid`, `.stat-item`)
- Net pay green box (`.net-pay-box`)
- All money formatted with `paiseToCurrency()` from paise values

**DO NOT** create a new file. Modify `app/portal.html` only.

---

## Implementation Guide

### 1. Extend MOCK_EMPLOYEES data

Add `ptPaise` to each payslip record (Professional Tax in paise, state-specific):
- Maharashtra employees: PT = ₹200/month = 20000 paise (except Feb when it's ₹300 = 30000 paise)
- Tamil Nadu employees: PT = ₹208/month = 20800 paise (approximate; ESI-eligible employees differ)
- Add 12 months of payslip history (June 2025 → May 2026) — generate consistent values programmatically

Also add statutory IDs to each employee mock record for the disclosures section:
```js
{
  uan: 'UAN100123456789',       // Universal Account Number (PF)
  esiNumber: '31-00-123456-000',  // ESI number (blank string '' if not applicable)
  pan: 'ABCPE1234F',
}
```

EMP002 (Raj Mehta, Finance, CTC > ₹21,000/month) is ESI-exempt (esiNumber: '').

### 2. Pagination

After building the filtered list (last 12 months), paginate: show 6 rows per page.
- State: `currentPage = 1` per employee session (reset when tab is opened)
- Show "← Prev" / "Next →" buttons beneath the list; hide Prev on page 1, hide Next on last page
- Show "Showing 1–6 of 12" counter
- Keep it simple — no URL routing needed

### 3. Last-12-months filter

```js
const cutoff = new Date();
cutoff.setFullYear(cutoff.getFullYear() - 1);
const filtered = emp.payslips.filter(ps => new Date(ps.payDate) >= cutoff);
```

Sort descending by `payDate` (most recent first) before paginating.

### 4. Enhanced payslip detail

Replace the existing `detail.innerHTML` in `renderPayslips()` with a layout that matches payslip.html's structure:
- Employee info grid (name, department, month, payment date)
- Earnings section: Gross Pay
- Deductions section: PF (`pfPaise`), ESI if > 0 (`esiPaise`), TDS (`tdsPaise`), PT if > 0 (`ptPaise`)
- Net Pay box (green background, matching payslip.html `.net-pay-box`)
- Statutory disclosures section with UAN, ESI number (if non-empty), PAN, and the computer-generated notice

### 5. Download PDF button

Add a "⬇ Download PDF" button inside each expanded detail block:
```html
<button class="pdf-btn no-print" onclick="printPayslip(${idx})">⬇ Download PDF</button>
```

Implement `printPayslip(idx)`:
```js
function printPayslip(idx) {
  // Set a body attribute so print CSS knows which detail to show
  document.body.setAttribute('data-print-idx', idx);
  window.print();
  document.body.removeAttribute('data-print-idx');
}
```

Add `@media print` CSS to `portal.html` (append to the existing `<style>` block):
```css
@media print {
  /* Hide everything except the targeted payslip detail */
  .login-wrap, .app, #loginWrap, #appHeader,
  .tab-bar, .payslip-row, .pdf-btn,
  .pagination-bar, .card-head { display: none !important; }

  /* Show only the active detail */
  .payslip-detail { display: none !important; }
  body[data-print-idx] .payslip-detail.print-target { display: block !important; }

  body { background: #fff; margin: 0; }
  .card { box-shadow: none; border: none; border-radius: 0; }
  .portal { padding: 0; max-width: 100%; }

  @page { size: A4 portrait; margin: 15mm; }
}
```

When `printPayslip(idx)` is called, also add class `print-target` to `detail-{idx}` and remove it afterward:
```js
function printPayslip(idx) {
  const detail = document.getElementById('detail-' + idx);
  detail.classList.add('print-target');
  document.body.setAttribute('data-print-idx', idx);
  window.print();
  detail.classList.remove('print-target');
  document.body.removeAttribute('data-print-idx');
}
```

### 6. Statutory disclosures section

Append to the detail HTML after the net pay box:
```html
<div class="ps-disclosures">
  <div class="disc-title">Statutory Details</div>
  <div class="disc-grid">
    <div class="disc-item"><span class="disc-k">UAN (PF)</span><span class="disc-v">${emp.uan}</span></div>
    ${emp.esiNumber ? `<div class="disc-item"><span class="disc-k">ESI Number</span><span class="disc-v">${emp.esiNumber}</span></div>` : ''}
    <div class="disc-item"><span class="disc-k">PAN</span><span class="disc-v">${emp.pan}</span></div>
  </div>
  <div class="disc-notice">This payslip is computer-generated and does not require a signature.</div>
</div>
```

Add CSS for `.ps-disclosures`, `.disc-title`, `.disc-grid`, `.disc-item`, `.disc-k`, `.disc-v`, `.disc-notice` — match the subdued style of existing `.detail-item` elements.

---

## Patterns to Follow

| Pattern | Where | Rule |
|---|---|---|
| Money formatting | `paiseToCurrency(paise)` | Always paise in data; format at display edge only |
| Tenant isolation | `verifySession(session, emp)` | Call before rendering any employee data |
| Design tokens | CSS vars (`--green`, `--red`, etc.) | Never hardcode hex values |
| Zero dependencies | `app/portal.html` | No `import`, no CDN links, no `require` |
| PT Professional Tax | `ptPaise` field | Show only if `> 0`; same pattern as `esiPaise` conditional |
| Print PDF | `window.print()` | Same as `payslip.html`; no html2canvas, no jsPDF |

---

## Anti-Patterns to Avoid

- **Do not** create a new HTML file for this story — modify `portal.html` only
- **Do not** add any CDN/npm dependencies — vanilla JS only
- **Do not** change `verifySession` or `enforceIsolation` — tenant isolation is security-critical
- **Do not** use `innerHTML` for the entire `#dashWrap` on re-render — use targeted DOM updates
- **Do not** reinvent `paiseToCurrency` — it already exists at the top of portal.html's `<script>`
- **Do not** make the F&F tab visible for non-exiting employees — tab creation already handles this; don't break it
- **Do not** show PT if `ptPaise === 0` — conditional rendering same pattern as ESI

---

## Files to Modify

| File | Action |
|---|---|
| `app/portal.html` | UPDATE — primary implementation target |

No other files.

---

## Definition of Done

- [x] Payslip list shows last 12 months, sorted most-recent-first, paginated 6/page with Prev/Next controls
- [x] Each payslip row shows month, Gross, Net Pay, View button
- [x] Clicking View expands inline detail with PF/ESI/TDS/PT deductions (PT and ESI shown only when > 0)
- [x] Statutory disclosures section present in every expanded detail: UAN, ESI (if applicable), PAN, computer-generated notice
- [x] "Download PDF" button opens browser print dialog via `window.print()` showing only the selected payslip detail
- [x] `@media print` CSS hides all portal chrome (header, tabs, list, pagination) during print
- [x] Mock data extended to 12 months per employee with `ptPaise` field
- [x] Tenant isolation check (`verifySession`) still called before every payslip render
- [x] No new dependencies introduced
- [x] Mobile layout: single-column, tap targets ≥ 44px, no horizontal scroll on 375px viewport

---

## Dev Agent Record

### Implementation Notes

- Replaced static 3-month payslip arrays with a `_mkPayslips()` generator that produces 14 months per employee (April 2025 – May 2026). The 2 pre-window entries (April/May 2025) exist to exercise AC-4's cutoff filter.
- Maharashtra PT: ₹200 normal months, ₹300 February. Tamil Nadu: ₹208 all months. Net pay computed as `gross − pf − esi − tds − pt` inside the generator.
- Pagination state held in module-level `_payslipsState` (emp + session + filtered array) and `_currentPage`. `renderPayslips()` sets state and calls `renderPayslipsPage()`. `goToPage()` updates `_currentPage` and re-renders.
- `toggleDetail(absIdx)` uses `absIdx` (index into the full filtered array) so IDs stay stable across page changes. Button text is updated via `closest('[data-block-idx]')` lookup rather than iterating all buttons.
- `printPayslip(absIdx)` adds `.print-target` class and `data-print-idx` body attribute before `window.print()`, removes both after. `@media print` uses `:has(.payslip-detail.print-target)` to show only the targeted block.
- ESI row and ESI Number disclosure are conditional on `esiPaise > 0` and `emp.esiNumber` respectively — verified with EMP002 (ESI-exempt).

### Completion Notes

All 6 ACs verified visually via Playwright:
- AC-1: 12 rows, sorted desc, "Showing 1–6 of 12" pagination
- AC-2: Detail shows employee grid, earnings/deductions tables, PT row, net pay box, statutory disclosures
- AC-3: Download PDF button present (calls `window.print()` with `@media print` CSS)
- AC-4: Page 2 ends at June 2025; April/May 2025 correctly excluded
- AC-5: `ptPaise` in every payslip; February correctly shows ₹71,800 (MH: ₹300 PT)
- AC-6: UAN, ESI Number (conditional), PAN, computer-generated notice all present

---

## File List

- `app/portal.html` — updated (primary implementation target)

---

## Review Findings

### Decision Needed

- [x] [Review][Decision] Sort direction ambiguity — resolved: most-recent-first (DoD) is correct. AC-1 wording "chronological" is imprecise; DoD wins.

### Patches

- [x] [Review][Patch] `printPayslip()` removes `.print-target` class synchronously before print renders — use `afterprint` event instead [app/portal.html:635–637]
- [x] [Review][Patch] `goToPage()` has no bounds check — out-of-range call renders blank page [app/portal.html:604]
- [x] [Review][Patch] `_payslipsState` null dereference in `renderPayslipsPage()` if called before `renderPayslips()` ever runs [app/portal.html:476]
- [x] [Review][Patch] Date-only ISO strings parsed as UTC midnight — all dates display one day earlier for IST (Indian) users [app/portal.html:350–353]
- [x] [Review][Patch] `localStorage` API calls unguarded against `SecurityError` (private browsing, storage blocked by policy) [app/portal.html:362–377]
- [x] [Review][Patch] Hardcoded hex values (`#FAFBFC`, `#FFFFFF`, `#F9FAFB`, `#F3F4F6`, `#E5E7EB`) violate CLAUDE.md colour-system rule — use CSS vars [app/portal.html:26,44,57,122,139,183,208,237]
- [x] [Review][Patch] `.pdf-btn { min-height: 40px }` below 44px mobile tap target — no responsive override unlike `.view-btn` [app/portal.html:139]
- [x] [Review][Patch] Pagination bar hidden when `totalPages === 1` — spec requires controls always present (disabled at boundaries) [app/portal.html:584]
- [x] [Review][Patch] `verifySession()` called per-row inside `forEach` instead of a single pre-render gate — rows already appended if check fails mid-loop [app/portal.html:492]
- [x] [Review][Patch] `paiseToCurrency(undefined)` renders `"₹NaN"` — missing null/NaN guard [app/portal.html:345]
- [x] [Review][Patch] `renderDashboard` shows header/dashboard frame when `enforceIsolation` fails — missing `renderLogin()` call on failure path [app/portal.html:426]
- [x] [Review][Patch] `storage` event handler calls `showSecurityViolation()` but omits `renderLogin()` — dashboard stays visible behind overlay [app/portal.html:706]
- [x] [Review][Patch] Print CSS uses `:has()` pseudo-class — unsupported in Firefox < 121, causes blank print because parent `.ps-block` stays `display:none` [app/portal.html:245]

### Deferred

- [x] [Review][Defer] Auth is client-side mock — all credentials readable in JS source, no real server auth [app/portal.html:299–346] — deferred, prototype by design
- [x] [Review][Defer] Demo credentials displayed unconditionally in login hint [app/portal.html:770–775] — deferred, prototype
- [x] [Review][Defer] PAN/UAN/ESI numbers displayed without masking [app/portal.html:563–569] — deferred, prototype
- [x] [Review][Defer] `innerHTML` XSS vectors in `emp.name`, `emp.uan`, `emp.pan`, `ps.month`, `ff.paymentMethod` — unsafe if ever backed by real API [app/portal.html:523–569,656] — deferred, mock data only
- [x] [Review][Defer] Client-side clock used for 12-month cutoff — tampered clock widens the window [app/portal.html:465] — deferred, prototype
- [x] [Review][Defer] `session.isExiting` not re-validated against employee record after initial login [app/portal.html:437] — deferred, prototype
- [x] [Review][Defer] Same-tenant cross-employee data access via tampered `employeeId` in `localStorage` [app/portal.html:385] — deferred, prototype
- [x] [Review][Defer] `storage` event listener fires for other-tab changes only, not same-tab manipulation [app/portal.html:706] — deferred, understood design
- [x] [Review][Defer] Negative `netPaise` renders without visual warning — deferred, mock data always positive
- [x] [Review][Defer] Payslip exactly on 12-month cutoff boundary may include/exclude unexpectedly due to UTC vs local date parsing — deferred, minor theoretical edge

---

## Change Log

- 2026-06-11: Implemented story 5-2 — payslip list pagination, 12-month filter, enhanced detail view with PT/statutory disclosures, PDF print support, extended mock data to 14 months per employee.
