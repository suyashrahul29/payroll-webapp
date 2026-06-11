/**
 * Multi-State Payslip Compliance — Jurisdiction-Specific Utilities
 *
 * Pure functions only. No I/O, no DOM, no side effects.
 */

import type { Employee } from "./calculator.js";
import type { Jurisdiction } from "./types.js";

// ── Wage-Rule Validation ──────────────────────────────────────────────────────

export interface WageRuleResult {
  compliant: boolean;
  basicPct: number;      // integer, e.g. 45 means 45%
  requiredPct: number;   // always 50 (national floor)
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

// ── Jurisdiction Change Audit Record ─────────────────────────────────────────

export interface JurisdictionChangeRecord {
  readonly timestamp: string;
  readonly employeeId: string;
  readonly fromJurisdiction: Jurisdiction;
  readonly toJurisdiction: Jurisdiction;
  readonly actor: string;
  readonly periodAffected: string;
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
