/**
 * 50%-Wage-Rule Roster Scan & Restructuring Simulator — Epic 3
 *
 * Story 3.1: scanWageRuleCompliance — roster-level aggregation over the frozen
 *   per-employee validateWageRule (multi-state.ts).
 * Story 3.2: simulateRestructuring — per-employee impact preview (PF Δ, net-pay Δ,
 *   gratuity Δ) computed via the Compliance Engine (calculator.ts compute()).
 * Story 3.3: Change-Handshake execution will extend this module further.
 *
 * Pure functions only. No I/O, no DOM, no side effects.
 * All money is integer paise; rupee formatting is a UI concern.
 */

import type { Employee, PayrollPeriod, ResolvedRules } from "./calculator.js";
import { compute } from "./calculator.js";
import { validateWageRule } from "./multi-state.js";

export interface WageRuleViolation {
  employeeId: string;
  employeeName: string;
  currentBasicPct: number; // integer, e.g. 45 means 45%
  requiredBasicPct: number; // always 50 (national floor)
  gapPaise: number; // monthly shortfall to reach 50% of monthly CTC
}

export interface WageRuleScanResult {
  compliantCount: number;
  nonCompliantCount: number;
  violations: WageRuleViolation[]; // one per non-compliant employee, in INPUT order
}

/**
 * Scan a tenant roster for 50%-wage-rule violations.
 *
 * Pure: does not mutate the input array or its elements. Reuses the frozen
 * `validateWageRule` per employee — the 50%-threshold math is not duplicated.
 */
// ============================================================================
// STORY 3.2: RESTRUCTURING SIMULATOR
// ============================================================================

/**
 * Per-employee impact of raising basic salary to meet the 50%-wage rule.
 *
 * When basic increases within a fixed gross:
 * - PF changes (basic-capped at ₹15,000/month).
 * - ESI / TDS / PT are gross-based and do NOT change.
 * - Take-home delta = negative of PF delta.
 * - Monthly gratuity accrual delta = employer liability growth per month per year of service.
 */
export interface RestructuringImpact {
  employeeId: string;
  employeeName: string;
  currentBasicPaise: number;
  proposedBasicPaise: number;
  currentPfEmployeePaise: number;
  proposedPfEmployeePaise: number;
  currentNetPayPaise: number;
  proposedNetPayPaise: number;
  /** floor(basic × 15 / 312) — monthly accrual per year-of-service */
  currentMonthlyGratuityAccrualPaise: number;
  proposedMonthlyGratuityAccrualPaise: number;
  /** proposed − current; negative = employee's take-home drops */
  deltaNetPayPaise: number;
  /** positive = higher PF deduction for employee */
  deltaPfEmployeePaise: number;
  /** employer's monthly gratuity liability growth */
  deltaMonthlyGratuityAccrualPaise: number;
}

/**
 * Simulate the statutory impact of raising an employee's basic salary.
 *
 * Pure: delegates monetary computation to compute() (Compliance Engine).
 * Gross salary is treated as unchanged — only basic composition shifts.
 *
 * @param employee         Employee to simulate (gross stays constant).
 * @param proposedBasicPaise  New monthly basic in paise (should be ≥ 50% of monthly CTC).
 * @param period           Payroll period for rule resolution.
 * @param rules            Pre-resolved compliance rules (use resolveRulesForPeriod).
 */
export function simulateRestructuring(
  employee: Employee,
  proposedBasicPaise: number,
  period: PayrollPeriod,
  rules: ResolvedRules,
): RestructuringImpact {
  if (!Number.isFinite(proposedBasicPaise) || proposedBasicPaise <= 0) {
    throw new RangeError(
      `proposedBasicPaise must be a positive finite number, got ${proposedBasicPaise}`,
    );
  }
  if (proposedBasicPaise > employee.grossSalaryPaise) {
    throw new RangeError(
      `proposedBasicPaise (${proposedBasicPaise}) exceeds employee gross salary (${employee.grossSalaryPaise})`,
    );
  }

  const currentOutputs = compute(employee, period, rules);
  const proposedEmployee: Employee = { ...employee, basicSalaryPaise: proposedBasicPaise };
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

// ============================================================================
// STORY 3.3: CHANGE HANDSHAKE ROUTING
// ============================================================================

export interface RestructuringChangeRecord {
  employeeId: string;
  employeeName: string;
  oldBasicPaise: number;
  newBasicPaise: number;
  deltaNetPayPaise: number;
  deltaPfEmployeePaise: number;
  deltaMonthlyGratuityAccrualPaise: number;
  effectiveDate: string;
  signatory: string;
  status: 'pending' | 'signed_off' | 'held' | 'rejected';
  createdAt: string;
}

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

// ============================================================================
// STORY 3.1: ROSTER SCAN
// ============================================================================

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
        requiredBasicPct: result.requiredPct, // 50
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
