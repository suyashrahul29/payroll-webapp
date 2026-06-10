# Deferred Work

## Deferred from: code review of 1-8-run-payroll-execution-prevented-error-counter (2026-06-10)

- `reducedMotion` dead code — both branches of if/else in `setInterval` call `updateFFClock()` identically; no actual reduced-motion accommodation provided despite `@media (prefers-reduced-motion)` CSS being present. [app/index.html ~line 497]
- `simulatePostSignoffChange` permanently mutates `changeRecords` — repeated demo button clicks compound 3% CTC increases with no reset path back to original mock data. Demo-only code, low priority. [app/index.html — simulatePostSignoffChange]
- `pulse-num` animation timer pile-up — rapid successive `resolve()` calls queue multiple 400ms remove-class timers that can race with `completePayrollRun`'s animation, potentially cutting off the pulse effect. Minor visual glitch only. [app/index.html — resolve/completePayrollRun]

## Deferred from: code review of 1-7-pre-flight-checklist-checks-gate-enforcement (2026-06-10)

- `computeWorkingDayDeadline` uses local `getDay()` for weekend detection but normalises holidays to UTC midnight via `setUTCHours`. In IST (UTC+5:30), dates near midnight can differ between local and UTC, causing holidays to be missed and weekend detection to be inconsistent with the holiday set. Both should use the same timezone reference. Story 1-6 code. [src/domain/readiness/service.ts]
- `computeWorkingDayDeadline` returns the same mutated `current` Date object rather than `new Date(current)`. Callers that mutate the result could be surprised. Minor footgun. Story 1-6 code. [src/domain/readiness/service.ts]
- `prevented` counter in the prototype increments on every blocker resolution (lifetime tally), not scoped to a payroll run attempt. The Metrics label "Errors prevented this run" is therefore inaccurate between runs. Pre-existing prototype design since story 1-1; fix alongside the Run Payroll execution story (1-8). [app/index.html]
