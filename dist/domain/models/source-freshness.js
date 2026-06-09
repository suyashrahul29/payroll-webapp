/**
 * Source Freshness Domain Model
 *
 * Tracks per-source (tenant, source) freshness state and last sync timestamp.
 * Used to feed Data Freshness Vitals and determine if sources are stale/dead.
 */
import { FreshnessState } from "../events.js";
/**
 * Create a new source freshness record
 */
export function createSourceFreshness(id, tenant_id, source_name, source_type, staleness_threshold_seconds = 7200 // 2 hours default
) {
    return {
        id,
        tenant_id,
        source_name,
        source_type,
        last_success_at: null,
        last_failure_at: null,
        state: FreshnessState.FRESH, // Default to fresh until proven otherwise
        staleness_threshold_seconds,
        updated_at: new Date(),
    };
}
/**
 * Update source freshness to FRESH (successful sync)
 */
export function recordSuccessfulSync(record, timestamp = new Date()) {
    return {
        ...record,
        last_success_at: timestamp,
        state: FreshnessState.FRESH,
        updated_at: timestamp,
    };
}
/**
 * Mark source as STALE (not synced within threshold)
 */
export function markAsStale(record, timestamp = new Date()) {
    return {
        ...record,
        state: FreshnessState.STALE,
        updated_at: timestamp,
    };
}
/**
 * Mark source as DEAD (not synced for 24h+)
 */
export function markAsDead(record, timestamp = new Date()) {
    return {
        ...record,
        state: FreshnessState.DEAD,
        updated_at: timestamp,
    };
}
/**
 * Determine freshness state based on last_success_at timestamp
 *
 * - FRESH: last sync was within staleness threshold
 * - STALE: last sync was beyond threshold but within 24h
 * - DEAD: last sync was >24h ago or never synced
 */
export function determineFreshnessState(record, currentTime = new Date()) {
    if (record.last_success_at === null) {
        return FreshnessState.DEAD;
    }
    const timeSinceLastSync = (currentTime.getTime() - record.last_success_at.getTime()) / 1000; // seconds
    // Threshold 1: Dead (24 hours = 86400 seconds)
    if (timeSinceLastSync > 86400) {
        return FreshnessState.DEAD;
    }
    // Threshold 2: Stale (beyond staleness_threshold_seconds)
    if (timeSinceLastSync > record.staleness_threshold_seconds) {
        return FreshnessState.STALE;
    }
    // Otherwise: Fresh
    return FreshnessState.FRESH;
}
/**
 * Get human-readable freshness message
 * e.g., "Live · 4 min", "Stale · 5 hours", "Dead · 24h+"
 */
export function getReadableFreshnessPhrase(record, currentTime = new Date()) {
    if (record.last_success_at === null) {
        return "Dead · never synced";
    }
    const timeSinceLastSync = (currentTime.getTime() - record.last_success_at.getTime()) / 1000; // seconds
    if (timeSinceLastSync < 60) {
        return `Live · just now`;
    }
    const minutes = Math.floor(timeSinceLastSync / 60);
    if (minutes < 60) {
        return `Live · ${minutes} min`;
    }
    const hours = Math.floor(timeSinceLastSync / 3600);
    if (hours < 24) {
        return `${record.state} · ${hours}h`;
    }
    const days = Math.floor(timeSinceLastSync / 86400);
    if (days === 1) {
        return `${record.state} · 1 day`;
    }
    if (days > 7) {
        return `${record.state} · 24h+`;
    }
    return `${record.state} · ${days} days`;
}
//# sourceMappingURL=source-freshness.js.map