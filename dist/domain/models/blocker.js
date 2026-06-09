/**
 * Blocker Domain Model
 *
 * Represents a discrete input problem that holds the Readiness Score below 100%.
 * Blockers are append-only: they record creation, resolution, and reopening timestamps.
 */
import { BlockerType } from "../events.js";
/**
 * Create a new blocker
 */
export function createBlocker(id, tenant_id, blocker_type, blocker_category, severity, description, blocking_record_ids) {
    return {
        id,
        tenant_id,
        blocker_type,
        blocker_category,
        severity,
        description,
        blocking_record_ids,
        created_at: new Date(),
        resolved_at: null,
        reopened_at: null,
    };
}
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
export function calculateBlockerImpact(blocker) {
    // Only active (unresolved) blockers contribute to score impact
    if (blocker.resolved_at !== null) {
        return 0;
    }
    switch (blocker.blocker_type) {
        case BlockerType.FRESHNESS_VITALS:
            // DEAD source → 100 points (forces score to 0)
            // STALE source → 15 points
            if (blocker.description.includes("Dead")) {
                return 100;
            }
            return 15;
        case BlockerType.CHANGE_HANDSHAKE:
            // Unconfirmed changes → 15 points
            return 15;
        case BlockerType.LIFECYCLE_CLOCK:
            // Exit with F&F pending → 15 points
            return 15;
        case BlockerType.PREFLIGHT:
            // Pre-flight failures → 10 points
            return 10;
        default:
            return 0;
    }
}
/**
 * Check if this blocker is a "dead source" blocker
 *
 * Dead source blockers force the score to 0 regardless of other state.
 */
export function isDeadSourceBlocker(blocker) {
    return (blocker.blocker_type === BlockerType.FRESHNESS_VITALS &&
        blocker.description.toLowerCase().includes("dead"));
}
//# sourceMappingURL=blocker.js.map