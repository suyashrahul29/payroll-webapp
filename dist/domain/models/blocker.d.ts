/**
 * Blocker Domain Model
 *
 * Represents a discrete input problem that holds the Readiness Score below 100%.
 * Blockers are append-only: they record creation, resolution, and reopening timestamps.
 */
import { BlockerType, Severity } from "../events.js";
/**
 * Blocker entity
 *
 * Invariant: All timestamps are immutable once set. State changes (resolution/reopening)
 * are recorded as new timestamp fields, preserving the audit trail.
 */
export interface Blocker {
    id: string;
    tenant_id: string;
    blocker_type: BlockerType;
    blocker_category: string;
    severity: Severity;
    description: string;
    blocking_record_ids: string[];
    created_at: Date;
    resolved_at: Date | null;
    reopened_at: Date | null;
}
/**
 * Create a new blocker
 */
export declare function createBlocker(id: string, tenant_id: string, blocker_type: BlockerType, blocker_category: string, severity: Severity, description: string, blocking_record_ids: string[]): Blocker;
/**
 * Calculate impact of this blocker on the readiness score
 *
 * Score impact algorithm:
 * - FRESHNESS_VITALS (DEAD) → 100 points
 * - FRESHNESS_VITALS (STALE) → 15 points
 * - CHANGE_HANDSHAKE (MEDIUM) → 15 points
 * - LIFECYCLE_CLOCK (HIGH, <24h) → 15 points
 * - PREFLIGHT → remaining points
 *
 * @returns Points deducted from 100 for this blocker
 */
export declare function calculateBlockerImpact(blocker: Blocker): number;
/**
 * Check if this blocker is a "dead source" blocker
 *
 * Dead source blockers force the score to 0 regardless of other state.
 */
export declare function isDeadSourceBlocker(blocker: Blocker): boolean;
//# sourceMappingURL=blocker.d.ts.map