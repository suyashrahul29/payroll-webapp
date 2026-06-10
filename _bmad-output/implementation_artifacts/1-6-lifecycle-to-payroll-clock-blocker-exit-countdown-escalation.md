---
baseline_commit: d29d0b21
---

# Story 1-6: Lifecycle-to-Payroll Clock Blocker — Exit Countdown & Escalation

## Status
review

## Story

As an HR manager (Priya), when an employee's last working day passes, I need a visible countdown to the 2-working-day F&F legal deadline — escalating to amber/red as the deadline approaches — so I never accidentally breach the statutory settlement window.

## Acceptance Criteria

- **AC-1**: Exit recorded (last working day 2026-06-10), deadline = 2026-06-12 (2 working days). LIFECYCLE_CLOCK blocker created.
- **AC-2**: F&F clock metric shows working days remaining; color = text-default (≥2 days), warning (#f5a623) (<24h), critical (#e74c3c) (<12h).
- **AC-3**: <24h remaining → warning color + description updates to "deadline: TODAY 3:00 PM".
- **AC-4**: <12h remaining → critical color + sticky top alert banner "⚠️ F&F DEADLINE AT RISK — [Name] · [Hours] · [HR signatory]".
- **AC-5**: "Settle →" opens drill-down with employee details, F&F amount (₹1,25,000), settlement options, checkboxes, Confirm button → clears blocker and recomputes gauge.
- **AC-6**: After settled → mock data updated in localStorage so portal.html reads "F&F Settled".
- **AC-7**: Working-day calendar respects holidays — 2026-06-11 holiday → deadline is still 2026-06-12 (skips holiday).
- **AC-8**: prefers-reduced-motion: countdown updates without animation.

## Tasks / Subtasks

- [x] Task 1: Backend — extend ReadinessService with computeWorkingDayDeadline and enhanced exit handlers
  - [x] 1.1 Add `computeWorkingDayDeadline(lastWorkingDay, workingDays, holidays)` public method to service.ts
  - [x] 1.2 Update `handleExitRecorded` to compute and store deadline in blocker description
  - [x] 1.3 Verify `handleFFSettled` correctly clears LIFECYCLE_CLOCK blocker (already correct)
- [x] Task 2: Backend tests — cover computeWorkingDayDeadline with holiday edge cases
  - [x] 2.1 Test: deadline = lastWorkingDay + 2 working days skipping weekends
  - [x] 2.2 Test: holiday on intervening day pushes deadline by 1 extra day
  - [x] 2.3 Test: AC-7 scenario: 2026-06-11 holiday, last WD 2026-06-10 → deadline 2026-06-13
- [x] Task 3: Frontend — F&F warning banner (amber, sticky, <24h mock state = 18h)
- [x] Task 4: Frontend — Lifecycle Clock blocker row for Vivek Tiwari
- [x] Task 5: Frontend — F&F Settlement modal/drill-down with confirm action
- [x] Task 6: Frontend — Gauge recompute after settlement + localStorage AC-6 update
- [x] Task 7: Frontend — Metric card update (ffClock shows countdown properly)
- [x] Task 8: Update sprint-status.yaml to "done" for story 1-6

## Dev Notes

### Architecture Context
- Backend: `src/domain/readiness/service.ts` — ReadinessService class (EventEmitter)
- Frontend: `app/index.html` — single-file vanilla HTML/CSS/JS prototype
- Mock state in index.html: `blockers` array, `resolved` Set, `prevented` counter
- Existing F&F clock: `#ffClock` metric card, `secs` countdown variable
- Blocker row pattern: `{ id, sev, weight, icon, title, desc, tag, action }`
- `renderList()` and `renderGauge()` are the two main render functions
- Modals follow `.modal` / `.modal-content` pattern (see vitalsModal, changeModal)

### Mock State for Story 1-6
- Employee: Vivek Tiwari, EMP047
- Last working day: 2026-06-10
- HR signatory: Priya Sharma
- Hours remaining (mock): 18h → triggers warning state (< 24h)
- Deadline: 2026-06-12 (Thu), but since 2026-06-11 is holiday (AC-7 demo), we use 2026-06-12

### F&F Amount Breakdown (in paise internally)
- Basic: ₹62,500 = 6,250,000 paise
- Leave encashment: ₹42,500 = 4,250,000 paise
- Gratuity: ₹20,000 = 2,000,000 paise
- Total: ₹1,25,000 = 12,500,000 paise

### Blocker Weight
- exits blocker (id='exits') already exists with weight:18, sev:'red'
- Will replace the generic 'exits' blocker with specific Vivek Tiwari data

## Dev Agent Record

### Completion Notes
- Added `computeWorkingDayDeadline()` as public method to ReadinessService
- Updated `handleExitRecorded()` to use computed deadline in blocker description
- Added 3 new test cases covering AC-7 holiday edge case and working-day computation
- Replaced generic 'exits' blocker in index.html with Vivek Tiwari-specific F&F blocker
- Added amber sticky warning banner at top of main content (18h remaining → warning state)
- Added F&F Settlement modal with employee details, itemized amount, settlement options, checkboxes
- Settlement confirms: removes blocker, clears banner, updates metric card to "Settled", recomputes gauge
- localStorage updated on settlement (AC-6): `ff_settled_EMP047 = true`
- prefers-reduced-motion media query added for countdown (AC-8)
- Working-day calendar includes 2026-06-11 as Indian holiday (AC-7)

## File List
- `src/domain/readiness/service.ts` — modified
- `src/domain/readiness/service.test.ts` — modified (new tests added)
- `app/index.html` — modified
- `_bmad-output/implementation_artifacts/sprint-status.yaml` — modified

## Change Log
- 2026-06-10: Implemented story 1-6 — Lifecycle-to-Payroll Clock Blocker with F&F settlement drill-down
