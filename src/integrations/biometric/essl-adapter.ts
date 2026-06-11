/**
 * eSSL ADMS Biometric Adapter
 *
 * Handles push payloads from eSSL Access & Attendance Management Software (ADMS).
 * eSSL devices push attendance logs over HTTP to a configured server URL.
 *
 * eSSL ADMS push format (single record or array):
 *   { UserID: "EMP001", AttTime: "2026-06-10 09:30:00", AttState: "0", VerifyMethod: "1", DeviceID: "DEV01" }
 *
 * AttState: "0" = Check-In, "1" = Check-Out, "4" = OT-In, "5" = OT-Out
 */

import { SourceType } from "../../domain/events";
import type { SourceSynced } from "../../domain/events";
import type { SourceAdapter, AttendanceRecord, NormalizedRecord } from "../types";

// Simple in-process event bus — adapters emit, listeners react (no external dep)
type EventHandler = (event: SourceSynced) => void;
const handlers: EventHandler[] = [];
export function onSourceSynced(handler: EventHandler): void {
  handlers.push(handler);
}
function emitSourceSynced(event: SourceSynced): void {
  for (const h of handlers) h(event);
}

// Tenant ID for demo prototype — real impl would inject per-request
const DEMO_TENANT_ID = "00000000-0000-0000-0000-000000000001";

interface EsslRecord {
  UserID?: unknown;
  AttTime?: unknown;
  AttState?: unknown;
  VerifyMethod?: unknown;
  DeviceID?: unknown;
}

function parseAttTime(attTime: string): { date: string; hour: number; minute: number } {
  // "2026-06-10 09:30:00" — IST wall-clock time from device
  const [datePart, timePart] = attTime.split(" ");
  const [hourStr, minuteStr] = timePart.split(":");
  return { date: datePart, hour: parseInt(hourStr, 10), minute: parseInt(minuteStr, 10) };
}

function normalizeRecord(raw: EsslRecord): AttendanceRecord | null {
  if (
    typeof raw.UserID !== "string" ||
    !raw.UserID ||
    typeof raw.AttTime !== "string" ||
    !raw.AttTime
  ) {
    return null;
  }

  const parsed = parseAttTime(raw.AttTime);
  const hoursWorked = parsed.hour + parsed.minute / 60;

  return {
    employeeId: raw.UserID,
    date: parsed.date,
    data: {
      hoursWorked: parseFloat(hoursWorked.toFixed(2)),
      present: true,
    },
    receivedAt: new Date(),
  };
}

export const esslAdapter: SourceAdapter = {
  sourceId: "essl-biometric",
  sourceType: SourceType.BIOMETRIC,

  receive(payload: unknown): NormalizedRecord[] {
    try {
      const items: EsslRecord[] = Array.isArray(payload) ? payload : [payload as EsslRecord];
      const records: AttendanceRecord[] = [];

      for (const item of items) {
        const record = normalizeRecord(item);
        if (record) {
          records.push(record);
        } else {
          console.error("[essl-adapter] Skipping malformed record:", item);
        }
      }

      if (records.length === 0) {
        return [];
      }

      emitSourceSynced({
        tenant_id: DEMO_TENANT_ID,
        source_id: "essl-biometric",
        timestamp: new Date(),
      });

      return records;
    } catch (err) {
      console.error("[essl-adapter] Failed to parse payload:", err);
      return [];
    }
  },

  async pull(): Promise<NormalizedRecord[]> {
    // Simulate pull — returns 5 mock records for today
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
    const mockEmployees = ["EMP001", "EMP002", "EMP003", "EMP004", "EMP005"];

    const records: AttendanceRecord[] = mockEmployees.map((id, i) => ({
      employeeId: id,
      date: today,
      data: { hoursWorked: 8 + i * 0.5, present: true },
      receivedAt: new Date(),
    }));

    emitSourceSynced({
      tenant_id: DEMO_TENANT_ID,
      source_id: "essl-biometric",
      timestamp: new Date(),
    });

    return records;
  },
};
