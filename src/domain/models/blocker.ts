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
  id: string; // UUID
  tenant_id: string; // UUID
  blocker_type: BlockerType;
  blocker_category: string; // Human-readable category (e.g., "Exit Settlement")
  severity: Severity;
  description: string; // User-facing, e.g., "3 exits pending F&F — deadline: Thu 12 Jun"
  blocking_record_ids: string[]; // Array of IDs (employees, changes, etc.) causing this blocker
  created_at: Date;
  resolved_at: Date | null; // When this blocker was marked resolved
  reopened_at: Date | null; // When this blocker was reopened (post-sign-off change detected)
}

/**
 * Create a new blocker
 */
export function createBlocker(
  id: string,
  tenant_id: string,
  blocker_type: BlockerType,
  blocker_category: string,
  severity: Severity,
  description: string,
  blocking_record_ids: string[]
): Blocker {
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
export function calculateBlockerImpact(blocker: Blocker): number {
  // Only active (unresolved) blockers contribute to score impact
  if (blocker.resolved_at !== null) {
    return 0;
  }

  switch (blocker.blocker_type) {
    case BlockerType.FRESHNESS_VITALS:
      // Check if this is a DEAD source blocker
      if (isDeadSourceBlocker(blocker)) {
        return 100; // DEAD source → 100 points (forces score to 0)
      }
      return 15; // STALE source → 15 points

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
export function isDeadSourceBlocker(blocker: Blocker): boolean {
  return (
    blocker.blocker_type === BlockerType.FRESHNESS_VITALS &&
    (blocker.description.toLowerCase().includes("dead") ||
      blocker.description.toLowerCase().includes("sync dead"))
  );
}
