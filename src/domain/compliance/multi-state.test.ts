import { _resetStore, resolveRuleSet } from "./rules-store.js";
import { compute, resolveRulesForPeriod } from "./calculator.js";
import { generatePayslipHTML } from "./payslip.js";
import { validateWageRule, recordJurisdictionChange } from "./multi-state.js";
import { RuleType } from "./types.js";
import type { Employee, PayrollPeriod } from "./calculator.js";
import type { PayslipRecord } from "./payslip.js";

beforeEach(() => {
  _resetStore();
});

const PERIOD: PayrollPeriod = { year: 2026, month: 6, periodString: "2026-06" };

const EMP_MH: Employee = {
  employeeId: "EMP001",
  name: "Aditya Sharma",
  department: "Engineering",
  basicSalaryPaise: 2_500_000,
  grossSalaryPaise: 5_000_000,
  ctcAnnualPaise: 70_000_000,
  jurisdiction: "MH",
  pfOptOut: false,
  esiApplicable: false,
};

const EMP_TN: Employee = {
  employeeId: "EMP002",
  name: "Kavitha Raman",
  department: "Finance",
  basicSalaryPaise: 2_500_000,
  grossSalaryPaise: 5_000_000,
  ctcAnnualPaise: 70_000_000,
  jurisdiction: "TN",
  pfOptOut: false,
  esiApplicable: false,
};

const EMP_KA: Employee = {
  employeeId: "EMP003",
  name: "Suresh Hegde",
  department: "Operations",
  basicSalaryPaise: 2_500_000,
  grossSalaryPaise: 5_000_000,
  ctcAnnualPaise: 70_000_000,
  jurisdiction: "KA",
  pfOptOut: false,
  esiApplicable: false,
};

const EMP_DL: Employee = {
  employeeId: "EMP004",
  name: "Ravi Kapoor",
  department: "HR",
  basicSalaryPaise: 2_500_000,
  grossSalaryPaise: 5_000_000,
  ctcAnnualPaise: 70_000_000,
  jurisdiction: "DL",
  pfOptOut: false,
  esiApplicable: false,
};

const EMP_GJ: Employee = {
  employeeId: "EMP005",
  name: "Priya Patel",
  department: "Sales",
  basicSalaryPaise: 2_500_000,
  grossSalaryPaise: 5_000_000,
  ctcAnnualPaise: 70_000_000,
  jurisdiction: "GJ",
  pfOptOut: false,
  esiApplicable: false,
};

function makePayslipRecord(employee: Employee): PayslipRecord {
  const rules = resolveRulesForPeriod(employee.jurisdiction, PERIOD);
  const outputs = compute(employee, PERIOD, rules);
  return {
    runId: "TEST-RUN",
    paymentDate: "2026-06-30",
    period: PERIOD,
    employee,
    outputs,
    uan: "",
    esiNumber: "",
    pan: "ABCDE1234F",
    pfAccountNumber: "",
    companyName: "Test Co",
    companyAddress: "Mumbai",
    companyPan: "AABCA1234D",
  };
}

describe("multi-state PT rule coverage", () => {
  it("resolveRuleSet('TG', '2025-04', PT) returns a non-null rule", () => {
    const rule = resolveRuleSet("TG", "2025-04", RuleType.PT);
    expect(rule).not.toBeNull();
    expect(rule!.id).toBe("pt-tg-2025-04");
  });

  it("MH vs TN — same employee gross, different ptPaise (20_000 vs 69_000)", () => {
    const rulesMH = resolveRulesForPeriod("MH", PERIOD);
    const rulesTN = resolveRulesForPeriod("TN", PERIOD);
    const mhOut = compute(EMP_MH, PERIOD, rulesMH);
    const tnOut = compute(EMP_TN, PERIOD, rulesTN);
    expect(mhOut.ptPaise).toBe(20_000);
    expect(tnOut.ptPaise).toBe(69_000);
    expect(mhOut.ptPaise).not.toBe(tnOut.ptPaise);
  });

  it("KA — ptPaise = 20_000 for gross ₹50k", () => {
    const rulesKA = resolveRulesForPeriod("KA", PERIOD);
    const out = compute(EMP_KA, PERIOD, rulesKA);
    expect(out.ptPaise).toBe(20_000);
  });

  it("DL — ptPaise = 0 and appliedRules.pt = 'pt-dl-2025-04'", () => {
    const rulesDL = resolveRulesForPeriod("DL", PERIOD);
    const out = compute(EMP_DL, PERIOD, rulesDL);
    expect(out.ptPaise).toBe(0);
    expect(out.appliedRules.pt).toBe("pt-dl-2025-04");
  });
});

describe("generatePayslipHTML PT label rendering", () => {
  it("TN payslip includes 'Professional Tax (Tamil Nadu)'", () => {
    const html = generatePayslipHTML(makePayslipRecord(EMP_TN));
    expect(html).toContain("Professional Tax (Tamil Nadu)");
  });

  it("GJ payslip does NOT include a Professional Tax row", () => {
    const html = generatePayslipHTML(makePayslipRecord(EMP_GJ));
    expect(html).not.toContain("Professional Tax");
  });
});

describe("validateWageRule", () => {
  it("compliant: basic = 50% of monthly CTC → gapPaise = 0", () => {
    // ctcAnnual 60_000_000 → monthly 5_000_000; 50% = 2_500_000
    const emp: Employee = { ...EMP_MH, basicSalaryPaise: 2_500_000, ctcAnnualPaise: 60_000_000 };
    const result = validateWageRule(emp);
    expect(result.compliant).toBe(true);
    expect(result.gapPaise).toBe(0);
    expect(result.requiredPct).toBe(50);
  });

  it("violation: basic = 40% of monthly CTC → correct gap amount", () => {
    // ctcAnnual 60_000_000 → monthly 5_000_000; required basic 2_500_000; actual 2_000_000
    const emp: Employee = { ...EMP_MH, basicSalaryPaise: 2_000_000, ctcAnnualPaise: 60_000_000 };
    const result = validateWageRule(emp);
    expect(result.compliant).toBe(false);
    expect(result.basicPct).toBe(40);
    expect(result.gapPaise).toBe(500_000);
  });
});

describe("recordJurisdictionChange", () => {
  it("returns record with all correct fields and result is frozen", () => {
    const ts = "2026-06-11T10:00:00.000Z";
    const record = recordJurisdictionChange(
      "EMP001", "MH", "TN", "hr-manager", "2026-06", ts
    );
    expect(record.employeeId).toBe("EMP001");
    expect(record.fromJurisdiction).toBe("MH");
    expect(record.toJurisdiction).toBe("TN");
    expect(record.actor).toBe("hr-manager");
    expect(record.periodAffected).toBe("2026-06");
    expect(record.timestamp).toBe(ts);
    expect(Object.isFrozen(record)).toBe(true);
  });
});
