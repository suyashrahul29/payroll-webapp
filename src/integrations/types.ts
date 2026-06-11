/**
 * Core adapter contract for all integration sources.
 *
 * The moat: adding a new device (Biomax, Matrix COSEC) = new adapter file only.
 * Zero changes to core domain logic required.
 */

import { SourceType } from "../domain/events";

export { SourceType };

export interface NormalizedRecord {
  employeeId: string;
  date: string; // YYYY-MM-DD (IST date, stored as UTC internally)
  data: Record<string, unknown>;
  receivedAt: Date;
}

export interface AttendanceRecord extends NormalizedRecord {
  data: {
    hoursWorked: number;
    present: boolean;
    overtime?: number;
  };
}

/**
 * Every integration source implements this interface.
 * pull() is for scheduled polling; receive() is for webhook/push delivery.
 */
export interface SourceAdapter {
  sourceId: string;
  sourceType: SourceType;
  pull(): Promise<NormalizedRecord[]>;
  receive(payload: unknown): NormalizedRecord[];
}

export interface AdapterResult {
  records: NormalizedRecord[];
  sourceId: string;
  timestamp: Date;
  success: boolean;
  error?: string;
}
