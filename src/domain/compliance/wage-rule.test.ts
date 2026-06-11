import { scanWageRuleCompliance, simulateRestructuring, createRestructuringChangeset } from "./wage-rule.js";
import type { Employee, PayrollPeriod } from "./calculator.js";
import { resolveRulesForPeriod } from "./calculator.js";
import { _resetStore } from "./rules-store.js";

const JUN_2026: PayrollPeriod = { year: 2026, month: 6, periodString: "2026-06" };

// Fixtures mirror the EMP_MH/EMP_TN/EMP_KA style in multi-state.test.ts.
// Compliant baseline: monthly CTC ₹50,000 (ctcAnnualPaise 60_000_000), basic at/above 50%.

// Exactly 50%: basic ₹25,000 (2_500_000) of monthly ₹50,000 → compliant boundary.
const EMP_50PCT: Employee = {
  employeeId: "EMP050",
  name: "Boundary Basu",
  department: "Engineering",
  basicSalaryPaise: 2_500_000,
  grossSalaryPaise: 4_000_000,
  ctcAnnualPaise: 60_000_000,
  jurisdiction: "MH",
  pfOptOut: false,
  esiApplicable: false,
};

// 60% basic → clearly compliant.
const EMP_60PCT: Employee = {
  employeeId: "EMP060",
  name: "Compliant Chetan",
  department: "Finance",
  basicSalaryPaise: 3_000_000,
  grossSalaryPaise: 4_500_000,
  ctcAnnualPaise: 60_000_000,
  jurisdiction: "TN",
  pfOptOut: false,
  esiApplicable: false,
};

// 70% basic → clearly compliant.
const EMP_70PCT: Employee = {
  employeeId: "EMP070",
  name: "Healthy Hema",
  department: "Operations",
  basicSalaryPaise: 3_500_000,
  grossSalaryPaise: 4_800_000,
  ctcAnnualPaise: 60_000_000,
  jurisdiction: "KA",
  pfOptOut: false,
  esiApplicable: false,
};

// 45% basic → violation. monthly CTC ₹50,000, basic ₹22,500 → gap to 50% (₹25,000) = ₹2,500 = 250_000 paise.
const EMP_45PCT: Employee = {
  employeeId: "EMP045",
  name: "Violator Vikram",
  department: "Sales",
  basicSalaryPaise: 2_250_000,
  grossSalaryPaise: 4_000_000,
  ctcAnnualPaise: 60_000_000,
  jurisdiction: "DL",
  pfOptOut: false,
  esiApplicable: false,
};

// 40% basic → violation. basic ₹20,000 → gap to ₹25,000 = ₹5,000 = 500_000 paise.
const EMP_40PCT: Employee = {
  employeeId: "EMP040",
  name: "Lowball Lata",
  department: "Support",
  basicSalaryPaise: 2_000_000,
  grossSalaryPaise: 3_800_000,
  ctcAnnualPaise: 60_000_000,
  jurisdiction: "HR",
  pfOptOut: false,
  esiApplicable: false,
};

describe("scanWageRuleCompliance", () => {
  // AC-4: Empty roster
  it("returns all-zero result for an empty roster, without throwing", () => {
    expect(scanWageRuleCompliance([])).toEqual({
      compliantCount: 0,
      nonCompliantCount: 0,
      violations: [],
    });
  });

  // AC-1: all-compliant
  it("flags nothing for an all-compliant roster", () => {
    const result = scanWageRuleCompliance([EMP_50PCT, EMP_60PCT, EMP_70PCT]);
    expect(result.compliantCount).toBe(3);
    expect(result.nonCompliantCount).toBe(0);
    expect(result.violations).toEqual([]);
  });

  // AC-1: mixed roster, aggregate counts
  it("returns correct counts for a mixed roster (3 compliant + 2 violating)", () => {
    const roster = [EMP_50PCT, EMP_45PCT, EMP_60PCT, EMP_40PCT, EMP_70PCT];
    const result = scanWageRuleCompliance(roster);
    expect(result.compliantCount).toBe(3);
    expect(result.nonCompliantCount).toBe(2);
    expect(result.violations).toHaveLength(2);
    expect(result.compliantCount + result.nonCompliantCount).toBe(roster.length);
    expect(result.violations).toHaveLength(result.nonCompliantCount);
  });

  // AC-2: per-violation detail
  it("produces correct per-violation detail for a 45%-basic employee", () => {
    const result = scanWageRuleCompliance([EMP_45PCT]);
    expect(result.violations[0]).toEqual({
      employeeId: "EMP045",
      employeeName: "Violator Vikram",
      currentBasicPct: 45,
      requiredBasicPct: 50,
      gapPaise: 250_000,
    });
  });

  // AC-3: exactly-50% boundary is compliant
  it("treats an employee at exactly 50% as compliant (>=), not a violation", () => {
    const result = scanWageRuleCompliance([EMP_50PCT]);
    expect(result.compliantCount).toBe(1);
    expect(result.nonCompliantCount).toBe(0);
    expect(result.violations).toEqual([]);
  });

  // AC-1: violations preserve input order
  it("preserves input order in the violations array", () => {
    const roster = [EMP_40PCT, EMP_60PCT, EMP_45PCT];
    const result = scanWageRuleCompliance(roster);
    expect(result.violations.map((v) => v.employeeId)).toEqual(["EMP040", "EMP045"]);
  });

  // AC-1: input immutability
  it("does not mutate the input array or its (frozen) employee objects", () => {
    const frozenEmp = Object.freeze({ ...EMP_45PCT });
    const roster = Object.freeze([frozenEmp]) as readonly Employee[];
    expect(() => scanWageRuleCompliance(roster as Employee[])).not.toThrow();
    // Original fixture untouched.
    expect(EMP_45PCT.basicSalaryPaise).toBe(2_250_000);
    expect(frozenEmp).toEqual(EMP_45PCT);
  });
});

// ============================================================================
// simulateRestructuring — Story 3.2
// ============================================================================
//
// Tests use _resetStore() + resolveRulesForPeriod() exactly like calculator.test.ts.
// FY 2025-26 seed: PF cap 1_500_000 paise (₹15,000), employee rate 12%.
//
// Key maths:
//   PF = floor(min(basic, 1_500_000) × 1200 / 10_000)
//   Gratuity monthly accrual = floor(basic × 15 / 312)
//   Take-home delta = −PF delta  (ESI / TDS / PT are gross-based, unchanged)

describe("simulateRestructuring", () => {
  beforeEach(() => {
    _resetStore();
  });

  // AC-7 / scenario: basic below the ₹15,000 PF cap both before and after the raise.
  // EMP_BC: monthly CTC ₹30,000 → required basic ₹15,000 (1_500_000 paise).
  // Current basic: ₹12,000 (1_200_000). Proposed: ₹15,000 (1_500_000) — exactly 50%.
  // Current PF:  floor(1_200_000 × 1200 / 10_000) = 144_000 paise
  // Proposed PF: floor(1_500_000 × 1200 / 10_000) = 180_000 paise
  // delta PF = +36_000; delta net = −36_000
  const EMP_BC: Employee = {
    employeeId: "EMP_BC",
    name: "Below Cap",
    basicSalaryPaise: 1_200_000,  // ₹12,000 → 40% of monthly ₹30,000
    grossSalaryPaise: 2_000_000,  // ₹20,000 (≤ ESI ceiling → ESI applies)
    ctcAnnualPaise:   36_000_000, // ₹3L annual → monthly CTC ₹30,000
    jurisdiction: "DL",           // Delhi has no PT
    pfOptOut: false,
    esiApplicable: true,
  };

  // AC-7 / scenario: basic already above the PF cap before and after the raise.
  // EMP_AC: current basic ₹20,000 → proposed ₹20,000 (same) — delta = 0.
  // Separate straddle test handles the cap-crossing case.
  const EMP_AC: Employee = {
    employeeId: "EMP_AC",
    name: "Above Cap",
    basicSalaryPaise: 2_000_000,  // ₹20,000 → 41.7% of monthly ₹40,000
    grossSalaryPaise: 4_000_000,  // ₹40,000 (> ESI ceiling → ESI = 0)
    ctcAnnualPaise:   48_000_000, // ₹4.8L annual → monthly CTC ₹40,000
    jurisdiction: "MH",
    pfOptOut: false,
    esiApplicable: false,
  };

  // PF opt-out employee — PF delta is always 0; gratuity delta still non-zero.
  const EMP_OPTOUT: Employee = {
    employeeId: "EMP_OO",
    name: "Optout Olu",
    basicSalaryPaise: 1_200_000,
    grossSalaryPaise: 2_500_000,
    ctcAnnualPaise:   36_000_000,
    jurisdiction: "TN",
    pfOptOut: true,
    esiApplicable: true,
  };

  it("below-cap raise: PF delta = +36,000p, net delta = −36,000p", () => {
    const rules = resolveRulesForPeriod("DL", JUN_2026);
    const impact = simulateRestructuring(EMP_BC, 1_500_000, JUN_2026, rules);
    expect(impact.currentPfEmployeePaise).toBe(144_000);
    expect(impact.proposedPfEmployeePaise).toBe(180_000);
    expect(impact.deltaPfEmployeePaise).toBe(36_000);
    expect(impact.deltaNetPayPaise).toBe(-36_000);
  });

  it("above-cap employee with same proposed basic: all deltas = 0", () => {
    const rules = resolveRulesForPeriod("MH", JUN_2026);
    // Proposed = current (both above cap) → zero impact
    const impact = simulateRestructuring(EMP_AC, EMP_AC.basicSalaryPaise, JUN_2026, rules);
    expect(impact.deltaPfEmployeePaise).toBe(0);
    expect(impact.deltaNetPayPaise).toBe(0);
    expect(impact.deltaMonthlyGratuityAccrualPaise).toBe(0);
  });

  it("current below cap, proposed above cap: PF clamped to cap, delta = +36,000p", () => {
    // Current basic ₹12,000 (below cap); proposed ₹20,000 (above cap).
    // Current PF: floor(1_200_000 × 1200 / 10_000) = 144_000
    // Proposed PF: floor(min(2_000_000, 1_500_000) × 1200 / 10_000) = 180_000 (capped at ₹15k)
    // delta PF = +36_000. Note: "below-cap raise" test covers proposed = cap exactly (1_500_000).
    const rules = resolveRulesForPeriod("DL", JUN_2026);
    const impact = simulateRestructuring(EMP_BC, 2_000_000, JUN_2026, rules);
    expect(impact.proposedPfEmployeePaise).toBe(180_000); // capped
    expect(impact.deltaPfEmployeePaise).toBe(36_000);
    expect(impact.deltaNetPayPaise).toBe(-36_000);
  });

  it("PF opt-out: PF delta = 0, gratuity delta is non-zero", () => {
    const rules = resolveRulesForPeriod("TN", JUN_2026);
    // Proposed: 1_500_000 (50% of monthly ₹30,000)
    const impact = simulateRestructuring(EMP_OPTOUT, 1_500_000, JUN_2026, rules);
    expect(impact.deltaPfEmployeePaise).toBe(0);
    expect(impact.currentPfEmployeePaise).toBe(0);
    expect(impact.proposedPfEmployeePaise).toBe(0);
    // Gratuity: floor(1_500_000 × 15 / 312) − floor(1_200_000 × 15 / 312)
    //         = floor(22_500_000 / 312) − floor(18_000_000 / 312)
    //         = 72_115 − 57_692 = 14_423
    expect(impact.deltaMonthlyGratuityAccrualPaise).toBe(14_423);
  });

  it("proposed == current: all deltas are exactly 0", () => {
    const rules = resolveRulesForPeriod("MH", JUN_2026);
    const impact = simulateRestructuring(EMP_AC, EMP_AC.basicSalaryPaise, JUN_2026, rules);
    expect(impact.deltaPfEmployeePaise).toBe(0);
    expect(impact.deltaNetPayPaise).toBe(0);
    expect(impact.deltaMonthlyGratuityAccrualPaise).toBe(0);
  });

  it("employeeId and employeeName pass through verbatim from employee", () => {
    const rules = resolveRulesForPeriod("DL", JUN_2026);
    const impact = simulateRestructuring(EMP_BC, 1_500_000, JUN_2026, rules);
    expect(impact.employeeId).toBe("EMP_BC");
    expect(impact.employeeName).toBe("Below Cap");
  });

  it("throws RangeError if proposedBasicPaise is zero or negative", () => {
    const rules = resolveRulesForPeriod("DL", JUN_2026);
    expect(() => simulateRestructuring(EMP_BC, 0, JUN_2026, rules)).toThrow(RangeError);
    expect(() => simulateRestructuring(EMP_BC, -1, JUN_2026, rules)).toThrow(RangeError);
  });

  it("throws RangeError if proposedBasicPaise exceeds employee gross salary", () => {
    // EMP_BC.grossSalaryPaise = 2_000_000
    const rules = resolveRulesForPeriod("DL", JUN_2026);
    expect(() => simulateRestructuring(EMP_BC, 2_000_001, JUN_2026, rules)).toThrow(RangeError);
  });
});

// ============================================================================
// createRestructuringChangeset — Story 3.3
// ============================================================================

describe("createRestructuringChangeset", () => {
  beforeEach(() => {
    _resetStore();
  });

  // Inline impact fixtures — no need for full Employee + compute() roundtrip.
  const IMPACT_A = {
    employeeId: "EMP_BC",
    employeeName: "Below Cap",
    currentBasicPaise: 1_200_000,
    proposedBasicPaise: 1_500_000,
    currentPfEmployeePaise: 144_000,
    proposedPfEmployeePaise: 180_000,
    currentNetPayPaise: 1_700_000,
    proposedNetPayPaise: 1_664_000,
    currentMonthlyGratuityAccrualPaise: 57_692,
    proposedMonthlyGratuityAccrualPaise: 72_115,
    deltaNetPayPaise: -36_000,
    deltaPfEmployeePaise: 36_000,
    deltaMonthlyGratuityAccrualPaise: 14_423,
  };

  const IMPACT_B = {
    employeeId: "EMP_AC",
    employeeName: "Above Cap",
    currentBasicPaise: 2_000_000,
    proposedBasicPaise: 2_500_000,
    currentPfEmployeePaise: 180_000,
    proposedPfEmployeePaise: 180_000,
    currentNetPayPaise: 3_820_000,
    proposedNetPayPaise: 3_820_000,
    currentMonthlyGratuityAccrualPaise: 96_153,
    proposedMonthlyGratuityAccrualPaise: 120_192,
    deltaNetPayPaise: 0,
    deltaPfEmployeePaise: 0,
    deltaMonthlyGratuityAccrualPaise: 24_039,
  };

  it("empty input → returns empty array", () => {
    expect(createRestructuringChangeset([], "2026-07-01", "HR Manager")).toEqual([]);
  });

  it("single impact → all fields mapped correctly per AC-1", () => {
    const [rec] = createRestructuringChangeset([IMPACT_A], "2026-07-01", "HR Manager");
    expect(rec.employeeId).toBe("EMP_BC");
    expect(rec.employeeName).toBe("Below Cap");
    expect(rec.oldBasicPaise).toBe(1_200_000);
    expect(rec.newBasicPaise).toBe(1_500_000);
    expect(rec.deltaNetPayPaise).toBe(-36_000);
    expect(rec.deltaPfEmployeePaise).toBe(36_000);
    expect(rec.deltaMonthlyGratuityAccrualPaise).toBe(14_423);
    expect(rec.effectiveDate).toBe("2026-07-01");
    expect(rec.signatory).toBe("HR Manager");
    expect(rec.status).toBe("pending");
  });

  it("createdAt is a valid ISO timestamp string", () => {
    const [rec] = createRestructuringChangeset([IMPACT_A], "2026-07-01", "HR Manager");
    expect(rec.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("status is always 'pending'", () => {
    const records = createRestructuringChangeset([IMPACT_A, IMPACT_B], "2026-07-01", "HR Manager");
    records.forEach(r => expect(r.status).toBe("pending"));
  });

  it("multiple impacts → each becomes its own record, order preserved", () => {
    const records = createRestructuringChangeset([IMPACT_A, IMPACT_B], "2026-07-01", "HR Manager");
    expect(records).toHaveLength(2);
    expect(records[0].employeeId).toBe("EMP_BC");
    expect(records[1].employeeId).toBe("EMP_AC");
  });

  it("effectiveDate and signatory are verbatim from arguments, not from impact", () => {
    const [rec] = createRestructuringChangeset([IMPACT_A], "2026-08-01", "Finance Head");
    expect(rec.effectiveDate).toBe("2026-08-01");
    expect(rec.signatory).toBe("Finance Head");
  });

  it("oldBasicPaise = currentBasicPaise from impact, newBasicPaise = proposedBasicPaise", () => {
    const [rec] = createRestructuringChangeset([IMPACT_B], "2026-07-01", "HR Manager");
    expect(rec.oldBasicPaise).toBe(IMPACT_B.currentBasicPaise);
    expect(rec.newBasicPaise).toBe(IMPACT_B.proposedBasicPaise);
  });
});
