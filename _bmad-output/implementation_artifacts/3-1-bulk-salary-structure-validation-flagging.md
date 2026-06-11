---
story_id: 3.1
story_key: 3-1-bulk-salary-structure-validation-flagging
epic: 3
title: Bulk Salary Structure Validation & Flagging
status: done
created: 2026-06-11
baseline_commit: 96956a59
---

# Story 3.1: Bulk Salary Structure Validation & Flagging

## Story

As a **Backend Engineer**,
I want to scan all employee salary structures in a tenant roster and flag those violating the 50%-wage rule (monthly basic < 50% of monthly CTC),
so that Priya knows exactly which employees need restructuring before payroll runs.

## Acceptance Criteria

### AC-1: Roster-Level Scan Returns Aggregate Counts + Violations

**Given** a tenant roster of `Employee[]` with a mix of compliant and non-compliant salary structures,
**When** I call `scanWageRuleCompliance(employees)`,
**Then** it returns a `WageRuleScanResult`:
```typescript
{
  compliantCount: number,       // employees whose basic ≥ 50% of monthly CTC
  nonCompliantCount: number,    // employees whose basic < 50%
  violations: WageRuleViolation[]  // one entry per non-compliant employee, in INPUT ORDER
}
```
- `compliantCount + nonCompliantCount === employees.length`
- `violations.length === nonCompliantCount`
- Pure function: no I/O, no mutation of the input array or its elements.

### AC-2: Per-Violation Detail

**Given** a non-compliant employee (e.g. monthly basic = 45% of monthly CTC),
**When** I read the corresponding `violations[]` entry,
**Then** it contains:
```typescript
{
  employeeId: string,
  employeeName: string,
  currentBasicPct: number,   // integer, e.g. 45
  requiredBasicPct: number,  // always 50
  gapPaise: number,          // monthly shortfall in paise to reach 50% of monthly CTC
}
```
- `gapPaise` equals `floor(monthlyCtcPaise / 2) - basicSalaryPaise` (the same shortfall the existing per-employee `validateWageRule` computes).
- Example: monthly CTC ₹50,000, basic ₹22,500 (45%) → `currentBasicPct: 45`, `requiredBasicPct: 50`, `gapPaise: 250_000` (₹2,500/month).

### AC-3: Boundary — Exactly 50% Is Compliant

**Given** an employee whose monthly basic is exactly 50% of monthly CTC,
**When** the roster is scanned,
**Then** that employee is counted as compliant and does NOT appear in `violations` (the rule is basic **≥** 50%, matching the frozen `validateWageRule` `>=` comparison).

### AC-4: Empty Roster

**Given** an empty `employees` array,
**When** `scanWageRuleCompliance([])` is called,
**Then** it returns `{ compliantCount: 0, nonCompliantCount: 0, violations: [] }` (no throw).

### AC-5: Reuses Frozen Per-Employee Logic (No Re-Implementation)

**Given** the existing `validateWageRule(employee): WageRuleResult` from story 2-4 (`multi-state.ts`),
**When** `scanWageRuleCompliance` evaluates each employee,
**Then** it calls `validateWageRule(employee)` per employee — the 50%-threshold math is NOT duplicated. The existing function and its `WageRuleResult` shape remain unchanged (frozen by 2-4; consumed by `multi-state.test.ts` and `app/payslip.html`).

### AC-6: Test Coverage

All tests in `src/domain/compliance/wage-rule.test.ts`:
- Empty roster → all-zero result.
- All-compliant roster (3 employees ≥50%) → `nonCompliantCount: 0`, `violations: []`.
- Mixed roster (e.g. 3 compliant + 2 violating) → correct counts; `violations.length === 2`.
- Violation detail: a 45%-basic employee → `{ currentBasicPct: 45, requiredBasicPct: 50, gapPaise: <correct> }`.
- Boundary: employee at exactly 50% → compliant, not in violations.
- Order preservation: violations appear in the same order as the input roster.
- Input immutability: input array and employee objects are not mutated (`Object.freeze` an input employee and confirm no throw / no change).

---

## Dev Notes

### Critical Context — Reuse, Don't Reinvent

**Story 2-4 already shipped the per-employee 50%-rule check.** Do NOT re-derive the threshold math. Story 3.1 is a thin **roster-level aggregation** on top of it.

Frozen function (DO NOT MODIFY — `src/domain/compliance/multi-state.ts:19-28`):
```typescript
export interface WageRuleResult {
  compliant: boolean;
  basicPct: number;      // integer, e.g. 45 means 45%
  requiredPct: number;   // always 50
  gapPaise: number;      // 0 if compliant; monthly shortfall if not
}

export function validateWageRule(employee: Employee): WageRuleResult {
  const monthlyCtcPaise = Math.floor(employee.ctcAnnualPaise / 12);
  const requiredBasicPaise = Math.floor(monthlyCtcPaise / 2);
  const basicPct = monthlyCtcPaise > 0
    ? Math.floor((employee.basicSalaryPaise / monthlyCtcPaise) * 100)
    : 0;
  const compliant = employee.basicSalaryPaise >= requiredBasicPaise;
  const gapPaise = compliant ? 0 : requiredBasicPaise - employee.basicSalaryPaise;
  return { compliant, basicPct, requiredPct: 50, gapPaise };
}
```
This is consumed by `multi-state.test.ts` and ported inline into `app/payslip.html`. Changing its signature or shape breaks both. **Import and call it; do not touch it.**

### Naming — Do NOT Shadow `validateWageRule`

The epic's AC writes `validateWageRule(tenant_id)` as illustration, but that exact name is **already taken** by the per-employee function above. Creating a second `validateWageRule` with a different signature would be a breaking collision. Use a distinct name for the roster-level function:

> **`scanWageRuleCompliance(employees: Employee[]): WageRuleScanResult`**

### Field Naming — camelCase + paise (codebase convention, NOT the epic's snake_case)

The epic illustrates fields as `{ employee_id, current_basic_pct, required_basic_pct, gap_amount }` (snake_case, rupees). **The codebase is camelCase + integer paise throughout** (`employeeId`, `basicSalaryPaise`, `ctcAnnualPaise`, `gapPaise`). Follow the codebase, not the epic's illustrative JSON. Concretely:
- `employee_id` → `employeeId`
- `current_basic_pct` → `currentBasicPct`
- `required_basic_pct` → `requiredBasicPct`
- `gap_amount` (rupees) → `gapPaise` (integer paise)

All money stays integer paise; never floats, never rupee-floats. Rupee formatting is a UI concern (story 3.2), not this layer.

### New Module: `src/domain/compliance/wage-rule.ts`

Create a **dedicated Epic-3 module** (stories 3.2 simulator and 3.3 Change-Handshake execution will extend it). Do NOT bloat `multi-state.ts`. Pure functions only — no I/O, no DOM, no side effects.

```typescript
import type { Employee } from "./calculator.js";
import { validateWageRule } from "./multi-state.js";

export interface WageRuleViolation {
  employeeId: string;
  employeeName: string;
  currentBasicPct: number;   // integer, e.g. 45
  requiredBasicPct: number;  // always 50
  gapPaise: number;          // monthly shortfall to reach 50% of monthly CTC
}

export interface WageRuleScanResult {
  compliantCount: number;
  nonCompliantCount: number;
  violations: WageRuleViolation[];  // one per non-compliant employee, input order
}

export function scanWageRuleCompliance(employees: Employee[]): WageRuleScanResult {
  const violations: WageRuleViolation[] = [];
  let compliantCount = 0;

  for (const emp of employees) {
    const result = validateWageRule(emp);
    if (result.compliant) {
      compliantCount++;
    } else {
      violations.push({
        employeeId: emp.employeeId,
        employeeName: emp.name,
        currentBasicPct: result.basicPct,
        requiredBasicPct: result.requiredPct,  // 50
        gapPaise: result.gapPaise,
      });
    }
  }

  return {
    compliantCount,
    nonCompliantCount: violations.length,
    violations,
  };
}
```

Note: `Employee.name` is the display name field (`calculator.ts:22`). There is no `employeeName` field on `Employee` — map `emp.name` → `WageRuleViolation.employeeName`.

### Employee Type (frozen — `src/domain/compliance/calculator.ts:20-30`)

```typescript
export interface Employee {
  employeeId: string;
  name: string;
  department?: string;
  basicSalaryPaise: number;   // monthly basic
  grossSalaryPaise: number;   // monthly gross
  ctcAnnualPaise: number;     // annual CTC
  jurisdiction: Jurisdiction;
  pfOptOut: boolean;
  esiApplicable: boolean;
}
```
The 50%-rule compares **monthly basic** (`basicSalaryPaise`) against 50% of **monthly CTC** (`floor(ctcAnnualPaise / 12) / 2`). This is exactly what `validateWageRule` already does — do not re-derive it.

### Scope Boundary — Backend Only

Story 3.1 is **pure backend logic + tests**. No UI, no DOM, no `app/*.html` changes. The restructuring simulator UI is story 3.2; Change-Handshake execution/audit is story 3.3. Do not pull those forward.

There is **no persistent tenant employee store** in the codebase yet — employees are passed as plain `Employee[]` arrays (same as `calculator.ts` / `multi-state.ts` consume them). The function input is the roster array, not a `tenantId` lookup. A `tenantId`-keyed store is out of scope for 3.1; if 3.2/3.3 need persistence, they will add it.

### Forward-Looking (do NOT implement now, but design cleanly for it)

- Story 3.2 will feed `violations[]` into a before/after preview table and recompute deltas via the Compliance Engine (`compute()` from `calculator.ts`).
- Story 3.3 will route an approved restructuring through the Change Handshake (`ChangeRecord` in `src/domain/models/change-record.ts`, established by Epic 1 Story 1.5). Keep `WageRuleViolation` serializable and free of behavior so it can be carried into a `ChangeRecord` batch later.

### Testing Setup

- Tests file: `src/domain/compliance/wage-rule.test.ts` (new).
- Jest is configured at root (`jest.config.js`). Run: `npx jest wage-rule`.
- Follow the `describe`/`it` pattern in `multi-state.test.ts`. **Import from `vitest` is a known repo trap** — `rules-store.test.ts`, `freshness-monitor.test.ts`, and `data-complete.test.ts` were written against `vitest` and silently fail to compile under Jest. Use Jest globals (`describe`, `it`, `expect`, `beforeEach`) with **no test-framework import** (or `@jest/globals`), exactly as `multi-state.test.ts` and `calculator.test.ts` do.
- No `_resetStore()` needed — `scanWageRuleCompliance` does not touch the rules store (it only calls `validateWageRule`, which reads no global state).
- Reuse the `EMP_MH` / `EMP_TN` / `EMP_KA` fixture style from `multi-state.test.ts`. For a clean 45%-violation fixture: `ctcAnnualPaise: 60_000_000` (monthly ₹50,000), `basicSalaryPaise: 2_250_000` (₹22,500 = 45%) → `gapPaise: 250_000`. For exactly-50%: `basicSalaryPaise: 2_500_000`.

### Regression Guard — Run the Full Suite

After implementing, run `npx jest` and confirm:
- The new `wage-rule.test.ts` passes.
- `multi-state.test.ts` (9 tests) still passes — confirms `validateWageRule` was reused, not altered.
- No new regressions among the currently-passing 188 tests.

(The 3 pre-existing `vitest`-import suite failures are unrelated to this story; do not let them mask a new failure — check the `wage-rule` and `multi-state` suites specifically.)

### File Summary

| File | Action | What Changes |
|------|--------|-------------|
| `src/domain/compliance/wage-rule.ts` | NEW | `WageRuleViolation`, `WageRuleScanResult`, `scanWageRuleCompliance()` — pure roster aggregation reusing `validateWageRule` |
| `src/domain/compliance/wage-rule.test.ts` | NEW | Tests for AC-1 through AC-5 (counts, violation detail, boundary, empty, order, immutability) |

### References

- Epic 3, Story 3.1: `_bmad-output/planning-artifacts/epics.md:724-738`
- Epic 3 scope/outcome: `_bmad-output/planning-artifacts/epics.md:229-239`
- FR-13 (restructuring + impact preview + Change Handshake): `_bmad-output/planning-artifacts/epics.md:52`
- Frozen `validateWageRule` / `WageRuleResult`: `src/domain/compliance/multi-state.ts:12-28`
- `Employee` type: `src/domain/compliance/calculator.ts:20-30`
- ChangeRecord (for 3.3 continuity, not this story): `src/domain/models/change-record.ts`
- Test pattern reference: `src/domain/compliance/multi-state.test.ts`

---

## Tasks / Subtasks

- [x] Create `src/domain/compliance/wage-rule.ts` (AC: 1, 2, 5)
  - [x] Define `WageRuleViolation` interface (camelCase + paise fields)
  - [x] Define `WageRuleScanResult` interface (`compliantCount`, `nonCompliantCount`, `violations`)
  - [x] Implement `scanWageRuleCompliance(employees)` — iterate, call frozen `validateWageRule(emp)` per employee, push violations in input order, do not mutate input
  - [x] Map `emp.name` → `violation.employeeName`; reuse `result.basicPct` / `result.requiredPct` / `result.gapPaise`

- [x] Create `src/domain/compliance/wage-rule.test.ts` (AC: 6)
  - [x] Test: empty roster → `{ compliantCount: 0, nonCompliantCount: 0, violations: [] }`
  - [x] Test: all-compliant roster → `nonCompliantCount: 0`, `violations: []`
  - [x] Test: mixed roster → correct counts; `violations.length === nonCompliantCount`
  - [x] Test: 45%-basic violation → `{ currentBasicPct: 45, requiredBasicPct: 50, gapPaise: 250_000 }`
  - [x] Test: exactly-50% boundary → compliant, not in violations
  - [x] Test: violations preserve input order
  - [x] Test: input array + employee objects not mutated (freeze an input employee, confirm no throw)
  - [x] Use Jest globals — NO `vitest` import

- [x] Verify (AC: all)
  - [x] `npx jest wage-rule` → all new tests pass (7/7)
  - [x] `npx jest multi-state` → 9 tests still pass (confirms `validateWageRule` untouched)
  - [x] `npx jest` → no new regressions vs. the 188 passing baseline (now 195 passing)

### Review Findings

_Code review 2026-06-11 (Blind Hunter + Edge Case Hunter + Acceptance Auditor). Acceptance Auditor: all 6 ACs + 3 constraints satisfied, zero deviations. 7 findings dismissed as noise (false contract guesses + benign edge paths)._

- [x] [Review][Defer] Non-positive/dirty CTC produces false-negatives in frozen `validateWageRule`, propagated unguarded by the scan [src/domain/compliance/multi-state.ts:19-28] — deferred, pre-existing. A `ctcAnnualPaise` of 0, <12, negative, or `NaN` collapses `requiredBasicPaise` to 0/negative, so `basic >= required` is trivially true and an under-paid employee is silently counted compliant (false-negative); the scan copies the result verbatim and has no test for it. Origin is the frozen story-2-4 function this story is forbidden to modify (consumed by `app/payslip.html` + `multi-state.test.ts`); roster data-hygiene belongs to onboarding/CSV-import validation (stories 4-1 / 6-4), not this pure aggregation layer.

---

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Code, bmad-dev-story workflow)

### Debug Log References

- `npx jest wage-rule` → 7/7 pass
- `npx jest multi-state` → 9/9 pass (frozen `validateWageRule` unchanged)
- `npx jest` (full suite) → 195 tests pass; 3 suites fail to compile (`data-complete`, `rules-store`, `freshness-monitor`) — all pre-existing `vitest`-import traps documented in Dev Notes, unrelated to this story (0 tests contributed by those suites).

### Completion Notes List

- Implemented `scanWageRuleCompliance(employees)` as a thin, pure roster-level aggregation over the frozen per-employee `validateWageRule` (story 2-4). The 50%-threshold math is NOT duplicated — each employee is delegated to `validateWageRule`, and `result.basicPct` / `result.requiredPct` / `result.gapPaise` are mapped straight into the violation record.
- Followed codebase conventions: camelCase + integer paise (`employeeId`, `currentBasicPct`, `gapPaise`), not the epic's illustrative snake_case/rupees. Mapped `emp.name` → `WageRuleViolation.employeeName` (there is no `employeeName` on `Employee`).
- Avoided the naming collision flagged in Dev Notes — used `scanWageRuleCompliance`, not a second `validateWageRule`.
- New module placed at `src/domain/compliance/wage-rule.ts` (Epic-3 home for 3.2 simulator / 3.3 Change-Handshake). Pure, serializable, behavior-free violation records — ready to be carried into a `ChangeRecord` batch later without modification.
- Tests use Jest globals with no test-framework import (matching `multi-state.test.ts`), explicitly avoiding the `vitest` import trap. Covers all of AC-1 through AC-6: empty roster, all-compliant, mixed counts, 45%-violation detail (`gapPaise: 250_000`), exactly-50% boundary (compliant via `>=`), input-order preservation, and input immutability (frozen input → no throw, fixtures untouched).

### File List

- `src/domain/compliance/wage-rule.ts` (NEW)
- `src/domain/compliance/wage-rule.test.ts` (NEW)

## Change Log

- 2026-06-11: Story created — roster-level 50%-wage-rule scan (`scanWageRuleCompliance`) reusing the frozen per-employee `validateWageRule` from story 2-4. Backend-only; new `wage-rule.ts` module establishes the Epic-3 home for stories 3.2 (simulator) and 3.3 (Change-Handshake execution).
- 2026-06-11: Implemented `wage-rule.ts` (`WageRuleViolation`, `WageRuleScanResult`, `scanWageRuleCompliance`) + `wage-rule.test.ts` (7 tests, all AC). All ACs satisfied; multi-state suite confirms `validateWageRule` untouched; no new regressions (195 passing). Status → review.
