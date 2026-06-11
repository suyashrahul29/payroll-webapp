/**
 * Pure Calculation Core — Statutory Computation (PF / ESI / TDS / PT)
 *
 * compute(employee, period, rulesMap) → StatutoryOutputs
 *
 * Constraints:
 *   - Pure function: no I/O, no side effects.
 *   - All monetary values as integer paise; never floats.
 *   - floor() on every division (statutory rounding always favours the employee).
 *   - Rates come from resolved rule-set params; never hard-coded here.
 */

import { ComplianceRuleSet, Jurisdiction, RuleType } from "./types.js";
import { resolveRuleSet } from "./rules-store.js";

// ============================================================================
// PUBLIC TYPES
// ============================================================================

export interface Employee {
  employeeId: string;
  name: string;
  department?: string;        // optional; not used in statutory computation
  basicSalaryPaise: number;   // monthly basic
  grossSalaryPaise: number;   // monthly gross
  ctcAnnualPaise: number;     // annual CTC (informational)
  jurisdiction: Jurisdiction; // state code for PT
  pfOptOut: boolean;          // true if employee opts out of PF
  esiApplicable: boolean;     // informational; actual applicability re-computed from gross
}

export interface PayrollPeriod {
  year: number;
  month: number;      // 1-12
  periodString: string; // 'YYYY-MM'
}

export interface StatutoryOutputs {
  grossPaise: number;
  pfEmployeePaise: number;      // 12% of basic (capped at ₹15,000 basic)
  pfEmployerPaise: number;      // 12% of basic (capped)
  esiEmployeePaise: number;     // 0.75% of gross (only if gross ≤ ₹21,000)
  esiEmployerPaise: number;     // 3.25% of gross (only if gross ≤ ₹21,000)
  tdsPaise: number;             // monthly TDS
  ptPaise: number;              // monthly PT per state slab
  totalDeductionsPaise: number; // sum of all employee-side deductions
  netPayPaise: number;          // gross − totalDeductions
  appliedRules: {
    pf: string;
    esi: string;
    tds: string;
    pt: string | null;          // null for states with no PT (Delhi)
  };
}

/** Pre-resolved rule map passed into compute(). Build with resolveRulesForPeriod(). */
export interface ResolvedRules {
  pf: ComplianceRuleSet;
  esi: ComplianceRuleSet;
  tds: ComplianceRuleSet;
  pt: ComplianceRuleSet | null;
}

// ============================================================================
// RULE RESOLUTION HELPER
// ============================================================================

/**
 * Resolve all four rule types for the given period and state jurisdiction.
 * Throws if PF / ESI / TDS rules are missing (they are nationally mandatory).
 */
export function resolveRulesForPeriod(
  jurisdiction: Jurisdiction,
  period: PayrollPeriod
): ResolvedRules {
  const p = period.periodString;

  const pf = resolveRuleSet("IN", p, RuleType.PF);
  if (!pf) throw new Error(`No PF rule found for period ${p}`);

  const esi = resolveRuleSet("IN", p, RuleType.ESI);
  if (!esi) throw new Error(`No ESI rule found for period ${p}`);

  const tds = resolveRuleSet("IN", p, RuleType.TDS);
  if (!tds) throw new Error(`No TDS rule found for period ${p}`);

  const pt = resolveRuleSet(jurisdiction, p, RuleType.PT);

  return { pf, esi, tds, pt };
}

// ============================================================================
// INTERNAL CALCULATORS
// ============================================================================

function computePF(
  basicPaise: number,
  pfOptOut: boolean,
  pfRule: ComplianceRuleSet
): { employee: number; employer: number } {
  if (pfOptOut) return { employee: 0, employer: 0 };

  const wageCap = pfRule.params["wage_cap_paise"] as number;
  const empRate = pfRule.params["employee_rate_bps"] as number;
  const erRate  = pfRule.params["employer_rate_bps"] as number;

  const base = Math.min(basicPaise, wageCap);
  return {
    employee: Math.floor((base * empRate) / 10_000),
    employer: Math.floor((base * erRate)  / 10_000),
  };
}

function computeESI(
  grossPaise: number,
  esiRule: ComplianceRuleSet
): { employee: number; employer: number } {
  const ceiling = esiRule.params["gross_ceiling_paise"] as number;
  if (grossPaise > ceiling) return { employee: 0, employer: 0 };

  const empRate = esiRule.params["employee_rate_bps"] as number;
  const erRate  = esiRule.params["employer_rate_bps"] as number;

  return {
    employee: Math.floor((grossPaise * empRate) / 10_000),
    employer: Math.floor((grossPaise * erRate)  / 10_000),
  };
}

interface PTSlab {
  from_paise: number;
  to_paise: number | null;
  monthly_paise: number;
}

function computePT(
  grossPaise: number,
  month: number,
  ptRule: ComplianceRuleSet | null
): number {
  if (!ptRule) return 0;
  if (ptRule.params["not_applicable"] === true) return 0;

  const slabs = ptRule.params["slabs"] as PTSlab[];
  for (const slab of slabs) {
    const lo = slab.from_paise;
    const hi = slab.to_paise;
    if (grossPaise >= lo && (hi === null || grossPaise <= hi)) {
      // February override applies only to the top slab
      if (
        month === 2 &&
        hi === null &&
        "february_override_paise" in ptRule.params
      ) {
        return ptRule.params["february_override_paise"] as number;
      }
      return slab.monthly_paise;
    }
  }
  return 0;
}

interface TDSSlab {
  from_paise: number;
  to_paise: number | null;
  rate_bps: number;
}

function computeTDS(
  grossPaise: number,
  tdsRule: ComplianceRuleSet
): number {
  const stdDed  = tdsRule.params["standard_deduction_paise"] as number;
  const slabs   = tdsRule.params["slabs"] as TDSSlab[];
  const rebateLimit = tdsRule.params["rebate_87a_limit_paise"] as number;

  const annualGross   = grossPaise * 12;
  const taxableIncome = Math.max(0, annualGross - stdDed);

  // Slab-wise tax
  let annualTax = 0;
  for (const slab of slabs) {
    if (taxableIncome <= slab.from_paise) break;
    const hi    = slab.to_paise ?? Infinity;
    const slice = Math.min(taxableIncome, hi) - slab.from_paise;
    annualTax  += Math.floor((slice * slab.rate_bps) / 10_000);
  }

  // 87A rebate: if taxable income ≤ limit, reduce tax by up to ₹25,000 (but not below 0)
  if (taxableIncome <= rebateLimit) {
    const maxRebate = 2_500_000; // ₹25,000 in paise
    annualTax = Math.max(0, annualTax - Math.min(annualTax, maxRebate));
  }

  return Math.floor(annualTax / 12);
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * compute — pure statutory calculation.
 *
 * @param employee  Employee data (salaries in paise).
 * @param period    Payroll period (year, month, periodString).
 * @param rules     Pre-resolved rules (use resolveRulesForPeriod to build).
 * @returns         StatutoryOutputs — all values as integer paise.
 */
export function compute(
  employee: Employee,
  period: PayrollPeriod,
  rules: ResolvedRules
): StatutoryOutputs {
  const pf  = computePF(employee.basicSalaryPaise, employee.pfOptOut, rules.pf);
  const esi = computeESI(employee.grossSalaryPaise, rules.esi);
  const pt  = computePT(employee.grossSalaryPaise, period.month, rules.pt);
  const tds = computeTDS(employee.grossSalaryPaise, rules.tds);

  const totalDeductions =
    pf.employee + esi.employee + tds + pt;

  const netPay = employee.grossSalaryPaise - totalDeductions;

  return {
    grossPaise:           employee.grossSalaryPaise,
    pfEmployeePaise:      pf.employee,
    pfEmployerPaise:      pf.employer,
    esiEmployeePaise:     esi.employee,
    esiEmployerPaise:     esi.employer,
    tdsPaise:             tds,
    ptPaise:              pt,
    totalDeductionsPaise: totalDeductions,
    netPayPaise:          netPay,
    appliedRules: {
      pf:  rules.pf.id,
      esi: rules.esi.id,
      tds: rules.tds.id,
      pt:  rules.pt?.id ?? null,
    },
  };
}
