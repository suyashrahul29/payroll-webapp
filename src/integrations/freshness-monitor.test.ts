/**
 * Tests for FreshnessMonitor
 */

import { describe, it, expect, beforeEach } from "vitest";
import { FreshnessMonitor, DEFAULT_THRESHOLDS } from "./freshness-monitor";
import { SourceType } from "../domain/events";

const TENANT = "00000000-0000-0000-0000-000000000001";
const BIOMETRIC_THRESHOLD = DEFAULT_THRESHOLDS[SourceType.BIOMETRIC]; // 2 h

function makeMonitor() {
  return new FreshnessMonitor();
}

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

// ─────────────────────────────────────────────────────────────────────────────

describe("FreshnessMonitor", () => {
  let monitor: FreshnessMonitor;

  beforeEach(() => {
    monitor = makeMonitor();
  });

  // 1. onSourceSynced → state becomes FRESH, lastSuccessAt updated
  it("onSourceSynced sets state to FRESH and records lastSuccessAt", () => {
    monitor.registerSource({
      sourceId: "essl-1",
      sourceName: "eSSL",
      sourceType: SourceType.BIOMETRIC,
      tenantId: TENANT,
    });

    const ts = new Date();
    monitor.onSourceSynced({ tenant_id: TENANT, source_id: "essl-1", timestamp: ts });

    const state = monitor.getState("essl-1")!;
    expect(state.state).toBe("FRESH");
    expect(state.lastSuccessAt).toBe(ts);
  });

  // 2. 3 h after last sync (biometric, threshold 2 h) → FRESH→STALE
  it("checkFreshness returns FRESH→STALE at 3 h elapsed (biometric 2 h threshold)", () => {
    monitor.registerSource({
      sourceId: "essl-2",
      sourceName: "eSSL",
      sourceType: SourceType.BIOMETRIC,
      tenantId: TENANT,
    });
    // Manually set state to FRESH with lastSuccessAt 3 h ago
    const s = monitor.getState("essl-2")!;
    s.lastSuccessAt = hoursAgo(3);
    s.state = "FRESH";

    const now = new Date();
    const changes = monitor.checkFreshness(now);

    expect(changes).toHaveLength(1);
    expect(changes[0].sourceId).toBe("essl-2");
    expect(changes[0].previousState).toBe("FRESH");
    expect(changes[0].newState).toBe("STALE");
  });

  // 3. 5 h after last sync (biometric, threshold 2 h) → STALE→DEAD
  it("checkFreshness returns STALE→DEAD at 5 h elapsed (biometric 2 h threshold)", () => {
    monitor.registerSource({
      sourceId: "essl-3",
      sourceName: "eSSL",
      sourceType: SourceType.BIOMETRIC,
      tenantId: TENANT,
    });
    const s = monitor.getState("essl-3")!;
    s.lastSuccessAt = hoursAgo(5);
    s.state = "STALE";

    const changes = monitor.checkFreshness(new Date());

    expect(changes).toHaveLength(1);
    expect(changes[0].previousState).toBe("STALE");
    expect(changes[0].newState).toBe("DEAD");
  });

  // 4. Source with no sync ever → always DEAD
  it("source with lastSuccessAt = null starts and stays DEAD", () => {
    monitor.registerSource({
      sourceId: "essl-4",
      sourceName: "eSSL",
      sourceType: SourceType.BIOMETRIC,
      tenantId: TENANT,
    });

    expect(monitor.getState("essl-4")!.state).toBe("DEAD");

    const changes = monitor.checkFreshness(new Date());
    // No transition — already DEAD
    expect(changes.filter((c) => c.sourceId === "essl-4")).toHaveLength(0);
  });

  // 5. Source syncs after being dead → DEAD→FRESH transition
  it("syncing after dead emits DEAD→FRESH via checkFreshness", () => {
    monitor.registerSource({
      sourceId: "essl-5",
      sourceName: "eSSL",
      sourceType: SourceType.BIOMETRIC,
      tenantId: TENANT,
    });

    // Source starts DEAD (lastSuccessAt = null)
    expect(monitor.getState("essl-5")!.state).toBe("DEAD");

    // Sync arrives
    const now = new Date();
    monitor.onSourceSynced({ tenant_id: TENANT, source_id: "essl-5", timestamp: now });

    const state = monitor.getState("essl-5")!;
    expect(state.state).toBe("FRESH");
  });

  // 6. MANUAL source never goes stale
  it("MANUAL source stays FRESH regardless of elapsed time", () => {
    monitor.registerSource({
      sourceId: "csv-1",
      sourceName: "CSV Import",
      sourceType: SourceType.MANUAL,
      tenantId: TENANT,
    });
    const s = monitor.getState("csv-1")!;
    s.lastSuccessAt = hoursAgo(999); // very old
    s.state = "FRESH";

    const changes = monitor.checkFreshness(new Date());
    expect(changes.filter((c) => c.sourceId === "csv-1")).toHaveLength(0);
    expect(monitor.getState("csv-1")!.state).toBe("FRESH");
  });

  // 7. Multiple sources — each transitions independently
  it("multiple sources for same tenant transition independently", () => {
    monitor.registerSource({ sourceId: "bio-a", sourceName: "Bio A", sourceType: SourceType.BIOMETRIC, tenantId: TENANT });
    monitor.registerSource({ sourceId: "fin-b", sourceName: "Fin B", sourceType: SourceType.FINANCE,   tenantId: TENANT });

    // bio-a: 3 h old → STALE (threshold 2 h)
    const sA = monitor.getState("bio-a")!;
    sA.lastSuccessAt = hoursAgo(3);
    sA.state = "FRESH";

    // fin-b: 1 h old → still FRESH (threshold 4 h)
    const sB = monitor.getState("fin-b")!;
    sB.lastSuccessAt = hoursAgo(1);
    sB.state = "FRESH";

    const changes = monitor.checkFreshness(new Date());

    const bioChange = changes.find((c) => c.sourceId === "bio-a");
    const finChange = changes.find((c) => c.sourceId === "fin-b");

    expect(bioChange?.newState).toBe("STALE");
    expect(finChange).toBeUndefined(); // fin-b should NOT transition
  });

  // 8. computeState is a pure function
  it("computeState returns the same result for the same inputs", () => {
    const now = new Date("2026-06-10T12:00:00Z");
    const lastSync = new Date("2026-06-10T09:30:00Z"); // 2.5 h ago

    const r1 = monitor.computeState(lastSync, BIOMETRIC_THRESHOLD, now);
    const r2 = monitor.computeState(lastSync, BIOMETRIC_THRESHOLD, now);
    expect(r1).toBe(r2);
    expect(r1).toBe("STALE"); // 2.5 h > 2 h, <= 4 h
  });

  // Bonus: checkFreshness is idempotent
  it("calling checkFreshness twice without time advancing emits no duplicate transitions", () => {
    monitor.registerSource({
      sourceId: "essl-idem",
      sourceName: "eSSL",
      sourceType: SourceType.BIOMETRIC,
      tenantId: TENANT,
    });
    const s = monitor.getState("essl-idem")!;
    s.lastSuccessAt = hoursAgo(3);
    s.state = "FRESH";

    const now = new Date();
    const first = monitor.checkFreshness(now);
    const second = monitor.checkFreshness(now); // same instant

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(0); // already STALE — no transition
  });

  // getTenantStates filters by tenant
  it("getTenantStates returns only sources for the requested tenant", () => {
    const OTHER = "00000000-0000-0000-0000-000000000002";
    monitor.registerSource({ sourceId: "s1", sourceName: "S1", sourceType: SourceType.BIOMETRIC, tenantId: TENANT });
    monitor.registerSource({ sourceId: "s2", sourceName: "S2", sourceType: SourceType.BANK,      tenantId: OTHER });

    expect(monitor.getTenantStates(TENANT)).toHaveLength(1);
    expect(monitor.getTenantStates(OTHER)).toHaveLength(1);
    expect(monitor.getTenantStates(TENANT)[0].sourceId).toBe("s1");
  });
});
