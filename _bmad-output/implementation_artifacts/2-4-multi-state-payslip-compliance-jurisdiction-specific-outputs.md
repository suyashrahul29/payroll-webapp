---
story_id: 2.4
story_key: 2-4-multi-state-payslip-compliance-jurisdiction-specific-outputs
epic: 2
title: Multi-State Payslip Compliance — Jurisdiction-Specific Outputs
status: done
created: 2026-06-11
baseline_commit: 96956a59
---

# Story 2.4: Multi-State Payslip Compliance — Jurisdiction-Specific Outputs

## Story

As a **Backend Engineer**,
I want to ensure payslips reflect the employee's jurisdiction for PT, state-specific disclosures, and wage-rule compliance,
so that a tenant with employees across states produces legally correct payslips per state.

## Acceptance Criteria

### AC-1: Multi-State Payslip Computation and Rendering

**Given** a tenant with employees in Maharashtra, Tamil Nadu, and Karnataka,
**When** I run payroll,
**Then** each payslip is computed and rendered with:
- State-correct PT rates (MH: ₹200/month for gross > ₹10,000; TN: slab-based; KA: slab-based)
- Wage-rule check (basic ≥ 50% of monthly CTC) visible on payslip — shown as compliant ✓ or violation ✗ with gap amount
- State-specific PT label (e.g. "Professional Tax (Maharashtra)" vs "Professional Tax (Tamil Nadu)")
- PT row omitted for states with no PT levy (Delhi, Rajasthan, UP, Haryana, Gujarat, Punjab)

### AC-2: State Change Mid-Cycle — Re-Computation and Audit Trail

**Given** an employee whose state changes mid-cycle (e.g. MH → TN),
**When** I re-run with the updated employee.jurisdiction,
**Then**:
- New payslip is computed using TN PT rules (not MH)
- New `appliedRules.pt` references TN rule ID (e.g. `'pt-tn-2025-04'`)
- `recordJurisdictionChange(...)` returns an immutable `JurisdictionChangeRecord` capturing: employeeId, fromJurisdiction, toJurisdiction, actor, periodAffected, timestamp
- The record is append-only (pure function returning a new object — no mutation)

### AC-3: Full PT Rule Coverage for All Supported Jurisdictions

**Given** the `rules-store.ts` in-memory store,
**When** `resolveRuleSet(jurisdiction, period, RuleType.PT)` is called for any `Jurisdiction` in the type union,
**Then** it returns a non-null rule for all 15 jurisdictions in the type union:
- Active PT rules (correct rates): MH ✓ (existing), TN ✓ (existing), KA ✓ (existing), TG, KL, WB, AP, MP
- `not_applicable: true` rules (returns rule but `computePT` → 0): DL ✓ (existing), RJ, UP, HR, GJ, PB

### AC-4: PT Display Consistency — payslip.ts and payslip.html In Sync

**Given** the `payslip.ts` PT_LABEL / PT_NOT_APPLICABLE maps and the equivalent inline maps in `app/payslip.html`,
**When** GJ and PB are not PT-levying jurisdictions,
**Then**:
- GJ and PB are removed from `PT_LABEL` in both `payslip.ts` and `payslip.html`
- GJ and PB are added to `PT_NOT_APPLICABLE` in both `payslip.ts` and `payslip.html`
- (These two files drifted in story 2-3 review; must stay in sync per that review finding)

### AC-5: Wage-Rule Validation

**Given** the `validateWageRule(employee: Employee): WageRuleResult` function in `multi-state.ts`,
**When** called with any employee:
- If `employee.basicSalaryPaise >= employee.ctcAnnualPaise / 12 / 2` → `{ compliant: true, basicPct: N, requiredPct: 50, gapPaise: 0 }`
- If basic < 50% → `{ compliant: false, basicPct: N, requiredPct: 50, gapPaise: <shortfall> }`

### AC-6: Multi-State Demo in payslip.html

**Given** `app/payslip.html`,
**When** I open it in a browser,
**Then** a "Multi-State Demo" section shows 3 employee buttons (Maharashtra / Tamil Nadu / Karnataka); clicking one:
- Re-renders the payslip for that jurisdiction's mock employee
- Shows the correct PT label and PT amount for that state
- Shows the wage-rule compliance badge (compliant ✓ or violation ✗)
- Appends an audit log entry if jurisdiction differs from previously selected (simulating AC-2)

### AC-7: Test Coverage

All tests in `src/domain/compliance/multi-state.test.ts`:
- `resolveRuleSet('TG', '2025-04', PT)` returns a non-null rule
- `compute(mhEmployee, period, rules)` vs `compute(tnEmployee, period, rules)` → different `ptPaise` values for same gross
- `compute(kaEmployee, period, rules)` → KA-correct PT (₹200/month for gross ₹50k)
- `compute(dlEmployee, period, rules)` → `ptPaise === 0`, `appliedRules.pt` is `'pt-dl-2025-04'`
- `generatePayslipHTML` for TN employee → PT row shows "Professional Tax (Tamil Nadu)"
- `generatePayslipHTML` for GJ employee → PT row absent
- `validateWageRule` compliant case (basic = 50% CTC/12)
- `validateWageRule` violation case (basic = 40% CTC/12) → correct gap amount
- `recordJurisdictionChange(...)` → returns record with all fields; original objects not mutated

---

## Dev Notes

### Critical Context from Previous Stories

**DO NOT MODIFY** (frozen by previous stories):
- `src/domain/compliance/calculator.ts` — `compute()` pure function; story 2-2. Already handles multi-state correctly via `resolveRulesForPeriod(jurisdiction, period)` → `resolveRuleSet(jurisdiction, period, PT)`.
- `src/domain/compliance/types.ts` — `Jurisdiction` type (15 state codes) and `ComplianceRuleSet` interface; story 2-1.

**EXTEND, don't rewrite** (story 2-3 files, small targeted changes only):
- `src/domain/compliance/rules-store.ts` — ADD new rule seed constants + update `_rules` array + update `_resetStore()`. Existing rules must NOT be mutated.
- `src/domain/compliance/payslip.ts` — ONLY change: remove GJ/PB from PT_LABEL, add to PT_NOT_APPLICABLE. No other changes.
- `app/payslip.html` — ADD multi-state demo section and sync PT_LABEL/PT_NOT_APPLICABLE maps. Do NOT touch existing payslip render logic.

### Exact Jurisdiction Type Union (from types.ts:20-35)

```typescript
export type Jurisdiction =
  | "IN" | "MH" | "TN" | "KA" | "DL" | "TG" | "KL" | "GJ"
  | "RJ" | "UP" | "WB" | "AP" | "HR" | "MP" | "PB";
```

15 codes. "IN" is used only for PF/ESI/TDS (national). PT rules are per state code.

### PT Rules Already Seeded (rules-store.ts, story 2-1)

| Rule ID           | Jurisdiction | Status     |
|-------------------|--------------|------------|
| `pt-mh-2025-04`   | MH           | ✓ seeded   |
| `pt-tn-2025-04`   | TN           | ✓ seeded   |
| `pt-ka-2025-04`   | KA           | ✓ seeded   |
| `pt-dl-2025-04`   | DL           | ✓ seeded (not_applicable) |

### PT Rules to Seed in rules-store.ts (story 2-4 adds these)

All use `effectiveFrom: "2025-04"`, `effectiveTo: null`, `version: 1`.

**PT_TG_2025** — Telangana (levies PT):
```typescript
{
  id: "pt-tg-2025-04", ruleType: RuleType.PT, jurisdiction: "TG",
  effectiveFrom: "2025-04", effectiveTo: null, version: 1,
  params: {
    slabs: [
      { from_paise: 0,         to_paise: 1_500_000,  monthly_paise: 0      },
      { from_paise: 1_500_001, to_paise: 2_000_000,  monthly_paise: 15_000 },
      { from_paise: 2_000_001, to_paise: null,        monthly_paise: 20_000 },
    ],
    annual_cap_paise: 250_000,
  },
  createdAt: "2025-04-01T00:00:00Z",
}
```

**PT_KL_2025** — Kerala (levies PT, higher slabs):
```typescript
{
  id: "pt-kl-2025-04", ruleType: RuleType.PT, jurisdiction: "KL",
  effectiveFrom: "2025-04", effectiveTo: null, version: 1,
  params: {
    slabs: [
      { from_paise: 0,           to_paise: 1_199_900,   monthly_paise: 0       },
      { from_paise: 1_200_000,   to_paise: 1_799_900,   monthly_paise: 12_000  },
      { from_paise: 1_800_000,   to_paise: 2_999_900,   monthly_paise: 18_000  },
      { from_paise: 3_000_000,   to_paise: 4_499_900,   monthly_paise: 30_000  },
      { from_paise: 4_500_000,   to_paise: 5_999_900,   monthly_paise: 45_000  },
      { from_paise: 6_000_000,   to_paise: 7_499_900,   monthly_paise: 60_000  },
      { from_paise: 7_500_000,   to_paise: 9_999_900,   monthly_paise: 75_000  },
      { from_paise: 10_000_000,  to_paise: null,         monthly_paise: 125_000 },
    ],
  },
  createdAt: "2025-04-01T00:00:00Z",
}
```

**PT_WB_2025** — West Bengal (levies PT):
```typescript
{
  id: "pt-wb-2025-04", ruleType: RuleType.PT, jurisdiction: "WB",
  effectiveFrom: "2025-04", effectiveTo: null, version: 1,
  params: {
    slabs: [
      { from_paise: 0,           to_paise: 1_000_000,  monthly_paise: 0      },
      { from_paise: 1_000_001,   to_paise: 1_500_000,  monthly_paise: 11_000 },
      { from_paise: 1_500_001,   to_paise: 2_500_000,  monthly_paise: 13_000 },
      { from_paise: 2_500_001,   to_paise: 4_000_000,  monthly_paise: 15_000 },
      { from_paise: 4_000_001,   to_paise: null,        monthly_paise: 20_000 },
    ],
  },
  createdAt: "2025-04-01T00:00:00Z",
}
```

**PT_AP_2025** — Andhra Pradesh (levies PT):
```typescript
{
  id: "pt-ap-2025-04", ruleType: RuleType.PT, jurisdiction: "AP",
  effectiveFrom: "2025-04", effectiveTo: null, version: 1,
  params: {
    slabs: [
      { from_paise: 0,           to_paise: 1_500_000,  monthly_paise: 0      },
      { from_paise: 1_500_001,   to_paise: 2_000_000,  monthly_paise: 15_000 },
      { from_paise: 2_000_001,   to_paise: null,        monthly_paise: 20_000 },
    ],
  },
  createdAt: "2025-04-01T00:00:00Z",
}
```

**PT_MP_2025** — Madhya Pradesh (levies PT):
```typescript
{
  id: "pt-mp-2025-04", ruleType: RuleType.PT, jurisdiction: "MP",
  effectiveFrom: "2025-04", effectiveTo: null, version: 1,
  params: {
    slabs: [
      { from_paise: 0,           to_paise: 1_875_000,  monthly_paise: 0      },
      { from_paise: 1_875_001,   to_paise: 2_500_000,  monthly_paise: 12_500 },
      { from_paise: 2_500_001,   to_paise: null,        monthly_paise: 20_800 },
    ],
  },
  createdAt: "2025-04-01T00:00:00Z",
}
```

**Not-applicable rules** — for GJ, PB, RJ, UP, HR (pattern identical to DL):
```typescript
// One constant per state, using the same not_applicable: true pattern as PT_DL_2025
{ id: "pt-gj-2025-04", jurisdiction: "GJ", params: { not_applicable: true, slabs: [] }, ... }
{ id: "pt-pb-2025-04", jurisdiction: "PB", params: { not_applicable: true, slabs: [] }, ... }
{ id: "pt-rj-2025-04", jurisdiction: "RJ", params: { not_applicable: true, slabs: [] }, ... }
{ id: "pt-up-2025-04", jurisdiction: "UP", params: { not_applicable: true, slabs: [] }, ... }
{ id: "pt-hr-2025-04", jurisdiction: "HR", params: { not_applicable: true, slabs: [] }, ... }
```

After adding all these, update `_rules` initializer AND `_resetStore()` to include them.

### payslip.ts — Two-Line Fix Required

Current state (story 2-3 output):
```typescript
const PT_LABEL: Partial<Record<Jurisdiction, string>> = {
  MH: ..., TN: ..., KA: ..., TG: ..., KL: ..., WB: ..., AP: ...,
  GJ: "Professional Tax (Gujarat)",   // ← REMOVE (GJ doesn't levy PT)
  MP: ...,
  PB: "Professional Tax (Punjab)",    // ← REMOVE (PB doesn't levy PT)
};

const PT_NOT_APPLICABLE: Jurisdiction[] = ["DL", "RJ", "UP", "HR"];
// ↑ Add "GJ" and "PB" here
```

After fix:
```typescript
const PT_LABEL: Partial<Record<Jurisdiction, string>> = {
  MH: "Professional Tax (Maharashtra)",
  TN: "Professional Tax (Tamil Nadu)",
  KA: "Professional Tax (Karnataka)",
  TG: "Professional Tax (Telangana)",
  KL: "Professional Tax (Kerala)",
  WB: "Professional Tax (West Bengal)",
  AP: "Professional Tax (Andhra Pradesh)",
  MP: "Professional Tax (Madhya Pradesh)",
};

const PT_NOT_APPLICABLE: Jurisdiction[] = ["DL", "RJ", "UP", "HR", "GJ", "PB"];
```

Apply the **identical change** to `app/payslip.html`'s inline `PT_LABEL` and `PT_NOT_APPLICABLE` JS objects (story 2-3 review finding: these two files must stay in sync).

### New Module: src/domain/compliance/multi-state.ts

Pure functions only. No I/O, no DOM, no side effects.

```typescript
import type { Employee } from "./calculator.js";
import type { Jurisdiction } from "./types.js";

// ── Wage-Rule Validation ──────────────────────────────────────────────────────

export interface WageRuleResult {
  compliant: boolean;
  basicPct: number;        // integer, e.g. 45 means 45%
  requiredPct: number;     // always 50 (national; no state has a different floor in scope)
  gapPaise: number;        // 0 if compliant; monthly shortfall if not
}

export function validateWageRule(employee: Employee): WageRuleResult {
  const monthlyCtcPaise = Math.floor(employee.ctcAnnualPaise / 12);
  const requiredBasicPaise = Math.floor(monthlyCtcPaise / 2);  // 50%
  const basicPct = monthlyCtcPaise > 0
    ? Math.floor((employee.basicSalaryPaise / monthlyCtcPaise) * 100)
    : 0;
  const compliant = employee.basicSalaryPaise >= requiredBasicPaise;
  const gapPaise = compliant ? 0 : requiredBasicPaise - employee.basicSalaryPaise;
  return { compliant, basicPct, requiredPct: 50, gapPaise };
}

// ── Jurisdiction Change Audit Record ─────────────────────────────────────────

export interface JurisdictionChangeRecord {
  readonly timestamp: string;            // ISO 8601
  readonly employeeId: string;
  readonly fromJurisdiction: Jurisdiction;
  readonly toJurisdiction: Jurisdiction;
  readonly actor: string;                // who initiated the change
  readonly periodAffected: string;       // 'YYYY-MM'
}

export function recordJurisdictionChange(
  employeeId: string,
  fromJurisdiction: Jurisdiction,
  toJurisdiction: Jurisdiction,
  actor: string,
  periodAffected: string,
  timestamp: string = new Date().toISOString()
): JurisdictionChangeRecord {
  return Object.freeze({
    timestamp,
    employeeId,
    fromJurisdiction,
    toJurisdiction,
    actor,
    periodAffected,
  });
}
```

Note: `timestamp` has a default so tests can pass a fixed value for determinism.

### Existing compute() Wiring — No Changes Needed

`calculator.ts:72-90` — `resolveRulesForPeriod(jurisdiction, period)` already calls `resolveRuleSet(jurisdiction, period, RuleType.PT)`. Once new rules are seeded, multi-state computation works automatically. **No changes to calculator.ts required.**

`calculator.ts:136-161` — `computePT(gross, month, ptRule)` already checks `ptRule.params["not_applicable"] === true` and returns 0. The `not_applicable` pattern used for DL is the same pattern new rules use.

### Mock Employees for Tests and Demo

Establish these three test fixtures in `multi-state.test.ts` (and reuse them in `payslip.html` demo):

```typescript
const PERIOD = { year: 2026, month: 6, periodString: "2026-06" };

// MH employee — existing MOCK_PAYSLIP basis (gross ₹50k → PT ₹200/month)
const EMP_MH: Employee = {
  employeeId: "EMP001", name: "Aditya Sharma", department: "Engineering",
  basicSalaryPaise: 2_500_000,   // ₹25,000 (50% of gross → compliant wage rule)
  grossSalaryPaise: 5_000_000,   // ₹50,000
  ctcAnnualPaise: 70_000_000,    // ₹7,00,000 (monthly ₹58,333; basic 43% → violation)
  jurisdiction: "MH", pfOptOut: false, esiApplicable: false,
};

// TN employee — same salary profile, different PT outcome (₹1,250/month for gross > ₹75k → N/A; ₹1,025/month for ₹60k-75k → N/A; ₹690/month for ₹45k-60k → applicable here)
const EMP_TN: Employee = {
  employeeId: "EMP002", name: "Kavitha Raman", department: "Finance",
  basicSalaryPaise: 2_500_000, grossSalaryPaise: 5_000_000,
  ctcAnnualPaise: 70_000_000, jurisdiction: "TN", pfOptOut: false, esiApplicable: false,
};

// KA employee — same gross; KA rate for ₹35k+ is ₹200/month
const EMP_KA: Employee = {
  employeeId: "EMP003", name: "Suresh Hegde", department: "Operations",
  basicSalaryPaise: 2_500_000, grossSalaryPaise: 5_000_000,
  ctcAnnualPaise: 70_000_000, jurisdiction: "KA", pfOptOut: false, esiApplicable: false,
};
```

Expected PT outputs for gross ₹50,000 (5_000_000 paise), month 6:
- MH: `ptPaise = 20_000` (₹200, slab ₹10,001+)
- TN: `ptPaise = 69_000` (₹690, slab ₹45,001–60,000)
- KA: `ptPaise = 20_000` (₹200, slab ₹35,001+)
- DL: `ptPaise = 0` (not_applicable)

### app/payslip.html — Multi-State Demo Section

Add below the existing Print button and above the payslip container. Vanilla JS only, no libraries.

**Demo UI structure (add to HTML body):**
```html
<div class="demo-bar no-print">
  <span class="demo-label">Multi-State Demo:</span>
  <button onclick="switchState('MH')" id="btn-MH" class="state-btn active">Maharashtra</button>
  <button onclick="switchState('TN')" id="btn-TN" class="state-btn">Tamil Nadu</button>
  <button onclick="switchState('KA')" id="btn-KA" class="state-btn">Karnataka</button>
</div>

<div id="wageRuleStatus" class="wage-badge no-print"></div>
<div id="auditLog" class="audit-log no-print"></div>
```

**Demo JS logic (in the page's `<script>` block):**
```javascript
// Three mock employees for the demo
const DEMO_EMPLOYEES = { MH: {...}, TN: {...}, KA: {...} }; // use same values as test fixtures

let currentState = null;

function switchState(jurisdiction) {
  const newPayslip = buildDemoPayslip(DEMO_EMPLOYEES[jurisdiction]);
  renderPayslip(newPayslip);

  // Wage rule badge
  const wr = validateWageRule(DEMO_EMPLOYEES[jurisdiction]);
  document.getElementById('wageRuleStatus').innerHTML = wr.compliant
    ? '<span class="badge-ok">✓ Wage Rule: Compliant</span>'
    : `<span class="badge-warn">✗ Wage Rule: Basic ${wr.basicPct}% < 50% (gap ₹${formatPaise(wr.gapPaise)})</span>`;

  // Audit log entry if jurisdiction changed
  if (currentState && currentState !== jurisdiction) {
    appendAuditEntry(currentState, jurisdiction);
  }
  currentState = jurisdiction;

  // Update active button styles
  document.querySelectorAll('.state-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`btn-${jurisdiction}`).classList.add('active');
}
```

The `buildDemoPayslip(employee)` function in `payslip.html` should:
1. Use the JavaScript-port of `resolveRulesForPeriod` and `compute` (already embedded in the page from story 2-3's `completePayrollRun` logic) OR build mock `StatutoryOutputs` directly with hardcoded expected values for the three states.

**Simpler approach** (avoid duplicating the full TypeScript calculator in the JS page): hardcode the three expected `StatutoryOutputs` objects in the demo payslip fixtures. The TypeScript `compute()` tests already validate the math — the demo just needs to render correctly.

Hardcoded expected PT values for demo gross ₹50,000/month:
- MH: `ptPaise: 20_000`
- TN: `ptPaise: 69_000`
- KA: `ptPaise: 20_000`

The `totalDeductionsPaise` and `netPayPaise` must be re-computed consistently from the PT values (don't let them drift).

### XSS Guardrail

Story 2-3 added `escHtml()` in `payslip.ts` (line 401-408). All user-controlled strings passed to `generatePayslipHTML` are already escaped. Multi-state mock data is fully hardcoded — no user input involved. No new XSS surface.

For the `payslip.html` demo, the `appendAuditEntry()` function uses string concatenation to build log HTML. Use `escHtml()` (already inline in `payslip.html`) on jurisdiction codes before inserting, even though they're hardcoded enum values.

### Testing Setup

- Tests file: `src/domain/compliance/multi-state.test.ts`
- Jest is already configured (`jest.config.js` at root). Run: `npm test` or `npx jest multi-state`
- Follow existing pattern in `calculator.test.ts` and `payslip.test.ts` — `describe`/`it` blocks, no `beforeAll`
- Import `_resetStore` from `rules-store.ts` and call it in `beforeEach` to ensure tests are isolated (story 2-1 established this pattern)

### File Summary

| File | Action | What Changes |
|------|--------|-------------|
| `src/domain/compliance/rules-store.ts` | MODIFY | Add 10 new PT rule constants (TG, KL, WB, AP, MP, GJ, PB, RJ, UP, HR); update `_rules` and `_resetStore()` |
| `src/domain/compliance/payslip.ts` | MODIFY | Remove GJ/PB from PT_LABEL; add GJ/PB to PT_NOT_APPLICABLE |
| `src/domain/compliance/multi-state.ts` | NEW | `WageRuleResult`, `validateWageRule()`, `JurisdictionChangeRecord`, `recordJurisdictionChange()` |
| `src/domain/compliance/multi-state.test.ts` | NEW | 9 tests covering AC-1 through AC-2 (compute + render + wage-rule + audit) |
| `app/payslip.html` | MODIFY | Sync PT_LABEL/PT_NOT_APPLICABLE; add multi-state demo bar, wage badge, audit log |

### References

- Epic 2, Story 2.4: `_bmad-output/planning-artifacts/epics.md:689-705`
- Jurisdiction type: `src/domain/compliance/types.ts:20-35`
- computePT / not_applicable pattern: `src/domain/compliance/calculator.ts:136-161`
- resolveRulesForPeriod: `src/domain/compliance/calculator.ts:72-90`
- Current PT rules seed: `src/domain/compliance/rules-store.ts:94-207`
- PT_LABEL / PT_NOT_APPLICABLE in payslip.ts: `src/domain/compliance/payslip.ts:59-73`
- Story 2-3 review finding (MP/PB drift): `2-3-payslip-rendering-statutory-outputs-to-pdf-display.md:346`
- NFR-5 Multi-state correctness: `_bmad-output/planning-artifacts/prds/prd-payroll-webapp-2026-06-09/prd.md`

---

## Tasks / Subtasks

- [x] Extend `src/domain/compliance/rules-store.ts` (AC: 3)
  - [x] Add PT_TG_2025 constant with Telangana slabs
  - [x] Add PT_KL_2025 constant with Kerala slabs
  - [x] Add PT_WB_2025 constant with West Bengal slabs
  - [x] Add PT_AP_2025 constant with Andhra Pradesh slabs
  - [x] Add PT_MP_2025 constant with Madhya Pradesh slabs
  - [x] Add PT_GJ_2025, PT_PB_2025, PT_RJ_2025, PT_UP_2025, PT_HR_2025 constants (all `not_applicable: true`)
  - [x] Update `_rules` initializer array to include all 10 new rules
  - [x] Update `_resetStore()` to include all 10 new rules

- [x] Fix `src/domain/compliance/payslip.ts` (AC: 4)
  - [x] Remove "GJ" and "PB" entries from PT_LABEL
  - [x] Add "GJ" and "PB" to PT_NOT_APPLICABLE array

- [x] Create `src/domain/compliance/multi-state.ts` (AC: 5, 2)
  - [x] Define `WageRuleResult` interface
  - [x] Implement `validateWageRule(employee: Employee): WageRuleResult`
  - [x] Define `JurisdictionChangeRecord` interface (all fields `readonly`)
  - [x] Implement `recordJurisdictionChange(...)` — pure function, returns `Object.freeze({...})`

- [x] Create `src/domain/compliance/multi-state.test.ts` (AC: 7)
  - [x] Test: `resolveRuleSet('TG', '2025-04', PT)` returns non-null rule
  - [x] Test: MH vs TN — same employee, same gross, different ptPaise (20_000 vs 69_000)
  - [x] Test: KA — ptPaise = 20_000 for gross ₹50k
  - [x] Test: DL — ptPaise = 0, appliedRules.pt = 'pt-dl-2025-04'
  - [x] Test: `generatePayslipHTML(tnPayslip)` includes "Professional Tax (Tamil Nadu)"
  - [x] Test: `generatePayslipHTML(gjPayslip)` does NOT include "Professional Tax" row
  - [x] Test: `validateWageRule(compliantEmployee)` → `{ compliant: true, gapPaise: 0 }`
  - [x] Test: `validateWageRule(violatingEmployee)` → `{ compliant: false, gapPaise: <correct value> }`
  - [x] Test: `recordJurisdictionChange(...)` → correct fields; result is frozen

- [x] Modify `app/payslip.html` (AC: 4, 6)
  - [x] Sync PT_LABEL — remove GJ/PB (match payslip.ts fix above)
  - [x] Sync PT_NOT_APPLICABLE — add GJ/PB (match payslip.ts fix above)
  - [x] Add 3 demo employee mock payslip fixtures (MH/TN/KA) with correct PT values
  - [x] Add `validateWageRule` JS implementation (port from multi-state.ts, no import)
  - [x] Add `appendAuditEntry` function and audit log `<div>` (escHtml all dynamic values)
  - [x] Add `switchState(jurisdiction)` function, demo bar buttons, wage badge element
  - [x] Verify `@media print` hides `.no-print` — demo bar / badge / audit log must be `no-print`

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Seeded 10 new PT rules in `rules-store.ts`: 5 active-levy states (TG, KL, WB, AP, MP) and 5 not-applicable states (GJ, PB, RJ, UP, HR). `_rules` initializer and `_resetStore()` both updated.
- Fixed `payslip.ts` PT_LABEL/PT_NOT_APPLICABLE sync issue from story 2-3 review: GJ and PB removed from PT_LABEL, added to PT_NOT_APPLICABLE.
- Created `multi-state.ts` with pure `validateWageRule()` and `recordJurisdictionChange()` functions. `recordJurisdictionChange` returns `Object.freeze({...})` for immutability. Default `timestamp` parameter enables deterministic tests.
- Created `multi-state.test.ts` with 9 tests covering all AC-7 requirements. All 9 pass; full suite 188 tests pass with no regressions.
- Added Multi-State Demo bar to `payslip.html`: 3 state buttons (MH/TN/KA), wage-rule badge, audit log with `escHtml` guards, `switchState()` function. PT_LABEL/PT_NOT_APPLICABLE in payslip.html now in sync with payslip.ts. `@media print` `.no-print` rule already existed and covers all new demo elements. Visually verified at 1440×900 and 375×812.

### File List

- `src/domain/compliance/rules-store.ts` — modified
- `src/domain/compliance/payslip.ts` — modified
- `src/domain/compliance/multi-state.ts` — created
- `src/domain/compliance/multi-state.test.ts` — created
- `app/payslip.html` — modified

## Change Log

- 2026-06-11: Implemented story 2.4 — seeded 10 new PT rules (TG/KL/WB/AP/MP active; GJ/PB/RJ/UP/HR not-applicable), fixed GJ/PB PT_LABEL drift in payslip.ts and payslip.html, created multi-state.ts pure module with wage-rule validation and jurisdiction-change audit, created multi-state.test.ts (9 tests), added Multi-State Demo section to payslip.html.
