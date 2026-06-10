/**
 * Readiness Service
 *
 * Core service that maintains readiness state and emits score changes.
 * Listens to domain events and recomputes the score in response.
 */

import { EventEmitter } from "events";
import {
  SourceSynced,
  SourceWentStale,
  SourceDead,
  ChangeDetected,
  ChangeSignedOff,
  ExitRecorded,
  FFSettled,
  PreFlightItemChanged,
  ReadinessScoreChanged,
  BlockerType,
  Severity,
  SourceType,
} from "../events.js";
import { Blocker, createBlocker } from "../models/blocker.js";
import {
  SourceFreshness,
  createSourceFreshness,
  recordSuccessfulSync,
  markAsStale,
  markAsDead,
} from "../models/source-freshness.js";
import {
  ChangeRecord,
  createChangeRecord,
  resolveChangeRecord,
  isPendingChange,
} from "../models/change-record.js";
import { computeScore } from "./score.js";

export interface PreFlightCheckResult {
  check: string;
  check_id: string;
  status: 'PASS' | 'FAIL';
  blocker_if_fail: Blocker | null;
}

/**
 * ReadinessService
 *
 * Maintains the state of blockers and source freshness for a tenant.
 * Listens to events and recomputes the score when state changes.
 */
export class ReadinessService extends EventEmitter {
  /**
   * In-memory state (in production, would be fetched from DB)
   * tenant_id → state
   */
  private state: Map<
    string,
    {
      blockers: Map<string, Blocker>;
      sourceFreshness: Map<string, SourceFreshness>;
      pendingChanges: Map<string, ChangeRecord>;
    }
  > = new Map();

  constructor() {
    super();
    this.setupEventListeners();
  }

  /**
   * Set up all event listeners
   */
  private setupEventListeners(): void {
    this.on("SourceSynced", (event: SourceSynced) =>
      this.handleSourceSynced(event)
    );
    this.on("SourceWentStale", (event: SourceWentStale) =>
      this.handleSourceWentStale(event)
    );
    this.on("SourceDead", (event: SourceDead) =>
      this.handleSourceDead(event)
    );
    this.on("ChangeDetected", (event: ChangeDetected) =>
      this.handleChangeDetected(event)
    );
    this.on("ChangeSignedOff", (event: ChangeSignedOff) =>
      this.handleChangeSignedOff(event)
    );
    this.on("ExitRecorded", (event: ExitRecorded) =>
      this.handleExitRecorded(event)
    );
    this.on("FFSettled", (event: FFSettled) =>
      this.handleFFSettled(event)
    );
    this.on("PreFlightItemChanged", (event: PreFlightItemChanged) =>
      this.handlePreFlightItemChanged(event)
    );
  }

  /**
   * Get or create tenant state
   */
  private getTenantState(
    tenant_id: string
  ): {
    blockers: Map<string, Blocker>;
    sourceFreshness: Map<string, SourceFreshness>;
    pendingChanges: Map<string, ChangeRecord>;
  } {
    if (!this.state.has(tenant_id)) {
      this.state.set(tenant_id, {
        blockers: new Map(),
        sourceFreshness: new Map(),
        pendingChanges: new Map(),
      });
    }
    return this.state.get(tenant_id)!;
  }

  /**
   * Compute and return the current readiness score for a tenant
   */
  public computeScore(tenant_id: string): ReadinessScoreChanged {
    const tenantState = this.getTenantState(tenant_id);

    const blockers = Array.from(tenantState.blockers.values());
    const sourceFreshness = Array.from(
      tenantState.sourceFreshness.values()
    );

    const scoreResult = computeScore(blockers, sourceFreshness);

    // Map sources to include status and formatted names
    const sources = sourceFreshness.map(src => {
      let status: "live" | "stale" | "dead" = "live";
      if (src.state === "DEAD") status = "dead";
      else if (src.state === "STALE") status = "stale";

      return {
        source_id: src.source_name,
        name: this.formatSourceName(src.source_name),
        status,
        last_synced_at: src.last_success_at,
        stale_since_timestamp: status === "stale" ? src.updated_at : undefined,
        dead_since_timestamp: status === "dead" ? src.updated_at : undefined,
      };
    });

    const pendingChanges = Array.from(tenantState.pendingChanges.values()).map(r => ({
      id: r.id,
      employee_id: r.employee_id,
      employee_name: r.employee_name,
      old_ctc: r.old_ctc,
      new_ctc: r.new_ctc,
      effective_date: r.effective_date,
      signatory: r.signatory,
      status: r.status,
    }));

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
      sources,
      pending_changes: pendingChanges,
      dead_sources: scoreResult.deadSources,
      timestamp: new Date(),
    };
  }

  /**
   * Format source_id into human-readable name
   */
  private formatSourceName(source_id: string): string {
    const names: { [key: string]: string } = {
      "essl-biometric": "eSSL Biometric",
      "hrms-csv": "HRMS CSV",
      "tally-finance": "Tally Finance",
      "zkeco-biometric": "ZKTeco Biometric",
    };
    return names[source_id] || source_id;
  }

  /**
   * Get appropriate action button for a blocker type
   */
  private getActionButton(blocker_type: BlockerType): string {
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

  private handleSourceSynced(event: SourceSynced): void {
    const tenantState = this.getTenantState(event.tenant_id);

    // Get or create source freshness record
    let sourceFreshness = tenantState.sourceFreshness.get(event.source_id);
    if (!sourceFreshness) {
      const sourceType = this.detectSourceType(event.source_id);
      sourceFreshness = createSourceFreshness(
        `source-${event.source_id}`,
        event.tenant_id,
        event.source_id,
        sourceType,
        7200 // 2 hour default threshold
      );
    }

    // Update to successful sync
    sourceFreshness = recordSuccessfulSync(
      sourceFreshness,
      event.timestamp
    );
    tenantState.sourceFreshness.set(event.source_id, sourceFreshness);

    // Check if this clears any FRESHNESS_VITALS blockers
    const staleBlockers = Array.from(
      tenantState.blockers.values()
    ).filter(
      b =>
        b.blocker_type === BlockerType.FRESHNESS_VITALS &&
        b.blocking_record_ids.includes(event.source_id) &&
        b.resolved_at === null
    );

    if (staleBlockers.length > 0) {
      // Mark stale blockers as resolved (immutable update)
      for (const blocker of staleBlockers) {
        const resolvedBlocker = { ...blocker, resolved_at: event.timestamp };
        tenantState.blockers.set(blocker.id, resolvedBlocker);
      }
    }

    // Recompute and emit score
    this.recomputeAndEmitScore(event.tenant_id);
  }

  private handleSourceWentStale(event: SourceWentStale): void {
    const tenantState = this.getTenantState(event.tenant_id);

    let sourceFreshness = tenantState.sourceFreshness.get(
      event.source_id
    );
    if (!sourceFreshness) {
      const sourceType = this.detectSourceType(event.source_id);
      sourceFreshness = createSourceFreshness(
        `source-${event.source_id}`,
        event.tenant_id,
        event.source_id,
        sourceType,
        7200
      );
    }

    sourceFreshness = markAsStale(
      sourceFreshness,
      event.staleness_threshold_exceeded_at
    );
    tenantState.sourceFreshness.set(event.source_id, sourceFreshness);

    // Create FRESHNESS_VITALS blocker if not already present
    const existingBlocker = Array.from(
      tenantState.blockers.values()
    ).find(
      b =>
        b.blocker_type === BlockerType.FRESHNESS_VITALS &&
        b.blocking_record_ids.includes(event.source_id) &&
        b.resolved_at === null
    );

    if (!existingBlocker) {
      const sourceType = this.detectSourceType(event.source_id);
      const blocker = createBlocker(
        `blocker-${event.source_id}-stale`,
        event.tenant_id,
        BlockerType.FRESHNESS_VITALS,
        "Data Freshness",
        Severity.MEDIUM,
        `${event.source_id} is stale — last synced ${new Date(event.staleness_threshold_exceeded_at).toLocaleDateString()}`,
        [event.source_id],
        false,
        sourceType
      );
      tenantState.blockers.set(blocker.id, blocker);
    }

    this.recomputeAndEmitScore(event.tenant_id);
  }

  private handleSourceDead(event: SourceDead): void {
    const tenantState = this.getTenantState(event.tenant_id);

    let sourceFreshness = tenantState.sourceFreshness.get(
      event.source_id
    );
    if (!sourceFreshness) {
      const sourceType = this.detectSourceType(event.source_id);
      sourceFreshness = createSourceFreshness(
        `source-${event.source_id}`,
        event.tenant_id,
        event.source_id,
        sourceType,
        7200
      );
    }

    sourceFreshness = markAsDead(
      sourceFreshness,
      event.dead_since_timestamp
    );
    tenantState.sourceFreshness.set(event.source_id, sourceFreshness);

    // Create FRESHNESS_VITALS blocker (dead) — clear any prior stale blocker for this source
    const existingBlocker = Array.from(
      tenantState.blockers.values()
    ).find(
      b =>
        b.blocker_type === BlockerType.FRESHNESS_VITALS &&
        b.blocking_record_ids.includes(event.source_id)
    );

    if (existingBlocker) {
      tenantState.blockers.delete(existingBlocker.id);
    }

    const deadSourceType = this.detectSourceType(event.source_id);
    const blocker = createBlocker(
      `blocker-${event.source_id}-dead`,
      event.tenant_id,
      BlockerType.FRESHNESS_VITALS,
      "Data Freshness",
      Severity.HIGH,
      `${event.source_id} sync dead — no successful sync in 24h. Payroll at risk.`,
      [event.source_id],
      true, // is_dead_source flag
      deadSourceType
    );
    tenantState.blockers.set(blocker.id, blocker);

    this.recomputeAndEmitScore(event.tenant_id);
  }

  private handleChangeDetected(event: ChangeDetected): void {
    const tenantState = this.getTenantState(event.tenant_id);

    // Store each change record; skip if a record for this employee already exists and is pending
    const newRecordIds: string[] = [];
    event.change_set.forEach((change, i) => {
      const existingPending = Array.from(tenantState.pendingChanges.values()).find(
        r => r.employee_id === change.employee_id && isPendingChange(r)
      );
      if (!existingPending) {
        const recordId = `change-${event.tenant_id}-${change.employee_id}-${Date.now()}-${i}`;
        const record = createChangeRecord(
          recordId,
          event.tenant_id,
          change.employee_id,
          change.employee_name,
          change.old_ctc,
          change.new_ctc,
          change.effective_date,
          change.signatory
        );
        tenantState.pendingChanges.set(recordId, record);
        newRecordIds.push(recordId);
      }
    });

    if (newRecordIds.length === 0) {
      return;
    }

    // Remove any existing CHANGE_HANDSHAKE blocker and create a fresh one with updated count
    const existingBlocker = Array.from(tenantState.blockers.values()).find(
      b => b.blocker_type === BlockerType.CHANGE_HANDSHAKE && !b.resolved_at
    );
    if (existingBlocker) {
      tenantState.blockers.delete(existingBlocker.id);
    }

    const allPendingIds = Array.from(tenantState.pendingChanges.values())
      .filter(isPendingChange)
      .map(r => r.id);

    const blocker = createBlocker(
      `blocker-change-${Date.now()}`,
      event.tenant_id,
      BlockerType.CHANGE_HANDSHAKE,
      "CTC/Structure Changes",
      Severity.MEDIUM,
      `${allPendingIds.length} unconfirmed CTC changes awaiting review and sign-off`,
      allPendingIds
    );

    tenantState.blockers.set(blocker.id, blocker);
    this.recomputeAndEmitScore(event.tenant_id);
  }

  private handleChangeSignedOff(event: ChangeSignedOff): void {
    const tenantState = this.getTenantState(event.tenant_id);

    const record = tenantState.pendingChanges.get(event.change_id);
    if (!record) return;

    const updated = resolveChangeRecord(record, event.action, event.signed_by, event.timestamp);
    tenantState.pendingChanges.set(event.change_id, updated);

    const remainingPending = Array.from(tenantState.pendingChanges.values()).filter(isPendingChange);

    // Remove current CHANGE_HANDSHAKE blocker
    const existingBlocker = Array.from(tenantState.blockers.values()).find(
      b => b.blocker_type === BlockerType.CHANGE_HANDSHAKE && !b.resolved_at
    );
    if (existingBlocker) {
      tenantState.blockers.delete(existingBlocker.id);
    }

    if (remainingPending.length > 0) {
      // Recreate blocker with updated count
      const blocker = createBlocker(
        `blocker-change-${Date.now()}`,
        event.tenant_id,
        BlockerType.CHANGE_HANDSHAKE,
        "CTC/Structure Changes",
        Severity.MEDIUM,
        `${remainingPending.length} unconfirmed CTC changes awaiting review and sign-off`,
        remainingPending.map(r => r.id)
      );
      tenantState.blockers.set(blocker.id, blocker);
    }

    this.recomputeAndEmitScore(event.tenant_id);
  }

  private handleExitRecorded(event: ExitRecorded): void {
    const tenantState = this.getTenantState(event.tenant_id);

    // Compute statutory 2-working-day deadline (no public holidays)
    const deadline = this.computeWorkingDayDeadline(event.last_working_day, 2, []);
    const deadlineStr = deadline.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

    // Create LIFECYCLE_CLOCK blocker
    const blocker = createBlocker(
      `blocker-exit-${event.employee_id}`,
      event.tenant_id,
      BlockerType.LIFECYCLE_CLOCK,
      "Exit Settlement",
      Severity.HIGH,
      `Employee ${event.employee_id} exit pending F&F — deadline: ${deadlineStr}`,
      [event.employee_id]
    );

    tenantState.blockers.set(blocker.id, blocker);

    this.recomputeAndEmitScore(event.tenant_id);
  }

  /**
   * Compute the deadline date by adding `workingDays` working days (Mon–Fri)
   * to `startDate`, skipping any dates listed in `holidays`.
   *
   * AC-7: if 2026-06-11 is in `holidays` and startDate is 2026-06-10,
   * adding 2 working days yields 2026-06-13 (not 2026-06-12).
   */
  public computeWorkingDayDeadline(
    startDate: Date,
    workingDays: number,
    holidays: Date[]
  ): Date {
    // Normalise holidays to midnight UTC for comparison
    const holidaySet = new Set(
      holidays.map(d => {
        const n = new Date(d);
        n.setUTCHours(0, 0, 0, 0);
        return n.getTime();
      })
    );

    const isHoliday = (d: Date): boolean => {
      const n = new Date(d);
      n.setUTCHours(0, 0, 0, 0);
      return holidaySet.has(n.getTime());
    };

    const isWeekend = (d: Date): boolean => {
      const day = d.getDay(); // 0 = Sun, 6 = Sat
      return day === 0 || day === 6;
    };

    let current = new Date(startDate);
    let added = 0;

    while (added < workingDays) {
      current.setDate(current.getDate() + 1);
      if (!isWeekend(current) && !isHoliday(current)) {
        added++;
      }
    }

    return current;
  }

  private handleFFSettled(event: FFSettled): void {
    const tenantState = this.getTenantState(event.tenant_id);

    // Mark exit blocker as resolved (immutable update)
    const exitBlocker = Array.from(
      tenantState.blockers.values()
    ).find(
      b =>
        b.blocker_type === BlockerType.LIFECYCLE_CLOCK &&
        b.blocking_record_ids.includes(event.employee_id) &&
        b.resolved_at === null
    );

    if (exitBlocker) {
      const resolvedBlocker = { ...exitBlocker, resolved_at: event.timestamp };
      tenantState.blockers.set(exitBlocker.id, resolvedBlocker);
    }

    this.recomputeAndEmitScore(event.tenant_id);
  }

  private handlePreFlightItemChanged(event: PreFlightItemChanged): void {
    const tenantState = this.getTenantState(event.tenant_id);

    // Check if preflight item is failing
    if (event.status === "FAIL") {
      const existingBlocker = Array.from(
        tenantState.blockers.values()
      ).find(
        b =>
          b.blocker_type === BlockerType.PREFLIGHT &&
          b.blocking_record_ids.includes(event.check_id)
      );

      if (!existingBlocker) {
        const blocker = createBlocker(
          `blocker-preflight-${event.check_id}`,
          event.tenant_id,
          BlockerType.PREFLIGHT,
          "Pre-Flight Check",
          Severity.MEDIUM,
          `Pre-flight check failed: ${event.check_id}`,
          [event.check_id]
        );
        tenantState.blockers.set(blocker.id, blocker);
      }
    } else {
      // PASS - clear preflight blockers for this check (immutable update)
      const blockers = Array.from(
        tenantState.blockers.values()
      ).filter(
        b =>
          b.blocker_type === BlockerType.PREFLIGHT &&
          b.blocking_record_ids.includes(event.check_id)
      );

      const now = new Date();
      for (const blocker of blockers) {
        if (blocker.resolved_at === null) {
          const resolvedBlocker = { ...blocker, resolved_at: now };
          tenantState.blockers.set(blocker.id, resolvedBlocker);
        }
      }
    }

    this.recomputeAndEmitScore(event.tenant_id);
  }

  /**
   * Evaluate all 4 pre-flight checks against current tenant state.
   * Pure query method — does not modify state.
   */
  public runPreFlightChecks(tenant_id: string): PreFlightCheckResult[] {
    const tenantState = this.getTenantState(tenant_id);

    const active = (type: BlockerType): Blocker | null =>
      Array.from(tenantState.blockers.values()).find(
        b => b.blocker_type === type && b.resolved_at === null
      ) ?? null;

    // Attendance check is scoped to biometric sources only (spec constraint)
    const attendanceBlocker =
      Array.from(tenantState.blockers.values()).find(
        b =>
          b.blocker_type === BlockerType.FRESHNESS_VITALS &&
          b.resolved_at === null &&
          b.source_type === SourceType.BIOMETRIC
      ) ?? null;

    const exitsBlocker = active(BlockerType.LIFECYCLE_CLOCK);
    const ctcBlocker = active(BlockerType.CHANGE_HANDSHAKE);
    const complianceBlocker = active(BlockerType.PREFLIGHT);

    return [
      {
        check: 'Attendance synced in last 2 hours',
        check_id: 'attendance-fresh',
        status: attendanceBlocker ? 'FAIL' : 'PASS',
        blocker_if_fail: attendanceBlocker,
      },
      {
        check: 'No pending exits without F&F settled',
        check_id: 'exits-settled',
        status: exitsBlocker ? 'FAIL' : 'PASS',
        blocker_if_fail: exitsBlocker,
      },
      {
        check: 'No unacknowledged CTC changes',
        check_id: 'ctc-acknowledged',
        status: ctcBlocker ? 'FAIL' : 'PASS',
        blocker_if_fail: ctcBlocker,
      },
      {
        check: 'Compliance defaults validated',
        check_id: 'compliance-validated',
        status: complianceBlocker ? 'FAIL' : 'PASS',
        blocker_if_fail: complianceBlocker,
      },
    ];
  }

  /**
   * Recompute the score and emit event if score changed significantly
   */
  private recomputeAndEmitScore(tenant_id: string): void {
    const scoreEvent = this.computeScore(tenant_id);

    // Emit the ReadinessScoreChanged event
    this.emit("ReadinessScoreChanged", scoreEvent);
  }

  /**
   * Detect source type from source name
   */
  private detectSourceType(source_id: string): SourceType {
    const lower = source_id.toLowerCase();
    if (
      lower.includes("essl") ||
      lower.includes("zk") ||
      lower.includes("biomax") ||
      lower.includes("matrix") ||
      lower.includes("biometric")
    ) {
      return SourceType.BIOMETRIC;
    }

    if (
      lower.includes("tally") ||
      lower.includes("zoho") ||
      lower.includes("qb")
    ) {
      return SourceType.FINANCE;
    }

    if (lower.includes("bank") || lower.includes("disbursement")) {
      return SourceType.BANK;
    }

    return SourceType.MANUAL;
  }
}
