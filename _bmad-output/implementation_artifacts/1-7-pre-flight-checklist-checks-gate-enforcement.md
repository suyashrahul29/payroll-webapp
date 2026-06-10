---
baseline_commit: d29d0b21
---

# Story 1-7: Pre-Flight Checklist — Checks & Gate Enforcement

## Status
done

## Story

As an HR manager (Priya), when I'm preparing a pay run, I need the Pre-Flight Checklist to evaluate all four checks — attendance fresh, no pending exits, no unacknowledged CTC changes, compliance validated — and show me exactly what's failing with a direct link to fix it, so that the Run Payroll button only unlocks when everything is genuinely clear.

## Acceptance Criteria

- **AC-1**: `service.runPreFlightChecks(tenant_id)` returns a checklist array with results for: (a) attendance synced in last 2h, (b) no pending exits without F&F, (c) no unacknowledged CTC changes, (d) compliance defaults validated. Each item is `{ check: string, check_id: string, status: 'PASS' | 'FAIL', blocker_if_fail: Blocker | null }`.
- **AC-2**: When all checks pass — the pre-flight section shows a green "✓ All clear. Payroll is ready to run." card and the run-button flips to enabled/ready (green fill, "▶ Run Payroll — 248 employees"). No "run anyway" option exists; this is binary.
- **AC-3**: When one or more checks fail — the pre-flight section lists each failing check with a red/amber icon, the check name, the specific blocker description (e.g., "3 exits pending F&F"), and an action button that links to the resolution surface (Settle → F&F modal, Review & sign → Change Handshake modal, Re-sync → Vitals modal).
- **AC-4**: The run-button is visually disabled (muted `#36404d`/`#E5E7EB` fill, cursor not-allowed, no hover effect) while any check fails, labeled "🔒 Run Payroll — blocked by pre-flight". Clicking it does nothing. **No bypass.** Hard gate, binary.
- **AC-5**: When a blocker is resolved (e.g., F&F settled via the modal), the corresponding pre-flight check flips to PASS immediately, the gauge recomputes, and if all checks now pass, the run-button flips to ready state — all without a page reload.
- **AC-6**: If pre-flight evaluation takes longer than 5 seconds (simulated with a demo toggle), the pre-flight section shows "Verifying pre-flight…" with a subtle loading indicator, and the run-button remains disabled until the check completes.
- **AC-7**: When a blocker was raised and then resolved before the run, the prevented-error counter increments by 1 per resolved blocker. This counter is visible in the Metrics section ("Errors prevented this run").

## Tasks / Subtasks

- [x] Task 1: Backend — add `runPreFlightChecks()` public method to service.ts
  - [x] 1.1 Define `PreFlightCheckResult` interface: `{ check: string, check_id: string, status: 'PASS' | 'FAIL', blocker_if_fail: Blocker | null }`
  - [x] 1.2 Implement `runPreFlightChecks(tenant_id: string): PreFlightCheckResult[]` with 4 check evaluations
  - [x] 1.3 Check (a): attendance FRESH — any FRESHNESS_VITALS blocker with a biometric source = FAIL; otherwise PASS
  - [x] 1.4 Check (b): exits settled — any active LIFECYCLE_CLOCK blocker = FAIL; otherwise PASS
  - [x] 1.5 Check (c): CTC acknowledged — any active CHANGE_HANDSHAKE blocker = FAIL; otherwise PASS
  - [x] 1.6 Check (d): compliance validated — any active PREFLIGHT blocker with check_id 'compliance-defaults' = FAIL; otherwise PASS
  - [x] 1.7 Return all 4 results in a fixed order (attendance, exits, CTC, compliance); include the first matching active blocker for blocker_if_fail

- [x] Task 2: Backend tests — cover `runPreFlightChecks()` scenarios in service.test.ts
  - [x] 2.1 All 4 checks PASS when no blockers exist (fresh tenant)
  - [x] 2.2 Check (a) FAIL when a FRESHNESS_VITALS blocker exists for a biometric source
  - [x] 2.3 Check (b) FAIL when a LIFECYCLE_CLOCK blocker exists; PASS after FFSettled event
  - [x] 2.4 Check (c) FAIL when a CHANGE_HANDSHAKE blocker exists; PASS after ChangeSignedOff clears all pending changes
  - [x] 2.5 Check (d) FAIL when PreFlightItemChanged(status: FAIL, check_id: 'compliance-defaults') fires; PASS when it fires with status: PASS
  - [x] 2.6 `blocker_if_fail` is null when check passes; contains the active blocker when check fails

- [x] Task 3: Frontend — pre-flight section all-clear state (AC-2)
  - [x] 3.1 In `renderList()`, when `resolved.size === blockers.length` (score = 100), replace the blockers list content with the all-clear card: green-tinted div, "✓ All clear. Payroll is ready to run." in bold, and the sub-note "Confirm the green gauge — no fire drill."
  - [x] 3.2 The run button already flips to ready via `renderGauge()` — verify this wires correctly with the all-clear card rendering

- [x] Task 4: Frontend — pre-flight loading state (AC-6)
  - [x] 4.1 Add `preFlightLoading` boolean flag (default false)
  - [x] 4.2 Add `showPreFlightLoading()` function: sets flag, replaces blockerList content with "Verifying pre-flight…" + subtle spinner div, disables run button regardless of score
  - [x] 4.3 Add "Demo: Trigger loading state" footer button that calls `showPreFlightLoading()` then restores after 6s via `setTimeout`
  - [x] 4.4 `renderList()` must no-op when `preFlightLoading === true` (so the loading state isn't overwritten)

- [x] Task 5: Frontend — verify action buttons link to correct resolution surfaces (AC-3)
  - [x] 5.1 `attend` blocker button ("Re-sync") → `openSourceModal(sources[0])` (eSSL detail modal) — updated to open source modal with "Re-sync now" button inside
  - [x] 5.2 `pf` blocker button ("Generate") → currently calls `resolve('pf')` (simple resolve) — kept as-is for mock
  - [x] 5.3 `exits` blocker button ("Settle →") → `openFFModal()` — already wired in Story 1-6
  - [x] 5.4 `ctc` blocker button ("Review & sign") → `openChangeModal()` — already wired in Story 1-5

- [x] Task 6: Update sprint-status.yaml to "ready-for-dev" for story 1-7 (already done by create-story workflow)

## Dev Notes

### Architecture Context

This story is in the **prototype layer** (`app/index.html`, single-file, zero dependencies) and the **backend domain layer** (`src/domain/readiness/service.ts`).

The backend changes are purely additive — a new public method `runPreFlightChecks()`. The frontend changes enhance the existing pre-flight section rendering.

**Backend:**
- `src/domain/readiness/service.ts` — ReadinessService class (EventEmitter pattern)
- `handlePreFlightItemChanged()` already exists and correctly handles PREFLIGHT blockers
- `BlockerType.PREFLIGHT` enum value already defined in `events.ts`
- `computeScore()` already deducts points for any active blocker regardless of type
- The new `runPreFlightChecks()` is a **query method** — it reads current state and maps to structured results. It does NOT modify state.

**Frontend:**
- `app/index.html` — single-file vanilla HTML/CSS/JS prototype
- `blockers` array (mock state): 4 blockers — exits, ctc, attend, pf
- `resolved` Set: tracks which blockers have been resolved
- `prevented` counter: increments via `resolve(id)` — already implements AC-7
- `renderList()` — renders blocker rows; needs all-clear state + loading state guard
- `renderGauge()` — calls `renderSources()` and manages run button state; already implements AC-4 binary gate
- `resolve(id)` — marks blocker done, increments `prevented`, triggers both renders with animation — already implements AC-5 and AC-7

**Key invariant:** The run button binary gate (`score >= 100 → enabled, else disabled`) is already implemented in `renderGauge()` and must NOT be changed. Story 1-7 only adds the all-clear card in the checklist section and the loading state.

### What Already Works (Do NOT Reinvent)

| Behavior | Where it lives | Status |
|---|---|---|
| Run button binary gate | `renderGauge()` in index.html | ✅ already works |
| Blocked button styling (muted fill, cursor not-allowed) | `.runbtn.blocked` CSS class | ✅ already correct |
| Blocker resolution in-place (gauge recomputes) | `resolve(id)` + `renderGauge(true)` | ✅ already works |
| Prevented-error counter increment | `resolve(id)` calls `prevented += 1` | ✅ already works |
| F&F modal action from 'exits' blocker | `openFFModal()` wired in renderList() | ✅ Story 1-6 |
| Change Handshake modal from 'ctc' blocker | `openChangeModal()` wired in renderList() | ✅ Story 1-5 |
| Source detail modal | `openSourceModal(source)` via vital tiles | ✅ Story 1-4 |
| `handlePreFlightItemChanged` backend handler | service.ts line 536–581 | ✅ Story 1-1 |

### Existing Blocker Row Pattern (index.html)

```javascript
// blockers array shape (mock state)
const blockers = [
  { id:'exits',  sev:'amber', weight:18, icon:'🕐', title:'1 exit pending F&F',
    desc:'Vivek Tiwari · F&F deadline: Thu 12 Jun 2026 · HR signatory: Priya Sharma',
    tag:'Lifecycle Clock', action:'Settle →' },
  { id:'ctc',    sev:'amber', weight:16, icon:'✎', title:'18 unconfirmed CTC changes',
    desc:'Finance pushed structure edits since last run · sign-off required',
    tag:'Change Handshake', action:'Review & sign' },
  { id:'attend', sev:'red',   weight:12, icon:'📡', title:'Attendance stale — 5 days',
    desc:'Biometric (eSSL) sync dead · LOP-sensitive payslips at risk',
    tag:'Freshness Vitals', action:'Re-sync' },
  { id:'pf',     sev:'amber', weight:6,  icon:'₹',  title:'PF challan not generated',
    desc:'Due by 15th · 248 employees · auto-fileable once inputs green',
    tag:'Compliance floor', action:'Generate' },
];
```

```javascript
// Existing resolve() — already handles AC-5 and AC-7, DO NOT break
function resolve(id){
  resolved.add(id);
  prevented += 1;
  renderList();
  renderGauge(true);
  // ...counter animation
}
```

### All-Clear Card Implementation (AC-2 / Task 3)

Add this at the top of `renderList()`, before the blockers loop:

```javascript
function renderList(){
  if (preFlightLoading) return;  // Task 4.4 guard
  listEl.innerHTML = '';

  if (resolved.size === blockers.length) {
    // AC-2: all-clear state
    listEl.innerHTML =
      '<div style="padding:22px 18px;display:flex;align-items:center;gap:14px;">' +
        '<div style="width:40px;height:40px;border-radius:50%;background:rgba(22,163,74,.12);' +
             'color:var(--green);display:grid;place-items:center;font-size:20px;flex:0 0 auto;">✓</div>' +
        '<div><div style="font-weight:700;color:var(--txt);">All clear. Payroll is ready to run.</div>' +
        '<div style="font-size:13px;color:var(--muted);margin-top:3px;">Confirm the green gauge — no fire drill.</div></div>' +
      '</div>';
    return;
  }

  blockers.forEach(b => { /* existing blocker row rendering... */ });
  // ...existing button wiring
}
```

### Loading State (AC-6 / Task 4)

```javascript
let preFlightLoading = false;

function showPreFlightLoading() {
  preFlightLoading = true;
  listEl.innerHTML =
    '<div style="padding:22px 18px;display:flex;align-items:center;gap:12px;color:var(--muted);">' +
      '<div style="width:18px;height:18px;border:2px solid var(--line);border-top-color:var(--blue);' +
           'border-radius:50%;animation:spin .8s linear infinite;flex:0 0 auto;"></div>' +
      '<span>Verifying pre-flight…</span>' +
    '</div>';
  // Keep run button disabled during loading
  runBtn.className = 'runbtn blocked';
  runBtn.disabled = true;
  runBtn.textContent = '🔒 Run Payroll — blocked by pre-flight';
  setTimeout(() => {
    preFlightLoading = false;
    renderList();
    renderGauge(false);  // restore correct state
  }, 6000);
}
```

Add `@keyframes spin { to { transform: rotate(360deg); } }` to the `<style>` block.

### `runPreFlightChecks()` Method Shape (service.ts)

```typescript
// Add this interface above the class (or in a types file)
export interface PreFlightCheckResult {
  check: string;
  check_id: string;
  status: 'PASS' | 'FAIL';
  blocker_if_fail: Blocker | null;
}

// Add as a public method on ReadinessService
public runPreFlightChecks(tenant_id: string): PreFlightCheckResult[] {
  const tenantState = this.getTenantState(tenant_id);
  const active = (type: BlockerType) =>
    Array.from(tenantState.blockers.values()).find(
      b => b.blocker_type === type && b.resolved_at === null
    ) ?? null;

  const attendanceBlocker = Array.from(tenantState.blockers.values()).find(
    b =>
      b.blocker_type === BlockerType.FRESHNESS_VITALS &&
      b.resolved_at === null
  ) ?? null;

  return [
    {
      check: 'Attendance synced in last 2 hours',
      check_id: 'attendance-fresh',
      status: attendanceBlocker ? 'FAIL' : 'PASS',
      blocker_if_fail: attendanceBlocker,
    },
    {
      check: 'No pending exits without F&F settled',
      check_id: 'exits-settled',
      status: active(BlockerType.LIFECYCLE_CLOCK) ? 'FAIL' : 'PASS',
      blocker_if_fail: active(BlockerType.LIFECYCLE_CLOCK),
    },
    {
      check: 'No unacknowledged CTC changes',
      check_id: 'ctc-acknowledged',
      status: active(BlockerType.CHANGE_HANDSHAKE) ? 'FAIL' : 'PASS',
      blocker_if_fail: active(BlockerType.CHANGE_HANDSHAKE),
    },
    {
      check: 'Compliance defaults validated',
      check_id: 'compliance-validated',
      status: active(BlockerType.PREFLIGHT) ? 'FAIL' : 'PASS',
      blocker_if_fail: active(BlockerType.PREFLIGHT),
    },
  ];
}
```

### Testing Patterns (from service.test.ts)

Follow existing test patterns:
- `describe("AC-N: Description", () => { it("should ...", (done) => { ... }) })`
- Use `service.emit("EventName", event)` to fire events
- Listen for `service.on("ReadinessScoreChanged", ...)` to assert side effects
- For synchronous query tests (no event needed): call `service.runPreFlightChecks(tenantId)` directly and assert the return value

```typescript
describe("runPreFlightChecks", () => {
  it("should return all PASS when no blockers exist", () => {
    const results = service.runPreFlightChecks(tenantId);
    expect(results).toHaveLength(4);
    results.forEach(r => {
      expect(r.status).toBe('PASS');
      expect(r.blocker_if_fail).toBeNull();
    });
  });

  it("should return FAIL for exits-settled when LIFECYCLE_CLOCK blocker exists", () => {
    // Fire ExitRecorded to create the blocker
    service.emit("ExitRecorded", {
      tenant_id: tenantId,
      employee_id: "EMP047",
      last_working_day: new Date(),
    });
    const results = service.runPreFlightChecks(tenantId);
    const exitsCheck = results.find(r => r.check_id === 'exits-settled')!;
    expect(exitsCheck.status).toBe('FAIL');
    expect(exitsCheck.blocker_if_fail).not.toBeNull();
    expect(exitsCheck.blocker_if_fail!.blocker_type).toBe(BlockerType.LIFECYCLE_CLOCK);
  });
});
```

### Regression Risks — Do Not Break

1. **`renderGauge()` run-button logic** — The binary gate in `renderGauge()` (score >= 100 → ready, else blocked) must not be duplicated or replaced in `renderList()`. The all-clear card in `renderList()` is purely visual; the gate logic stays in `renderGauge()`.

2. **`resolve(id)` side effects** — `resolve()` calls both `renderList()` and `renderGauge(true)`. If you add a `preFlightLoading` guard to `renderList()`, make sure the guard is ONLY active during the loading state demo, not during normal blocker resolution.

3. **`prevented` counter** — Do not add another increment in the all-clear rendering. Counter increments exactly once per `resolve(id)` call — that's already correct.

4. **F&F Settlement `confirmFFSettlement()`** — Story 1-6 calls `resolve('exits')` after confirming. The new `renderList()` all-clear check (`resolved.size === blockers.length`) will trigger the all-clear card once the last blocker resolves. Verify this works end-to-end.

5. **`handlePreFlightItemChanged` in service.ts** — Do not modify this handler. The new `runPreFlightChecks()` only reads state; it does not change how events are processed.

### Prototype-only Constraint

This is a **zero-dependency vanilla HTML/CSS/JS prototype** (see CLAUDE.md). Do not introduce:
- Any build step, npm package, or framework
- Module imports in `app/index.html`
- External CDN references

The demo toggle for the loading state (Task 4.3) can be a small hidden `<button>` in the page footnote area.

## Dev Agent Record

### Completion Notes

- **Backend**: Added `PreFlightCheckResult` interface (exported) and `runPreFlightChecks(tenant_id)` public method to `ReadinessService`. The method is a pure query — reads current blocker state for the tenant, maps 4 check types (FRESHNESS_VITALS, LIFECYCLE_CLOCK, CHANGE_HANDSHAKE, PREFLIGHT) to structured results with `status: 'PASS' | 'FAIL'` and `blocker_if_fail`.
- **Backend tests**: 9 new tests added in a `describe("runPreFlightChecks", ...)` block covering all 6 subtasks. Also fixed a pre-existing AC-7 test bug where `computeWorkingDayDeadline` test dates assumed June 10, 2026 is Tuesday (it's Wednesday) — corrected to 2025 dates. Total: 44 tests passing, 0 failures.
- **Frontend all-clear card (AC-2)**: `renderList()` early-returns with a green-tinted "✓ All clear. Payroll is ready to run." card when all blockers are resolved. Run button flips to green/enabled via existing `renderGauge()` logic.
- **Frontend loading state (AC-6)**: `preFlightLoading` flag + `showPreFlightLoading()` function with CSS spinner (`@keyframes spin`). Guard in `renderList()` no-ops when flag is set. Demo button in footnote triggers a 6s loading state.
- **AC-3 attend wiring**: Changed `attend` blocker action button to call `openSourceModal(sources[0])` instead of `resolve('attend')` directly. Added "↻ Re-sync now" button inside `openSourceModal()` for stale/dead sources — clicking it marks source live, resolves the blocker, and shows a toast.
- **Visual verification**: Full browser session confirmed — blocked state (48%), re-sync flow (source modal → Re-sync now → 60%, counter 0→1), sequential resolution of all 4 blockers, all-clear card at 100% with enabled green Run Payroll button and counter at 4.

### Senior Developer Review (AI)

**Review Date:** 2026-06-10
**Outcome:** Changes Requested
**Action Items:** 7 total — 1 decision-needed, 6 patch, 3 deferred

#### Action Items

- [x] [Decision] `attendanceBlocker` matches any FRESHNESS_VITALS source, not just biometric — resolved: added `source_type?: SourceType` to `Blocker` interface; `createBlocker` now accepts optional `source_type`; `handleSourceWentStale` and `handleSourceDead` pass the detected source type; `runPreFlightChecks` filters attendance blocker to `source_type === SourceType.BIOMETRIC`. Also made `detectSourceType` case-insensitive. [src/domain/models/blocker.ts, src/domain/readiness/service.ts]
- [x] [Patch] `renderGauge(false)` after loading timeout suppresses gauge animation — fixed: changed to `renderGauge(true)` in `showPreFlightLoading` setTimeout callback. [app/index.html]
- [x] [Patch] `active()` called twice per check; `attendanceBlocker` duplicates the same filter — fixed: stored `exitsBlocker`, `ctcBlocker`, `complianceBlocker` as single-call variables; attendance uses biometric-filtered lookup. [src/domain/readiness/service.ts]
- [x] [Patch] `openSourceModal(sources[0])` hardcoded to index 0 — fixed: changed to `sources.find(s => s.source_id === 'essl-biometric') || sources[0]`. [app/index.html]
- [x] [Patch] Double-click on Re-sync button double-increments `prevented` counter — fixed: added `if (resolved.has(id)) return;` guard at the start of `resolve()`. [app/index.html]
- [x] [Patch] Loading timeout (6s) not cancellable — fixed: stored timer ID in `preFlightLoadingTimer`; `resolve()` clears it via `clearTimeout`. [app/index.html]
- [x] [Patch] Missing test: `attendance-fresh` PASS after `SourceSynced` resolves FRESHNESS_VITALS blocker — fixed: added 2 new tests (PASS after sync, PASS when only non-biometric blocker exists). Total: 46 tests passing. [src/domain/readiness/service.test.ts]
- [x] [Defer] `computeWorkingDayDeadline` uses local `getDay()` vs UTC-normalized holidays — timezone mismatch could cause wrong weekend/holiday detection in IST. Story 1-6 code; deferred to follow-up. [src/domain/readiness/service.ts]
- [x] [Defer] `computeWorkingDayDeadline` returns the same mutated Date object — callers who mutate the result affect nothing here, but it's a footgun. Story 1-6 code; deferred. [src/domain/readiness/service.ts]
- [x] [Defer] `prevented` counter not scoped to a run boundary — tally is lifetime, not per-run. Pre-existing prototype design since story 1-1; deferred. [app/index.html]

### Review Follow-ups (AI)

- [x] [AI-Review] Resolve decision: `attendanceBlocker` biometric-only filter approach
- [x] [AI-Review] Patch: `renderGauge(false)` → `renderGauge(true)` in `showPreFlightLoading`
- [x] [AI-Review] Patch: Eliminate double `active()` calls; replace `attendanceBlocker` with biometric-filtered lookup
- [x] [AI-Review] Patch: Replace `sources[0]` with lookup by `source_id: 'essl-biometric'`
- [x] [AI-Review] Patch: Add `if (resolved.has(id)) return;` guard in `resolve()`
- [x] [AI-Review] Patch: Make loading timeout cancellable via stored timer ID
- [x] [AI-Review] Patch: Add test for `attendance-fresh` PASS after `SourceSynced`

## File List

- `src/domain/readiness/service.ts` — add `PreFlightCheckResult` interface + `runPreFlightChecks()` method
- `src/domain/readiness/service.test.ts` — add tests for `runPreFlightChecks()` (AC-1 through AC-7 backend coverage)
- `app/index.html` — add all-clear card rendering, loading state, spin keyframe CSS
- `_bmad-output/implementation_artifacts/sprint-status.yaml` — update 1-7 to "done" when complete

## Change Log

- 2026-06-10: Story created — Pre-Flight Checklist checks & gate enforcement
