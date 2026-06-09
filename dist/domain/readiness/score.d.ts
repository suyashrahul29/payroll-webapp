/**
 * Score Computation Logic (Pure Functions)
 *
 * This module contains pure functions for computing the Readiness Score.
 * Pure functions are deterministic and fully testable with no side effects.
 */
import { Blocker } from "../models/blocker.js";
import { SourceFreshness } from "../models/source-freshness.js";
/**
 * Readiness score computation result
 */
export interface ScoreResult {
    score: number;
    activeBlockers: Blocker[];
    deadSources: boolean;
}
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
export declare function computeScore(blockers: Blocker[], sourceFreshness: SourceFreshness[], currentTime?: Date): ScoreResult;
/**
 * Simplified score computation when only blockers are known
 * (useful for unit testing)
 */
export declare function computeScoreFromBlockers(blockers: Blocker[]): number;
/**
 * Determine if a score change is significant enough to emit an event
 * (Used to avoid flooding the system with redundant events)
 *
 * Threshold: score change of 1 or more, or blocker list change
 */
export declare function isScoreChangeSignificant(oldScore: number, newScore: number, oldBlockerCount: number, newBlockerCount: number): boolean;
//# sourceMappingURL=score.d.ts.map