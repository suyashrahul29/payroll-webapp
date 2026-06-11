---
story_id: 4.2
story_key: 4-2-data-complete-detection-ttfp-clock-start
epic: 4
title: Data-Complete Detection & TTFP Clock Start
status: done
created: 2026-06-10
---

## Summary

Implements FR-14: Data-Complete detection with TTFP clock start.

## Files Created / Modified

- `src/domain/onboarding/data-complete.ts` — `DataCompleteService` with `checkDataComplete`, `getTTFPStatus`, and state updaters
- `src/domain/onboarding/data-complete.test.ts` — 8 tests covering all AC
- `src/domain/events.ts` — Added `DataComplete` and `TimeToFirstPayrollStarted` event types

## Acceptance Criteria Coverage

- **AC-1**: `checkDataComplete(tenantId)` evaluates all 3 conditions and returns `{ isComplete, timestamp, missingConditions }`
- **AC-2**: On first transition to complete, emits `DataComplete` then `TimeToFirstPayrollStarted` (guarded — fires exactly once)
- **AC-3**: `getTTFPStatus(tenantId)` returns `{ startedAt, isRunning, missingConditions }`

## Data-Complete Conditions

1. `employeeCount > 0`
2. `employeesWithPAN / employeeCount >= 0.8` (80% PAN coverage)
3. `employeesWithUAN / employeeCount >= 0.8` (80% UAN coverage)
4. `lastBiometricSyncAt !== null && (now - lastBiometricSyncAt) <= biometricStalenessThresholdMs` (default: 2 hours)
