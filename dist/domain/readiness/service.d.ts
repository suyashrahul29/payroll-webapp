/**
 * Readiness Service
 *
 * Core service that maintains readiness state and emits score changes.
 * Listens to domain events and recomputes the score in response.
 */
import { EventEmitter } from "events";
import { ReadinessScoreChanged } from "../events.js";
/**
 * ReadinessService
 *
 * Maintains the state of blockers and source freshness for a tenant.
 * Listens to events and recomputes the score when state changes.
 */
export declare class ReadinessService extends EventEmitter {
    /**
     * In-memory state (in production, would be fetched from DB)
     * tenant_id → state
     */
    private state;
    constructor();
    /**
     * Set up all event listeners
     */
    private setupEventListeners;
    /**
     * Get or create tenant state
     */
    private getTenantState;
    /**
     * Compute and return the current readiness score for a tenant
     */
    computeScore(tenant_id: string): ReadinessScoreChanged;
    /**
     * Get appropriate action button for a blocker type
     */
    private getActionButton;
    private handleSourceSynced;
    private handleSourceWentStale;
    private handleSourceDead;
    private handleChangeDetected;
    private handleChangeSignedOff;
    private handleExitRecorded;
    private handleFFSettled;
    private handlePreFlightItemChanged;
    /**
     * Recompute the score and emit event if score changed significantly
     */
    private recomputeAndEmitScore;
    /**
     * Detect source type from source name
     */
    private detectSourceType;
}
//# sourceMappingURL=service.d.ts.map