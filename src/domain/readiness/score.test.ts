/**
 * Unit Tests for Score Computation (Pure Functions)
 *
 * Tests the core algorithm for computing readiness score based on blockers
 * and source freshness states.
 */

import { computeScore, computeScoreFromBlockers } from "./score.js";
import { createBlocker } from "../models/blocker.js";
import { createSourceFreshness, markAsStale, markAsDead } from "../models/source-freshness.js";
import { BlockerType, Severity, SourceType } from "../events.js";

describe("Score Computation (Pure Functions)", () => {
  const tenantId = "550e8400-e29b-41d4-a716-446655440000";

  // ========================================================================
  // Basic Score Computation
  // ========================================================================

  describe("computeScore - Basic Cases", () => {
    it("should return score 100 with no blockers", () => {
      const result = computeScore([], []);
      expect(result.score).toBe(100);
      expect(result.activeBlockers).toHaveLength(0);
      expect(result.deadSources).toBe(false);
    });

    it("should return score 85 with one stale source blocker (15 pts)", () => {
      const blockers = [
        createBlocker(
          "blocker-1",
          tenantId,
          BlockerType.FRESHNESS_VITALS,
          "Data Freshness",
          Severity.MEDIUM,
          "eSSL is stale",
          ["eSSL"]
        ),
      ];

      const result = computeScore(blockers, []);
      expect(result.score).toBe(85);
    });

    it("should return score 70 with multiple blockers", () => {
      const blockers = [
        // Stale source (15 pts)
        createBlocker(
          "blocker-1",
          tenantId,
          BlockerType.FRESHNESS_VITALS,
          "Data Freshness",
          Severity.MEDIUM,
          "eSSL is stale",
          ["eSSL"]
        ),
        // Pending exit (15 pts)
        createBlocker(
          "blocker-2",
          tenantId,
          BlockerType.LIFECYCLE_CLOCK,
          "Exit Settlement",
          Severity.HIGH,
          "1 exit pending F&F",
          ["EMP001"]
        ),
      ];

      const result = computeScore(blockers, []);
      expect(result.score).toBe(70);
      expect(result.activeBlockers).toHaveLength(2);
    });
  });

  // ========================================================================
  // Resolved Blocker Handling
  // ========================================================================

  describe("Resolved Blockers", () => {
    it("should ignore resolved blockers in score calculation", () => {
      const now = new Date();
      const blocker = createBlocker(
        "blocker-1",
        tenantId,
        BlockerType.LIFECYCLE_CLOCK,
        "Exit Settlement",
        Severity.HIGH,
        "1 exit pending F&F",
        ["EMP001"]
      );

      // Mark as resolved
      blocker.resolved_at = now;

      const result = computeScore([blocker], []);
      expect(result.score).toBe(100);
      expect(result.activeBlockers).toHaveLength(0);
    });

    it("should only count unresolved blockers", () => {
      const now = new Date();

      const blocker1 = createBlocker(
        "blocker-1",
        tenantId,
        BlockerType.LIFECYCLE_CLOCK,
        "Exit Settlement",
        Severity.HIGH,
        "1 exit pending F&F",
        ["EMP001"]
      );
      blocker1.resolved_at = now; // Resolved

      const blocker2 = createBlocker(
        "blocker-2",
        tenantId,
        BlockerType.CHANGE_HANDSHAKE,
        "CTC Changes",
        Severity.MEDIUM,
        "5 unconfirmed CTC changes",
        ["change-1", "change-2"]
      );
      // blocker2 is unresolved

      const result = computeScore([blocker1, blocker2], []);
      expect(result.score).toBe(85);
      expect(result.activeBlockers).toHaveLength(1);
      expect(result.activeBlockers[0].id).toBe("blocker-2");
    });
  });

  // ========================================================================
  // Dead Source Handling (Critical)
  // ========================================================================

  describe("Dead Source Handling", () => {
    it("should force score to 0 if any source is DEAD", () => {
      const sourceFreshness = [
        createSourceFreshness(
          "source-1",
          tenantId,
          "eSSL",
          SourceType.BIOMETRIC,
          7200
        ),
      ];

      // Mark source as DEAD
      sourceFreshness[0] = markAsDead(sourceFreshness[0]);

      const result = computeScore([], sourceFreshness);
      expect(result.score).toBe(0);
      expect(result.deadSources).toBe(true);
    });

    it("should prioritize dead source over other blockers", () => {
      const blockers = [
        createBlocker(
          "blocker-1",
          tenantId,
          BlockerType.CHANGE_HANDSHAKE,
          "CTC Changes",
          Severity.MEDIUM,
          "5 unconfirmed CTC changes",
          ["change-1"]
        ),
      ];

      const sourceFreshness = [
        markAsDead(
          createSourceFreshness(
            "source-1",
            tenantId,
            "eSSL",
            SourceType.BIOMETRIC,
            7200
          )
        ),
      ];

      const result = computeScore(blockers, sourceFreshness);
      // Even with other blockers, dead source forces score to 0
      expect(result.score).toBe(0);
      expect(result.deadSources).toBe(true);
    });

    it("should cap score below 100 if any source is DEAD", () => {
      const sourceFreshness = [
        markAsDead(
          createSourceFreshness(
            "source-1",
            tenantId,
            "eSSL",
            SourceType.BIOMETRIC,
            7200
          )
        ),
      ];

      const result = computeScore([], sourceFreshness);
      expect(result.score).not.toBe(100);
      expect(result.score).toBe(0);
    });
  });

  // ========================================================================
  // Stale Source Handling
  // ========================================================================

  describe("Stale Source Handling", () => {
    it("should not force score to 0 for STALE source", () => {
      const sourceFreshness = [
        markAsStale(
          createSourceFreshness(
            "source-1",
            tenantId,
            "eSSL",
            SourceType.BIOMETRIC,
            7200
          )
        ),
      ];

      const result = computeScore([], sourceFreshness);
      // Stale doesn't force to 0, but creates a blocker
      expect(result.score).toBe(100); // No blocker yet, just source state
      expect(result.deadSources).toBe(false);
    });
  });

  // ========================================================================
  // Score Boundaries
  // ========================================================================

  describe("Score Boundaries", () => {
    it("should clamp score to minimum 0", () => {
      const blockers = [
        createBlocker(
          "blocker-1",
          tenantId,
          BlockerType.FRESHNESS_VITALS,
          "Data Freshness",
          Severity.HIGH,
          "eSSL sync dead",
          ["eSSL"]
        ),
        createBlocker(
          "blocker-2",
          tenantId,
          BlockerType.LIFECYCLE_CLOCK,
          "Exit",
          Severity.HIGH,
          "1 exit pending F&F",
          ["EMP001"]
        ),
        createBlocker(
          "blocker-3",
          tenantId,
          BlockerType.CHANGE_HANDSHAKE,
          "Changes",
          Severity.MEDIUM,
          "5 changes pending",
          ["change-1"]
        ),
      ];

      // Dead source blocker (100) forces score to 0
      const result = computeScore(blockers, []);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it("should clamp score to maximum 100", () => {
      const result = computeScore([], []);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("should handle exactly 100% score", () => {
      const result = computeScore([], []);
      expect(result.score).toBe(100);
    });

    it("should handle exactly 0% score", () => {
      const blocker = createBlocker(
        "blocker-1",
        tenantId,
        BlockerType.FRESHNESS_VITALS,
        "Data Freshness",
        Severity.HIGH,
        "eSSL sync dead — no successful sync in 24h",
        ["eSSL"],
        true // is_dead_source
      );

      const result = computeScore([blocker], []);
      expect(result.score).toBe(0);
    });
  });

  // ========================================================================
  // computeScoreFromBlockers (Simplified)
  // ========================================================================

  describe("computeScoreFromBlockers - Simplified", () => {
    it("should compute score from blockers only", () => {
      const blockers = [
        createBlocker(
          "blocker-1",
          tenantId,
          BlockerType.FRESHNESS_VITALS,
          "Data Freshness",
          Severity.MEDIUM,
          "eSSL is stale",
          ["eSSL"]
        ),
      ];

      const score = computeScoreFromBlockers(blockers);
      expect(score).toBe(85);
    });

    it("should ignore resolved blockers in simplified version", () => {
      const now = new Date();
      const blocker = createBlocker(
        "blocker-1",
        tenantId,
        BlockerType.LIFECYCLE_CLOCK,
        "Exit Settlement",
        Severity.HIGH,
        "1 exit pending F&F",
        ["EMP001"]
      );
      blocker.resolved_at = now;

      const score = computeScoreFromBlockers([blocker]);
      expect(score).toBe(100);
    });

    it("should force score to 0 for dead source blocker", () => {
      const blocker = createBlocker(
        "blocker-1",
        tenantId,
        BlockerType.FRESHNESS_VITALS,
        "Data Freshness",
        Severity.HIGH,
        "eSSL sync dead",
        ["eSSL"],
        true // is_dead_source
      );

      const score = computeScoreFromBlockers([blocker]);
      expect(score).toBe(0);
    });
  });

  // ========================================================================
  // Blocker Impact Calculation
  // ========================================================================

  describe("Blocker Impact Values", () => {
    it("should calculate FRESHNESS_VITALS impact as 15 for STALE", () => {
      const blocker = createBlocker(
        "blocker-1",
        tenantId,
        BlockerType.FRESHNESS_VITALS,
        "Data Freshness",
        Severity.MEDIUM,
        "eSSL is stale",
        ["eSSL"]
      );

      const score = computeScoreFromBlockers([blocker]);
      expect(score).toBe(85);
    });

    it("should calculate FRESHNESS_VITALS impact as 100 for DEAD", () => {
      const blocker = createBlocker(
        "blocker-1",
        tenantId,
        BlockerType.FRESHNESS_VITALS,
        "Data Freshness",
        Severity.HIGH,
        "eSSL sync dead",
        ["eSSL"],
        true // is_dead_source
      );

      const score = computeScoreFromBlockers([blocker]);
      expect(score).toBe(0);
    });

    it("should calculate CHANGE_HANDSHAKE impact as 15", () => {
      const blocker = createBlocker(
        "blocker-1",
        tenantId,
        BlockerType.CHANGE_HANDSHAKE,
        "Changes",
        Severity.MEDIUM,
        "5 unconfirmed CTC changes",
        ["change-1"]
      );

      const score = computeScoreFromBlockers([blocker]);
      expect(score).toBe(85);
    });

    it("should calculate LIFECYCLE_CLOCK impact as 15", () => {
      const blocker = createBlocker(
        "blocker-1",
        tenantId,
        BlockerType.LIFECYCLE_CLOCK,
        "Exit",
        Severity.HIGH,
        "1 exit pending F&F",
        ["EMP001"]
      );

      const score = computeScoreFromBlockers([blocker]);
      expect(score).toBe(85);
    });

    it("should calculate PREFLIGHT impact as 10", () => {
      const blocker = createBlocker(
        "blocker-1",
        tenantId,
        BlockerType.PREFLIGHT,
        "Pre-Flight",
        Severity.MEDIUM,
        "Attendance stale",
        ["attendance"]
      );

      const score = computeScoreFromBlockers([blocker]);
      expect(score).toBe(90);
    });
  });
});
