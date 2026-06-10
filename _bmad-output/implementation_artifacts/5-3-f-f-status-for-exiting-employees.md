---
story_id: 5.3
story_key: 5-3-f-f-status-for-exiting-employees
epic: 5
title: F&F Status for Exiting Employees
status: done
created: 2026-06-11
baseline_commit: 7119d75e685107ff2c8201bafd6e3f207367562c
---

# Story 5.3 — F&F Status for Exiting Employees

## Story Statement

As a **Frontend Engineer**,
I want to show exiting employees their F&F settlement status (pending vs settled) in the portal,
So that departing employees can see their final dues, deadline, and settlement confirmation from the portal.

---

## Acceptance Criteria

**AC-1: F&F card structure**
- Given an employee with `isExiting: true` opens the portal
- When they click the "F&F Status" tab
- Then they see a Full & Final Settlement card with: last working day, statutory deadline, status (pending/settled), and the settlement amount. If settled, the payment date and payment method are also shown.

**AC-2: Pending state display**
- Given F&F is pending
- When they view the card
- Then the card shows a prominent "F&F Pending" status badge, the settlement deadline date, and a note: "Settlement is being processed. You will be notified once the amount is credited."

**AC-3: Settled state display**
- Given F&F is settled
- When they view the card
- Then the card shows: a prominent "F&F Settled ✓" confirmation header, the settlement amount (e.g. ₹1,25,000), payment date, payment method, and a confirmation message: "Your full & final settlement has been processed and credited."

**AC-4: Cross-system bridge from operator settlement**
- Given the operator settles F&F via index.html (story 1-6), which writes `localStorage.setItem('ff_settled_EMP047', 'true')`
- When an employee logged into the portal has `employeeId === 'EMP047'`
- Then `renderFF()` checks `localStorage.getItem('ff_settled_' + emp.employeeId)` and renders the settled state (overriding the mock `ff.status`) if the key is present and truthy.

**AC-5: Settled mock employee demonstrable**
- Given the portal mock data contains a 4th employee (EMP004, Meera Kapoor, tenant-acme, exiting, settled F&F)
- When `meera.kapoor@acme.in` / `EMP004` logs in
- Then the F&F tab shows the settled state (AC-3 layout) using the static mock.

**AC-6: Non-exiting employee — no F&F tab**
- Given an employee with `isExiting: false` logs in
- When the dashboard renders
- Then the "F&F Status" tab is absent. This behavior already exists — do not break it.

---

## What Already Exists — Read These Before Writing Any Code

**`app/portal.html`** is the only file to modify. The following is already implemented (from stories 5-1 and 5-2):

- **F&F tab infrastructure**: `renderDashboard()` conditionally adds the "F&F Status" tab when `session.isExiting` is true (line ~448). The tab panel `#ffPanel` with `#ffContent` exists in HTML.
- **`renderFF(emp)` at line ~670**: Renders a grid showing last working day, statutory deadline, status badge, settlement amount, payment method. The `.ff-note` is shown for pending. **This function needs to be replaced/upgraded to satisfy the ACs.**
- **CSS already defined** for `.ff-card`, `.ff-title`, `.ff-grid`, `.ff-item .fk/.fv`, `.status-badge.pending`, `.status-badge.settled`, `.ff-note` — reuse these, don't add redundant rules.
- **EMP002 (Raj Mehta)** has `isExiting: true` and `ff: { lastWorkingDay, deadline, status:'pending', amount, paymentMethod }` — extend this object with `settledDate` and `settledAmount` fields for when the status transitions to settled.
- **`formatDate(iso)`** helper parses date-only ISO strings as local time (IST-safe). Reuse it everywhere.
- **`paiseToCurrency(paise)`** formats INR. Use for all money display.

---

## Implementation Guide

### 1. Extend mock data

**Add EMP004 (settled state demo) to `MOCK_EMPLOYEES`:**

```js
{
  employeeId: 'EMP004',
  email: 'meera.kapoor@acme.in',
  name: 'Meera Kapoor',
  tenantId: 'tenant-acme',
  department: 'Marketing',
  isExiting: true,
  uan: 'UAN100456789012',
  esiNumber: '31-00-234567-001',
  pan: 'DGKMK5678J',
  payslips: _mkPayslips(9000000, 648000, 67500, 784500, 20000, 30000),
  ff: {
    lastWorkingDay: '2026-05-31',
    deadline: '2026-06-04',
    status: 'settled',
    amount: 14200000,           // ₹1,42,000 in paise
    settledAmount: 14200000,    // same here, in paise
    settledDate: '2026-06-03',  // payment date
    paymentMethod: 'Bank Transfer (NEFT)'
  }
}
```

**Also extend EMP002's `ff` object** with `settledDate` and `settledAmount` fields so it's ready when the cross-system bridge (AC-4) triggers:

```js
ff: {
  lastWorkingDay: '2026-06-20',
  deadline: '2026-06-24',
  status: 'pending',
  amount: 12500000,
  settledAmount: 12500000,
  settledDate: '2026-06-23',    // hypothetical date used when status becomes 'settled'
  paymentMethod: 'Bank Transfer (NEFT)'
}
```

**Add EMP004 login hint** to the `login-hint` div:
```html
<code>meera.kapoor@acme.in</code> / <code>EMP004</code> (Marketing · settled F&F)
```

### 2. Replace `renderFF(emp)` with an upgraded version

The new implementation must handle three cases:
1. **Settled via localStorage** (AC-4): `localStorage.getItem('ff_settled_' + emp.employeeId)` truthy → show settled
2. **Statically settled** (AC-5): `ff.status === 'settled'` → show settled
3. **Pending** (AC-2): otherwise → show pending

```js
function renderFF(emp) {
  const ff = emp.ff;
  const container = document.getElementById('ffContent');

  // AC-4: check if settled via operator action in index.html
  let isSettled = ff.status === 'settled';
  try { if (localStorage.getItem('ff_settled_' + emp.employeeId)) isSettled = true; } catch(e) {}

  if (isSettled) {
    renderFFSettled(container, emp, ff);
  } else {
    renderFFPending(container, ff);
  }
}
```

#### Settled state (`renderFFSettled`)

```js
function renderFFSettled(container, emp, ff) {
  container.innerHTML = `
    <div class="ff-card">
      <div class="ff-settled-header">
        <span class="ff-settled-icon">✓</span>
        <div>
          <div class="ff-settled-title">F&amp;F Settled</div>
          <div class="ff-settled-sub">Your full &amp; final settlement has been processed and credited.</div>
        </div>
      </div>
      <div class="ff-grid">
        <div class="ff-item"><div class="fk">Settlement Amount</div><div class="fv amount">${paiseToCurrency(ff.settledAmount || ff.amount)}</div></div>
        <div class="ff-item"><div class="fk">Payment Date</div><div class="fv">${formatDate(ff.settledDate)}</div></div>
        <div class="ff-item"><div class="fk">Payment Method</div><div class="fv">${ff.paymentMethod || 'Bank Transfer (NEFT)'}</div></div>
        <div class="ff-item"><div class="fk">Last Working Day</div><div class="fv">${formatDate(ff.lastWorkingDay)}</div></div>
      </div>
    </div>
  `;
}
```

#### Pending state (`renderFFPending`)

```js
function renderFFPending(container, ff) {
  container.innerHTML = `
    <div class="ff-card">
      <div class="ff-title">Full &amp; Final Settlement</div>
      <div style="margin-bottom:16px;">
        <span class="status-badge pending">F&amp;F Pending</span>
        <span style="margin-left:10px; font-size:13px; color:var(--muted);">Settlement deadline: ${formatDate(ff.deadline)}</span>
      </div>
      <div class="ff-grid">
        <div class="ff-item"><div class="fk">Last Working Day</div><div class="fv">${formatDate(ff.lastWorkingDay)}</div></div>
        <div class="ff-item"><div class="fk">Statutory Deadline</div><div class="fv">${formatDate(ff.deadline)}</div></div>
        <div class="ff-item"><div class="fk">Estimated Amount</div><div class="fv">${paiseToCurrency(ff.amount)}</div></div>
        <div class="ff-item"><div class="fk">Payment Method</div><div class="fv">${ff.paymentMethod || 'Bank Transfer (NEFT)'}</div></div>
      </div>
      <div class="ff-note">⏳ Settlement is being processed. You will be notified once the amount is credited.</div>
    </div>
  `;
}
```

### 3. Add CSS for settled header

Add to the `<style>` block (after `.ff-note`):

```css
/* ── F&F Settled header ── */
.ff-settled-header {
  display: flex; align-items: flex-start; gap: 14px; margin-bottom: 20px;
  padding: 16px; background: rgba(22,163,74,.06);
  border: 1px solid rgba(22,163,74,.2); border-radius: 10px;
}
.ff-settled-icon {
  width: 36px; height: 36px; border-radius: 50%;
  background: rgba(22,163,74,.12); color: var(--green);
  font-size: 18px; font-weight: 800; display: flex;
  align-items: center; justify-content: center; flex-shrink: 0;
}
.ff-settled-title { font-size: 18px; font-weight: 800; color: var(--green); }
.ff-settled-sub { font-size: 13px; color: var(--muted); margin-top: 3px; }
```

Also add a responsive rule inside `@media (max-width: 600px)`:
```css
.ff-settled-header { flex-direction: column; gap: 10px; }
```

---

## Patterns to Follow

| Pattern | Where | Rule |
|---|---|---|
| Money | `paiseToCurrency(paise)` | Always paise in data, format at display edge |
| Dates | `formatDate(iso)` | Always use this helper — avoids UTC-midnight IST shift |
| Design tokens | `var(--green)`, `var(--amber)`, etc. | Never hardcode hex |
| localStorage guard | `try { } catch(e) {}` | Always wrap localStorage calls — SecurityError in private browsing |
| Zero dependencies | `app/portal.html` | No CDN links, no `import`, no `require` |
| Tenant isolation | `verifySession`, `enforceIsolation` | Do not modify these |

---

## Anti-Patterns to Avoid

- **Do not** create a new file — `app/portal.html` only
- **Do not** add any CDN / npm dependencies
- **Do not** change `verifySession`, `enforceIsolation`, `clearSession`, `setSession`
- **Do not** use `innerHTML` for the entire `#dashWrap` on re-render
- **Do not** show the F&F tab for non-exiting employees — the condition on `session.isExiting` already handles this; don't touch it
- **Do not** hardcode hex values — use CSS vars from `:root`
- **Do not** check settlement status from MOCK_EMPLOYEES directly in more than one place — funnel through `renderFF()` which calls the two sub-renderers

---

## Files to Modify

| File | Action |
|---|---|
| `app/portal.html` | UPDATE — only file touched |

---

## Definition of Done

- [x] EMP004 (Meera Kapoor, settled F&F) added to `MOCK_EMPLOYEES` with correct mock data
- [x] EMP002 `ff` extended with `settledDate` and `settledAmount` fields
- [x] `renderFF()` refactored to delegate to `renderFFSettled()` or `renderFFPending()` based on status + localStorage check
- [x] Pending state shows: "F&F Pending" badge + deadline date + grid (last WD, deadline, estimated amount, payment method) + processing note
- [x] Settled state shows: green confirmation header ("F&F Settled ✓" + sub-message) + grid (settled amount, payment date, payment method, last WD)
- [x] AC-4: `localStorage.getItem('ff_settled_EMP002')` truthy → renders settled state for EMP002 (bridge from index.html settlement)
- [x] EMP004 login (`meera.kapoor@acme.in` / `EMP004`) shows settled state
- [x] EMP002 login shows pending state (without triggering AC-4)
- [x] Non-exiting employees (EMP001, EMP003) still have no F&F tab
- [x] `formatDate()` used for all date formatting in FF card
- [x] `paiseToCurrency()` used for all money values
- [x] No hardcoded hex values in new CSS
- [x] No new dependencies introduced
- [x] EMP004 hint added to login-hint div
- [x] localStorage reads wrapped in try/catch

---

## Dev Agent Record

### Implementation Notes

- `renderFF()` now checks `localStorage.getItem('ff_settled_' + emp.employeeId)` first (AC-4 bridge) before falling back to `ff.status`. This means operator settlement in index.html immediately propagates to the portal without a data reload.
- Split into `renderFFSettled(container, ff)` and `renderFFPending(container, ff)` for clean separation of the two states.
- EMP004 (Meera Kapoor) added as a static settled-state demo — no localStorage needed. Her `settledDate: '2026-06-03'` and `settledAmount: 14200000` populate the settled grid directly.
- EMP002's `ff` extended with `settledDate: '2026-06-23'` and `settledAmount: 12500000` so the settled view has real data when the AC-4 bridge activates.
- Added `.ff-settled-header` CSS block with `rgba(22,163,74,.06)` background — uses CSS vars throughout, no hardcoded hex.
- Responsive rule `flex-direction: column` added for `.ff-settled-header` at ≤600px.
- All localStorage reads wrapped in `try/catch` for SecurityError safety (private browsing, etc.).

### Completion Notes

All 6 ACs verified visually via Playwright:
- AC-1: F&F card present for all `isExiting` employees — grid shows last WD, deadline/payment date, amount, payment method.
- AC-2: EMP002 (pending) shows "F&F PENDING" amber badge + "Settlement deadline: 24 Jun 2026" + grid + amber processing note.
- AC-3: EMP004 (settled) shows green "F&F Settled ✓" confirmation header + settlement amount ₹1,42,000 + payment date 03 Jun 2026 + Bank Transfer (NEFT).
- AC-4: Set `localStorage.setItem('ff_settled_EMP002', 'true')` → EMP002's F&F tab switched to settled view showing ₹1,25,000 / 23 Jun 2026.
- AC-5: EMP004 login confirmed via Playwright — settled state rendered from static mock.
- AC-6: EMP001 (Priya Sharma, Engineering) — only "Payslips" tab visible, no F&F tab.

---

## File List

- `app/portal.html` — updated

---

## Change Log

- 2026-06-11: Story 5-3 created — F&F Status settled/pending states, cross-system bridge from index.html settlement, EMP004 settled mock.
- 2026-06-11: Implemented story 5-3 — split renderFF into settled/pending renderers, added EMP004 (Meera Kapoor) with settled F&F mock, extended EMP002 ff with settledDate/settledAmount, added .ff-settled-header CSS, added AC-4 localStorage bridge, updated login hints.
