/**
 * Tests for DataCompleteService — Data-Complete Detection & TTFP Clock Start
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { DataCompleteService } from "./data-complete.js";
import { DomainEvent } from "../events.js";

const TENANT = "tenant-abc";
// 2 hours in ms (default biometric threshold)
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function makeService() {
  const emitted: DomainEvent[] = [];
  const emitter = (event: DomainEvent) => emitted.push(event);
  const svc = new DataCompleteService(emitter);
  return { svc, emitted };
}

describe("DataCompleteService", () => {
  describe("checkDataComplete — incomplete cases", () => {
    it("returns false when no employees imported", () => {
      const { svc } = makeService();
      const result = svc.checkDataComplete(TENANT);
      expect(result.isComplete).toBe(false);
      expect(result.timestamp).toBeNull();
      expect(result.missingConditions).toContain("No employees imported");
    });

    it("returns false when employees present but no biometric sync", () => {
      const { svc } = makeService();
      svc.updateEmployeeCount(TENANT, 10);
      svc.updateStatutoryIds(TENANT, 9, 9); // 90% coverage — OK
      const result = svc.checkDataComplete(TENANT);
      expect(result.isComplete).toBe(false);
      expect(result.missingConditions).toContain("No biometric sync in last 2 hours");
    });

    it("returns false when employees + biometric sync but PAN coverage < 80%", () => {
      const { svc } = makeService();
      const recentSync = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago
      svc.updateEmployeeCount(TENANT, 10);
      svc.updateStatutoryIds(TENANT, 6, 9); // 60% PAN — below threshold
      svc.onSourceSynced(TENANT, "BIOMETRIC", recentSync);
      const result = svc.checkDataComplete(TENANT);
      expect(result.isComplete).toBe(false);
      expect(
        result.missingConditions.some((m) => m.includes("60% have PAN"))
      ).toBe(true);
    });
  });

  describe("checkDataComplete — complete case", () => {
    it("returns true and emits DataComplete + TimeToFirstPayrollStarted when all conditions met", () => {
      const { svc, emitted } = makeService();
      const recentSync = new Date(Date.now() - 30 * 60 * 1000);
      svc.updateEmployeeCount(TENANT, 10);
      svc.updateStatutoryIds(TENANT, 9, 9); // 90% — OK
      svc.onSourceSynced(TENANT, "BIOMETRIC", recentSync);

      const result = svc.checkDataComplete(TENANT);
      expect(result.isComplete).toBe(true);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.missingConditions).toHaveLength(0);

      const types = emitted.map((e) => (e as { type: string }).type);
      expect(types).toContain("DataComplete");
      expect(types).toContain("TimeToFirstPayrollStarted");
    });

    it("does NOT re-emit events when checkDataComplete is called again after already complete", () => {
      const { svc, emitted } = makeService();
      const recentSync = new Date(Date.now() - 30 * 60 * 1000);
      svc.updateEmployeeCount(TENANT, 10);
      svc.updateStatutoryIds(TENANT, 9, 9);
      svc.onSourceSynced(TENANT, "BIOMETRIC", recentSync);

      // First call — transitions to complete, emits 2 events
      svc.checkDataComplete(TENANT);
      const countAfterFirst = emitted.length;

      // Subsequent calls — pure read, no new emissions
      svc.checkDataComplete(TENANT);
      svc.checkDataComplete(TENANT);
      expect(emitted.length).toBe(countAfterFirst);
    });
  });

  describe("getTTFPStatus", () => {
    it("returns startedAt after DataComplete and isRunning=true", () => {
      const { svc } = makeService();
      const recentSync = new Date(Date.now() - 30 * 60 * 1000);
      svc.updateEmployeeCount(TENANT, 5);
      svc.updateStatutoryIds(TENANT, 5, 5);
      svc.onSourceSynced(TENANT, "BIOMETRIC", recentSync);

      const status = svc.getTTFPStatus(TENANT);
      expect(status.startedAt).toBeInstanceOf(Date);
      expect(status.isRunning).toBe(true);
      expect(status.missingConditions).toHaveLength(0);
    });

    it("returns startedAt=null and isRunning=false when not yet complete", () => {
      const { svc } = makeService();
      const status = svc.getTTFPStatus(TENANT);
      expect(status.startedAt).toBeNull();
      expect(status.isRunning).toBe(false);
      expect(status.missingConditions.length).toBeGreaterThan(0);
    });
  });

  describe("edge cases", () => {
    it("resets to incomplete when all employees are removed after being complete", () => {
      const { svc } = makeService();
      const recentSync = new Date(Date.now() - 30 * 60 * 1000);
      svc.updateEmployeeCount(TENANT, 10);
      svc.updateStatutoryIds(TENANT, 9, 9);
      svc.onSourceSynced(TENANT, "BIOMETRIC", recentSync);

      // Verify complete first
      expect(svc.checkDataComplete(TENANT).isComplete).toBe(true);

      // Now remove all employees — edge case
      svc.updateEmployeeCount(TENANT, 0);
      const result = svc.checkDataComplete(TENANT);
      expect(result.isComplete).toBe(false);
      expect(result.missingConditions).toContain("No employees imported");
    });

    it("missing conditions list uses human-readable strings with specifics", () => {
      const { svc } = makeService();
      // 10 employees, 6 have PAN (60%), 7 have UAN (70%), biometric is stale
      const staleSync = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3h ago
      svc.updateEmployeeCount(TENANT, 10);
      svc.updateStatutoryIds(TENANT, 6, 7);
      svc.onSourceSynced(TENANT, "BIOMETRIC", staleSync);

      const result = svc.checkDataComplete(TENANT);
      expect(result.isComplete).toBe(false);

      // PAN condition
      expect(
        result.missingConditions.some((m) => m.includes("60% have PAN"))
      ).toBe(true);
      // UAN condition
      expect(
        result.missingConditions.some((m) => m.includes("70% have UAN"))
      ).toBe(true);
      // Biometric condition
      expect(
        result.missingConditions.some((m) =>
          m.includes("No biometric sync in last 2 hours")
        )
      ).toBe(true);
    });
  });
});
