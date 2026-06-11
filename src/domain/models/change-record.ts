/**
 * ChangeRecord domain model
 *
 * Tracks per-record CTC/structure changes pending sign-off in the Change Handshake.
 * One record per (tenant_id, employee_id, change_event).
 */

export type ChangeRecordStatus = "pending" | "signed_off" | "held" | "rejected";

export interface ChangeRecord {
  id: string;
  tenant_id: string;
  employee_id: string;
  employee_name: string;
  old_ctc: number;       // integer paise
  new_ctc: number;       // integer paise
  effective_date: Date;
  signatory: string;
  status: ChangeRecordStatus;
  resolved_by?: string;
  resolved_at?: Date;
  created_at: Date;
}

export function createChangeRecord(
  id: string,
  tenant_id: string,
  employee_id: string,
  employee_name: string,
  old_ctc: number,
  new_ctc: number,
  effective_date: Date,
  signatory: string
): ChangeRecord {
  return {
    id,
    tenant_id,
    employee_id,
    employee_name,
    old_ctc,
    new_ctc,
    effective_date,
    signatory,
    status: "pending",
    created_at: new Date(),
  };
}

export function resolveChangeRecord(
  record: ChangeRecord,
  action: 'signed_off' | 'held' | 'rejected',
  resolved_by: string,
  resolved_at: Date = new Date()
): ChangeRecord {
  return { ...record, status: action, resolved_by, resolved_at };
}

export function isPendingChange(record: ChangeRecord): boolean {
  return record.status === "pending" || record.status === "held";
}
