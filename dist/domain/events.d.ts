/**
 * Domain Events for Payroll Readiness System
 *
 * This module defines all domain events that trigger readiness score recomputation.
 * Events are the backbone of the event-driven architecture.
 */
import { z } from "zod";
export declare enum BlockerType {
    FRESHNESS_VITALS = "FRESHNESS_VITALS",
    CHANGE_HANDSHAKE = "CHANGE_HANDSHAKE",
    LIFECYCLE_CLOCK = "LIFECYCLE_CLOCK",
    PREFLIGHT = "PREFLIGHT"
}
export declare enum Severity {
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH"
}
export declare enum SourceType {
    BIOMETRIC = "BIOMETRIC",
    FINANCE = "FINANCE",
    BANK = "BANK",
    MANUAL = "MANUAL"
}
export declare enum FreshnessState {
    FRESH = "FRESH",
    STALE = "STALE",
    DEAD = "DEAD"
}
/** Event: A source has successfully synced */
export declare const SourceSyncedSchema: z.ZodObject<{
    tenant_id: z.ZodString;
    source_id: z.ZodString;
    timestamp: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    tenant_id: string;
    source_id: string;
    timestamp: Date;
}, {
    tenant_id: string;
    source_id: string;
    timestamp: Date;
}>;
export type SourceSynced = z.infer<typeof SourceSyncedSchema>;
/** Event: A source has gone stale (not synced within threshold) */
export declare const SourceWentStaleSchema: z.ZodObject<{
    tenant_id: z.ZodString;
    source_id: z.ZodString;
    staleness_threshold_exceeded_at: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    tenant_id: string;
    source_id: string;
    staleness_threshold_exceeded_at: Date;
}, {
    tenant_id: string;
    source_id: string;
    staleness_threshold_exceeded_at: Date;
}>;
export type SourceWentStale = z.infer<typeof SourceWentStaleSchema>;
/** Event: A source has been dead (not synced for 24h+) */
export declare const SourceDeadSchema: z.ZodObject<{
    tenant_id: z.ZodString;
    source_id: z.ZodString;
    dead_since_timestamp: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    tenant_id: string;
    source_id: string;
    dead_since_timestamp: Date;
}, {
    tenant_id: string;
    source_id: string;
    dead_since_timestamp: Date;
}>;
export type SourceDead = z.infer<typeof SourceDeadSchema>;
/** Event: CTC or salary structure changes detected from upstream source */
export declare const ChangeDetectedSchema: z.ZodObject<{
    tenant_id: z.ZodString;
    change_set: z.ZodArray<z.ZodObject<{
        employee_id: z.ZodString;
        old_ctc: z.ZodNumber;
        new_ctc: z.ZodNumber;
        signatory: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        employee_id: string;
        old_ctc: number;
        new_ctc: number;
        signatory: string;
    }, {
        employee_id: string;
        old_ctc: number;
        new_ctc: number;
        signatory: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    tenant_id: string;
    change_set: {
        employee_id: string;
        old_ctc: number;
        new_ctc: number;
        signatory: string;
    }[];
}, {
    tenant_id: string;
    change_set: {
        employee_id: string;
        old_ctc: number;
        new_ctc: number;
        signatory: string;
    }[];
}>;
export type ChangeDetected = z.infer<typeof ChangeDetectedSchema>;
/** Event: Changes have been signed off by operator */
export declare const ChangeSignedOffSchema: z.ZodObject<{
    tenant_id: z.ZodString;
    change_id: z.ZodString;
    signed_by: z.ZodString;
    timestamp: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    tenant_id: string;
    timestamp: Date;
    change_id: string;
    signed_by: string;
}, {
    tenant_id: string;
    timestamp: Date;
    change_id: string;
    signed_by: string;
}>;
export type ChangeSignedOff = z.infer<typeof ChangeSignedOffSchema>;
/** Event: Employee exit recorded */
export declare const ExitRecordedSchema: z.ZodObject<{
    tenant_id: z.ZodString;
    employee_id: z.ZodString;
    last_working_day: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    tenant_id: string;
    employee_id: string;
    last_working_day: Date;
}, {
    tenant_id: string;
    employee_id: string;
    last_working_day: Date;
}>;
export type ExitRecorded = z.infer<typeof ExitRecordedSchema>;
/** Event: Full & Final settlement has been completed */
export declare const FFSettledSchema: z.ZodObject<{
    tenant_id: z.ZodString;
    employee_id: z.ZodString;
    settlement_amount: z.ZodNumber;
    timestamp: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    tenant_id: string;
    timestamp: Date;
    employee_id: string;
    settlement_amount: number;
}, {
    tenant_id: string;
    timestamp: Date;
    employee_id: string;
    settlement_amount: number;
}>;
export type FFSettled = z.infer<typeof FFSettledSchema>;
/** Event: Pre-flight checklist item status changed */
export declare const PreFlightItemChangedSchema: z.ZodObject<{
    tenant_id: z.ZodString;
    check_id: z.ZodString;
    status: z.ZodEnum<["PASS", "FAIL"]>;
}, "strip", z.ZodTypeAny, {
    tenant_id: string;
    status: "PASS" | "FAIL";
    check_id: string;
}, {
    tenant_id: string;
    status: "PASS" | "FAIL";
    check_id: string;
}>;
export type PreFlightItemChanged = z.infer<typeof PreFlightItemChangedSchema>;
/** Event: Readiness score has been recomputed */
export declare const ReadinessScoreChangedSchema: z.ZodObject<{
    tenant_id: z.ZodString;
    score: z.ZodNumber;
    blockers: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodNativeEnum<typeof BlockerType>;
        severity: z.ZodNativeEnum<typeof Severity>;
        description: z.ZodString;
        action_button: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: BlockerType;
        id: string;
        severity: Severity;
        description: string;
        action_button?: string | undefined;
    }, {
        type: BlockerType;
        id: string;
        severity: Severity;
        description: string;
        action_button?: string | undefined;
    }>, "many">;
    dead_sources: z.ZodBoolean;
    timestamp: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    tenant_id: string;
    timestamp: Date;
    score: number;
    blockers: {
        type: BlockerType;
        id: string;
        severity: Severity;
        description: string;
        action_button?: string | undefined;
    }[];
    dead_sources: boolean;
}, {
    tenant_id: string;
    timestamp: Date;
    score: number;
    blockers: {
        type: BlockerType;
        id: string;
        severity: Severity;
        description: string;
        action_button?: string | undefined;
    }[];
    dead_sources: boolean;
}>;
export type ReadinessScoreChanged = z.infer<typeof ReadinessScoreChangedSchema>;
export type DomainEvent = SourceSynced | SourceWentStale | SourceDead | ChangeDetected | ChangeSignedOff | ExitRecorded | FFSettled | PreFlightItemChanged | ReadinessScoreChanged;
/**
 * Validate an event payload against its schema
 * @param eventType - The name of the event
 * @param payload - The event payload to validate
 * @throws ZodError if validation fails
 */
export declare function validateEvent(eventType: string, payload: unknown): DomainEvent;
//# sourceMappingURL=events.d.ts.map