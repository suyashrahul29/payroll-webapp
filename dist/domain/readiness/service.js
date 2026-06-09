/**
 * Readiness Service
 *
 * Core service that maintains readiness state and emits score changes.
 * Listens to domain events and recomputes the score in response.
 */
import { EventEmitter } from "events";
import { BlockerType, Severity, SourceType, } from "../events.js";
import { createBlocker } from "../models/blocker.js";
import { createSourceFreshness, recordSuccessfulSync, markAsStale, markAsDead, } from "../models/source-freshness.js";
import { computeScore } from "./score.js";
/**
 * ReadinessService
 *
 * Maintains the state of blockers and source freshness for a tenant.
 * Listens to events and recomputes the score when state changes.
 */
export class ReadinessService extends EventEmitter {
    constructor() {
        super();
        /**
         * In-memory state (in production, would be fetched from DB)
         * tenant_id → state
         */
        this.state = new Map();
        this.setupEventListeners();
    }
    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        this.on("SourceSynced", (event) => this.handleSourceSynced(event));
        this.on("SourceWentStale", (event) => this.handleSourceWentStale(event));
        this.on("SourceDead", (event) => this.handleSourceDead(event));
        this.on("ChangeDetected", (event) => this.handleChangeDetected(event));
        this.on("ChangeSignedOff", (event) => this.handleChangeSignedOff(event));
        this.on("ExitRecorded", (event) => this.handleExitRecorded(event));
        this.on("FFSettled", (event) => this.handleFFSettled(event));
        this.on("PreFlightItemChanged", (event) => this.handlePreFlightItemChanged(event));
    }
    /**
     * Get or create tenant state
     */
    getTenantState(tenant_id) {
        if (!this.state.has(tenant_id)) {
            this.state.set(tenant_id, {
                blockers: new Map(),
                sourceFreshness: new Map(),
            });
        }
        return this.state.get(tenant_id);
    }
    /**
     * Compute and return the current readiness score for a tenant
     */
    computeScore(tenant_id) {
        const tenantState = this.getTenantState(tenant_id);
        const blockers = Array.from(tenantState.blockers.values());
        const sourceFreshness = Array.from(tenantState.sourceFreshness.values());
        const scoreResult = computeScore(blockers, sourceFreshness);
        return {
            tenant_id,
            score: scoreResult.score,
            blockers: scoreResult.activeBlockers.map(b => ({
                id: b.id,
                type: b.blocker_type,
                severity: b.severity,
                description: b.description,
                action_button: this.getActionButton(b.blocker_type),
            })),
            dead_sources: scoreResult.deadSources,
            timestamp: new Date(),
        };
    }
    /**
     * Get appropriate action button for a blocker type
     */
    getActionButton(blocker_type) {
        switch (blocker_type) {
            case BlockerType.FRESHNESS_VITALS:
                return "Re-sync";
            case BlockerType.CHANGE_HANDSHAKE:
                return "Review & sign";
            case BlockerType.LIFECYCLE_CLOCK:
                return "Settle";
            case BlockerType.PREFLIGHT:
                return "Resolve";
            default:
                return "Action";
        }
    }
    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================
    handleSourceSynced(event) {
        const tenantState = this.getTenantState(event.tenant_id);
        // Get or create source freshness record
        let sourceFreshness = tenantState.sourceFreshness.get(event.source_id);
        if (!sourceFreshness) {
            const sourceType = this.detectSourceType(event.source_id);
            sourceFreshness = createSourceFreshness(`source-${event.source_id}`, event.tenant_id, event.source_id, sourceType, 7200 // 2 hour default threshold
            );
        }
        // Update to successful sync
        sourceFreshness = recordSuccessfulSync(sourceFreshness, event.timestamp);
        tenantState.sourceFreshness.set(event.source_id, sourceFreshness);
        // Check if this clears any FRESHNESS_VITALS blockers
        const staleBlockers = Array.from(tenantState.blockers.values()).filter(b => b.blocker_type === BlockerType.FRESHNESS_VITALS &&
            b.blocking_record_ids.includes(event.source_id) &&
            b.resolved_at === null);
        if (staleBlockers.length > 0) {
            // Mark stale blockers as resolved
            for (const blocker of staleBlockers) {
                blocker.resolved_at = event.timestamp;
            }
        }
        // Recompute and emit score
        this.recomputeAndEmitScore(event.tenant_id);
    }
    handleSourceWentStale(event) {
        const tenantState = this.getTenantState(event.tenant_id);
        let sourceFreshness = tenantState.sourceFreshness.get(event.source_id);
        if (!sourceFreshness) {
            const sourceType = this.detectSourceType(event.source_id);
            sourceFreshness = createSourceFreshness(`source-${event.source_id}`, event.tenant_id, event.source_id, sourceType, 7200);
        }
        sourceFreshness = markAsStale(sourceFreshness, event.staleness_threshold_exceeded_at);
        tenantState.sourceFreshness.set(event.source_id, sourceFreshness);
        // Create FRESHNESS_VITALS blocker if not already present
        const existingBlocker = Array.from(tenantState.blockers.values()).find(b => b.blocker_type === BlockerType.FRESHNESS_VITALS &&
            b.blocking_record_ids.includes(event.source_id) &&
            b.resolved_at === null);
        if (!existingBlocker) {
            const blocker = createBlocker(`blocker-${event.source_id}-stale`, event.tenant_id, BlockerType.FRESHNESS_VITALS, "Data Freshness", Severity.MEDIUM, `${event.source_id} is stale — last synced ${new Date(event.staleness_threshold_exceeded_at).toLocaleDateString()}`, [event.source_id]);
            tenantState.blockers.set(blocker.id, blocker);
        }
        this.recomputeAndEmitScore(event.tenant_id);
    }
    handleSourceDead(event) {
        const tenantState = this.getTenantState(event.tenant_id);
        let sourceFreshness = tenantState.sourceFreshness.get(event.source_id);
        if (!sourceFreshness) {
            const sourceType = this.detectSourceType(event.source_id);
            sourceFreshness = createSourceFreshness(`source-${event.source_id}`, event.tenant_id, event.source_id, sourceType, 7200);
        }
        sourceFreshness = markAsDead(sourceFreshness, event.dead_since_timestamp);
        tenantState.sourceFreshness.set(event.source_id, sourceFreshness);
        // Create FRESHNESS_VITALS blocker (dead)
        const existingBlocker = Array.from(tenantState.blockers.values()).find(b => b.blocker_type === BlockerType.FRESHNESS_VITALS &&
            b.blocking_record_ids.includes(event.source_id) &&
            b.description.toLowerCase().includes("dead"));
        if (!existingBlocker) {
            const blocker = createBlocker(`blocker-${event.source_id}-dead`, event.tenant_id, BlockerType.FRESHNESS_VITALS, "Data Freshness", Severity.HIGH, `${event.source_id} sync dead — no successful sync in 24h. Payroll at risk.`, [event.source_id]);
            tenantState.blockers.set(blocker.id, blocker);
        }
        this.recomputeAndEmitScore(event.tenant_id);
    }
    handleChangeDetected(event) {
        const tenantState = this.getTenantState(event.tenant_id);
        // Create CHANGE_HANDSHAKE blocker
        const change_ids = event.change_set.map((_, i) => `change-${i}`);
        const blocker = createBlocker(`blocker-change-${Date.now()}`, event.tenant_id, BlockerType.CHANGE_HANDSHAKE, "CTC/Structure Changes", Severity.MEDIUM, `${event.change_set.length} unconfirmed CTC changes awaiting review and sign-off`, change_ids);
        tenantState.blockers.set(blocker.id, blocker);
        this.recomputeAndEmitScore(event.tenant_id);
    }
    handleChangeSignedOff(_event) {
        // Implementation for future: mark change as signed off
        // For now, this is handled by external logic
    }
    handleExitRecorded(event) {
        const tenantState = this.getTenantState(event.tenant_id);
        // Create LIFECYCLE_CLOCK blocker
        const blocker = createBlocker(`blocker-exit-${event.employee_id}`, event.tenant_id, BlockerType.LIFECYCLE_CLOCK, "Exit Settlement", Severity.HIGH, `Employee ${event.employee_id} exit pending F&F — legal deadline: 2 working days`, [event.employee_id]);
        tenantState.blockers.set(blocker.id, blocker);
        this.recomputeAndEmitScore(event.tenant_id);
    }
    handleFFSettled(event) {
        const tenantState = this.getTenantState(event.tenant_id);
        // Mark exit blocker as resolved
        const exitBlocker = Array.from(tenantState.blockers.values()).find(b => b.blocker_type === BlockerType.LIFECYCLE_CLOCK &&
            b.blocking_record_ids.includes(event.employee_id) &&
            b.resolved_at === null);
        if (exitBlocker) {
            exitBlocker.resolved_at = event.timestamp;
        }
        this.recomputeAndEmitScore(event.tenant_id);
    }
    handlePreFlightItemChanged(event) {
        const tenantState = this.getTenantState(event.tenant_id);
        // Check if preflight item is failing
        if (event.status === "FAIL") {
            const existingBlocker = Array.from(tenantState.blockers.values()).find(b => b.blocker_type === BlockerType.PREFLIGHT &&
                b.blocking_record_ids.includes(event.check_id));
            if (!existingBlocker) {
                const blocker = createBlocker(`blocker-preflight-${event.check_id}`, event.tenant_id, BlockerType.PREFLIGHT, "Pre-Flight Check", Severity.MEDIUM, `Pre-flight check failed: ${event.check_id}`, [event.check_id]);
                tenantState.blockers.set(blocker.id, blocker);
            }
        }
        else {
            // PASS - clear preflight blockers for this check
            const blockers = Array.from(tenantState.blockers.values()).filter(b => b.blocker_type === BlockerType.PREFLIGHT &&
                b.blocking_record_ids.includes(event.check_id));
            for (const blocker of blockers) {
                if (blocker.resolved_at === null) {
                    blocker.resolved_at = new Date();
                }
            }
        }
        this.recomputeAndEmitScore(event.tenant_id);
    }
    /**
     * Recompute the score and emit event if score changed significantly
     */
    recomputeAndEmitScore(tenant_id) {
        const scoreEvent = this.computeScore(tenant_id);
        // Emit the ReadinessScoreChanged event
        this.emit("ReadinessScoreChanged", scoreEvent);
    }
    /**
     * Detect source type from source name
     */
    detectSourceType(source_id) {
        if (source_id.includes("eSSL") ||
            source_id.includes("ZK") ||
            source_id.includes("Biomax") ||
            source_id.includes("Matrix")) {
            return SourceType.BIOMETRIC;
        }
        if (source_id.includes("Tally") ||
            source_id.includes("Zoho") ||
            source_id.includes("QB")) {
            return SourceType.FINANCE;
        }
        if (source_id.includes("Bank") || source_id.includes("Disbursement")) {
            return SourceType.BANK;
        }
        return SourceType.MANUAL;
    }
}
//# sourceMappingURL=service.js.map