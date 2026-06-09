/**
 * Domain Events for Payroll Readiness System
 *
 * This module defines all domain events that trigger readiness score recomputation.
 * Events are the backbone of the event-driven architecture.
 */

import { z } from "zod";

// ============================================================================
// ENUMS
// ============================================================================

export enum BlockerType {
  FRESHNESS_VITALS = "FRESHNESS_VITALS",
  CHANGE_HANDSHAKE = "CHANGE_HANDSHAKE",
  LIFECYCLE_CLOCK = "LIFECYCLE_CLOCK",
  PREFLIGHT = "PREFLIGHT",
}

export enum Severity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
}

export enum SourceType {
  BIOMETRIC = "BIOMETRIC",
  FINANCE = "FINANCE",
  BANK = "BANK",
  MANUAL = "MANUAL",
}

export enum FreshnessState {
  FRESH = "FRESH",
  STALE = "STALE",
  DEAD = "DEAD",
}

// ============================================================================
// EVENT SCHEMAS (for validation)
// ============================================================================

/** Event: A source has successfully synced */
export const SourceSyncedSchema = z.object({
  tenant_id: z.string().uuid(),
  source_id: z.string(),
  timestamp: z.date(),
});
export type SourceSynced = z.infer<typeof SourceSyncedSchema>;

/** Event: A source has gone stale (not synced within threshold) */
export const SourceWentStaleSchema = z.object({
  tenant_id: z.string().uuid(),
  source_id: z.string(),
  staleness_threshold_exceeded_at: z.date(),
});
export type SourceWentStale = z.infer<typeof SourceWentStaleSchema>;

/** Event: A source has been dead (not synced for 24h+) */
export const SourceDeadSchema = z.object({
  tenant_id: z.string().uuid(),
  source_id: z.string(),
  dead_since_timestamp: z.date(),
});
export type SourceDead = z.infer<typeof SourceDeadSchema>;

/** Event: CTC or salary structure changes detected from upstream source */
export const ChangeDetectedSchema = z.object({
  tenant_id: z.string().uuid(),
  change_set: z.array(
    z.object({
      employee_id: z.string(),
      old_ctc: z.number().int(),
      new_ctc: z.number().int(),
      signatory: z.string(),
    })
  ),
});
export type ChangeDetected = z.infer<typeof ChangeDetectedSchema>;

/** Event: Changes have been signed off by operator */
export const ChangeSignedOffSchema = z.object({
  tenant_id: z.string().uuid(),
  change_id: z.string(),
  signed_by: z.string(),
  timestamp: z.date(),
});
export type ChangeSignedOff = z.infer<typeof ChangeSignedOffSchema>;

/** Event: Employee exit recorded */
export const ExitRecordedSchema = z.object({
  tenant_id: z.string().uuid(),
  employee_id: z.string(),
  last_working_day: z.date(),
});
export type ExitRecorded = z.infer<typeof ExitRecordedSchema>;

/** Event: Full & Final settlement has been completed */
export const FFSettledSchema = z.object({
  tenant_id: z.string().uuid(),
  employee_id: z.string(),
  settlement_amount: z.number().int(),
  timestamp: z.date(),
});
export type FFSettled = z.infer<typeof FFSettledSchema>;

/** Event: Pre-flight checklist item status changed */
export const PreFlightItemChangedSchema = z.object({
  tenant_id: z.string().uuid(),
  check_id: z.string(),
  status: z.enum(["PASS", "FAIL"]),
});
export type PreFlightItemChanged = z.infer<typeof PreFlightItemChangedSchema>;

/** Event: Readiness score has been recomputed */
export const ReadinessScoreChangedSchema = z.object({
  tenant_id: z.string().uuid(),
  score: z.number().int().min(0).max(100),
  blockers: z.array(
    z.object({
      id: z.string().uuid(),
      type: z.nativeEnum(BlockerType),
      severity: z.nativeEnum(Severity),
      description: z.string(),
      action_button: z.string().optional(),
    })
  ),
  dead_sources: z.boolean(),
  timestamp: z.date(),
});
export type ReadinessScoreChanged = z.infer<
  typeof ReadinessScoreChangedSchema
>;

// ============================================================================
// UNIFIED EVENT TYPE
// ============================================================================

export type DomainEvent =
  | SourceSynced
  | SourceWentStale
  | SourceDead
  | ChangeDetected
  | ChangeSignedOff
  | ExitRecorded
  | FFSettled
  | PreFlightItemChanged
  | ReadinessScoreChanged;

/**
 * Validate an event payload against its schema
 * @param eventType - The name of the event
 * @param payload - The event payload to validate
 * @throws ZodError if validation fails
 */
export function validateEvent(
  eventType: string,
  payload: unknown
): DomainEvent {
  switch (eventType) {
    case "SourceSynced":
      return SourceSyncedSchema.parse(payload);
    case "SourceWentStale":
      return SourceWentStaleSchema.parse(payload);
    case "SourceDead":
      return SourceDeadSchema.parse(payload);
    case "ChangeDetected":
      return ChangeDetectedSchema.parse(payload);
    case "ChangeSignedOff":
      return ChangeSignedOffSchema.parse(payload);
    case "ExitRecorded":
      return ExitRecordedSchema.parse(payload);
    case "FFSettled":
      return FFSettledSchema.parse(payload);
    case "PreFlightItemChanged":
      return PreFlightItemChangedSchema.parse(payload);
    case "ReadinessScoreChanged":
      return ReadinessScoreChangedSchema.parse(payload);
    default:
      throw new Error(`Unknown event type: ${eventType}`);
  }
}
