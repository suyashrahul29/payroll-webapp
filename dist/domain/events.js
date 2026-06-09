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
export var BlockerType;
(function (BlockerType) {
    BlockerType["FRESHNESS_VITALS"] = "FRESHNESS_VITALS";
    BlockerType["CHANGE_HANDSHAKE"] = "CHANGE_HANDSHAKE";
    BlockerType["LIFECYCLE_CLOCK"] = "LIFECYCLE_CLOCK";
    BlockerType["PREFLIGHT"] = "PREFLIGHT";
})(BlockerType || (BlockerType = {}));
export var Severity;
(function (Severity) {
    Severity["LOW"] = "LOW";
    Severity["MEDIUM"] = "MEDIUM";
    Severity["HIGH"] = "HIGH";
})(Severity || (Severity = {}));
export var SourceType;
(function (SourceType) {
    SourceType["BIOMETRIC"] = "BIOMETRIC";
    SourceType["FINANCE"] = "FINANCE";
    SourceType["BANK"] = "BANK";
    SourceType["MANUAL"] = "MANUAL";
})(SourceType || (SourceType = {}));
export var FreshnessState;
(function (FreshnessState) {
    FreshnessState["FRESH"] = "FRESH";
    FreshnessState["STALE"] = "STALE";
    FreshnessState["DEAD"] = "DEAD";
})(FreshnessState || (FreshnessState = {}));
// ============================================================================
// EVENT SCHEMAS (for validation)
// ============================================================================
/** Event: A source has successfully synced */
export const SourceSyncedSchema = z.object({
    tenant_id: z.string().uuid(),
    source_id: z.string(),
    timestamp: z.date(),
});
/** Event: A source has gone stale (not synced within threshold) */
export const SourceWentStaleSchema = z.object({
    tenant_id: z.string().uuid(),
    source_id: z.string(),
    staleness_threshold_exceeded_at: z.date(),
});
/** Event: A source has been dead (not synced for 24h+) */
export const SourceDeadSchema = z.object({
    tenant_id: z.string().uuid(),
    source_id: z.string(),
    dead_since_timestamp: z.date(),
});
/** Event: CTC or salary structure changes detected from upstream source */
export const ChangeDetectedSchema = z.object({
    tenant_id: z.string().uuid(),
    change_set: z.array(z.object({
        employee_id: z.string(),
        old_ctc: z.number().int(),
        new_ctc: z.number().int(),
        signatory: z.string(),
    })),
});
/** Event: Changes have been signed off by operator */
export const ChangeSignedOffSchema = z.object({
    tenant_id: z.string().uuid(),
    change_id: z.string(),
    signed_by: z.string(),
    timestamp: z.date(),
});
/** Event: Employee exit recorded */
export const ExitRecordedSchema = z.object({
    tenant_id: z.string().uuid(),
    employee_id: z.string(),
    last_working_day: z.date(),
});
/** Event: Full & Final settlement has been completed */
export const FFSettledSchema = z.object({
    tenant_id: z.string().uuid(),
    employee_id: z.string(),
    settlement_amount: z.number().int(),
    timestamp: z.date(),
});
/** Event: Pre-flight checklist item status changed */
export const PreFlightItemChangedSchema = z.object({
    tenant_id: z.string().uuid(),
    check_id: z.string(),
    status: z.enum(["PASS", "FAIL"]),
});
/** Event: Readiness score has been recomputed */
export const ReadinessScoreChangedSchema = z.object({
    tenant_id: z.string().uuid(),
    score: z.number().int().min(0).max(100),
    blockers: z.array(z.object({
        id: z.string().uuid(),
        type: z.nativeEnum(BlockerType),
        severity: z.nativeEnum(Severity),
        description: z.string(),
        action_button: z.string().optional(),
    })),
    dead_sources: z.boolean(),
    timestamp: z.date(),
});
/**
 * Validate an event payload against its schema
 * @param eventType - The name of the event
 * @param payload - The event payload to validate
 * @throws ZodError if validation fails
 */
export function validateEvent(eventType, payload) {
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
//# sourceMappingURL=events.js.map