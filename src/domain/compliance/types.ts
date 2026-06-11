/**
 * Compliance Domain Types
 *
 * Defines types for compliance rules: PF, ESI, TDS, PT.
 * All monetary values in PAISE (integer). Periods as 'YYYY-MM'.
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum RuleType {
  PF = "PF",
  ESI = "ESI",
  TDS = "TDS",
  PT = "PT",
}

// National + major state codes for PT jurisdiction resolution
export type Jurisdiction =
  | "IN"
  | "MH"
  | "TN"
  | "KA"
  | "DL"
  | "TG"
  | "KL"
  | "GJ"
  | "RJ"
  | "UP"
  | "WB"
  | "AP"
  | "HR"
  | "MP"
  | "PB";

// ============================================================================
// CORE INTERFACE
// ============================================================================

/**
 * ComplianceRuleSet — effective-dated versioned rule row.
 *
 * - effectiveTo null means the rule is currently in effect (open-ended).
 * - params holds rule-specific structured config (slabs, rates, caps).
 * - All monetary values in params are PAISE.
 */
export interface ComplianceRuleSet {
  id: string;
  ruleType: RuleType;
  jurisdiction: Jurisdiction;
  effectiveFrom: string; // 'YYYY-MM'
  effectiveTo: string | null; // 'YYYY-MM' inclusive, null = open-ended
  version: number;
  params: Record<string, unknown>;
  createdAt: string; // ISO 8601
}
