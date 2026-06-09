/**
 * Score Computation Logic (Pure Functions)
 *
 * This module contains pure functions for computing the Readiness Score.
 * Pure functions are deterministic and fully testable with no side effects.
 */
import { calculateBlockerImpact, isDeadSourceBlocker } from "../models/blocker.js";
import { determineFreshnessState } from "../models/source-freshness.js";
import { FreshnessState } from "../events.js";
/**
 * Compute the Readiness Score for a tenant
 *
 * Algorithm:
 * - Start with score = 100
 * - Subtract impact of each active (unresolved) blocker
 * - If any source is DEAD, cap score at 0
 * - Clamp result to [0, 100]
 *
 * @param blockers - All blockers for the tenant
 * @param sourceFreshness - All source freshness records for the tenant
 * @param currentTime - Current time (for testing; defaults to now)
 * @returns Score result with score (0-100), active blockers, and dead sources flag
 */
export function computeScore(blockers, sourceFreshness, currentTime = new Date()) {
    // Filter to active (unresolved) blockers
    const activeBlockers = blockers.filter(b => b.resolved_at === null);
    // Check for dead sources
    const hasDeadSource = sourceFreshness.some(source => determineFreshnessState(source, currentTime) === FreshnessState.DEAD);
    // Calculate score impact from blockers
    let score = 100;
    for (const blocker of activeBlockers) {
        if (isDeadSourceBlocker(blocker)) {
            // Dead source blocker forces score to 0
            score = 0;
            break;
        }
        score -= calculateBlockerImpact(blocker);
    }
    // Hard floor: If any source is dead in freshness records, ensure score < 100
    if (hasDeadSource && score === 100) {
        score = 0;
    }
    // Clamp to [0, 100]
    score = Math.max(0, Math.min(100, score));
    return {
        score,
        activeBlockers,
        deadSources: hasDeadSource,
    };
}
/**
 * Simplified score computation when only blockers are known
 * (useful for unit testing)
 */
export function computeScoreFromBlockers(blockers) {
    let score = 100;
    for (const blocker of blockers) {
        if (blocker.resolved_at === null) {
            // Only active blockers count
            const impact = calculateBlockerImpact(blocker);
            if (impact === 100) {
                // Dead source blocker → force score to 0
                return 0;
            }
            score -= impact;
        }
    }
    return Math.max(0, Math.min(100, score));
}
/**
 * Determine if a score change is significant enough to emit an event
 * (Used to avoid flooding the system with redundant events)
 *
 * Threshold: score change of 1 or more, or blocker list change
 */
export function isScoreChangeSignificant(oldScore, newScore, oldBlockerCount, newBlockerCount) {
    return oldScore !== newScore || oldBlockerCount !== newBlockerCount;
}
//# sourceMappingURL=score.js.map