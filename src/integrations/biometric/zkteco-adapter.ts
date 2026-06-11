/**
 * ZKTeco WDMS Biometric Adapter
 *
 * Handles push payloads from ZKTeco Web Data Management Server (WDMS).
 * ZKTeco devices use a different field naming convention but normalize to the
 * same AttendanceRecord shape — the core system never sees protocol differences.
 *
 * ZKTeco WDMS push format:
 *   { pin: "EMP002", time: "2026-06-10T08:45:00", type: "0", dev: "ZK01" }
 *
 * type: "0" = Normal, "1" = Check-In, "2" = Check-Out, "4" = OT-In, "5" = OT-Out
 */

import { SourceType } from "../../domain/events";
import type { SourceSynced } from "../../domain/events";
import type { SourceAdapter, AttendanceRecord, NormalizedRecord } from "../types";

type EventHandler = (event: SourceSynced) => void;
const handlers: EventHandler[] = [];
export function onSourceSynced(handler: EventHandler): void {
  handlers.push(handler);
}
function emitSourceSynced(event: SourceSynced): void {
  for (const h of handlers) h(event);
}

const DEMO_TENANT_ID = "00000000-0000-0000-0000-000000000001";

interface ZktecoRecord {
  pin?: unknown;
  time?: unknown;
  type?: unknown;
  dev?: unknown;
}

function normalizeRecord(raw: ZktecoRecord): AttendanceRecord | null {
  if (
    typeof raw.pin !== "string" ||
    !raw.pin ||
    typeof raw.time !== "string" ||
    !raw.time
  ) {
    return null;
  }

  // ZKTeco uses ISO 8601: "2026-06-10T08:45:00"
  const date = raw.time.slice(0, 10); // "YYYY-MM-DD"
  const timePart = raw.time.slice(11, 16); // "HH:MM"
  const [hourStr, minuteStr] = timePart.split(":");
  const hoursWorked = parseInt(hourStr, 10) + parseInt(minuteStr, 10) / 60;

  return {
    employeeId: raw.pin,
    date,
    data: {
      hoursWorked: parseFloat(hoursWorked.toFixed(2)),
      present: true,
    },
    receivedAt: new Date(),
  };
}

export const zktecoAdapter: SourceAdapter = {
  sourceId: "zkteco-biometric",
  sourceType: SourceType.BIOMETRIC,

  receive(payload: unknown): NormalizedRecord[] {
    try {
      const items: ZktecoRecord[] = Array.isArray(payload) ? payload : [payload as ZktecoRecord];
      const records: AttendanceRecord[] = [];

      for (const item of items) {
        const record = normalizeRecord(item);
        if (record) {
          records.push(record);
        } else {
          console.error("[zkteco-adapter] Skipping malformed record:", item);
        }
      }

      if (records.length === 0) {
        return [];
      }

      emitSourceSynced({
        tenant_id: DEMO_TENANT_ID,
        source_id: "zkteco-biometric",
        timestamp: new Date(),
      });

      return records;
    } catch (err) {
      console.error("[zkteco-adapter] Failed to parse payload:", err);
      return [];
    }
  },

  async pull(): Promise<NormalizedRecord[]> {
    const today = new Date().toISOString().slice(0, 10);
    const mockEmployees = ["EMP006", "EMP007", "EMP008", "EMP009", "EMP010"];

    const records: AttendanceRecord[] = mockEmployees.map((id, i) => ({
      employeeId: id,
      date: today,
      data: { hoursWorked: 7.5 + i * 0.25, present: true },
      receivedAt: new Date(),
    }));

    emitSourceSynced({
      tenant_id: DEMO_TENANT_ID,
      source_id: "zkteco-biometric",
      timestamp: new Date(),
    });

    return records;
  },
};
