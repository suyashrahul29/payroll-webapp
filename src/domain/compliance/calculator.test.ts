/**
 * Tests for Pure Calculation Core — Statutory Computation (PF/ESI/TDS/PT)
 *
 * Covers story 2-2 acceptance criteria AC-1 through AC-6.
 */

import {
  compute,
  resolveRulesForPeriod,
  Employee,
  PayrollPeriod,
  StatutoryOutputs,
} from "./calculator.js";
import { _resetStore } from "./rules-store.js";

// ============================================================================
// HELPERS
// ============================================================================

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    employeeId: "emp-001",
    name: "Test Employee",
    basicSalaryPaise: 5_000_000,  // ₹50,000 basic
    grossSalaryPaise: 5_000_000,  // ₹50,000 gross
    ctcAnnualPaise: 60_000_000,   // ₹6,00,000 annual CTC
    jurisdiction: "MH",
    pfOptOut: false,
    esiApplicable: false,         // gross > ₹21,000, so ESI not applicable
    ...overrides,
  };
}

const JUN_2026: PayrollPeriod = { year: 2026, month: 6, periodString: "2026-06" };
const MAY_2025: PayrollPeriod = { year: 2025, month: 5, periodString: "2025-05" };
const FEB_2026: PayrollPeriod = { year: 2026, month: 2, periodString: "2026-02" };

beforeEach(() => {
  _resetStore();
});

// ============================================================================
// AC-1: Employee ₹50,000/month, Maharashtra, June 2026
// ============================================================================

describe("AC-1: ₹50,000/month, Maharashtra, June 2026", () => {
  let result: StatutoryOutputs;

  beforeEach(() => {
    const emp = makeEmployee();
    const rules = resolveRulesForPeriod("MH", JUN_2026);
    result = compute(emp, JUN_2026, rules);
  });

  test("PF employee = floor(min(5_000_000, 1_500_000) * 0.12) = 180,000 paise", () => {
    expect(result.pfEmployeePaise).toBe(180_000);
  });

  test("PF employer = 180,000 paise", () => {
    expect(result.pfEmployerPaise).toBe(180_000);
  });

  test("ESI employee = 0 (gross ₹50,000 > ₹21,000 ceiling)", () => {
    expect(result.esiEmployeePaise).toBe(0);
  });

  test("ESI employer = 0", () => {
    expect(result.esiEmployerPaise).toBe(0);
  });

  test("PT (MH, gross ₹50,000 > ₹10,000) = 20,000 paise (₹200)", () => {
    expect(result.ptPaise).toBe(20_000);
  });

  test("gross = 5,000,000 paise", () => {
    expect(result.grossPaise).toBe(5_000_000);
  });

  test("net pay = gross − PF_emp − ESI_emp − TDS − PT", () => {
    const expected =
      result.grossPaise -
      result.pfEmployeePaise -
      result.esiEmployeePaise -
      result.tdsPaise -
      result.ptPaise;
    expect(result.netPayPaise).toBe(expected);
  });

  test("totalDeductions = PF_emp + ESI_emp + TDS + PT", () => {
    expect(result.totalDeductionsPaise).toBe(
      result.pfEmployeePaise +
      result.esiEmployeePaise +
      result.tdsPaise +
      result.ptPaise
    );
  });

  test("appliedRules contains pf, esi, tds, pt ids", () => {
    expect(result.appliedRules.pf).toBe("pf-in-2025-04");
    expect(result.appliedRules.esi).toBe("esi-in-2025-04");
    expect(result.appliedRules.tds).toBe("tds-in-2025-04");
    expect(result.appliedRules.pt).toBe("pt-mh-2025-04");
  });
});

// ============================================================================
// AC-2: Same employee, Tamil Nadu — PT must differ from Maharashtra
// ============================================================================

describe("AC-2: ₹50,000/month, Tamil Nadu, June 2026", () => {
  let resultMH: StatutoryOutputs;
  let resultTN: StatutoryOutputs;

  beforeEach(() => {
    const empMH = makeEmployee({ jurisdiction: "MH" });
    const empTN = makeEmployee({ jurisdiction: "TN" });
    resultMH = compute(empMH, JUN_2026, resolveRulesForPeriod("MH", JUN_2026));
    resultTN = compute(empTN, JUN_2026, resolveRulesForPeriod("TN", JUN_2026));
  });

  test("TN PT is computed (non-negative)", () => {
    expect(resultTN.ptPaise).toBeGreaterThanOrEqual(0);
  });

  test("TN PT differs from MH PT for ₹50,000 gross", () => {
    // MH: ₹200  TN: ₹690 (₹45,001–60,000 slab)
    expect(resultTN.ptPaise).not.toBe(resultMH.ptPaise);
  });

  test("TN PT for ₹50,000 = 69,000 paise (₹690 — ₹45k–60k slab)", () => {
    expect(resultTN.ptPaise).toBe(69_000);
  });

  test("TN appliedRules.pt = pt-tn-2025-04", () => {
    expect(resultTN.appliedRules.pt).toBe("pt-tn-2025-04");
  });

  test("PF, ESI, TDS are identical between MH and TN", () => {
    expect(resultTN.pfEmployeePaise).toBe(resultMH.pfEmployeePaise);
    expect(resultTN.esiEmployeePaise).toBe(resultMH.esiEmployeePaise);
    expect(resultTN.tdsPaise).toBe(resultMH.tdsPaise);
  });
});

// ============================================================================
// AC-3: Historical period May 2025 — resolves correctly, no error
// ============================================================================

describe("AC-3: Historical period May 2025", () => {
  test("computes without error for May 2025", () => {
    const emp = makeEmployee();
    const rules = resolveRulesForPeriod("MH", MAY_2025);
    expect(() => compute(emp, MAY_2025, rules)).not.toThrow();
  });

  test("appliedRules reference the 2025 rule versions", () => {
    const emp = makeEmployee();
    const rules = resolveRulesForPeriod("MH", MAY_2025);
    const result = compute(emp, MAY_2025, rules);
    // Same seed rules cover both May 2025 and June 2026 (effectiveTo = null)
    expect(result.appliedRules.pf).toBe("pf-in-2025-04");
    expect(result.appliedRules.tds).toBe("tds-in-2025-04");
  });
});

// ============================================================================
// ESI applicability: Employee ₹15,000/month gross
// ============================================================================

describe("ESI: Employee ₹15,000/month (gross ≤ ₹21,000 threshold)", () => {
  let result: StatutoryOutputs;

  beforeEach(() => {
    const emp = makeEmployee({
      basicSalaryPaise: 1_200_000, // ₹12,000
      grossSalaryPaise: 1_500_000, // ₹15,000
      esiApplicable: true,
    });
    const rules = resolveRulesForPeriod("MH", JUN_2026);
    result = compute(emp, JUN_2026, rules);
  });

  test("esiEmployee = floor(1_500_000 * 75 / 10_000) = 11,250 paise", () => {
    expect(result.esiEmployeePaise).toBe(11_250);
  });

  test("esiEmployer = floor(1_500_000 * 325 / 10_000) = 48,750 paise", () => {
    expect(result.esiEmployerPaise).toBe(48_750);
  });
});

// ============================================================================
// PF opt-out
// ============================================================================

describe("PF opt-out", () => {
  test("PF employee and employer both = 0 when pfOptOut = true", () => {
    const emp = makeEmployee({ pfOptOut: true });
    const rules = resolveRulesForPeriod("MH", JUN_2026);
    const result = compute(emp, JUN_2026, rules);
    expect(result.pfEmployeePaise).toBe(0);
    expect(result.pfEmployerPaise).toBe(0);
  });
});

// ============================================================================
// February PT override (Maharashtra)
// ============================================================================

describe("February PT override — Maharashtra", () => {
  test("PT = 30,000 paise (₹300) for gross ₹50,000 in February", () => {
    const emp = makeEmployee({ jurisdiction: "MH" });
    const rules = resolveRulesForPeriod("MH", FEB_2026);
    const result = compute(emp, FEB_2026, rules);
    expect(result.ptPaise).toBe(30_000);
  });
});

// ============================================================================
// Delhi — no PT
// ============================================================================

describe("Delhi — no professional tax", () => {
  test("PT = 0 for Delhi jurisdiction", () => {
    const emp = makeEmployee({ jurisdiction: "DL" });
    const rules = resolveRulesForPeriod("DL", JUN_2026);
    const result = compute(emp, JUN_2026, rules);
    expect(result.ptPaise).toBe(0);
  });
});

// ============================================================================
// AC-5: Pure function — same inputs → identical outputs
// ============================================================================

describe("AC-5: Referential transparency", () => {
  test("calling compute twice with same inputs produces identical results", () => {
    const emp = makeEmployee();
    const rules = resolveRulesForPeriod("MH", JUN_2026);
    const r1 = compute(emp, JUN_2026, rules);
    const r2 = compute(emp, JUN_2026, rules);
    expect(r1).toEqual(r2);
  });
});

// ============================================================================
// AC-6: All output values are non-negative integers (no floats, no negative net)
// ============================================================================

describe("AC-6: Output type correctness", () => {
  const scenarios: Array<{ label: string; emp: Partial<Employee>; period: PayrollPeriod }> = [
    { label: "50k MH Jun 2026",  emp: { jurisdiction: "MH" }, period: JUN_2026 },
    { label: "50k TN Jun 2026",  emp: { jurisdiction: "TN" }, period: JUN_2026 },
    { label: "50k DL Jun 2026",  emp: { jurisdiction: "DL" }, period: JUN_2026 },
    { label: "50k MH May 2025",  emp: { jurisdiction: "MH" }, period: MAY_2025 },
    { label: "15k MH (ESI)",     emp: { jurisdiction: "MH", basicSalaryPaise: 1_200_000, grossSalaryPaise: 1_500_000 }, period: JUN_2026 },
    { label: "50k MH pfOptOut",  emp: { jurisdiction: "MH", pfOptOut: true }, period: JUN_2026 },
  ];

  const moneyFields: Array<keyof StatutoryOutputs> = [
    "grossPaise",
    "pfEmployeePaise",
    "pfEmployerPaise",
    "esiEmployeePaise",
    "esiEmployerPaise",
    "tdsPaise",
    "ptPaise",
    "totalDeductionsPaise",
    "netPayPaise",
  ];

  for (const { label, emp, period } of scenarios) {
    test(`${label}: all money fields are non-negative integers`, () => {
      const employee = makeEmployee(emp);
      const rules = resolveRulesForPeriod(employee.jurisdiction, period);
      const result = compute(employee, period, rules);

      for (const field of moneyFields) {
        const val = result[field] as number;
        expect(Number.isInteger(val)).toBe(true);
        expect(val).toBeGreaterThanOrEqual(0);
      }
    });
  }
});
