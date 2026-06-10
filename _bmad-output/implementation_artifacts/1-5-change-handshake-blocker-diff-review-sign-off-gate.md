---
story_id: 1.5
story_key: 1-5-change-handshake-blocker-diff-review-sign-off-gate
epic: 1
title: Change Handshake Blocker — Diff Review & Sign-off Gate
status: review
created: 2026-06-10
baseline_commit: d29d0b2115bf2712f5aa716d59d071530a127781
document_owner: Frontend + Backend Integration
---

# Story 1.5: Change Handshake Blocker — Diff Review & Sign-off Gate

## Overview

This story delivers the **Change Handshake** — the third pillar of the Payroll Readiness Score. It detects CTC/structure changes from finance sources, presents a per-record before/after diff with sign-off workflow, and enforces that unacknowledged changes block the run.

**What this story delivers:**
- Backend: Proper per-record change tracking with employee, old CTC, new CTC, effective date, signatory
- Backend: `handleChangeSignedOff` fully implemented — clears/reduces blocker per signed-off record
- Backend: FR-6 re-blocking — new change after partial sign-off re-opens the gate
- Frontend: Dynamic per-record diff table replacing static HTML
- Frontend: Per-row Sign-off / Hold / Reject radio buttons + Save button
- Frontend: Partial sign-off keeps blocker alive with updated count
- Frontend: Post-sign-off re-block simulation (FR-6 demo)

**Why this matters:**
Silent CTC changes are the #1 cause of post-run corrections in Indian payroll. The Change Handshake makes every change visible and requires explicit acknowledgement before it enters a payroll run.

---

## User Story Statement

As a **Payroll Manager (Priya)**,
I want to review a per-record diff of all CTC changes since the last run and sign off each record individually,
So that no salary change enters a payroll run without my acknowledgement, and I can see exactly what changed, for whom, and why.

---

## Acceptance Criteria

### AC-1: Change Handshake Blocker Creation
**Given** a ChangeDetected event arrives with N change records,
**When** the ReadinessService processes it,
**Then** a CHANGE_HANDSHAKE blocker is created with:
- `severity: MEDIUM`
- `description: "N unconfirmed CTC changes awaiting review and sign-off"`
- All change records stored and linked to the blocker

### AC-2: Per-Record Diff Display
**Given** the Change Handshake blocker is visible on the home screen,
**When** Priya clicks "Review & sign",
**Then** a drill-down surface opens showing a per-record table with columns:
- Employee name / ID
- Old CTC (₹)
- New CTC (₹)
- Effective date
- Signatory
- Action: radio buttons [Sign-off | Hold | Reject]

### AC-3: Sign-off Processing
**Given** Priya reviews the diff and selects actions for each record (sign-off some, hold others),
**When** she saves,
**Then**:
- Signed-off records are acknowledged (audit record created)
- Held records keep the blocker alive
- Blocker description updates to "N unconfirmed CTC changes" (only the held/unreviewed count)
- If ALL records are signed off, the blocker is fully resolved and score recomputes
- If SOME are held, score improves proportionally but blocker remains

### AC-4: FR-6 — Post-Sign-off Re-blocking
**Given** Priya has signed off all changes (score is back to 100%),
**When** a new CTC change arrives (ChangeDetected for a previously signed-off employee),
**Then** a new blocker row is raised: "1 new CTC change since sign-off"
The Readiness Score drops and the run re-blocks until the new diff is acknowledged.

### AC-5: Audit Trail
**Given** sign-off actions are performed,
**When** I query the audit log,
**Then** each sign-off record shows: actor, timestamp, employee_id, old_ctc, new_ctc, action (signed_off / held / rejected).

### AC-6: Score Impact
- Each unconfirmed change contributes to score deduction (part of overall CHANGE_HANDSHAKE blocker weight)
- Blocker cleared = full score points restored
- Partial sign-off = proportional improvement

---

## Technical Requirements

### Backend: ChangeDetected Schema Extension
Add `effective_date` to the change_set items:
```typescript
change_set: z.array(z.object({
  employee_id: z.string(),
  old_ctc: z.number().int(),
  new_ctc: z.number().int(),
  effective_date: z.date(),
  signatory: z.string(),
}))
```

### Backend: ChangeRecord Model
```typescript
interface ChangeRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  old_ctc: number;      // integer paise
  new_ctc: number;      // integer paise
  effective_date: Date;
  signatory: string;
  status: 'pending' | 'signed_off' | 'held' | 'rejected';
  resolved_by?: string;
  resolved_at?: Date;
}
```

### Backend: Tenant State Extension
Add `pendingChanges: Map<string, ChangeRecord>` to TenantState.
`handleChangeDetected`: store records in `pendingChanges`, create one CHANGE_HANDSHAKE blocker for all.
`handleChangeSignedOff`: update record status, recount pending, update/clear blocker.

### Backend: ReadinessScoreChanged Extension
Add optional `pending_changes` array to event schema so frontend can display them.

### Frontend
- `changeRecords` mock array: 18 records with per-employee data
- `renderChangeDiff(records)`: builds the per-record table dynamically
- `saveSignoffDecisions()`: reads radio states, calls resolve/partial-resolve
- Blocker description updated dynamically: "N unconfirmed CTC changes"
- FR-6 demo button: "Simulate new change" re-adds a held record to the pending set

---

## Integration with Previous Stories

**Story 1-1 (Readiness Service)**: `handleChangeDetected` already exists (stub). This story completes it with per-record tracking and `handleChangeSignedOff`.

**Story 1-2/1-3 (Home Screen + Score)**: The CHANGE_HANDSHAKE blocker already shows on the home screen. This story makes "Review & sign" open a real per-record diff instead of static HTML.

**Story 1-4 (Data Freshness Vitals)**: Pattern established here (event → blocker → score → UI) repeats for Change Handshake.

---

## Testing Requirements

### Unit Tests (ReadinessService)
- ChangeDetected creates CHANGE_HANDSHAKE blocker with correct count
- handleChangeSignedOff: all signed off → blocker cleared → score recomputes
- handleChangeSignedOff: partial sign-off → blocker updated with remaining count
- FR-6: new ChangeDetected after sign-off → re-creates blocker
- Rejected records treated same as signed-off (acknowledged, excluded from run)
- Held records keep blocker alive

### Frontend (Manual/Visual)
- Per-record table renders with employee data
- Radio buttons work per row
- Save button updates blocker count and score
- Full sign-off clears the blocker
- FR-6 demo: new change after sign-off re-blocks

---

## Definition of Done

- [ ] ChangeDetected schema includes `effective_date` and `employee_name`
- [ ] ChangeRecord model created
- [ ] TenantState extended with `pendingChanges`
- [ ] `handleChangeDetected` stores records and creates accurate blocker
- [ ] `handleChangeSignedOff` fully implemented
- [ ] ReadinessScoreChanged includes `pending_changes` array
- [ ] Frontend: dynamic per-record diff table
- [ ] Frontend: Sign-off/Hold/Reject per row + Save button
- [ ] Frontend: partial sign-off updates count correctly
- [ ] FR-6: post-sign-off re-blocking works
- [ ] All unit tests pass
- [ ] No regressions in stories 1-1 through 1-4

---

## Dev Notes for Implementation

**Pattern from story 1-4**: Event → tenantState update → recomputeAndEmitScore → UI renders from event payload. Follow this same pattern.

**Single-file constraint**: All frontend changes go in `app/index.html`. Keep it vanilla JS.

**Mock data**: Use 18 change records (matching the existing mock) with realistic Indian employee names and CTC values in integer paise.

**Key learning from 1-4**: The frontend simply renders what the service returns; don't duplicate state logic in the frontend.

**Paise convention**: All CTC values stored as integer paise (50,000 INR = 5,000,000 paise). Format to ₹ only at the display edge.

---

## Tasks / Subtasks

### Backend: Schema & Model

- [x] Extend ChangeDetected schema with `effective_date` and `employee_name` in events.ts
- [x] Create ChangeRecord interface in src/domain/models/change-record.ts
- [x] Export ChangeRecord from domain/models/index.ts (if index exists)

### Backend: Service Extension

- [x] Add `pendingChanges: Map<string, ChangeRecord>` to TenantState
- [x] Update `handleChangeDetected`: store records in pendingChanges, create blocker with accurate count
- [x] Implement `handleChangeSignedOff`: update record status, recount pending, update/clear blocker
- [x] Handle FR-6 in `handleChangeDetected`: if changes arrive after some signed-off, create new blocker for only new records
- [x] Add `pending_changes` array to ReadinessScoreChanged event (optional field)
- [x] Map pendingChanges to pending_changes in recomputeAndEmitScore

### Backend: Tests

- [x] Test: ChangeDetected stores all records and creates blocker with correct count
- [x] Test: handleChangeSignedOff with all records signed off → blocker cleared
- [x] Test: handleChangeSignedOff with partial sign-off → blocker updated with remaining count
- [x] Test: FR-6 — new ChangeDetected after sign-off creates new blocker for new records only
- [x] Test: Held records keep blocker alive

### Frontend: Change Diff UI

- [x] Replace static `changeRecords` mock with structured array (18 records with employee_name, old_ctc, new_ctc, effective_date, signatory)
- [x] Implement `renderChangeDiff(records)` function: builds per-record table dynamically
- [x] Add Sign-off / Hold / Reject radio button group per row
- [x] Add "Save decisions" button that calls `saveSignoffDecisions()`
- [x] Implement `saveSignoffDecisions()`: reads radio states, signs off / holds / rejects per record, updates blocker count, re-renders
- [x] Update modal header to show remaining unconfirmed count
- [x] Handle all-signed-off state: show FR-6 demo button, resolve blocker, update score

### Frontend: FR-6 Demo

- [x] Add "Simulate new change post-sign-off" button in the UI (visible after sign-off)
- [x] Clicking it fires a new ChangeDetected for one previously-signed record, re-adds to pending set
- [x] Score drops and blocker re-appears

### Regression

- [x] Run full test suite — all tests pass (111/111)
- [x] Visual check: diff table renders correctly, sign-off flow works end-to-end

---

## Dev Agent Record

### Implementation Plan
1. Backend schema/model first (extends existing ChangeDetected, adds ChangeRecord).
2. Service: complete handleChangeDetected and handleChangeSignedOff with per-record tracking.
3. Tests: cover all new service behavior.
4. Frontend: replace static modal with dynamic per-record diff table.
5. FR-6 demo in frontend.

### Completion Notes

All ACs satisfied. Backend fully implemented with per-record ChangeRecord tracking, handleChangeSignedOff with partial/full resolution, and FR-6 re-blocking. Frontend replaced static modal with dynamic per-record diff table (18 realistic Indian employees, paise values). Fixed `updateUI` → `renderList()+renderGauge(true)` bug found during visual testing. All 111 unit tests pass; visual flow verified end-to-end via Playwright.

### File List

- `src/domain/events.ts` — ChangeDetected schema extended (employee_name, effective_date); ChangeSignedOff schema extended (action); ReadinessScoreChanged extended (stale_since_timestamp, dead_since_timestamp, pending_changes)
- `src/domain/models/change-record.ts` — NEW: ChangeRecord interface, createChangeRecord, resolveChangeRecord, isPendingChange
- `src/domain/readiness/service.ts` — TenantState.pendingChanges added; handleChangeDetected and handleChangeSignedOff fully implemented; computeScore maps pending_changes
- `src/domain/readiness/service.test.ts` — Updated ChangeDetected fixtures; 3 new tests for sign-off flow and FR-6
- `app/index.html` — Dynamic change diff modal; 18 mock records; renderChangeDiff, saveSignoffDecisions, simulatePostSignoffChange; FR-6 demo button; fixed updateUI → renderList+renderGauge

### Change Log

| Date | Change |
|------|--------|
| 2026-06-10 | Initial implementation — all ACs delivered |
| 2026-06-10 | Fix: updateUI undefined error → renderList()+renderGauge(true) |
| 2026-06-10 | Fix: all-signed-off now shows FR-6 button before closing modal |
