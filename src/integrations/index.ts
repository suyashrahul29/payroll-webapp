/**
 * Integrations — top-level exports.
 *
 * Add new source adapters by registering them in biometric/index.ts (or a
 * parallel finance/index.ts, bank/index.ts, etc.) — zero changes needed here.
 */

export { FreshnessMonitor, DEFAULT_THRESHOLDS } from "./freshness-monitor";
export type { SourceFreshnessState, SourceFreshnessStateChange } from "./freshness-monitor";

export { biometricAdapters, getAdapter, registerAdapter } from "./biometric/index";

export type { SourceAdapter, NormalizedRecord, AttendanceRecord, SourceType } from "./types";
