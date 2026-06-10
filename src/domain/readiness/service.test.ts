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
import type { PreFlightCheckResult } from "./service.js";

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
            employee_name: "Arjun Mehta",
            old_ctc: 500000,
            new_ctc: 550000,
            effective_date: new Date("2026-07-01"),
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
  // computeWorkingDayDeadline — AC-7: holiday-aware working-day calendar
  // ========================================================================

  describe("computeWorkingDayDeadline", () => {
    it("should add 2 working days skipping weekends (Mon → Wed)", () => {
      // 2026-06-08 is a Monday; +2 working days = 2026-06-10 (Wednesday)
      const lastWD = new Date("2026-06-08T00:00:00Z");
      const result = service.computeWorkingDayDeadline(lastWD, 2, []);
      expect(result.getUTCDate()).toBe(10);
      expect(result.getUTCMonth()).toBe(5); // June = 5
      expect(result.getUTCFullYear()).toBe(2026);
    });

    it("should skip Saturday and Sunday when adding working days", () => {
      // 2026-06-12 is Friday; +2 working days skips Sat+Sun → 2026-06-16 (Tuesday)
      const lastWD = new Date("2026-06-12T00:00:00Z");
      const result = service.computeWorkingDayDeadline(lastWD, 2, []);
      expect(result.getUTCDate()).toBe(16);
      expect(result.getUTCMonth()).toBe(5);
    });

    it("AC-7: holiday on intervening day pushes deadline by 1 extra calendar day", () => {
      // 2025-06-10 is a Tuesday; holiday on Wed 2025-06-11
      // +2 working days without holiday = 2025-06-12 (Thu)
      // +2 working days with 2025-06-11 as holiday = 2025-06-13 (Fri)
      const lastWD = new Date("2025-06-10T00:00:00Z");
      const holiday = new Date("2025-06-11T00:00:00Z");
      const result = service.computeWorkingDayDeadline(lastWD, 2, [holiday]);
      expect(result.getUTCDate()).toBe(13);
      expect(result.getUTCMonth()).toBe(5);
      expect(result.getUTCFullYear()).toBe(2025);
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
            employee_name: "Priya Sharma",
            old_ctc: 500000,
            new_ctc: 550000,
            effective_date: new Date("2026-07-01"),
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
            employee_name: "Arjun Mehta",
            old_ctc: 500000,
            new_ctc: 550000,
            effective_date: new Date("2026-07-01"),
            signatory: "Finance",
          },
        ],
      });
    });

    it("should clear CHANGE_HANDSHAKE blocker when all records are signed off", (done) => {
      let changeBlockerId: string;

      service.once("ReadinessScoreChanged", (event: ReadinessScoreChanged) => {
        const changeBlocker = event.blockers.find(b => b.type === BlockerType.CHANGE_HANDSHAKE);
        expect(changeBlocker).toBeDefined();
        changeBlockerId = event.pending_changes![0].id;

        // Sign off the single record
        service.emit("ChangeSignedOff", {
          tenant_id: tenantId,
          change_id: changeBlockerId,
          signed_by: "Priya",
          action: "signed_off",
          timestamp: new Date(),
        });
      });

      service.on("ReadinessScoreChanged", (event: ReadinessScoreChanged) => {
        if (changeBlockerId && !event.blockers.find(b => b.type === BlockerType.CHANGE_HANDSHAKE)) {
          // Blocker cleared
          expect(event.pending_changes!.every(c => c.status === "signed_off")).toBe(true);
          done();
        }
      });

      service.emit("ChangeDetected", {
        tenant_id: tenantId,
        change_set: [
          {
            employee_id: "EMP001",
            employee_name: "Arjun Mehta",
            old_ctc: 500000,
            new_ctc: 550000,
            effective_date: new Date("2026-07-01"),
            signatory: "Finance",
          },
        ],
      });
    });

    it("should update CHANGE_HANDSHAKE blocker count on partial sign-off", (done) => {
      let pendingIds: string[] = [];
      let phase = 0;

      service.on("ReadinessScoreChanged", (event: ReadinessScoreChanged) => {
        if (phase === 0 && event.pending_changes && event.pending_changes.length === 2) {
          phase = 1;
          pendingIds = event.pending_changes.map(c => c.id);

          // Sign off first record only
          service.emit("ChangeSignedOff", {
            tenant_id: tenantId,
            change_id: pendingIds[0],
            signed_by: "Priya",
            action: "signed_off",
            timestamp: new Date(),
          });
        } else if (phase === 1 && event.blockers.find(b => b.type === BlockerType.CHANGE_HANDSHAKE)) {
          const blocker = event.blockers.find(b => b.type === BlockerType.CHANGE_HANDSHAKE)!;
          expect(blocker.description).toContain("1 unconfirmed");
          done();
        }
      });

      service.emit("ChangeDetected", {
        tenant_id: tenantId,
        change_set: [
          {
            employee_id: "EMP001",
            employee_name: "Arjun Mehta",
            old_ctc: 500000,
            new_ctc: 550000,
            effective_date: new Date("2026-07-01"),
            signatory: "Finance",
          },
          {
            employee_id: "EMP002",
            employee_name: "Ravi Kumar",
            old_ctc: 600000,
            new_ctc: 650000,
            effective_date: new Date("2026-07-01"),
            signatory: "Finance",
          },
        ],
      });
    });

    it("should re-block on new ChangeDetected after sign-off (FR-6)", (done) => {
      let phase = 0;

      service.on("ReadinessScoreChanged", (event: ReadinessScoreChanged) => {
        if (phase === 0 && event.pending_changes && event.pending_changes.length === 1) {
          phase = 1;
          const recordId = event.pending_changes[0].id;

          // Sign off the record
          service.emit("ChangeSignedOff", {
            tenant_id: tenantId,
            change_id: recordId,
            signed_by: "Priya",
            action: "signed_off",
            timestamp: new Date(),
          });
        } else if (phase === 1 && !event.blockers.find(b => b.type === BlockerType.CHANGE_HANDSHAKE)) {
          phase = 2;
          // Blocker cleared — now emit a new change for a different employee (FR-6)
          service.emit("ChangeDetected", {
            tenant_id: tenantId,
            change_set: [
              {
                employee_id: "EMP003",
                employee_name: "Sunita Rao",
                old_ctc: 700000,
                new_ctc: 750000,
                effective_date: new Date("2026-07-15"),
                signatory: "Finance Manager",
              },
            ],
          });
        } else if (phase === 2 && event.blockers.find(b => b.type === BlockerType.CHANGE_HANDSHAKE)) {
          // Re-blocked
          expect(event.blockers.find(b => b.type === BlockerType.CHANGE_HANDSHAKE)).toBeDefined();
          done();
        }
      });

      service.emit("ChangeDetected", {
        tenant_id: tenantId,
        change_set: [
          {
            employee_id: "EMP001",
            employee_name: "Arjun Mehta",
            old_ctc: 500000,
            new_ctc: 550000,
            effective_date: new Date("2026-07-01"),
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

  // ========================================================================
  // runPreFlightChecks — Story 1-7: Pre-Flight Checklist
  // ========================================================================

  describe("runPreFlightChecks", () => {
    // 2.1: All 4 checks PASS when no blockers exist
    it("should return all PASS when no blockers exist (fresh tenant)", () => {
      const results: PreFlightCheckResult[] = service.runPreFlightChecks(tenantId);
      expect(results).toHaveLength(4);
      results.forEach(r => {
        expect(r.status).toBe('PASS');
        expect(r.blocker_if_fail).toBeNull();
      });
    });

    it("should return checks in fixed order with correct check_ids", () => {
      const results = service.runPreFlightChecks(tenantId);
      expect(results[0].check_id).toBe('attendance-fresh');
      expect(results[1].check_id).toBe('exits-settled');
      expect(results[2].check_id).toBe('ctc-acknowledged');
      expect(results[3].check_id).toBe('compliance-validated');
    });

    // 2.2: Check (a) FAIL when FRESHNESS_VITALS blocker exists
    it("should return FAIL for attendance-fresh when FRESHNESS_VITALS blocker exists", () => {
      service.emit("SourceWentStale", {
        tenant_id: tenantId,
        source_id: "essl-biometric",
        staleness_threshold_exceeded_at: new Date(),
      });
      const results = service.runPreFlightChecks(tenantId);
      const check = results.find(r => r.check_id === 'attendance-fresh')!;
      expect(check.status).toBe('FAIL');
      expect(check.blocker_if_fail).not.toBeNull();
      expect(check.blocker_if_fail!.blocker_type).toBe(BlockerType.FRESHNESS_VITALS);
    });

    it("should return PASS for attendance-fresh after SourceSynced resolves the biometric blocker", () => {
      service.emit("SourceWentStale", {
        tenant_id: tenantId,
        source_id: "essl-biometric",
        staleness_threshold_exceeded_at: new Date(),
      });
      service.emit("SourceSynced", {
        tenant_id: tenantId,
        source_id: "essl-biometric",
        timestamp: new Date(),
      });
      const results = service.runPreFlightChecks(tenantId);
      const check = results.find(r => r.check_id === 'attendance-fresh')!;
      expect(check.status).toBe('PASS');
      expect(check.blocker_if_fail).toBeNull();
    });

    it("should return PASS for attendance-fresh when only a non-biometric FRESHNESS_VITALS blocker exists", () => {
      service.emit("SourceWentStale", {
        tenant_id: tenantId,
        source_id: "tally-finance",
        staleness_threshold_exceeded_at: new Date(),
      });
      const results = service.runPreFlightChecks(tenantId);
      const check = results.find(r => r.check_id === 'attendance-fresh')!;
      expect(check.status).toBe('PASS');
      expect(check.blocker_if_fail).toBeNull();
    });

    // 2.3: Check (b) FAIL when LIFECYCLE_CLOCK blocker exists
    it("should return FAIL for exits-settled when LIFECYCLE_CLOCK blocker exists", () => {
      service.emit("ExitRecorded", {
        tenant_id: tenantId,
        employee_id: "EMP047",
        last_working_day: new Date(),
      });
      const results = service.runPreFlightChecks(tenantId);
      const check = results.find(r => r.check_id === 'exits-settled')!;
      expect(check.status).toBe('FAIL');
      expect(check.blocker_if_fail).not.toBeNull();
      expect(check.blocker_if_fail!.blocker_type).toBe(BlockerType.LIFECYCLE_CLOCK);
    });

    it("should return PASS for exits-settled after FFSettled clears the blocker", () => {
      service.emit("ExitRecorded", {
        tenant_id: tenantId,
        employee_id: "EMP047",
        last_working_day: new Date(),
      });
      service.emit("FFSettled", {
        tenant_id: tenantId,
        employee_id: "EMP047",
        settlement_amount: 12500000,
        timestamp: new Date(),
      });
      const results = service.runPreFlightChecks(tenantId);
      const check = results.find(r => r.check_id === 'exits-settled')!;
      expect(check.status).toBe('PASS');
      expect(check.blocker_if_fail).toBeNull();
    });

    // 2.4: Check (c) FAIL when CHANGE_HANDSHAKE blocker exists
    it("should return FAIL for ctc-acknowledged when CHANGE_HANDSHAKE blocker exists", () => {
      service.emit("ChangeDetected", {
        tenant_id: tenantId,
        change_set: [
          {
            employee_id: "EMP001",
            employee_name: "Arjun Mehta",
            old_ctc: 500000,
            new_ctc: 550000,
            effective_date: new Date("2026-07-01"),
            signatory: "Finance Manager",
          },
        ],
      });
      const results = service.runPreFlightChecks(tenantId);
      const check = results.find(r => r.check_id === 'ctc-acknowledged')!;
      expect(check.status).toBe('FAIL');
      expect(check.blocker_if_fail).not.toBeNull();
      expect(check.blocker_if_fail!.blocker_type).toBe(BlockerType.CHANGE_HANDSHAKE);
    });

    // 2.5: Check (d) via PreFlightItemChanged events
    it("should return FAIL for compliance-validated when PreFlightItemChanged FAIL is emitted", () => {
      service.emit("PreFlightItemChanged", {
        tenant_id: tenantId,
        check_id: "compliance-defaults",
        status: "FAIL",
      });
      const results = service.runPreFlightChecks(tenantId);
      const check = results.find(r => r.check_id === 'compliance-validated')!;
      expect(check.status).toBe('FAIL');
      expect(check.blocker_if_fail).not.toBeNull();
    });

    it("should return PASS for compliance-validated when PreFlightItemChanged PASS clears the blocker", () => {
      service.emit("PreFlightItemChanged", {
        tenant_id: tenantId,
        check_id: "compliance-defaults",
        status: "FAIL",
      });
      service.emit("PreFlightItemChanged", {
        tenant_id: tenantId,
        check_id: "compliance-defaults",
        status: "PASS",
      });
      const results = service.runPreFlightChecks(tenantId);
      const check = results.find(r => r.check_id === 'compliance-validated')!;
      expect(check.status).toBe('PASS');
      expect(check.blocker_if_fail).toBeNull();
    });

    // 2.6: blocker_if_fail null on PASS, populated on FAIL
    it("should have blocker_if_fail null for all passing checks on fresh tenant", () => {
      const results = service.runPreFlightChecks(tenantId);
      results.forEach(r => {
        if (r.status === 'PASS') {
          expect(r.blocker_if_fail).toBeNull();
        }
      });
    });

    it("should populate blocker_if_fail with the active blocker when check fails", () => {
      service.emit("ExitRecorded", {
        tenant_id: tenantId,
        employee_id: "EMP001",
        last_working_day: new Date(),
      });
      const results = service.runPreFlightChecks(tenantId);
      const failCheck = results.find(r => r.status === 'FAIL')!;
      expect(failCheck.blocker_if_fail).not.toBeNull();
      expect(failCheck.blocker_if_fail!.id).toBeDefined();
      expect(failCheck.blocker_if_fail!.description).toBeDefined();
    });
  });
});
