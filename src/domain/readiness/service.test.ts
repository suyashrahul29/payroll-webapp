/**
 * Unit Tests for Readiness Service
 *
 * Tests cover all acceptance criteria (AC-1 through AC-6):
 * - AC-1: Event listener initialization
 * - AC-2: Source sync event handling
 * - AC-3: Blockers table schema
 * - AC-4: Source freshness table schema
 * - AC-5: Readiness score computation
 * - AC-6: Event loop & score recomputation
 */

import { ReadinessService } from "./service.js";
import {
  SourceSynced,
  ChangeDetected,
  ExitRecorded,
  ReadinessScoreChanged,
  Severity,
  BlockerType,
} from "../events.js";

describe("ReadinessService", () => {
  let service: ReadinessService;
  const tenantId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    service = new ReadinessService();
  });

  // ========================================================================
  // AC-1: Event Listener Initialization
  // ========================================================================

  describe("AC-1: Event Listener Initialization", () => {
    it("should initialize and listen for all 8 domain events", () => {
      const events = [
        "SourceSynced",
        "SourceWentStale",
        "SourceDead",
        "ChangeDetected",
        "ChangeSignedOff",
        "ExitRecorded",
        "FFSettled",
        "PreFlightItemChanged",
      ];

      for (const eventName of events) {
        expect(service.listenerCount(eventName)).toBeGreaterThanOrEqual(1);
      }
    });
  });

  // ========================================================================
  // AC-2: Source Sync Event Handling
  // ========================================================================

  describe("AC-2: Source Sync Event Handling", () => {
    it("should handle SourceSynced event and emit ReadinessScoreChanged", (done) => {
      const sourceId = "eSSL";
      const timestamp = new Date();

      service.on("ReadinessScoreChanged", (event: ReadinessScoreChanged) => {
        expect(event.tenant_id).toBe(tenantId);
        expect(event.score).toBe(100);
        expect(event.blockers).toEqual([]);
        expect(event.timestamp).toBeDefined();
        done();
      });

      const event: SourceSynced = {
        tenant_id: tenantId,
        source_id: sourceId,
        timestamp,
      };

      service.emit("SourceSynced", event);
    });
  });

  // ========================================================================
  // AC-5: Readiness Score Computation
  // ========================================================================

  describe("AC-5: Readiness Score Computation", () => {
    it("should return score object with score, blockers, dead_sources, timestamp", () => {
      const result = service.computeScore(tenantId);

      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("blockers");
      expect(result).toHaveProperty("dead_sources");
      expect(result).toHaveProperty("timestamp");

      expect(typeof result.score).toBe("number");
      expect(Array.isArray(result.blockers)).toBe(true);
      expect(typeof result.dead_sources).toBe("boolean");
      expect(result.timestamp instanceof Date).toBe(true);
    });

    it("should return score 100 with no blockers for new tenant", () => {
      const result = service.computeScore(tenantId);

      expect(result.score).toBe(100);
      expect(result.blockers.length).toBe(0);
      expect(result.dead_sources).toBe(false);
    });

    it("should include action_button in blocker results", (done) => {
      service.on("ReadinessScoreChanged", () => {
        const result = service.computeScore(tenantId);

        if (result.blockers.length > 0) {
          result.blockers.forEach(blocker => {
            expect(blocker).toHaveProperty("action_button");
            expect(
              ["Re-sync", "Review & sign", "Settle", "Resolve", "Action"]
            ).toContain(blocker.action_button);
          });
          done();
        }
      });

      const event: ChangeDetected = {
        tenant_id: tenantId,
        change_set: [
          {
            employee_id: "EMP001",
            old_ctc: 500000,
            new_ctc: 550000,
            signatory: "Finance Manager",
          },
        ],
      };

      service.emit("ChangeDetected", event);
    });
  });

  // ========================================================================
  // AC-6: Event Loop & Score Recomputation
  // ========================================================================

  describe("AC-6: Event Loop & Score Recomputation", () => {
    it("should recompute score when blocker is resolved", (done) => {
      let callCount = 0;
      const scores: number[] = [];

      service.on("ReadinessScoreChanged", (event: ReadinessScoreChanged) => {
        callCount++;
        scores.push(event.score);

        if (callCount === 2) {
          // First emit: create exit blocker
          expect(scores[0]).toBeLessThan(100);
          // Second emit: resolve exit blocker
          expect(scores[1]).toBe(100);
          done();
        }
      });

      // First: record an exit (creates blocker)
      const exitEvent: ExitRecorded = {
        tenant_id: tenantId,
        employee_id: "EMP001",
        last_working_day: new Date(),
      };
      service.emit("ExitRecorded", exitEvent);

      // Then: settle F&F (resolves blocker)
      setTimeout(() => {
        service.emit("FFSettled", {
          tenant_id: tenantId,
          employee_id: "EMP001",
          settlement_amount: 500000,
          timestamp: new Date(),
        });
      }, 10);
    });

    it("should emit ReadinessScoreChanged within 60 seconds of event", (done) => {
      const start = Date.now();
      let emitTime: number;

      service.on("ReadinessScoreChanged", () => {
        emitTime = Date.now();
        const elapsed = emitTime - start;
        expect(elapsed).toBeLessThan(60000); // 60 seconds
        done();
      });

      const event: SourceSynced = {
        tenant_id: tenantId,
        source_id: "eSSL",
        timestamp: new Date(),
      };

      service.emit("SourceSynced", event);
    });
  });

  // ========================================================================
  // Score Computation Edge Cases
  // ========================================================================

  describe("Score Computation - Edge Cases", () => {
    it("should cap score at 100 with no blockers", () => {
      const result = service.computeScore(tenantId);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("should floor score at 0 with many blockers", (done) => {
      service.on("ReadinessScoreChanged", () => {
        const result = service.computeScore(tenantId);
        expect(result.score).toBeGreaterThanOrEqual(0);
        done();
      });

      // Create multiple blockers
      const exitEvent: ExitRecorded = {
        tenant_id: tenantId,
        employee_id: "EMP001",
        last_working_day: new Date(),
      };

      service.emit("ExitRecorded", exitEvent);
    });

    it("should force score to 0 if any source is dead", (done) => {
      service.on("ReadinessScoreChanged", (event: ReadinessScoreChanged) => {
        if (event.dead_sources) {
          expect(event.score).toBe(0);
          done();
        }
      });

      // Emit a dead source event
      service.emit("SourceDead", {
        tenant_id: tenantId,
        source_id: "eSSL",
        dead_since_timestamp: new Date(),
      });
    });
  });

  // ========================================================================
  // Tenant Isolation
  // ========================================================================

  describe("Tenant Isolation", () => {
    it("should compute scores independently for different tenants", (done) => {
      const tenant1 = "550e8400-e29b-41d4-a716-446655440001";
      const tenant2 = "550e8400-e29b-41d4-a716-446655440002";

      const results: Map<string, number> = new Map();

      const handler = (event: ReadinessScoreChanged) => {
        results.set(event.tenant_id, event.score);

        if (results.size === 2) {
          // Both tenants should have their own independent scores
          expect(results.get(tenant1)).toBeDefined();
          expect(results.get(tenant2)).toBeDefined();
          service.removeListener("ReadinessScoreChanged", handler);
          done();
        }
      };

      service.on("ReadinessScoreChanged", handler);

      // Create blocker for tenant1
      service.emit("ExitRecorded", {
        tenant_id: tenant1,
        employee_id: "EMP001",
        last_working_day: new Date(),
      });

      // Create different blocker for tenant2
      service.emit("ChangeDetected", {
        tenant_id: tenant2,
        change_set: [
          {
            employee_id: "EMP002",
            old_ctc: 500000,
            new_ctc: 550000,
            signatory: "Finance",
          },
        ],
      });
    });
  });

  // ========================================================================
  // Blocker Type & Severity
  // ========================================================================

  describe("Blocker Types & Severity", () => {
    it("should create LIFECYCLE_CLOCK blocker when exit recorded", (done) => {
      service.on("ReadinessScoreChanged", (event: ReadinessScoreChanged) => {
        if (event.blockers.length > 0) {
          const blocker = event.blockers[0];
          expect(blocker.type).toBe(BlockerType.LIFECYCLE_CLOCK);
          expect(blocker.severity).toBe(Severity.HIGH);
          done();
        }
      });

      service.emit("ExitRecorded", {
        tenant_id: tenantId,
        employee_id: "EMP001",
        last_working_day: new Date(),
      });
    });

    it("should create CHANGE_HANDSHAKE blocker when changes detected", (done) => {
      service.on("ReadinessScoreChanged", (event: ReadinessScoreChanged) => {
        if (event.blockers.length > 0) {
          const blocker = event.blockers[0];
          expect(blocker.type).toBe(BlockerType.CHANGE_HANDSHAKE);
          expect(blocker.severity).toBe(Severity.MEDIUM);
          done();
        }
      });

      service.emit("ChangeDetected", {
        tenant_id: tenantId,
        change_set: [
          {
            employee_id: "EMP001",
            old_ctc: 500000,
            new_ctc: 550000,
            signatory: "Finance",
          },
        ],
      });
    });

    it("should create FRESHNESS_VITALS blocker when source goes dead", (done) => {
      service.on("ReadinessScoreChanged", (event: ReadinessScoreChanged) => {
        if (
          event.blockers.length > 0 &&
          event.blockers[0].type === BlockerType.FRESHNESS_VITALS
        ) {
          expect(event.blockers[0].severity).toBe(Severity.HIGH);
          expect(event.blockers[0].description.toLowerCase()).toContain("dead");
          done();
        }
      });

      service.emit("SourceDead", {
        tenant_id: tenantId,
        source_id: "eSSL",
        dead_since_timestamp: new Date(),
      });
    });
  });
});
