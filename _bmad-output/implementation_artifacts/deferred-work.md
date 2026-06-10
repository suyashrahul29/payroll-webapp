# Deferred Work

## Deferred from: code review of 2-3-payslip-rendering-statutory-outputs-to-pdf-display (2026-06-10)

- `runId` generator uses `Date.now().slice(-3)` — collides for two runs within the same second. Prototype mock concern; no DB key dependency. [app/index.html completePayrollRun]
- Earnings row subtotal uses `outputs.grossPaise` while row values sum to `employee.grossSalaryPaise` — diverges under loss-of-pay prorating. Not in prototype scope. [payslip.ts:117, payslip.html:323]
- `formatDate` parses ISO date as UTC midnight — off-by-one in UTC-negative timezones. India-only product always runs in IST. [payslip.ts:87, payslip.html:304]
- `formatPaise` locale test asserts Indian grouping format which depends on ICU data — could flake in minimal-ICU Node. Project targets Node 20 with full ICU. [payslip.test.ts:17–23]
- `localStorage.getItem('payslip_current')` result passed to `renderPayslip` without null-safety on nested fields — uncaught TypeError if record shape is corrupted. MOCK fallback guards the no-data case; corrupted localStorage is prototype scope. [payslip.html:484]

## Deferred from: code review of 1-8-run-payroll-execution-prevented-error-counter (2026-06-10)

- `reducedMotion` dead code — both branches of if/else in `setInterval` call `updateFFClock()` identically; no actual reduced-motion accommodation provided despite `@media (prefers-reduced-motion)` CSS being present. [app/index.html ~line 497]
- `simulatePostSignoffChange` permanently mutates `changeRecords` — repeated demo button clicks compound 3% CTC increases with no reset path back to original mock data. Demo-only code, low priority. [app/index.html — simulatePostSignoffChange]
- `pulse-num` animation timer pile-up — rapid successive `resolve()` calls queue multiple 400ms remove-class timers that can race with `completePayrollRun`'s animation, potentially cutting off the pulse effect. Minor visual glitch only. [app/index.html — resolve/completePayrollRun]

## Deferred from: code review of 1-7-pre-flight-checklist-checks-gate-enforcement (2026-06-10)

- `computeWorkingDayDeadline` uses local `getDay()` for weekend detection but normalises holidays to UTC midnight via `setUTCHours`. In IST (UTC+5:30), dates near midnight can differ between local and UTC, causing holidays to be missed and weekend detection to be inconsistent with the holiday set. Both should use the same timezone reference. Story 1-6 code. [src/domain/readiness/service.ts]
- `computeWorkingDayDeadline` returns the same mutated `current` Date object rather than `new Date(current)`. Callers that mutate the result could be surprised. Minor footgun. Story 1-6 code. [src/domain/readiness/service.ts]
- `prevented` counter in the prototype increments on every blocker resolution (lifetime tally), not scoped to a payroll run attempt. The Metrics label "Errors prevented this run" is therefore inaccurate between runs. Pre-existing prototype design since story 1-1; fix alongside the Run Payroll execution story (1-8). [app/index.html]

## Deferred from: code review of 6-3-bank-disbursement-instruction-file-generation (2026-06-11)

- `csvQuote` tab-prefix mutates cell value — prefixing `\t` to formula-injection chars is non-standard; Excel/Sheets may strip it, and bank portal parsers may reject leading-whitespace account fields. Prototype-only risk. [app/disbursement.html, csvQuote()]
- RTGS threshold `20000000` lacks unit annotation — magic number; no comment stating it represents ₹2,00,000 in paise. Easy to misread. Low risk in prototype. [app/index.html, buildMockDisbursementRecord()]
- Run ID suffix collision (`Date.now().slice(-3)`) — 1000 distinct values; two runs within the same second produce the same Run ID and overwrite localStorage. Pre-existing from story 1-8. [app/index.html]
- `employeeId` lexicographic sort fragile for non-zero-padded IDs — `localeCompare` on `EMP9` vs `EMP10` sorts wrong; mock uses padded IDs so no current impact. [app/disbursement.html, getSortedEmployees()]
- AC-8: jurisdiction field absent from disbursement record schema — employees array has no jurisdiction field; MH/TN/KA coverage from AC-8 is unverifiable at schema level. No functional impact. [app/disbursement.html, MOCK_DISBURSEMENT]
- RTGS threshold duplicated — defined separately in `buildMockDisbursementRecord()` and hardcoded in `MOCK_DISBURSEMENT.employees[].paymentMode`; no single source of truth. [app/index.html; app/disbursement.html]
