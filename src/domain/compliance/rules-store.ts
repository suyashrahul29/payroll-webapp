/**
 * Compliance Rules Store
 *
 * In-memory store of versioned compliance rules seeded with real Indian
 * statutory rates for FY 2025-26.  All monetary values in PAISE.
 *
 * resolveRuleSet(jurisdiction, period, ruleType) → rule effective for that period.
 * addRuleVersion(rule) → insert a new version; existing rows are never mutated.
 */

import { ComplianceRuleSet, Jurisdiction, RuleType } from "./types.js";

// ============================================================================
// SEED DATA — real Indian statutory rates FY 2025-26
// ============================================================================

/**
 * PF (Provident Fund) — IN-wide
 * Employee: 12% of basic salary, capped at ₹15,000/month basic (1,500,000 paise).
 * Employer: 12% of basic salary (3.67% to EPF + 8.33% to EPS).
 */
const PF_2025: ComplianceRuleSet = {
  id: "pf-in-2025-04",
  ruleType: RuleType.PF,
  jurisdiction: "IN",
  effectiveFrom: "2025-04",
  effectiveTo: null,
  version: 1,
  params: {
    employee_rate_bps: 1200,      // 12.00%
    employer_rate_bps: 1200,      // 12.00%
    wage_cap_paise: 1_500_000,    // ₹15,000/month
    epf_split_bps: 367,           // 3.67% → EPF
    eps_split_bps: 833,           // 8.33% → EPS
  },
  createdAt: "2025-04-01T00:00:00Z",
};

/**
 * ESI (Employee State Insurance) — IN-wide
 * Employee: 0.75% of gross.  Employer: 3.25% of gross.
 * Applicable only if gross salary ≤ ₹21,000/month (2,100,000 paise).
 */
const ESI_2025: ComplianceRuleSet = {
  id: "esi-in-2025-04",
  ruleType: RuleType.ESI,
  jurisdiction: "IN",
  effectiveFrom: "2025-04",
  effectiveTo: null,
  version: 1,
  params: {
    employee_rate_bps: 75,        // 0.75%
    employer_rate_bps: 325,       // 3.25%
    gross_ceiling_paise: 2_100_000, // ₹21,000/month
  },
  createdAt: "2025-04-01T00:00:00Z",
};

/**
 * TDS — New Tax Regime slabs FY 2025-26 (Section 115BAC).
 * Slabs on annual taxable income (paise).
 *   ₹0–3L      → 0%
 *   ₹3L–7L     → 5%
 *   ₹7L–10L    → 10%
 *   ₹10L–12L   → 15%
 *   ₹12L–15L   → 20%
 *   ₹15L+      → 30%
 * Standard deduction: ₹75,000 (7,500,000 paise) for salaried employees.
 */
const TDS_2025: ComplianceRuleSet = {
  id: "tds-in-2025-04",
  ruleType: RuleType.TDS,
  jurisdiction: "IN",
  effectiveFrom: "2025-04",
  effectiveTo: null,
  version: 1,
  params: {
    regime: "new",
    standard_deduction_paise: 7_500_000,
    slabs: [
      { from_paise: 0,            to_paise: 30_000_000,   rate_bps: 0    },
      { from_paise: 30_000_000,   to_paise: 70_000_000,   rate_bps: 500  },
      { from_paise: 70_000_000,   to_paise: 100_000_000,  rate_bps: 1000 },
      { from_paise: 100_000_000,  to_paise: 120_000_000,  rate_bps: 1500 },
      { from_paise: 120_000_000,  to_paise: 150_000_000,  rate_bps: 2000 },
      { from_paise: 150_000_000,  to_paise: null,          rate_bps: 3000 },
    ],
    rebate_87a_limit_paise: 70_000_000, // ₹7L — full rebate up to this income
  },
  createdAt: "2025-04-01T00:00:00Z",
};

/**
 * PT — Maharashtra
 * Monthly gross salary slabs:
 *   ₹0–7,500        → ₹0/month
 *   ₹7,501–10,000   → ₹175/month
 *   ₹10,001+        → ₹200/month (except February: ₹300)
 * Annual cap: ₹2,400/year.
 */
const PT_MH_2025: ComplianceRuleSet = {
  id: "pt-mh-2025-04",
  ruleType: RuleType.PT,
  jurisdiction: "MH",
  effectiveFrom: "2025-04",
  effectiveTo: null,
  version: 1,
  params: {
    slabs: [
      { from_paise: 0,       to_paise: 750_000,   monthly_paise: 0   },
      { from_paise: 750_001, to_paise: 1_000_000, monthly_paise: 17_500 },
      { from_paise: 1_000_001, to_paise: null,    monthly_paise: 20_000 },
    ],
    february_override_paise: 30_000, // ₹300 for the slab ₹10,001+
    annual_cap_paise: 240_000,
  },
  createdAt: "2025-04-01T00:00:00Z",
};

/**
 * PT — Tamil Nadu
 * Half-yearly slabs on gross salary (paise/month basis for comparison):
 *   ₹0–21,000     → ₹0
 *   ₹21,001–30,000 → ₹135/month
 *   ₹30,001–45,000 → ₹315/month
 *   ₹45,001–60,000 → ₹690/month
 *   ₹60,001–75,000 → ₹1,025/month
 *   ₹75,001+       → ₹1,250/month
 */
const PT_TN_2025: ComplianceRuleSet = {
  id: "pt-tn-2025-04",
  ruleType: RuleType.PT,
  jurisdiction: "TN",
  effectiveFrom: "2025-04",
  effectiveTo: null,
  version: 1,
  params: {
    slabs: [
      { from_paise: 0,         to_paise: 2_100_000,  monthly_paise: 0      },
      { from_paise: 2_100_001, to_paise: 3_000_000,  monthly_paise: 13_500 },
      { from_paise: 3_000_001, to_paise: 4_500_000,  monthly_paise: 31_500 },
      { from_paise: 4_500_001, to_paise: 6_000_000,  monthly_paise: 69_000 },
      { from_paise: 6_000_001, to_paise: 7_500_000,  monthly_paise: 102_500 },
      { from_paise: 7_500_001, to_paise: null,        monthly_paise: 125_000 },
    ],
  },
  createdAt: "2025-04-01T00:00:00Z",
};

/**
 * PT — Karnataka
 *   ₹0–15,000     → ₹0
 *   ₹15,001–25,000 → ₹150/month
 *   ₹25,001–35,000 → ₹200/month
 *   ₹35,001+       → ₹200/month
 */
const PT_KA_2025: ComplianceRuleSet = {
  id: "pt-ka-2025-04",
  ruleType: RuleType.PT,
  jurisdiction: "KA",
  effectiveFrom: "2025-04",
  effectiveTo: null,
  version: 1,
  params: {
    slabs: [
      { from_paise: 0,         to_paise: 1_500_000,  monthly_paise: 0      },
      { from_paise: 1_500_001, to_paise: 2_500_000,  monthly_paise: 15_000 },
      { from_paise: 2_500_001, to_paise: 3_500_000,  monthly_paise: 20_000 },
      { from_paise: 3_500_001, to_paise: null,        monthly_paise: 20_000 },
    ],
  },
  createdAt: "2025-04-01T00:00:00Z",
};

/**
 * PT — Telangana
 *   ₹0–15,000       → ₹0
 *   ₹15,001–20,000   → ₹150/month
 *   ₹20,001+         → ₹200/month
 */
const PT_TG_2025: ComplianceRuleSet = {
  id: "pt-tg-2025-04",
  ruleType: RuleType.PT,
  jurisdiction: "TG",
  effectiveFrom: "2025-04",
  effectiveTo: null,
  version: 1,
  params: {
    slabs: [
      { from_paise: 0,         to_paise: 1_500_000,  monthly_paise: 0      },
      { from_paise: 1_500_001, to_paise: 2_000_000,  monthly_paise: 15_000 },
      { from_paise: 2_000_001, to_paise: null,        monthly_paise: 20_000 },
    ],
    annual_cap_paise: 250_000,
  },
  createdAt: "2025-04-01T00:00:00Z",
};

/**
 * PT — Kerala
 *   ₹0–11,999        → ₹0
 *   ₹12,000–17,999   → ₹120/month
 *   ₹18,000–29,999   → ₹180/month
 *   ₹30,000–44,999   → ₹300/month
 *   ₹45,000–59,999   → ₹450/month
 *   ₹60,000–74,999   → ₹600/month
 *   ₹75,000–99,999   → ₹750/month
 *   ₹1,00,000+       → ₹1,250/month
 */
const PT_KL_2025: ComplianceRuleSet = {
  id: "pt-kl-2025-04",
  ruleType: RuleType.PT,
  jurisdiction: "KL",
  effectiveFrom: "2025-04",
  effectiveTo: null,
  version: 1,
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
};

/**
 * PT — West Bengal
 *   ₹0–10,000        → ₹0
 *   ₹10,001–15,000   → ₹110/month
 *   ₹15,001–25,000   → ₹130/month
 *   ₹25,001–40,000   → ₹150/month
 *   ₹40,001+         → ₹200/month
 */
const PT_WB_2025: ComplianceRuleSet = {
  id: "pt-wb-2025-04",
  ruleType: RuleType.PT,
  jurisdiction: "WB",
  effectiveFrom: "2025-04",
  effectiveTo: null,
  version: 1,
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
};

/**
 * PT — Andhra Pradesh
 *   ₹0–15,000        → ₹0
 *   ₹15,001–20,000   → ₹150/month
 *   ₹20,001+         → ₹200/month
 */
const PT_AP_2025: ComplianceRuleSet = {
  id: "pt-ap-2025-04",
  ruleType: RuleType.PT,
  jurisdiction: "AP",
  effectiveFrom: "2025-04",
  effectiveTo: null,
  version: 1,
  params: {
    slabs: [
      { from_paise: 0,           to_paise: 1_500_000,  monthly_paise: 0      },
      { from_paise: 1_500_001,   to_paise: 2_000_000,  monthly_paise: 15_000 },
      { from_paise: 2_000_001,   to_paise: null,        monthly_paise: 20_000 },
    ],
  },
  createdAt: "2025-04-01T00:00:00Z",
};

/**
 * PT — Madhya Pradesh
 *   ₹0–18,750        → ₹0
 *   ₹18,751–25,000   → ₹125/month
 *   ₹25,001+         → ₹208/month
 */
const PT_MP_2025: ComplianceRuleSet = {
  id: "pt-mp-2025-04",
  ruleType: RuleType.PT,
  jurisdiction: "MP",
  effectiveFrom: "2025-04",
  effectiveTo: null,
  version: 1,
  params: {
    slabs: [
      { from_paise: 0,           to_paise: 1_875_000,  monthly_paise: 0      },
      { from_paise: 1_875_001,   to_paise: 2_500_000,  monthly_paise: 12_500 },
      { from_paise: 2_500_001,   to_paise: null,        monthly_paise: 20_800 },
    ],
  },
  createdAt: "2025-04-01T00:00:00Z",
};

// Not-applicable rules — these states do not levy Professional Tax.
const PT_GJ_2025: ComplianceRuleSet = {
  id: "pt-gj-2025-04",
  ruleType: RuleType.PT,
  jurisdiction: "GJ",
  effectiveFrom: "2025-04",
  effectiveTo: null,
  version: 1,
  params: { not_applicable: true, slabs: [] },
  createdAt: "2025-04-01T00:00:00Z",
};

const PT_PB_2025: ComplianceRuleSet = {
  id: "pt-pb-2025-04",
  ruleType: RuleType.PT,
  jurisdiction: "PB",
  effectiveFrom: "2025-04",
  effectiveTo: null,
  version: 1,
  params: { not_applicable: true, slabs: [] },
  createdAt: "2025-04-01T00:00:00Z",
};

const PT_RJ_2025: ComplianceRuleSet = {
  id: "pt-rj-2025-04",
  ruleType: RuleType.PT,
  jurisdiction: "RJ",
  effectiveFrom: "2025-04",
  effectiveTo: null,
  version: 1,
  params: { not_applicable: true, slabs: [] },
  createdAt: "2025-04-01T00:00:00Z",
};

const PT_UP_2025: ComplianceRuleSet = {
  id: "pt-up-2025-04",
  ruleType: RuleType.PT,
  jurisdiction: "UP",
  effectiveFrom: "2025-04",
  effectiveTo: null,
  version: 1,
  params: { not_applicable: true, slabs: [] },
  createdAt: "2025-04-01T00:00:00Z",
};

const PT_HR_2025: ComplianceRuleSet = {
  id: "pt-hr-2025-04",
  ruleType: RuleType.PT,
  jurisdiction: "HR",
  effectiveFrom: "2025-04",
  effectiveTo: null,
  version: 1,
  params: { not_applicable: true, slabs: [] },
  createdAt: "2025-04-01T00:00:00Z",
};

/**
 * PT — Delhi
 * Delhi does not levy Professional Tax.
 * We store a zero-rate rule so resolveRuleSet returns a valid (non-throwing) result.
 */
const PT_DL_2025: ComplianceRuleSet = {
  id: "pt-dl-2025-04",
  ruleType: RuleType.PT,
  jurisdiction: "DL",
  effectiveFrom: "2025-04",
  effectiveTo: null,
  version: 1,
  params: {
    not_applicable: true,
    slabs: [],
  },
  createdAt: "2025-04-01T00:00:00Z",
};

// ============================================================================
// IN-MEMORY STORE
// ============================================================================

// Mutable array — addRuleVersion pushes new rows; existing rows are never mutated.
let _rules: ComplianceRuleSet[] = [
  PF_2025,
  ESI_2025,
  TDS_2025,
  PT_MH_2025,
  PT_TN_2025,
  PT_KA_2025,
  PT_DL_2025,
  PT_TG_2025,
  PT_KL_2025,
  PT_WB_2025,
  PT_AP_2025,
  PT_MP_2025,
  PT_GJ_2025,
  PT_PB_2025,
  PT_RJ_2025,
  PT_UP_2025,
  PT_HR_2025,
];

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Compare two 'YYYY-MM' period strings.
 * Returns negative if a < b, 0 if equal, positive if a > b.
 */
function comparePeriods(a: string, b: string): number {
  // 'YYYY-MM' lexicographic order is the same as chronological order.
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Check whether a rule is effective during the given period.
 * effectiveFrom ≤ period ≤ effectiveTo (or effectiveTo is null = open-ended).
 */
function isEffectiveForPeriod(rule: ComplianceRuleSet, period: string): boolean {
  if (comparePeriods(period, rule.effectiveFrom) < 0) return false;
  if (rule.effectiveTo !== null && comparePeriods(period, rule.effectiveTo) > 0) return false;
  return true;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Resolve the compliance rule effective for the given jurisdiction, period, and rule type.
 *
 * For PT, jurisdiction must be the state code (e.g. 'MH', 'TN').
 * For PF / ESI / TDS, pass 'IN'.
 *
 * Returns the rule with the highest version number that is effective for the period.
 * Returns null when no matching rule exists (e.g. PT for a state that has no levy).
 */
export function resolveRuleSet(
  jurisdiction: Jurisdiction,
  period: string,
  ruleType: RuleType
): ComplianceRuleSet | null {
  const candidates = _rules.filter(
    (r) =>
      r.ruleType === ruleType &&
      r.jurisdiction === jurisdiction &&
      isEffectiveForPeriod(r, period)
  );

  if (candidates.length === 0) return null;

  // Pick the highest version among effective candidates.
  return candidates.reduce((best, r) => (r.version > best.version ? r : best));
}

/**
 * Add a new versioned rule to the store.
 *
 * - Does NOT mutate any existing row.
 * - The caller is responsible for closing (setting effectiveTo on) the
 *   previously-open rule before calling this, if desired.
 *   This store treats that as a data concern, not an enforcement concern.
 */
export function addRuleVersion(rule: ComplianceRuleSet): void {
  _rules = [..._rules, rule];
}

/**
 * Reset the store to seed data — useful in tests.
 * @internal
 */
export function _resetStore(): void {
  _rules = [
    PF_2025,
    ESI_2025,
    TDS_2025,
    PT_MH_2025,
    PT_TN_2025,
    PT_KA_2025,
    PT_DL_2025,
    PT_TG_2025,
    PT_KL_2025,
    PT_WB_2025,
    PT_AP_2025,
    PT_MP_2025,
    PT_GJ_2025,
    PT_PB_2025,
    PT_RJ_2025,
    PT_UP_2025,
    PT_HR_2025,
  ];
}
