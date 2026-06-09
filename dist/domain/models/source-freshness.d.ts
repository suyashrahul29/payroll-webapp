/**
 * Source Freshness Domain Model
 *
 * Tracks per-source (tenant, source) freshness state and last sync timestamp.
 * Used to feed Data Freshness Vitals and determine if sources are stale/dead.
 */
import { SourceType, FreshnessState } from "../events.js";
/**
 * SourceFreshness entity
 *
 * One row per (tenant_id, source_name) pair.
 * State is derived from last_success_at timestamp and staleness_threshold_seconds.
 */
export interface SourceFreshness {
    id: string;
    tenant_id: string;
    source_name: string;
    source_type: SourceType;
    last_success_at: Date | null;
    last_failure_at: Date | null;
    state: FreshnessState;
    staleness_threshold_seconds: number;
    updated_at: Date;
}
/**
 * Create a new source freshness record
 */
export declare function createSourceFreshness(id: string, tenant_id: string, source_name: string, source_type: SourceType, staleness_threshold_seconds?: number): SourceFreshness;
/**
 * Update source freshness to FRESH (successful sync)
 */
export declare function recordSuccessfulSync(record: SourceFreshness, timestamp?: Date): SourceFreshness;
/**
 * Mark source as STALE (not synced within threshold)
 */
export declare function markAsStale(record: SourceFreshness, timestamp?: Date): SourceFreshness;
/**
 * Mark source as DEAD (not synced for 24h+)
 */
export declare function markAsDead(record: SourceFreshness, timestamp?: Date): SourceFreshness;
/**
 * Determine freshness state based on last_success_at timestamp
 *
 * - FRESH: last sync was within staleness threshold
 * - STALE: last sync was beyond threshold but within 24h
 * - DEAD: last sync was >24h ago or never synced
 */
export declare function determineFreshnessState(record: SourceFreshness, currentTime?: Date): FreshnessState;
/**
 * Get human-readable freshness message
 * e.g., "Live · 4 min", "Stale · 5 hours", "Dead · 24h+"
 */
export declare function getReadableFreshnessPhrase(record: SourceFreshness, currentTime?: Date): string;
//# sourceMappingURL=source-freshness.d.ts.map