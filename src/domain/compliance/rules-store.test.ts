/**
 * Tests for Compliance Rules Store
 *
 * Verifies: per-state PT resolution, PF/ESI/TDS national rules,
 * effective-date versioning, and immutability of addRuleVersion.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { resolveRuleSet, addRuleVersion, _resetStore } from "./rules-store.js";
import { RuleType } from "./types.js";

beforeEach(() => {
  _resetStore();
});

// ============================================================================
// PT — state-specific resolution
// ============================================================================

describe("resolveRuleSet — PT", () => {
  it("resolves MH PT rule for 2025-05", () => {
    const rule = resolveRuleSet("MH", "2025-05", RuleType.PT);
    expect(rule).not.toBeNull();
    expect(rule!.jurisdiction).toBe("MH");
    expect(rule!.ruleType).toBe(RuleType.PT);
    expect(rule!.id).toBe("pt-mh-2025-04");
  });

  it("resolves TN PT rule for 2025-05 — different from MH", () => {
    const mh = resolveRuleSet("MH", "2025-05", RuleType.PT);
    const tn = resolveRuleSet("TN", "2025-05", RuleType.PT);
    expect(tn).not.toBeNull();
    expect(tn!.jurisdiction).toBe("TN");
    expect(tn!.id).not.toBe(mh!.id);
  });

  it("resolves DL PT rule — zero-rate (Delhi has no PT levy)", () => {
    const rule = resolveRuleSet("DL", "2025-05", RuleType.PT);
    expect(rule).not.toBeNull();
    expect(rule!.jurisdiction).toBe("DL");
    expect(rule!.params["not_applicable"]).toBe(true);
    const slabs = rule!.params["slabs"] as unknown[];
    expect(slabs).toHaveLength(0);
  });

  it("resolves KA PT rule for 2025-05", () => {
    const rule = resolveRuleSet("KA", "2025-05", RuleType.PT);
    expect(rule).not.toBeNull();
    expect(rule!.jurisdiction).toBe("KA");
  });

  it("returns null for a state with no seeded PT rule", () => {
    const rule = resolveRuleSet("UP", "2025-05", RuleType.PT);
    expect(rule).toBeNull();
  });
});

// ============================================================================
// PF / ESI / TDS — national rules
// ============================================================================

describe("resolveRuleSet — PF/ESI/TDS", () => {
  it("resolves IN PF rule for 2025-05", () => {
    const rule = resolveRuleSet("IN", "2025-05", RuleType.PF);
    expect(rule).not.toBeNull();
    expect(rule!.ruleType).toBe(RuleType.PF);
    expect(rule!.jurisdiction).toBe("IN");
    expect(rule!.params["employee_rate_bps"]).toBe(1200);
    expect(rule!.params["wage_cap_paise"]).toBe(1_500_000);
  });

  it("resolves IN ESI rule for 2025-05", () => {
    const rule = resolveRuleSet("IN", "2025-05", RuleType.ESI);
    expect(rule).not.toBeNull();
    expect(rule!.ruleType).toBe(RuleType.ESI);
    expect(rule!.params["employee_rate_bps"]).toBe(75);
    expect(rule!.params["employer_rate_bps"]).toBe(325);
  });

  it("resolves IN TDS rule for 2025-05 with new regime slabs", () => {
    const rule = resolveRuleSet("IN", "2025-05", RuleType.TDS);
    expect(rule).not.toBeNull();
    expect(rule!.params["regime"]).toBe("new");
    const slabs = rule!.params["slabs"] as Array<{ rate_bps: number }>;
    expect(slabs.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Effective-date versioning
// ============================================================================

describe("addRuleVersion — versioning and immutability", () => {
  it("historical period resolves to historical rule after a newer version is added", () => {
    // Close out the existing MH rule at 2026-06, add a new v2 from 2026-07.
    addRuleVersion({
      id: "pt-mh-2026-07",
      ruleType: RuleType.PT,
      jurisdiction: "MH",
      effectiveFrom: "2026-07",
      effectiveTo: null,
      version: 2,
      params: {
        slabs: [
          { from_paise: 0, to_paise: null, monthly_paise: 25_000 }, // hypothetical higher rate
        ],
      },
      createdAt: "2026-07-01T00:00:00Z",
    });

    // 2025-05 should still resolve to v1 (effectiveFrom 2025-04).
    const historical = resolveRuleSet("MH", "2025-05", RuleType.PT);
    expect(historical!.version).toBe(1);
    expect(historical!.id).toBe("pt-mh-2025-04");
  });

  it("new period resolves to the newly added version", () => {
    addRuleVersion({
      id: "pf-in-2026-07",
      ruleType: RuleType.PF,
      jurisdiction: "IN",
      effectiveFrom: "2026-07",
      effectiveTo: null,
      version: 2,
      params: {
        employee_rate_bps: 1200,
        employer_rate_bps: 1200,
        wage_cap_paise: 1_800_000, // hypothetical cap increase
        epf_split_bps: 367,
        eps_split_bps: 833,
      },
      createdAt: "2026-07-01T00:00:00Z",
    });

    const future = resolveRuleSet("IN", "2026-08", RuleType.PF);
    expect(future!.version).toBe(2);
    expect(future!.id).toBe("pf-in-2026-07");
  });

  it("addRuleVersion does not mutate existing rows", () => {
    const before = resolveRuleSet("IN", "2025-05", RuleType.PF);
    const originalId = before!.id;

    addRuleVersion({
      id: "pf-in-2026-07",
      ruleType: RuleType.PF,
      jurisdiction: "IN",
      effectiveFrom: "2026-07",
      effectiveTo: null,
      version: 2,
      params: { employee_rate_bps: 1200, employer_rate_bps: 1200, wage_cap_paise: 1_800_000, epf_split_bps: 367, eps_split_bps: 833 },
      createdAt: "2026-07-01T00:00:00Z",
    });

    // The 2025-05 rule must still have the original id — no mutation.
    const after = resolveRuleSet("IN", "2025-05", RuleType.PF);
    expect(after!.id).toBe(originalId);
  });

  it("period before effectiveFrom returns null (no rule yet)", () => {
    const rule = resolveRuleSet("IN", "2024-03", RuleType.PF);
    expect(rule).toBeNull();
  });

  it("effectiveTo boundary: period exactly at effectiveTo is still valid", () => {
    addRuleVersion({
      id: "esi-in-test-closed",
      ruleType: RuleType.ESI,
      jurisdiction: "IN",
      effectiveFrom: "2026-04",
      effectiveTo: "2026-06",
      version: 2,
      params: { employee_rate_bps: 75, employer_rate_bps: 325, gross_ceiling_paise: 2_100_000 },
      createdAt: "2026-04-01T00:00:00Z",
    });

    expect(resolveRuleSet("IN", "2026-06", RuleType.ESI)!.id).toBe("esi-in-test-closed");
    // 2026-07 should fall back to v1 open-ended rule (effectiveTo null)
    expect(resolveRuleSet("IN", "2026-07", RuleType.ESI)!.version).toBe(1);
  });
});
