---
story_id: 3.3
story_key: 3-3-restructuring-execution-via-change-handshake
epic: 3
title: Restructuring Execution via Change Handshake
status: done
created: 2026-06-11
baseline_commit: 96956a59cd48a9edc90b376eaadb793ef2e45d30
---

# Story 3.3: Restructuring Execution via Change Handshake

## Story

As a **Backend + Frontend Engineer**,
I want to route the approved restructuring through the Change Handshake so changes are audited and require sign-off before being applied,
so that all salary structure changes from the 50%-wage-rule assistant are tracked, not silent.

## Acceptance Criteria

### AC-1: `RestructuringChangeRecord` type and `createRestructuringChangeset()` in `wage-rule.ts`

**Given** a set of `RestructuringImpact` objects (output of `simulateRestructuring`), an effective date string, and a signatory name,
**When** `createRestructuringChangeset(impacts, effectiveDate, signatory)` is called,
**Then** it returns `RestructuringChangeRecord[]` where each record has:
- `employeeId`, `employeeName` (passed through verbatim from the impact)
- `oldBasicPaise`, `newBasicPaise` (from `currentBasicPaise` and `proposedBasicPaise`)
- `deltaNetPayPaise`, `deltaPfEmployeePaise`, `deltaMonthlyGratuityAccrualPaise` (from the impact deltas)
- `effectiveDate` (the passed-in string, verbatim)
- `signatory` (the passed-in string, verbatim)
- `status: 'pending'`
- `createdAt`: ISO timestamp string (format `new Date().toISOString()`)

The function is **pure** except for `createdAt` — no I/O, no DOM access, no store reads. Empty input array → empty output array.

### AC-2: "Apply Restructuring" button replaces dashed placeholder in `restructure.html`

**Given** the Restructuring Assistant page is open (`app/restructure.html`),
**When** Priya views it,
**Then** the dashed `.apply-placeholder` div is replaced with a real "Apply Restructuring" section containing:
- A button: `Apply Restructuring — N employees` (N = count of violating employees whose proposed basic ≥ required)
- An inline warning showing how many rows still have `⚠` (proposed < 50% threshold), if any
- The preview-only amber banner text is updated to remove "available in the next release"

### AC-3: Apply button validation and confirmation

**Given** the Apply button is clicked,
**When** one or more violating employees still have a proposed basic below the 50% threshold (⚠ still showing),
**Then** a confirmation prompt is shown (inline UI, not `window.confirm`) warning: "N employees still below 50% threshold — applying partial compliance. Proceed?"

**Given** all proposed values are valid (no `⚠`, no "exceeds gross" errors in any row),
**When** the Apply button is clicked,
**Then** no warning is needed — the button proceeds directly to the confirmation step.

**Given** the confirmation step,
**When** Priya clicks "Confirm & Send to Dashboard",
**Then** the current proposed-basic values for all violating employees are serialized to `localStorage` under key `restructuring_pending` as a JSON object (see Dev Notes for schema), and the page navigates to `index.html`.

### AC-4: Dashboard detects pending restructuring and injects blocker

**Given** `index.html` loads and `localStorage.getItem('restructuring_pending')` returns a non-null value,
**When** the page initialises,
**Then** a `restructuring` blocker is prepended to the `blockers` array with:
- `id: 'restructuring'`
- `sev: 'amber'`
- `weight: 14`
- `icon: '⟳'`
- `title: 'N salary structures changed — restructuring pending sign-off'` (N = count of records in the pending set)
- `desc: 'Proposed restructuring from the 50%-Wage-Rule Assistant · sign-off required before changes are applied'`
- `tag: 'Change Handshake'`
- `action: 'Review & sign'`

If `restructuring_pending` is absent or unparseable, no blocker is injected — the existing 4 static blockers remain unchanged.

### AC-5: "Review & sign" on the restructuring blocker opens a sign-off modal

**Given** the `restructuring` blocker is visible on the dashboard,
**When** Priya clicks "Review & sign",
**Then** a **Restructuring Sign-off modal** opens, distinct from (but visually consistent with) the existing CTC Change Handshake modal. It shows:
- Modal title: "Restructuring Sign-off — N salary structures"
- Summary line: "Proposed restructuring from Restructuring Assistant · [timestamp from `createdAt` of first record]"
- A diff table with columns: [Employee, Old Basic, New Basic, Take-home Δ, PF Δ, Signatory, Action]
- Each row that is `pending` shows radio buttons: [Sign-off | Hold | Reject]
- Each row that is already `signed_off` / `held` / `rejected` shows a status label (green ✓ / amber ⏸ / red ✗)
- A badge showing "N AWAITING SIGN-OFF" (amber) or "✓ ALL SIGNED OFF" (green)
- A "✓ Save Decisions" button

### AC-6: Signing off resolves the blocker and writes the audit record

**Given** Priya has saved sign-off decisions for all records,
**When** zero records remain in `pending` status (all are `signed_off`, `held`, or `rejected`),
**Then**:
1. The `restructuring` blocker is resolved (same `resolve('restructuring')` call pattern as other blockers)
2. `localStorage.removeItem('restructuring_pending')` is called
3. An audit record is written to `localStorage` under key `restructuring_audit` with:
   - `appliedBy`: `'Priya Sharma (HR Manager)'`
   - `appliedAt`: ISO timestamp
   - `records`: the final list of change records (each with its `status`, `employeeId`, `employeeName`, `oldBasicPaise`, `newBasicPaise`)
4. A toast is shown: `'✅ N salary structures signed off — audit record saved'`

**Given** some records were held or rejected,
**When** Priya saves decisions with a mix of statuses,
**Then** the blocker remains open (not resolved) until ALL records leave the `pending` state. The blocker description and weight update to reflect remaining pending count (mirroring the CTC Change Handshake pattern).

### AC-7: Tests for `createRestructuringChangeset`

New tests in `src/domain/compliance/wage-rule.test.ts` (appended to the existing file):

- Empty input → returns empty array
- Single impact → returns one record with all fields correctly mapped, `status: 'pending'`
- `oldBasicPaise` = `currentBasicPaise`, `newBasicPaise` = `proposedBasicPaise` from the input impact
- All delta fields pass through verbatim from the impact
- `effectiveDate` and `signatory` are set verbatim from the function arguments
- `createdAt` is a valid ISO date string (matches `/^\d{4}-\d{2}-\d{2}T/`)
- Multiple impacts → each becomes its own record; order preserved
- Does NOT call `compute()` internally (no side effects beyond `new Date()`)

---

## Dev Notes

### Architecture context

This is still a **prototype** (vanilla HTML/CSS/JS, single files, no build step, no real backend). The "Change Handshake" is an in-memory interaction pattern implemented in `app/index.html`. Story 3-3 extends the same pattern.

Communication between `restructure.html` and `index.html` uses `localStorage` — the same mechanism already established for payslips (`payslip_current`) and disbursement records (`disbursement_current`). Do NOT introduce `BroadcastChannel`, `sessionStorage`, URL params, or any new transport mechanism.

### Backend: additions to `src/domain/compliance/wage-rule.ts`

Add below the existing `simulateRestructuring` block (before the `// STORY 3.1` section):

```typescript
// ============================================================================
// STORY 3.3: CHANGE HANDSHAKE ROUTING
// ============================================================================

/**
 * A single employee's restructuring change, formatted for the Change Handshake.
 * Mirrors the shape of changeRecords in app/index.html.
 */
export interface RestructuringChangeRecord {
  employeeId: string;
  employeeName: string;
  oldBasicPaise: number;
  newBasicPaise: number;
  deltaNetPayPaise: number;
  deltaPfEmployeePaise: number;
  deltaMonthlyGratuityAccrualPaise: number;
  effectiveDate: string;   // ISO date string, e.g. "2026-07-01"
  signatory: string;
  status: 'pending' | 'signed_off' | 'held' | 'rejected';
  createdAt: string;       // ISO timestamp from new Date().toISOString()
}

/**
 * Convert simulator output into Change Handshake records.
 *
 * Pure except for createdAt (Date.now). No I/O, no store access.
 * Empty input returns empty array.
 */
export function createRestructuringChangeset(
  impacts: RestructuringImpact[],
  effectiveDate: string,
  signatory: string,
): RestructuringChangeRecord[] {
  const createdAt = new Date().toISOString();
  return impacts.map(impact => ({
    employeeId: impact.employeeId,
    employeeName: impact.employeeName,
    oldBasicPaise: impact.currentBasicPaise,
    newBasicPaise: impact.proposedBasicPaise,
    deltaNetPayPaise: impact.deltaNetPayPaise,
    deltaPfEmployeePaise: impact.deltaPfEmployeePaise,
    deltaMonthlyGratuityAccrualPaise: impact.deltaMonthlyGratuityAccrualPaise,
    effectiveDate,
    signatory,
    status: 'pending',
    createdAt,
  }));
}
```

**Frozen exports — do not touch**: `WageRuleViolation`, `WageRuleScanResult`, `scanWageRuleCompliance`, `RestructuringImpact`, `simulateRestructuring`.

### localStorage schema for `restructuring_pending`

```typescript
// Written by restructure.html Apply button; read by index.html on load
interface RestructuringPending {
  records: RestructuringChangeRecord[];  // one per violating employee
  submittedAt: string;                   // ISO timestamp
  submittedBy: string;                   // "Priya Sharma (HR Manager)"
  employeeCount: number;                 // records.length
}
```

In `restructure.html`, construct this from the ROSTER violations using the inlined `computeDeltas` math (mirroring `createRestructuringChangeset` — the JS side cannot import TypeScript):

```javascript
const EFFECTIVE_DATE = '2026-07-01';
const SIGNATORY = 'HR Manager';

function buildChangeRecord(emp, proposedBasicPaise) {
  const deltas = computeDeltas(emp, proposedBasicPaise);
  return {
    employeeId:    emp.id,
    employeeName:  emp.name,
    oldBasicPaise: emp.basicPaise,
    newBasicPaise: proposedBasicPaise,
    deltaNetPayPaise:                  deltas.deltaNet,
    deltaPfEmployeePaise:              deltas.deltaPf,
    deltaMonthlyGratuityAccrualPaise:  deltas.deltaGrat,
    effectiveDate: EFFECTIVE_DATE,
    signatory:     SIGNATORY,
    status:        'pending',
    createdAt:     new Date().toISOString(),
  };
}
```

Read the current proposed value from each row's input (`document.getElementById('input-' + rowIdx)`), convert rupees → paise (`Math.round(parseFloat(input.value) * 100)`).

### `restructure.html`: changes required

**Remove**: the `.apply-placeholder` CSS rule and the `<div class="apply-placeholder" id="applyCta">` element.

**Remove**: the CSS comment `/* TODO (story 3.3): Replace this placeholder… */` from the `<style>` block.

**Add**: An apply section after the violations table:

```html
<!-- AC-2/AC-3: Apply Restructuring (story 3.3) -->
<div id="applySection" style="margin-top: 0;">
  <!-- Inline warning for partial compliance — shown only when needed (AC-3) -->
  <div id="partialWarning" style="display:none; background:#FFFBEB; border:1px solid #FDE68A;
    border-radius:10px; padding:12px 18px; margin-bottom:12px; color:#92400E; font-size:13px;">
    <strong>⚠ N employees still below 50% threshold.</strong>
    Applying will partially restructure the roster. Employees marked ⚠ will still violate the rule.
    <div style="display:flex; gap:8px; margin-top:10px;">
      <button id="proceedAnyway" onclick="applyRestructuring(true)"
        style="padding:8px 16px; border:0; border-radius:8px; background:#D97706;
               color:#fff; font-weight:700; cursor:pointer; font-size:13px;">
        Proceed anyway
      </button>
      <button onclick="dismissPartialWarning()"
        style="padding:8px 16px; border:1px solid #FDE68A; border-radius:8px;
               background:none; color:#92400E; cursor:pointer; font-size:13px;">
        Cancel
      </button>
    </div>
  </div>

  <button id="applyBtn" onclick="applyRestructuring(false)"
    style="width:100%; padding:14px; border:0; border-radius:10px;
           background:#0D9488; color:#fff; font-weight:700; font-size:15px; cursor:pointer;">
    Apply Restructuring — N employees
  </button>
  <p style="margin-top:8px; font-size:12px; color:var(--muted); text-align:center;">
    Routes through the Change Handshake — Priya must sign off on the dashboard before changes take effect.
  </p>
</div>
```

**Add `applyRestructuring(force)` JS function**:

```javascript
function applyRestructuring(force) {
  // Count rows that still have the ⚠ indicator (proposed < required)
  const nonCompliantRows = violations.filter((emp, i) => {
    const input = document.getElementById('input-' + i);
    if (!input || input.classList.contains('invalid')) return true;
    const proposedPaise = Math.round(parseFloat(input.value) * 100);
    const required = Math.floor(monthlyCtcPaise(emp) / 2);
    return proposedPaise < required;
  });

  if (!force && nonCompliantRows.length > 0) {
    // Show inline partial-compliance warning
    const warn = document.getElementById('partialWarning');
    warn.querySelector('strong').textContent =
      '⚠ ' + nonCompliantRows.length + ' employee' +
      (nonCompliantRows.length !== 1 ? 's' : '') + ' still below 50% threshold.';
    warn.style.display = 'block';
    document.getElementById('applyBtn').style.display = 'none';
    return;
  }

  // Collect proposed values
  const records = violations.map((emp, i) => {
    const input = document.getElementById('input-' + i);
    const proposedPaise = input && !input.classList.contains('invalid')
      ? Math.round(parseFloat(input.value) * 100)
      : defaultProposed(emp);
    return buildChangeRecord(emp, proposedPaise);
  });

  const payload = {
    records,
    submittedAt:    new Date().toISOString(),
    submittedBy:    'Priya Sharma (HR Manager)',
    employeeCount:  records.length,
  };

  try {
    localStorage.setItem('restructuring_pending', JSON.stringify(payload));
  } catch(e) { /* quota exceeded — prototype only */ }

  window.location.href = 'index.html';
}

function dismissPartialWarning() {
  document.getElementById('partialWarning').style.display = 'none';
  document.getElementById('applyBtn').style.display = 'block';
}
```

**Update the preview-only banner** to remove the "available in the next release" clause:

```html
<span><strong>Preview only — no changes committed yet.</strong> Review the impact of raising basic salaries to meet the 50%-wage rule. When ready, click "Apply Restructuring" to route changes through the Change Handshake on the dashboard.</span>
```

**Update `applyBtn` text dynamically** in the page init section:

```javascript
const applyBtn = document.getElementById('applyBtn');
if (applyBtn) {
  applyBtn.textContent = 'Apply Restructuring — ' + violations.length +
    ' employee' + (violations.length !== 1 ? 's' : '');
}
```

### `index.html`: changes required

#### 1. Load pending restructuring at the top of the `<script>` block (before the `const blockers` declaration)

```javascript
// Story 3.3: detect pending restructuring from Restructuring Assistant
let restructuringPending = null;
try {
  const raw = localStorage.getItem('restructuring_pending');
  if (raw) restructuringPending = JSON.parse(raw);
} catch(e) { /* malformed — ignore */ }
```

#### 2. Inject the restructuring blocker into the `blockers` array

The `const blockers = [...]` block is a static declaration. Change it to be mutable:

```javascript
const blockers = [];
if (restructuringPending && restructuringPending.records && restructuringPending.records.length > 0) {
  const n = restructuringPending.records.length;
  blockers.push({
    id: 'restructuring', sev: 'amber', weight: 14, icon: '⟳',
    title: n + ' salary structure' + (n !== 1 ? 's' : '') + ' changed — restructuring pending sign-off',
    desc: 'Proposed restructuring from the 50%-Wage-Rule Assistant · sign-off required before changes are applied',
    tag: 'Change Handshake', action: 'Review & sign',
  });
}
blockers.push(
  { id:'exits',  sev:'amber', weight:18, icon:'🕐', title:'1 exit pending F&F',
    desc:'Raj Mehta · F&F deadline: Tue 24 Jun 2026 · HR signatory: Priya Sharma', tag:'Lifecycle Clock', action:'Settle →' },
  { id:'ctc',    sev:'amber', weight:16, icon:'✎', title:'18 unconfirmed CTC changes',
    desc:'Finance pushed structure edits since last run · sign-off required', tag:'Change Handshake', action:'Review & sign' },
  { id:'attend', sev:'red',   weight:12, icon:'📡', title:'Attendance stale — 5 days',
    desc:'Biometric (eSSL) sync dead · LOP-sensitive payslips at risk', tag:'Freshness Vitals', action:'Re-sync' },
  { id:'pf',     sev:'amber', weight:6,  icon:'₹',  title:'PF challan not generated',
    desc:'Due by 15th · 248 employees · auto-fileable once inputs green', tag:'Compliance floor', action:'Generate' },
);
```

**Important**: `baseScore` and `totalWeight` are computed from `blockers` after this block — they automatically reflect the injected restructuring blocker when present.

#### 3. Wire the restructuring blocker's action button in `renderList()`

In the `listEl.querySelectorAll('button').forEach(btn => { ... })` block, add:

```javascript
} else if (btn.dataset.id === 'restructuring') {
  openRestructuringModal();
```

(Before the `else { resolve(btn.dataset.id); }` fallback.)

#### 4. Add the Restructuring Sign-off modal HTML

After the `<!-- Run Payroll Confirmation Modal -->` closing `</div>`, add:

```html
<!-- Restructuring Sign-off Modal (Story 3.3) -->
<div class="modal" id="restructuringModal">
  <div class="modal-content" style="max-width:820px;">
    <div class="modal-head">
      <h3 id="restructModalTitle">Restructuring Sign-off</h3>
      <button class="modal-close" onclick="closeRestructuringModal()">×</button>
    </div>
    <div class="modal-body">
      <p id="restructModalSummary" style="margin: 0 0 12px; color: var(--muted); font-size: 13px;"></p>
      <div class="diff-scroll">
        <table class="diff-table" id="restructDiffTable">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Old Basic</th>
              <th>New Basic</th>
              <th>Take-home Δ</th>
              <th>PF Δ</th>
              <th>Signatory</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="restructDiffBody"></tbody>
        </table>
      </div>
      <div class="diff-badge" id="restructDiffBadge">⚠ AWAITING SIGN-OFF</div>
      <button class="change-review-btn" id="saveRestructSignoffBtn" onclick="saveRestructuringDecisions()">
        ✓ Save Decisions
      </button>
    </div>
  </div>
</div>
```

#### 5. Add sign-off modal JS functions

```javascript
function openRestructuringModal() {
  renderRestructuringDiff();
  document.getElementById('restructuringModal').classList.add('show');
}

function closeRestructuringModal() {
  document.getElementById('restructuringModal').classList.remove('show');
}

function formatBasic(paise) {
  return '₹' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function fmtRestructDelta(paise) {
  if (paise === 0) return '<span style="color:var(--muted)">—</span>';
  const abs = Math.abs(paise);
  const sign = paise > 0 ? '+' : '−';
  const cls  = paise < 0 ? 'ctc-old' : 'ctc-new'; // red for negative (worse for employee), green for positive
  return '<span class="' + cls + '">' + sign + formatBasic(abs) + '</span>';
}

function renderRestructuringDiff() {
  if (!restructuringPending) return;
  const records = restructuringPending.records;
  const pending = records.filter(r => r.status === 'pending' || r.status === 'held');
  const n = records.length;

  document.getElementById('restructModalTitle').textContent =
    'Restructuring Sign-off — ' + n + ' salary structure' + (n !== 1 ? 's' : '');

  const ts = records[0] ? new Date(records[0].createdAt).toLocaleString('en-IN') : '';
  document.getElementById('restructModalSummary').innerHTML =
    'Proposed by Restructuring Assistant · ' + ts +
    ' · <strong>Sign off to apply salary structure changes</strong>';

  const badge = document.getElementById('restructDiffBadge');
  badge.textContent = pending.length > 0
    ? ('⚠ ' + pending.length + ' AWAITING SIGN-OFF')
    : '✓ ALL SIGNED OFF';
  badge.style.background = pending.length > 0 ? 'rgba(217,119,6,.1)' : 'rgba(46,204,113,.1)';
  badge.style.color       = pending.length > 0 ? 'var(--amber)' : 'var(--green)';

  const btn = document.getElementById('saveRestructSignoffBtn');
  btn.disabled    = pending.length === 0;
  btn.textContent = pending.length > 0 ? '✓ Save Decisions' : '✓ All done';

  const tbody = document.getElementById('restructDiffBody');
  tbody.innerHTML = '';

  records.forEach(rec => {
    const tr = document.createElement('tr');
    const isPending = rec.status === 'pending' || rec.status === 'held';

    const empTd = document.createElement('td');
    empTd.innerHTML = '<div style="font-weight:500">' + escHtml(rec.employeeName) +
      '</div><div style="font-size:11px;color:var(--muted)">' + escHtml(rec.employeeId) + '</div>';

    const oldTd = document.createElement('td');
    oldTd.className = 'ctc-old';
    oldTd.textContent = formatBasic(rec.oldBasicPaise);

    const newTd = document.createElement('td');
    newTd.className = 'ctc-new';
    newTd.textContent = formatBasic(rec.newBasicPaise);

    const netTd = document.createElement('td');
    netTd.innerHTML = fmtRestructDelta(rec.deltaNetPayPaise);

    const pfTd = document.createElement('td');
    pfTd.innerHTML = fmtRestructDelta(-rec.deltaPfEmployeePaise); // negative pf delta = good for employee

    const sigTd = document.createElement('td');
    sigTd.style.cssText = 'font-size:12px;color:var(--muted)';
    sigTd.textContent = rec.signatory;

    const actTd = document.createElement('td');
    if (isPending) {
      const cur = rec.status === 'held' ? 'hold' : 'sign';
      actTd.innerHTML =
        '<div class="diff-action">' +
        '<label class="opt-sign"><input type="radio" name="rstruct-' + rec.employeeId + '" value="sign"' +
          (cur === 'sign' ? ' checked' : '') + '><span>Sign-off</span></label>' +
        '<label class="opt-hold"><input type="radio" name="rstruct-' + rec.employeeId + '" value="hold"' +
          (cur === 'hold' ? ' checked' : '') + '><span>Hold</span></label>' +
        '<label class="opt-reject"><input type="radio" name="rstruct-' + rec.employeeId + '" value="reject">' +
          '<span>Reject</span></label>' +
        '</div>';
    } else {
      const labels = { signed_off:'✓ Signed off', rejected:'✗ Rejected', held:'⏸ Held' };
      const colors = { signed_off:'var(--green)', rejected:'var(--red)', held:'var(--amber)' };
      const el = document.createElement('span');
      el.style.cssText = 'font-size:11px;font-weight:600;color:' + (colors[rec.status] || 'var(--muted)');
      el.textContent = labels[rec.status] || rec.status;
      actTd.appendChild(el);
    }

    tr.appendChild(empTd); tr.appendChild(oldTd); tr.appendChild(newTd);
    tr.appendChild(netTd); tr.appendChild(pfTd);  tr.appendChild(sigTd);
    tr.appendChild(actTd);
    tbody.appendChild(tr);
  });
}

function saveRestructuringDecisions() {
  if (!restructuringPending) return;

  restructuringPending.records.forEach(rec => {
    if (rec.status !== 'pending' && rec.status !== 'held') return;
    const radios = document.querySelectorAll('input[name="rstruct-' + rec.employeeId + '"]');
    radios.forEach(r => {
      if (r.checked) {
        if (r.value === 'sign')   rec.status = 'signed_off';
        if (r.value === 'hold')   rec.status = 'held';
        if (r.value === 'reject') rec.status = 'rejected';
      }
    });
  });

  const remainingPending = restructuringPending.records.filter(
    r => r.status === 'pending' || r.status === 'held'
  ).length;

  const restructBlocker = blockers.find(b => b.id === 'restructuring');

  if (remainingPending === 0) {
    // All decided — write audit, clear pending, resolve blocker
    const signedOff = restructuringPending.records.filter(r => r.status === 'signed_off').length;
    const auditRecord = {
      appliedBy:  'Priya Sharma (HR Manager)',
      appliedAt:  new Date().toISOString(),
      records:    restructuringPending.records.map(r => ({
        employeeId: r.employeeId, employeeName: r.employeeName,
        oldBasicPaise: r.oldBasicPaise, newBasicPaise: r.newBasicPaise,
        status: r.status,
      })),
    };
    try {
      localStorage.setItem('restructuring_audit', JSON.stringify(auditRecord));
      localStorage.removeItem('restructuring_pending');
    } catch(e) { /* quota */ }

    closeRestructuringModal();
    resolve('restructuring');
    showToast('✅ ' + signedOff + ' salary structure' + (signedOff !== 1 ? 's' : '') +
      ' signed off — audit record saved');
    return;
  }

  // Partial — update blocker title/weight
  if (restructBlocker) {
    restructBlocker.title = remainingPending + ' salary structure' +
      (remainingPending !== 1 ? 's' : '') + ' — restructuring pending sign-off';
    restructBlocker.weight = Math.round(14 * remainingPending / restructuringPending.records.length);
  }

  renderRestructuringDiff();
  renderList();
  renderGauge(true);
}
```

#### 6. `escHtml` is already defined in `index.html`

Check that `escHtml` is available. If not (it was defined in `restructure.html`), add a local copy to `index.html`'s script block.

Grep confirms `escHtml` is NOT currently in `index.html`. Add it near the top of the script block:

```javascript
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
```

#### 7. `resetCycle()` must clear the restructuring state

In the existing `resetCycle()` function, add after `changeRecords.forEach(r => { r.status = 'pending'; });`:

```javascript
// Story 3.3: reset restructuring blocker if present
const rIdx = blockers.findIndex(b => b.id === 'restructuring');
if (rIdx !== -1) blockers.splice(rIdx, 1);
restructuringPending = null;
```

This ensures the demo is repeatable and the restructuring blocker doesn't persist across runs.

### Tests: `src/domain/compliance/wage-rule.test.ts` additions

Append a new `describe('createRestructuringChangeset', ...)` block. Import the new function alongside the existing imports:

```typescript
import {
  scanWageRuleCompliance,
  simulateRestructuring,
  createRestructuringChangeset,  // new
} from "./wage-rule.js";
```

Key test assertions:
- Empty array → returns `[]`
- Single impact, all fields mapped correctly (see AC-7 above for the mapping rules)
- `createdAt` format: `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/`
- `status` always `'pending'`
- Two impacts → two records, order preserved
- `effectiveDate` and `signatory` from arguments, not from the impact

Use `EMP_BELOW_CAP` and `EMP_ABOVE_CAP` fixtures from the existing `simulateRestructuring` tests (or define small inline fixtures). Use `_resetStore()` + `beforeEach` pattern.

### Scope guard

- **No new backend routes, no server calls** — all in-memory prototype.
- **Do not modify `simulateRestructuring`, `scanWageRuleCompliance`, `WageRuleViolation`, `WageRuleScanResult`** — they are frozen from 3.1/3.2.
- **Do not add a sort/filter UI** to the restructuring modal — rowIdx coupling deferred item from 3-2 review stays deferred.
- **Do not modify `payslip.html`, `portal.html`, `disbursement.html`** — not in scope.
- The `restructuring_audit` localStorage entry written in AC-6 is write-only in this story — no UI reads it yet.
- The `escHtml` addition to `index.html` is a safety fix that doesn't constitute new scope; it's needed for XSS safety on the names rendered in the new modal.

### Regression guards

After implementation, run:
```powershell
npx jest wage-rule      # all new tests pass; 13 existing wage-rule tests still pass
npx jest               # no new regressions vs 201-test baseline
```

Visual checks:
1. Open `app/restructure.html` → Apply button visible, preview banner updated
2. Click Apply → navigates to `app/index.html`
3. Dashboard shows extra blocker "5 salary structures changed — restructuring pending sign-off" with weight 14 (score should be 48: 100 - 14 - 18 - 16 - 12 - 6 = 34... wait: 100 - (14+18+16+12+6) = 34)
4. Click "Review & sign" → Restructuring Sign-off modal opens with 5 rows
5. Sign off all → toast appears, blocker resolves, gauge animates upward
6. Verify `localStorage.getItem('restructuring_audit')` contains the expected record
7. Verify `localStorage.getItem('restructuring_pending')` is null after sign-off

### File summary

| File | Action | What changes |
|---|---|---|
| `src/domain/compliance/wage-rule.ts` | UPDATE | Add `RestructuringChangeRecord` interface + `createRestructuringChangeset()` |
| `src/domain/compliance/wage-rule.test.ts` | UPDATE | Append `createRestructuringChangeset` describe block |
| `app/restructure.html` | UPDATE | Replace apply-placeholder with real Apply button + JS logic |
| `app/index.html` | UPDATE | Detect `restructuring_pending` on load, inject blocker, add sign-off modal + JS |

---

## Tasks / Subtasks

- [x] Extend `src/domain/compliance/wage-rule.ts` (AC-1)
  - [x] Add `RestructuringChangeRecord` interface (fields: employeeId, employeeName, oldBasicPaise, newBasicPaise, delta fields × 3, effectiveDate, signatory, status, createdAt)
  - [x] Add `createRestructuringChangeset(impacts, effectiveDate, signatory)` — maps `RestructuringImpact[]` → `RestructuringChangeRecord[]`, sets `status: 'pending'`, `createdAt: new Date().toISOString()`
  - [x] Verify frozen exports untouched

- [x] Add tests to `src/domain/compliance/wage-rule.test.ts` (AC-7)
  - [x] Import `createRestructuringChangeset` in the test file
  - [x] Test: empty input → `[]`
  - [x] Test: single impact → fields mapped correctly per AC-1 spec
  - [x] Test: `createdAt` is valid ISO timestamp string
  - [x] Test: `status` = `'pending'` always
  - [x] Test: multiple impacts → order preserved
  - [x] Test: `effectiveDate` and `signatory` verbatim from arguments

- [x] Update `app/restructure.html` (AC-2, AC-3)
  - [x] Remove `.apply-placeholder` CSS rule and the TODO CSS comment
  - [x] Remove `<div class="apply-placeholder" id="applyCta">` element
  - [x] Add `buildChangeRecord(emp, proposedBasicPaise)` JS helper (uses existing `computeDeltas`)
  - [x] Add `applyRestructuring(force)` JS function: validates, shows inline warning or proceeds, writes `restructuring_pending` to localStorage, navigates to `index.html`
  - [x] Add `dismissPartialWarning()` JS function
  - [x] Add apply section HTML: inline warning div (initially hidden) + Apply Restructuring button
  - [x] Update Apply button text dynamically in page init (violations count)
  - [x] Update preview-only banner text (remove "next release" language)

- [x] Update `app/index.html` (AC-4, AC-5, AC-6)
  - [x] Add `escHtml()` helper near top of script block (XSS safety for modal content)
  - [x] Add `restructuringPending` load block before `const blockers` (or refactored push pattern)
  - [x] Refactor static `blockers` array to push pattern; prepend `restructuring` blocker if pending data found
  - [x] Add `openRestructuringModal()` and `closeRestructuringModal()` functions
  - [x] Add `renderRestructuringDiff()` function
  - [x] Add `saveRestructuringDecisions()` function (resolves blocker when all decided, updates blocker on partial)
  - [x] Add `formatBasic(paise)` and `fmtRestructDelta(paise)` helpers for the modal
  - [x] Wire `btn.dataset.id === 'restructuring'` → `openRestructuringModal()` in `renderList()`
  - [x] Add Restructuring Sign-off modal HTML (after Run Payroll modal)
  - [x] Update `resetCycle()` to remove restructuring blocker and clear `restructuringPending`

- [x] Verify (AC: all)
  - [x] `npx jest wage-rule` → new tests pass + 13 existing still pass
  - [x] `npx jest` → no regressions vs 201-test baseline
  - [x] Open `restructure.html` → Apply button present, banner updated
  - [x] Click Apply → navigates to `index.html`, restructuring blocker visible
  - [x] Sign off all in modal → blocker resolves, toast shows, `restructuring_audit` in localStorage
  - [x] `restructuring_pending` removed from localStorage after sign-off

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Removed unused `rules` variable from `createRestructuringChangeset` describe block (TS6133 error).

### Completion Notes List

- Added `RestructuringChangeRecord` interface and `createRestructuringChangeset()` to `wage-rule.ts`. Pure function — no I/O, maps `RestructuringImpact[]` to change records with `status: 'pending'`.
- Appended 9 new tests in `wage-rule.test.ts` covering empty input, field mapping, ISO timestamp format, status, order preservation, and argument passthrough. All 22 wage-rule tests pass.
- Replaced `.apply-placeholder` stub in `restructure.html` with real Apply section including inline partial-compliance warning (AC-3) and `buildChangeRecord`/`applyRestructuring`/`dismissPartialWarning` JS functions.
- Updated `index.html`: added `escHtml()` for XSS safety, `restructuringPending` localStorage load on startup, refactored `blockers` array to push pattern with optional restructuring blocker prepend, added full Restructuring Sign-off modal HTML + JS (`openRestructuringModal`, `renderRestructuringDiff`, `saveRestructuringDecisions`, `formatBasic`, `fmtRestructDelta`), wired `renderList()` action routing, and `resetCycle()` cleanup.
- Visual checks passed: Apply button shows correct employee count, partial warning fires when a row is below threshold, blocker injects at score 34, modal opens with all 5 rows, sign-off resolves blocker to 48, audit record written to localStorage, pending cleared.
- Pre-existing 3 test suite failures (`rules-store`, `freshness-monitor`, `data-complete`) are unrelated vitest-import issues not caused by this story.

### File List

- `src/domain/compliance/wage-rule.ts`
- `src/domain/compliance/wage-rule.test.ts`
- `app/restructure.html`
- `app/index.html`

### Review Findings

- [x] [Review][Patch] Partial sign-off weight reduction has zero effect on Readiness Score [app/index.html — `saveRestructuringDecisions()` partial branch + `computeScore()`]
- [x] [Review][Patch] `resetCycle()` score miscalculated when restructuring blocker was active at cycle reset [app/index.html — `resetCycle()`]

## Change Log

- 2026-06-11: Story created — restructuring execution via Change Handshake (Apply button in `restructure.html`, blocker injection + sign-off modal in `index.html`, `RestructuringChangeRecord` + `createRestructuringChangeset` in `wage-rule.ts`).
- 2026-06-11: Story implemented — all ACs satisfied; 22 wage-rule tests pass (9 new), no new regressions across 210 tests.
