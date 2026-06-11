/**
 * Data-Complete Detection Service
 *
 * Determines when all onboarding conditions are met to start the
 * Time-to-First-Payroll (TTFP) clock. Emits DataComplete and
 * TimeToFirstPayrollStarted domain events exactly once per tenant.
 */

import { DomainEvent } from "../events.js";

export interface TenantOnboardingState {
  tenantId: string;
  employeeCount: number;
  employeesWithPAN: number;
  employeesWithUAN: number;
  lastBiometricSyncAt: Date | null;
  biometricStalenessThresholdMs: number;
  dataCompleteAt: Date | null;
  ttfpStartedAt: Date | null;
}

export interface DataCompleteResult {
  isComplete: boolean;
  timestamp: Date | null;
  missingConditions: string[];
}

const DEFAULT_BIOMETRIC_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours
const STATUTORY_ID_COVERAGE_THRESHOLD = 0.8; // 80%

export class DataCompleteService {
  private states: Map<string, TenantOnboardingState> = new Map();
  private eventEmitter: (event: DomainEvent) => void;

  constructor(eventEmitter: (event: DomainEvent) => void) {
    this.eventEmitter = eventEmitter;
  }

  // ========================================================================
  // STATE UPDATERS
  // ========================================================================

  updateEmployeeCount(tenantId: string, count: number): void {
    const state = this.getOrCreateState(tenantId);
    state.employeeCount = count;
    this._evaluateAndTransition(tenantId);
  }

  updateStatutoryIds(
    tenantId: string,
    employeesWithPAN: number,
    employeesWithUAN: number
  ): void {
    const state = this.getOrCreateState(tenantId);
    state.employeesWithPAN = employeesWithPAN;
    state.employeesWithUAN = employeesWithUAN;
    this._evaluateAndTransition(tenantId);
  }

  onSourceSynced(
    tenantId: string,
    sourceType: "BIOMETRIC",
    syncedAt: Date
  ): void {
    if (sourceType !== "BIOMETRIC") return;
    const state = this.getOrCreateState(tenantId);
    state.lastBiometricSyncAt = syncedAt;
    this._evaluateAndTransition(tenantId);
  }

  // ========================================================================
  // QUERIES
  // ========================================================================

  /**
   * Pure query — reads current state, does NOT mutate.
   */
  checkDataComplete(tenantId: string): DataCompleteResult {
    const state = this.states.get(tenantId);

    // Already transitioned — return cached result
    if (state?.dataCompleteAt) {
      return {
        isComplete: true,
        timestamp: state.dataCompleteAt,
        missingConditions: [],
      };
    }

    const missingConditions = this._computeMissingConditions(
      state ?? this.defaultState(tenantId)
    );

    return {
      isComplete: missingConditions.length === 0,
      timestamp: null,
      missingConditions,
    };
  }

  getTTFPStatus(tenantId: string): {
    startedAt: Date | null;
    isRunning: boolean;
    missingConditions: string[];
  } {
    const state = this.states.get(tenantId);
    if (state?.ttfpStartedAt) {
      return { startedAt: state.ttfpStartedAt, isRunning: true, missingConditions: [] };
    }
    const missingConditions = this._computeMissingConditions(
      state ?? this.defaultState(tenantId)
    );
    return { startedAt: null, isRunning: false, missingConditions };
  }

  // ========================================================================
  // INTERNAL
  // ========================================================================

  private _evaluateAndTransition(tenantId: string): void {
    const state = this.states.get(tenantId)!;

    // Guard: only fire once
    if (state.dataCompleteAt !== null) return;

    const missingConditions = this._computeMissingConditions(state);
    if (missingConditions.length === 0) {
      this._onDataComplete(tenantId, new Date());
    }
  }

  private _onDataComplete(tenantId: string, at: Date): void {
    const state = this.states.get(tenantId)!;
    state.dataCompleteAt = at;
    state.ttfpStartedAt = at;

    this.eventEmitter({
      type: "DataComplete",
      tenantId,
      timestamp: at,
      employeeCount: state.employeeCount,
    } as DomainEvent);

    this.eventEmitter({
      type: "TimeToFirstPayrollStarted",
      tenantId,
      startedAt: at,
    } as DomainEvent);
  }

  private _computeMissingConditions(state: TenantOnboardingState): string[] {
    const missing: string[] = [];

    // Condition 1: employees imported
    if (state.employeeCount <= 0) {
      missing.push("No employees imported");
      return missing; // Skip ratio checks if no employees
    }

    // Condition 2: PAN coverage ≥ 80%
    const panCoverage = state.employeesWithPAN / state.employeeCount;
    if (panCoverage < STATUTORY_ID_COVERAGE_THRESHOLD) {
      const pct = Math.round(panCoverage * 100);
      missing.push(
        `Statutory IDs incomplete (${pct}% have PAN, need ≥80%)`
      );
    }

    // Condition 3: UAN coverage ≥ 80%
    const uanCoverage = state.employeesWithUAN / state.employeeCount;
    if (uanCoverage < STATUTORY_ID_COVERAGE_THRESHOLD) {
      const pct = Math.round(uanCoverage * 100);
      missing.push(
        `Statutory IDs incomplete (${pct}% have UAN, need ≥80%)`
      );
    }

    // Condition 4: biometric sync within freshness window
    const now = Date.now();
    if (
      state.lastBiometricSyncAt === null ||
      now - state.lastBiometricSyncAt.getTime() >
        state.biometricStalenessThresholdMs
    ) {
      const thresholdHours =
        state.biometricStalenessThresholdMs / (60 * 60 * 1000);
      missing.push(
        `No biometric sync in last ${thresholdHours} hour${thresholdHours === 1 ? "" : "s"}`
      );
    }

    return missing;
  }

  private getOrCreateState(tenantId: string): TenantOnboardingState {
    if (!this.states.has(tenantId)) {
      this.states.set(tenantId, this.defaultState(tenantId));
    }
    return this.states.get(tenantId)!;
  }

  private defaultState(tenantId: string): TenantOnboardingState {
    return {
      tenantId,
      employeeCount: 0,
      employeesWithPAN: 0,
      employeesWithUAN: 0,
      lastBiometricSyncAt: null,
      biometricStalenessThresholdMs: DEFAULT_BIOMETRIC_THRESHOLD_MS,
      dataCompleteAt: null,
      ttfpStartedAt: null,
    };
  }
}
