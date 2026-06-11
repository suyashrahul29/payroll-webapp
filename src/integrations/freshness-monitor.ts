/**
 * FreshnessMonitor — tracks per-source sync freshness and emits state transitions.
 *
 * State model:
 *   FRESH  : now - lastSuccessAt <= threshold
 *   STALE  : threshold < now - lastSuccessAt <= threshold * 2
 *   DEAD   : now - lastSuccessAt > threshold * 2  OR  lastSuccessAt === null
 *
 * MANUAL sources never go stale (threshold = Infinity).
 */

import { SourceType } from "../domain/events";
import type { SourceSynced } from "../domain/events";

// ─── Staleness threshold defaults (ms) ────────────────────────────────────────
export const DEFAULT_THRESHOLDS: Record<SourceType, number> = {
  [SourceType.BIOMETRIC]: 2 * 60 * 60 * 1000,   // 2 h
  [SourceType.FINANCE]:   4 * 60 * 60 * 1000,   // 4 h
  [SourceType.BANK]:     24 * 60 * 60 * 1000,   // 24 h
  [SourceType.MANUAL]:   Infinity,               // never stale
};

// ─── Public types ─────────────────────────────────────────────────────────────

export interface SourceFreshnessState {
  sourceId: string;
  sourceName: string;
  sourceType: SourceType;
  tenantId: string;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  state: "FRESH" | "STALE" | "DEAD";
  stalenessThresholdMs: number;
  failureReason?: string;
}

export interface SourceFreshnessStateChange {
  sourceId: string;
  previousState: "FRESH" | "STALE" | "DEAD";
  newState: "FRESH" | "STALE" | "DEAD";
  at: Date;
}

interface RegisterConfig {
  sourceId: string;
  sourceName: string;
  sourceType: SourceType;
  tenantId: string;
  stalenessThresholdMs?: number;
}

// ─── FreshnessMonitor ─────────────────────────────────────────────────────────

export class FreshnessMonitor {
  private states: Map<string, SourceFreshnessState> = new Map();
  readonly checkInterval: number = 15 * 60 * 1000; // 15 min (exposed for tests)

  /** Register a source to be monitored. Idempotent — re-registering updates config. */
  registerSource(config: RegisterConfig): void {
    const threshold =
      config.stalenessThresholdMs ??
      DEFAULT_THRESHOLDS[config.sourceType];

    const existing = this.states.get(config.sourceId);

    this.states.set(config.sourceId, {
      sourceId: config.sourceId,
      sourceName: config.sourceName,
      sourceType: config.sourceType,
      tenantId: config.tenantId,
      lastSuccessAt: existing?.lastSuccessAt ?? null,
      lastFailureAt: existing?.lastFailureAt ?? null,
      state: existing?.state ?? "DEAD",
      stalenessThresholdMs: threshold,
      failureReason: existing?.failureReason,
    });
  }

  /** Called when a SourceSynced domain event is received. */
  onSourceSynced(event: SourceSynced): void {
    const s = this.states.get(event.source_id);
    if (!s) return; // source not registered — ignore

    s.lastSuccessAt = event.timestamp;
    s.failureReason = undefined;
    s.state = this.computeState(s.lastSuccessAt, s.stalenessThresholdMs, new Date());
  }

  /** Called when a sync attempt fails for a source. */
  onSourceFailed(sourceId: string, reason: string): void {
    const s = this.states.get(sourceId);
    if (!s) return;

    s.lastFailureAt = new Date();
    s.failureReason = reason;
    // Do NOT clear lastSuccessAt — last good sync still counts.
    // State will naturally transition on next checkFreshness().
  }

  /**
   * Run a freshness check across all registered sources.
   * Returns only the state transitions that occurred — calling twice
   * without time advancing returns an empty array (idempotent).
   */
  checkFreshness(now: Date = new Date()): SourceFreshnessStateChange[] {
    const changes: SourceFreshnessStateChange[] = [];

    for (const s of this.states.values()) {
      const newState = this.computeState(s.lastSuccessAt, s.stalenessThresholdMs, now);
      if (newState !== s.state) {
        changes.push({
          sourceId: s.sourceId,
          previousState: s.state,
          newState,
          at: now,
        });
        s.state = newState;
      }
    }

    return changes;
  }

  /** Get current state for a source. */
  getState(sourceId: string): SourceFreshnessState | undefined {
    return this.states.get(sourceId);
  }

  /** Get all states for a tenant. */
  getTenantStates(tenantId: string): SourceFreshnessState[] {
    return Array.from(this.states.values()).filter(
      (s) => s.tenantId === tenantId
    );
  }

  /**
   * Pure function — compute freshness state from inputs alone.
   * MANUAL sources use threshold = Infinity so age can never exceed it.
   */
  computeState(
    lastSuccessAt: Date | null,
    thresholdMs: number,
    now: Date
  ): "FRESH" | "STALE" | "DEAD" {
    if (lastSuccessAt === null) return "DEAD";
    if (thresholdMs === Infinity) return "FRESH"; // MANUAL — never stale

    const ageMs = now.getTime() - lastSuccessAt.getTime();

    if (ageMs <= thresholdMs) return "FRESH";
    if (ageMs <= thresholdMs * 2) return "STALE";
    return "DEAD";
  }
}
