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

## Deferred from: code review of 5-2-payslip-list-detail-view (2026-06-11)

- Auth is client-side mock — all credentials (email, empId, UAN, ESI, PAN) readable in JS source, no real server auth. Prototype by design. [app/portal.html:299–346]
- Demo credentials displayed unconditionally in login hint — no isDev guard. Prototype. [app/portal.html:770–775]
- PAN/UAN/ESI numbers shown without masking in statutory disclosures. Prototype. [app/portal.html:563–569]
- `innerHTML` XSS vectors — `emp.name`, `emp.uan`, `emp.pan`, `ps.month`, `ff.paymentMethod` interpolated raw. Safe with mock data; dangerous when backed by real API. [app/portal.html:523–569, 656]
- Client-side clock used for 12-month cutoff — tampered clock widens the visible window. Acceptable for prototype. [app/portal.html:465]
- `session.isExiting` not re-validated against employee record after login — stale until re-login if HR reverts exit status. Prototype. [app/portal.html:437]
- Same-tenant cross-employee data access via tampered `employeeId` in `localStorage` — `enforceIsolation` only verifies tenantId match after employee lookup. Prototype. [app/portal.html:385]
- `storage` event only fires for other-tab changes, not same-tab console manipulation — understood design limitation. [app/portal.html:706]
- Negative `netPaise` renders without visual warning or error — mock data always has positive net pay. [app/portal.html:289]
- Payslip at exact 12-month cutoff boundary may include/exclude unexpectedly due to UTC vs local date parsing — theoretical edge, cutoff uses local time and payDate parses as UTC midnight. [app/portal.html:468]

## Deferred from: code review of 6-3-bank-disbursement-instruction-file-generation (2026-06-11)

- `csvQuote` tab-prefix mutates cell value — prefixing `\t` to formula-injection chars is non-standard; Excel/Sheets may strip it, and bank portal parsers may reject leading-whitespace account fields. Prototype-only risk. [app/disbursement.html, csvQuote()]
- RTGS threshold `20000000` lacks unit annotation — magic number; no comment stating it represents ₹2,00,000 in paise. Easy to misread. Low risk in prototype. [app/index.html, buildMockDisbursementRecord()]
- Run ID suffix collision (`Date.now().slice(-3)`) — 1000 distinct values; two runs within the same second produce the same Run ID and overwrite localStorage. Pre-existing from story 1-8. [app/index.html]
- `employeeId` lexicographic sort fragile for non-zero-padded IDs — `localeCompare` on `EMP9` vs `EMP10` sorts wrong; mock uses padded IDs so no current impact. [app/disbursement.html, getSortedEmployees()]
- AC-8: jurisdiction field absent from disbursement record schema — employees array has no jurisdiction field; MH/TN/KA coverage from AC-8 is unverifiable at schema level. No functional impact. [app/disbursement.html, MOCK_DISBURSEMENT]
- RTGS threshold duplicated — defined separately in `buildMockDisbursementRecord()` and hardcoded in `MOCK_DISBURSEMENT.employees[].paymentMode`; no single source of truth. [app/index.html; app/disbursement.html]

## Deferred from: code review of 3-2-impact-preview-restructuring-simulator (2026-06-11)

- `violations[rowIdx]` index coupling in `recalcRow` — rowIdx is an array-position integer baked into the oninput handler at render time; will silently compute deltas for the wrong employee if rows are ever sorted or filtered. Should key by employeeId. [restructure.html:327]
- `scanWageRuleCompliance` has no error handling — a null/undefined entry or a `validateWageRule` throw aborts the loop mid-scan; partial results are returned without any error indicator. [wage-rule.ts:116]
- Frontend ROSTER mock missing `jurisdiction` and `esiApplicable` fields — structural mismatch with TypeScript `Employee` type; harmless while calculation is inlined JS, but a copy-paste trap for any typed integration. [restructure.html:201]
- `simulateRestructuring` assumes gross is unchanged (by convention) but does not enforce it — a caller who inadvertently passes a modified gross will get a misleading delta. Caller contract stated in JSDoc only. [wage-rule.ts:89]
- `monthlyCtc` literal baked into `oninput` attribute string at render time — if CTC ever becomes mutable (e.g., story 3.3 dynamic data), the pct-label display will use a stale denominator. [restructure.html:301]

## Deferred from: code review of 4-3-ttfp-measurement-instrumentation (2026-06-11)

- Duplicate business-day logic across 3 files (`ttfp.ts`, `app/index.html`, `app/onboarding.html`) — architectural necessity in zero-dependency prototype; TypeScript module cannot be imported from browser HTML files. Any future holiday list amendment requires updating three places with no test coverage of the browser copies. [src/domain/onboarding/ttfp.ts; app/index.html; app/onboarding.html]
- Malformed `pweb_ttfp_pauses` entries (missing or invalid `startedAt`) silently return 0 business days — `new Date(undefined)` is `Invalid Date`; the `while (cursor < endDay)` loop exits immediately, swallowing the pause contribution with no warning. [src/domain/onboarding/ttfp.ts:129; app/index.html `_computeBusinessDays`; app/onboarding.html `computeBusinessDaysJS`]
- Two `new Date()` calls in `computeBusinessDaysDisplay()` — `endDate` and `now` captured at different moments; theoretical ±1 business day error if execution crosses midnight. The canonical `computeTTFP` in `ttfp.ts` avoids this via injected `now` parameter. [app/index.html, `computeBusinessDaysDisplay()`]
- Pause `startedAt` marginally after `now` in onboarding clock tick loses first partial business day — benign sub-second rounding; `computeBusinessDays(ps, pe)` returns 0 when `ps >= pe` after midnight normalisation. [app/onboarding.html, `computeTTFPBizDays()`]
- Holiday list hardcoded to 2026 only — date ranges extending into 2027 will over-count business days; no tests cover year boundaries. [src/domain/onboarding/ttfp.ts:9; app/index.html; app/onboarding.html]
- `app/onboarding.html` biz-days display uses in-memory `ttfpStartTime`, not re-read from localStorage — cross-tab staleness if another tab writes `pweb_ttfp_start` after this page loads. [app/onboarding.html, `updateTTFPClock()` biz-days block]

## Deferred from: code review of 3-1-bulk-salary-structure-validation-flagging (2026-06-11)

- Non-positive/dirty CTC false-negative in frozen `validateWageRule` — a `ctcAnnualPaise` of 0, <12, negative, or `NaN` makes `requiredBasicPaise` collapse to 0/negative, so `basic >= required` is trivially true and a genuinely under-paid employee is silently counted *compliant* (never flagged). `scanWageRuleCompliance` propagates this verbatim with no test. Defect lives in the frozen story-2-4 function (forbidden to touch here; consumed by `app/payslip.html` + `multi-state.test.ts`). Right fix: reject/guard invalid CTC at the onboarding/CSV-import validation layer (stories 4-1 / 6-4), or add a non-positive-CTC guard when `validateWageRule` is next unfrozen. [src/domain/compliance/multi-state.ts:19-28; src/domain/compliance/wage-rule.ts]
