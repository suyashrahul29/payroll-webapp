---
story_id: 3.2
story_key: 3-2-impact-preview-restructuring-simulator
epic: 3
title: Impact Preview — Restructuring Simulator
status: done
created: 2026-06-11
baseline_commit: 96956a59cd48a9edc90b376eaadb793ef2e45d30
---

# Story 3.2: Impact Preview — Restructuring Simulator

## Story

As a **Frontend + Backend Engineer**,
I want to simulate salary restructuring and show per-employee impact (take-home Δ, PF Δ, gratuity Δ) before applying,
so that Priya sees the exact consequences of bringing each violating employee into 50%-wage-rule compliance before committing any change.

## Acceptance Criteria

### AC-1: Violations Table with Compliance Engine Deltas

**Given** the restructuring assistant is opened (`app/restructure.html`),
**When** the page loads,
**Then** a table appears listing every non-compliant employee, showing:

| Column | Description |
|---|---|
| Employee | Name + ID |
| Current Basic | Monthly basic in ₹ (and % of monthly CTC) |
| Proposed Basic | Editable input, pre-filled to exactly 50% of monthly CTC |
| Take-home Δ | Net pay change in ₹ (negative = employee pays more, due to higher PF) |
| PF Δ | Employee PF contribution change in ₹ |
| Gratuity Δ | Monthly employer gratuity accrual change in ₹/month |

All delta values are computed using the same logic as the Compliance Engine (Epic 2, `compute()` in `calculator.ts`).

### AC-2: Real-Time Recalculation on Manual Adjustment

**Given** the preview table is shown,
**When** Priya edits the "Proposed Basic" input for any row,
**Then** that row's Take-home Δ, PF Δ, and Gratuity Δ recompute instantly (no submit button needed).

The recalculation uses the same PF/gratuity logic as AC-1. No permanent changes are made.

### AC-3: Preview-Only — No Apply Action

**Given** any state of the preview table,
**When** Priya views the page,
**Then** there is no "Apply" or "Commit" button. A clear banner reads "Preview only — no changes committed." Applying restructuring is story 3.3.

### AC-4: Compliant Employees Shown Separately

**Given** the page loads,
**When** there are compliant employees in the roster,
**Then** they appear in a separate summary section ("Already compliant — N employees") below the violations table. They are not editable and show no delta columns.

### AC-5: Backend `simulateRestructuring()` Pure Function

**Given** any `Employee`, a proposed basic (paise), a `PayrollPeriod`, and `ResolvedRules`,
**When** `simulateRestructuring(employee, proposedBasicPaise, period, rules)` is called,
**Then** it returns a `RestructuringImpact` with:
- `currentPfEmployeePaise` and `proposedPfEmployeePaise` matching `compute()` outputs
- `deltaNetPayPaise` = proposed net − current net (negative when PF increases)
- `deltaPfEmployeePaise` = proposed PF − current PF
- `deltaMonthlyGratuityAccrualPaise` = `floor(proposedBasic × 15/312)` − `floor(currentBasic × 15/312)`

The function is pure (no I/O, no side effects, no store access). It delegates monetary computation to `compute()` from `calculator.ts`.

### AC-6: Navigation Link from Dashboard

**Given** a user is on `app/index.html`,
**When** they look at the header nav links,
**Then** they see a "Restructure →" link pointing to `restructure.html`, styled consistently with the existing "Setup →", "Import →", "Portal →" links.

### AC-7: Test Coverage

Tests in `src/domain/compliance/wage-rule.test.ts` (appended to existing file):
- Basic below PF cap → PF increases, take-home drops by matching amount
- Basic already above PF cap → PF delta = 0, take-home delta = 0
- Basic straddles PF cap → PF clamped to cap, correct delta
- PF opt-out employee → PF delta = 0, gratuity delta still non-zero
- Same proposed == current → all deltas = 0
- `simulateRestructuring` returns `employeeId` and `employeeName` verbatim from employee

---

## Dev Notes

### The Only Deduction That Changes

When basic increases within a fixed gross:
- **ESI**: based on gross → **unchanged**
- **TDS**: based on gross → **unchanged**
- **PT**: based on gross → **unchanged**
- **PF**: based on `min(basic, ₹15,000 cap)` → **changes only if current or proposed basic is below the cap (1,500,000 paise)**

Take-home delta = negative of PF delta. Net pay = gross − (PF + ESI + TDS + PT). Only PF moves.

### Backend: `simulateRestructuring` in `wage-rule.ts`

Extend `src/domain/compliance/wage-rule.ts` — the Epic-3 module established by story 3.1:

```typescript
import { Employee, PayrollPeriod, ResolvedRules, compute } from "./calculator.js";

export interface RestructuringImpact {
  employeeId: string;
  employeeName: string;
  currentBasicPaise: number;
  proposedBasicPaise: number;
  currentPfEmployeePaise: number;
  proposedPfEmployeePaise: number;
  currentNetPayPaise: number;
  proposedNetPayPaise: number;
  currentMonthlyGratuityAccrualPaise: number; // floor(basic × 15 / 312) per month
  proposedMonthlyGratuityAccrualPaise: number;
  deltaNetPayPaise: number;                   // proposed − current; negative = employee pays more
  deltaPfEmployeePaise: number;               // positive = higher PF deduction
  deltaMonthlyGratuityAccrualPaise: number;   // employer liability delta
}

export function simulateRestructuring(
  employee: Employee,
  proposedBasicPaise: number,
  period: PayrollPeriod,
  rules: ResolvedRules
): RestructuringImpact {
  const currentOutputs = compute(employee, period, rules);
  const proposedEmployee = { ...employee, basicSalaryPaise: proposedBasicPaise };
  const proposedOutputs = compute(proposedEmployee, period, rules);

  const currentGratuity = Math.floor(employee.basicSalaryPaise * 15 / 312);
  const proposedGratuity = Math.floor(proposedBasicPaise * 15 / 312);

  return {
    employeeId: employee.employeeId,
    employeeName: employee.name,
    currentBasicPaise: employee.basicSalaryPaise,
    proposedBasicPaise,
    currentPfEmployeePaise: currentOutputs.pfEmployeePaise,
    proposedPfEmployeePaise: proposedOutputs.pfEmployeePaise,
    currentNetPayPaise: currentOutputs.netPayPaise,
    proposedNetPayPaise: proposedOutputs.netPayPaise,
    currentMonthlyGratuityAccrualPaise: currentGratuity,
    proposedMonthlyGratuityAccrualPaise: proposedGratuity,
    deltaNetPayPaise: proposedOutputs.netPayPaise - currentOutputs.netPayPaise,
    deltaPfEmployeePaise: proposedOutputs.pfEmployeePaise - currentOutputs.pfEmployeePaise,
    deltaMonthlyGratuityAccrualPaise: proposedGratuity - currentGratuity,
  };
}
```

**Gratuity formula note:** `floor(basicPaise × 15 / 312)` = floor(basic × 15/26/12). This represents the monthly gratuity accrual *per year of service* (employer's liability growth per month). It is a rate, not an absolute amount — years-of-service data is not in the `Employee` type. The UI labels it clearly as "₹/month accrual" so Priya understands the framing.

### Frontend: `app/restructure.html` (new file)

Vanilla HTML/CSS/JS — no build step, no dependencies. Follow the exact CSS token pattern from `app/index.html` (same `:root` variables, same `.card`, `.brand`, header pattern).

**Page structure:**
1. Sticky header — brand logo, "Restructuring Assistant" subtitle, "← Dashboard" back link
2. Preview-only banner — amber background, "Preview only — no changes committed. Apply via story 3.3."
3. "Non-Compliant Employees" section — interactive table (see AC-1/AC-2)
4. "Already Compliant" section — summary row count only (see AC-4)

**Mock data for the HTML page** (8 employees — 5 violating, 3 compliant):
```javascript
const ROSTER = [
  // Violating
  { id:"EMP001", name:"Amit Sharma",    basicPaise:2_250_000, grossPaise:4_000_000, ctcAnnualPaise:60_000_000, pfOptOut:false },
  { id:"EMP002", name:"Sunita Rao",     basicPaise:1_800_000, grossPaise:3_500_000, ctcAnnualPaise:54_000_000, pfOptOut:false },
  { id:"EMP003", name:"Ravi Kumar",     basicPaise:1_200_000, grossPaise:2_000_000, ctcAnnualPaise:30_000_000, pfOptOut:false },
  { id:"EMP004", name:"Preethi Nair",   basicPaise:3_000_000, grossPaise:6_000_000, ctcAnnualPaise:90_000_000, pfOptOut:true  },
  { id:"EMP005", name:"Vikram Singh",   basicPaise:2_000_000, grossPaise:3_800_000, ctcAnnualPaise:60_000_000, pfOptOut:false },
  // Compliant
  { id:"EMP006", name:"Meera Iyer",     basicPaise:3_500_000, grossPaise:5_000_000, ctcAnnualPaise:72_000_000, pfOptOut:false },
  { id:"EMP007", name:"Aarav Patel",    basicPaise:2_500_000, grossPaise:4_200_000, ctcAnnualPaise:60_000_000, pfOptOut:false },
  { id:"EMP008", name:"Deepa Menon",    basicPaise:4_000_000, grossPaise:6_000_000, ctcAnnualPaise:84_000_000, pfOptOut:false },
];
```

**PF calculation inlined in JS** (mirrors `calculator.ts` for the preview; gross stays constant):
```javascript
const PF_WAGE_CAP = 1_500_000;  // ₹15,000/month
const PF_RATE_BPS = 1200;       // 12%

function computePfEmployee(basicPaise, pfOptOut) {
  if (pfOptOut) return 0;
  return Math.floor(Math.min(basicPaise, PF_WAGE_CAP) * PF_RATE_BPS / 10_000);
}

function monthlyGratuityAccrual(basicPaise) {
  return Math.floor(basicPaise * 15 / 312);
}

function computeDeltas(row, proposedBasicPaise) {
  const currentPf  = computePfEmployee(row.basicPaise, row.pfOptOut);
  const proposedPf = computePfEmployee(proposedBasicPaise, row.pfOptOut);
  const deltaPf    = proposedPf - currentPf;
  const deltaNet   = -deltaPf;   // ESI/TDS/PT don't change; only PF shifts take-home
  const deltaGrat  = monthlyGratuityAccrual(proposedBasicPaise) - monthlyGratuityAccrual(row.basicPaise);
  return { deltaPf, deltaNet, deltaGrat };
}
```

**Formatting helpers:**
```javascript
function paise2Rs(p) {
  return '₹' + Math.abs(p / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}
function fmtDelta(p) {
  if (p === 0) return '<span style="color:var(--muted)">—</span>';
  const sign = p > 0 ? '+' : '−';
  const cls  = p < 0 ? 'var(--red)' : 'var(--green)';
  // For take-home: negative p is bad (employee loses money) → red
  return `<span style="color:${cls}">${sign}${paise2Rs(Math.abs(p))}</span>`;
}
```

**Real-time recalculation:**
Each row's proposed-basic input (`<input type="number">`) has an `oninput` handler that reads the paise value, calls `computeDeltas`, and updates the three delta cells in that row by setting `innerHTML`.

**Violation detection** (inlined 50%-rule):
```javascript
function isViolating(emp) {
  const monthlyCtc = Math.floor(emp.ctcAnnualPaise / 12);
  return emp.basicPaise < Math.floor(monthlyCtc / 2);
}
function defaultProposedBasic(emp) {
  return Math.floor(emp.ctcAnnualPaise / 12 / 2);  // exactly 50%
}
```

### Tests for `simulateRestructuring`

Append to `src/domain/compliance/wage-rule.test.ts`. Use the same pattern as `calculator.test.ts`:
- Import `_resetStore` from `./rules-store.js`
- Import `resolveRulesForPeriod`, `PayrollPeriod` from `./calculator.js`
- `beforeEach(() => { _resetStore(); })` — resets to seeded FY 2025-26 defaults
- `const JUN_2026: PayrollPeriod = { year: 2026, month: 6, periodString: "2026-06" };`

**Key test fixtures:**
```typescript
// Below-cap scenario: basic ₹12,000 (1_200_000 paise), monthly CTC ₹30,000, gross ₹20,000
const EMP_BELOW_CAP: Employee = {
  employeeId: "EMP_BC",
  name: "Below Cap",
  basicSalaryPaise: 1_200_000,   // ₹12,000 → 40% of monthly ₹30,000
  grossSalaryPaise: 2_000_000,   // ₹20,000 gross (≤ ESI ceiling)
  ctcAnnualPaise:   36_000_000,  // ₹3L annual
  jurisdiction: "DL",            // no PT (Delhi)
  pfOptOut: false,
  esiApplicable: true,
};

// Above-cap scenario: basic ₹20,000 (2_000_000 paise), monthly CTC ₹48,000, gross ₹40,000
const EMP_ABOVE_CAP: Employee = {
  employeeId: "EMP_AC",
  name: "Above Cap",
  basicSalaryPaise: 2_000_000,   // ₹20,000 → 42% of monthly ₹40,000
  grossSalaryPaise: 4_000_000,   // ₹40,000 gross (> ESI ceiling)
  ctcAnnualPaise:   48_000_000,  // ₹4.8L annual
  jurisdiction: "MH",
  pfOptOut: false,
  esiApplicable: false,
};
```

**Critical PF maths to verify:**
- `EMP_BELOW_CAP` current PF: `floor(1_200_000 × 1200 / 10_000)` = `floor(144_000)` = **144,000 paise**
- Proposed basic 1,500,000 (50% of 3,000,000 monthly CTC): PF = `floor(1_500_000 × 1200 / 10_000)` = **180,000 paise**
- delta PF = +36,000 paise; delta net = −36,000 paise
- `EMP_ABOVE_CAP` current PF: `floor(min(2_000_000, 1_500_000) × 1200 / 10_000)` = **180,000 paise**
- Proposed basic 2_000_000 (same): PF = **180,000 paise** → delta = 0
- PF opt-out: delta PF = 0, delta gratuity = floor(proposed × 15/312) − floor(current × 15/312) ≠ 0

### Navigation Link: `app/index.html`

Add "Restructure →" to the existing nav group at line ~269 (after "Import →", before "Portal →"):
```html
<a href="restructure.html" style="font-size:12px;color:var(--blue);...">Restructure →</a>
```
Use the identical inline style as the sibling links (copy from Import or Setup).

### Scope Guard

- **No "Apply" button** — story 3.3 owns the Change Handshake execution. Leave a clear TODO comment in the HTML where the Apply CTA will go.
- **No persistence** — all state is in-memory JS; page refresh resets to mock data.
- **No backend API call** — all computation is client-side JS (same as the rest of the app).
- `wage-rule.ts` gains `simulateRestructuring` + `RestructuringImpact` **only**. No other exports change.
- `scanWageRuleCompliance` and `WageRuleViolation` / `WageRuleScanResult` from story 3.1 are **frozen** — do not modify their signatures.

### Regression Guard

After implementation, run:
- `npx jest wage-rule` — all new tests pass; original 7 tests still pass
- `npx jest multi-state` — 9 tests still pass
- `npx jest` — no new regressions vs. 195-test baseline

The 3 pre-existing `vitest`-import suite failures (`data-complete`, `rules-store`, `freshness-monitor`) are known and unrelated.

### File Summary

| File | Action | What Changes |
|---|---|---|
| `src/domain/compliance/wage-rule.ts` | UPDATE | Add `RestructuringImpact` interface + `simulateRestructuring()` |
| `src/domain/compliance/wage-rule.test.ts` | UPDATE | Append `simulateRestructuring` describe block (6 test cases) |
| `app/restructure.html` | NEW | Vanilla HTML impact-preview page with real-time JS recalculation |
| `app/index.html` | UPDATE | Add "Restructure →" nav link at line ~269 |

---

## Tasks / Subtasks

- [x] Extend `src/domain/compliance/wage-rule.ts` (AC-5)
  - [x] Add `RestructuringImpact` interface (camelCase + paise fields)
  - [x] Import `compute`, `PayrollPeriod`, `ResolvedRules` from `./calculator.js`
  - [x] Implement `simulateRestructuring(employee, proposedBasicPaise, period, rules)` — delegates to `compute()`, computes gratuity inline
  - [x] Preserve existing `WageRuleViolation`, `WageRuleScanResult`, `scanWageRuleCompliance` (frozen — do not touch)

- [x] Add tests to `src/domain/compliance/wage-rule.test.ts` (AC-7)
  - [x] Import `_resetStore` + `resolveRulesForPeriod` + `PayrollPeriod`; add `beforeEach(() => { _resetStore(); })`
  - [x] Test: below-cap raise → PF delta = +36,000p, net delta = −36,000p
  - [x] Test: above-cap employee → PF delta = 0, net delta = 0
  - [x] Test: straddles cap → PF clamped to 1,500,000 cap in proposed, correct delta
  - [x] Test: PF opt-out → PF delta = 0, gratuity delta != 0
  - [x] Test: proposed == current → all deltas = 0
  - [x] Test: `employeeId` and `employeeName` pass through verbatim

- [x] Create `app/restructure.html` (AC-1, AC-2, AC-3, AC-4)
  - [x] Header: brand, "Restructuring Assistant" subtitle, "← Dashboard" back link
  - [x] Preview-only amber banner (AC-3)
  - [x] Build violations table from ROSTER mock data; detect violations via inlined 50%-rule
  - [x] Each violation row: editable proposed-basic input (pre-filled to 50% of monthly CTC)
  - [x] `oninput` handler: recalculate PF Δ, Take-home Δ, Gratuity Δ in real-time
  - [x] Compliant employees summary section (AC-4)
  - [x] TODO comment where Apply CTA will go (story 3.3)

- [x] Update `app/index.html` (AC-6)
  - [x] Add "Restructure →" link styled identically to sibling nav links

- [x] Verify (AC: all)
  - [x] `npx jest wage-rule` → all new tests pass + original 7 still pass
  - [x] `npx jest` → no new regressions vs. 195-test baseline
  - [x] Open `app/restructure.html` in browser; edit a proposed-basic — deltas update in real time
  - [x] Preview-only banner present; no Apply button visible

### Review Findings

- [x] [Review][Decision] Should `simulateRestructuring()` validate `proposedBasicPaise`? — Resolved: throw on invalid inputs. Added RangeError guards for `<= 0`, `NaN`, and `> grossSalaryPaise`. [wage-rule.ts:82, restructure.html:317]

- [x] [Review][Patch] Add TODO comment to restructure.html acknowledging inlined PF/gratuity math must be kept in sync with wage-rule.ts and calculator.ts rule store [restructure.html:215-238]
- [x] [Review][Patch] XSS: emp.name and emp.id interpolated into innerHTML without escaping — added escHtml() helper, applied to emp.name, emp.id, and aria-label [restructure.html:buildRow]
- [x] [Review][Patch] No warning when proposed basic is still below the 50% threshold — added ⚠ amber indicator in pct-label when proposedBasicPaise < required [restructure.html:recalcRow]
- [x] [Review][Patch] basicPct() shows "49%" in red for a compliant employee when annual CTC is not divisible by 12 — changed Math.floor to Math.round for display [restructure.html:basicPct]
- [x] [Review][Patch] recalcRow does not warn when proposed basic > employee gross — added guard with "exceeds gross" label and invalid styling [restructure.html:recalcRow]
- [x] [Review][Patch] "Straddles PF cap" test is misleadingly named — renamed to "current below cap, proposed above cap"; added 2 RangeError guard tests [wage-rule.test.ts]

- [x] [Review][Defer] violations[rowIdx] index coupling — will silently corrupt delta display if rows are ever sorted or filtered; use employeeId as the key instead [restructure.html:327] — deferred, no sort/filter UI in scope
- [x] [Review][Defer] scanWageRuleCompliance has no error handling — null/undefined roster entry or validateWageRule throw aborts scan mid-loop with silent partial result [wage-rule.ts:116] — deferred, no production data path yet
- [x] [Review][Defer] Frontend ROSTER mock missing jurisdiction and esiApplicable fields — structural mismatch with Employee type; harmless in current inline JS, dangerous if used as a typed cast [restructure.html:201] — deferred, prototype mock
- [x] [Review][Defer] simulateRestructuring assumes gross is fixed but does not enforce it — caller could pass a proposedEmployee where gross also changed and get a misleading delta [wage-rule.ts:89] — deferred, caller contract documented in JSDoc
- [x] [Review][Defer] monthlyCtc literal baked into oninput attribute at render time — will use stale CTC value if CTC ever becomes mutable in a later story [restructure.html:301] — deferred, prototype

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (Claude Code, bmad-dev-story workflow)

### Completion Notes List

- Extended `src/domain/compliance/wage-rule.ts` with `RestructuringImpact` interface and `simulateRestructuring(employee, proposedBasicPaise, period, rules)`. Delegates monetary computation to `compute()` from the Compliance Engine (story 2-2) — not duplicated. Gross is treated as constant; only `basicSalaryPaise` changes on the proposed employee copy. Monthly gratuity accrual: `floor(basic × 15 / 312)` per year of service (employer liability delta).
- Frozen story-3.1 exports (`WageRuleViolation`, `WageRuleScanResult`, `scanWageRuleCompliance`) untouched.
- Added 6 `simulateRestructuring` tests to `wage-rule.test.ts`. Uses `_resetStore()` + `resolveRulesForPeriod()` pattern from `calculator.test.ts`. Covers: below-cap raise (PF +36k, net −36k), above-cap no-delta, straddles-cap clamping, PF opt-out (PF delta=0, gratuity!=0), no-change zeros, passthrough of employeeId/employeeName. All 13 wage-rule tests pass; 201 total suite passing; 3 pre-existing vitest-import failures unchanged.
- Created `app/restructure.html` — vanilla HTML/CSS/JS page. Header with brand + "← Dashboard" back link. Amber preview-only banner. Violations table with 5 mock non-compliant employees; editable proposed-basic inputs (pre-filled to 50% of monthly CTC); `oninput` recalculates PF Δ, Take-home Δ, Gratuity Δ in real time using inlined PF formula. Compliant employees summary section shows 3 employees. Apply CTA is a dashed placeholder with TODO for story 3.3 Change Handshake integration.
- Added "Restructure →" nav link to `app/index.html` header between "Import →" and "Portal →".
- Visual verification confirmed: real-time recalculation working correctly (e.g., Amit Sharma at ₹10,000 proposed → +₹600 take-home, −₹600 PF, −₹601 gratuity — all mathematically correct).

### File List

- `src/domain/compliance/wage-rule.ts` (UPDATED — added `RestructuringImpact`, `simulateRestructuring`)
- `src/domain/compliance/wage-rule.test.ts` (UPDATED — added `simulateRestructuring` describe block, 6 tests)
- `app/restructure.html` (NEW — impact preview page)
- `app/index.html` (UPDATED — "Restructure →" nav link)

## Change Log

- 2026-06-11: Story created — restructuring simulator (impact preview UI + `simulateRestructuring()` backend function extending the Epic-3 `wage-rule.ts` module from story 3.1).
- 2026-06-11: Implemented `simulateRestructuring()` + `RestructuringImpact` in `wage-rule.ts`; 6 new tests in `wage-rule.test.ts` (13/13 passing); `app/restructure.html` (new page with real-time JS recalculation); `app/index.html` nav link. 201 tests passing, no new regressions. Status → review.
