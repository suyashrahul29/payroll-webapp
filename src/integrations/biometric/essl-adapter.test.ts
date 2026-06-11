/**
 * Tests for eSSL and ZKTeco biometric adapters
 *
 * Verifies:
 * - Valid eSSL payload → correct AttendanceRecord
 * - Malformed payload (missing UserID) → empty array, no SourceSynced emitted
 * - Multiple records in one push → all normalized
 * - ZKTeco format produces same AttendanceRecord shape as eSSL
 */

import { esslAdapter, onSourceSynced as esslOnSourceSynced } from "./essl-adapter.js";
import { zktecoAdapter, onSourceSynced as zktecoOnSourceSynced } from "./zkteco-adapter.js";
import { SourceType } from "../../domain/events.js";
import type { AttendanceRecord } from "../types.js";

describe("eSSL Adapter", () => {
  it("normalizes a valid eSSL push record to AttendanceRecord", () => {
    const payload = {
      UserID: "EMP001",
      AttTime: "2026-06-10 09:30:00",
      AttState: "0",
      VerifyMethod: "1",
      DeviceID: "DEV01",
    };

    const records = esslAdapter.receive(payload) as AttendanceRecord[];

    expect(records).toHaveLength(1);
    expect(records[0].employeeId).toBe("EMP001");
    expect(records[0].date).toBe("2026-06-10");
    expect(records[0].data.present).toBe(true);
    expect(typeof records[0].data.hoursWorked).toBe("number");
    expect(records[0].receivedAt).toBeInstanceOf(Date);
  });

  it("emits SourceSynced on valid payload", () => {
    const events: unknown[] = [];
    esslOnSourceSynced((e) => events.push(e));

    esslAdapter.receive({
      UserID: "EMP002",
      AttTime: "2026-06-10 10:00:00",
      AttState: "0",
      DeviceID: "DEV01",
    });

    expect(events.length).toBeGreaterThan(0);
  });

  it("returns empty array for missing UserID and does not emit SourceSynced", () => {
    const events: unknown[] = [];
    esslOnSourceSynced((e) => events.push(e));

    const initialCount = events.length;
    const records = esslAdapter.receive({
      AttTime: "2026-06-10 09:30:00",
      AttState: "0",
      DeviceID: "DEV01",
    });

    expect(records).toHaveLength(0);
    expect(events.length).toBe(initialCount); // no new events
  });

  it("normalizes multiple records from a single push", () => {
    const payload = [
      { UserID: "EMP001", AttTime: "2026-06-10 09:00:00", AttState: "0", DeviceID: "DEV01" },
      { UserID: "EMP002", AttTime: "2026-06-10 09:15:00", AttState: "0", DeviceID: "DEV01" },
      { UserID: "EMP003", AttTime: "2026-06-10 09:30:00", AttState: "0", DeviceID: "DEV01" },
    ];

    const records = esslAdapter.receive(payload) as AttendanceRecord[];

    expect(records).toHaveLength(3);
    expect(records.map((r) => r.employeeId)).toEqual(["EMP001", "EMP002", "EMP003"]);
  });

  it("skips malformed records in a batch but processes valid ones", () => {
    const payload = [
      { UserID: "EMP001", AttTime: "2026-06-10 09:00:00", AttState: "0", DeviceID: "DEV01" },
      { AttTime: "2026-06-10 09:15:00" }, // missing UserID
    ];

    const records = esslAdapter.receive(payload);
    expect(records).toHaveLength(1);
    expect(records[0].employeeId).toBe("EMP001");
  });

  it("has correct sourceId and sourceType", () => {
    expect(esslAdapter.sourceId).toBe("essl-biometric");
    expect(esslAdapter.sourceType).toBe(SourceType.BIOMETRIC);
  });

  it("pull() returns 5 records for today", async () => {
    const records = await esslAdapter.pull() as AttendanceRecord[];
    expect(records).toHaveLength(5);
    for (const r of records) {
      expect(r.data.present).toBe(true);
      expect(typeof r.data.hoursWorked).toBe("number");
    }
  });
});

describe("ZKTeco Adapter", () => {
  it("normalizes a valid ZKTeco push record to AttendanceRecord", () => {
    const payload = {
      pin: "EMP002",
      time: "2026-06-10T08:45:00",
      type: "0",
      dev: "ZK01",
    };

    const records = zktecoAdapter.receive(payload) as AttendanceRecord[];

    expect(records).toHaveLength(1);
    expect(records[0].employeeId).toBe("EMP002");
    expect(records[0].date).toBe("2026-06-10");
    expect(records[0].data.present).toBe(true);
    expect(typeof records[0].data.hoursWorked).toBe("number");
  });

  it("produces the same AttendanceRecord shape as eSSL", () => {
    const esslRecord = esslAdapter.receive({
      UserID: "EMP001",
      AttTime: "2026-06-10 09:30:00",
      AttState: "0",
      DeviceID: "DEV01",
    })[0] as AttendanceRecord;

    const zkRecord = zktecoAdapter.receive({
      pin: "EMP001",
      time: "2026-06-10T09:30:00",
      type: "0",
      dev: "ZK01",
    })[0] as AttendanceRecord;

    // Same shape — core system sees no protocol difference
    expect(Object.keys(esslRecord).sort()).toEqual(Object.keys(zkRecord).sort());
    expect(Object.keys(esslRecord.data).sort()).toEqual(Object.keys(zkRecord.data).sort());
    expect(esslRecord.employeeId).toBe(zkRecord.employeeId);
    expect(esslRecord.date).toBe(zkRecord.date);
  });

  it("returns empty array for missing pin", () => {
    const records = zktecoAdapter.receive({
      time: "2026-06-10T08:45:00",
      type: "0",
      dev: "ZK01",
    });
    expect(records).toHaveLength(0);
  });

  it("emits SourceSynced on valid payload", () => {
    const events: unknown[] = [];
    zktecoOnSourceSynced((e) => events.push(e));

    zktecoAdapter.receive({
      pin: "EMP003",
      time: "2026-06-10T09:00:00",
      type: "0",
      dev: "ZK01",
    });

    expect(events.length).toBeGreaterThan(0);
  });

  it("has correct sourceId and sourceType", () => {
    expect(zktecoAdapter.sourceId).toBe("zkteco-biometric");
    expect(zktecoAdapter.sourceType).toBe(SourceType.BIOMETRIC);
  });

  it("pull() returns 5 records for today", async () => {
    const records = await zktecoAdapter.pull() as AttendanceRecord[];
    expect(records).toHaveLength(5);
  });
});
