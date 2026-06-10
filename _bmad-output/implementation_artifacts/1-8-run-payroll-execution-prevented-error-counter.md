---
baseline_commit: d29d0b2115bf2712f5aa716d59d071530a127781
---

# Story 1.8: Run Payroll Execution & Prevented-Error Counter

## Status

done

## Story

As an HR manager (Priya), when the Readiness Score reaches 100% and all pre-flight checks pass, I want to confirm and execute the payroll run through a soft confirmation modal, see the run in progress, receive a success confirmation with the prevented-error count, and have the dashboard reset for the next cycle, so that I have proof of first-pass accuracy and a clean slate for the next run.

## Acceptance Criteria

- **AC-1**: When Priya clicks "▶ Run Payroll — 248 employees" (run button enabled, score = 100%), a soft confirmation modal appears: "Ready to run payroll for June 2026? [Cancel] [Confirm]". The modal is dismissible by Cancel or clicking the backdrop.
- **AC-2**: On Confirm, the run button immediately shows "⏳ Running payroll…" (disabled, muted styling), and the modal closes. After a simulated 1.5s delay, the system completes the run. (In the prototype, this simulates the Compliance Engine call `runPayroll(tenant_id, cycle, signed_off_records, resolved_rules)` — the real integration is Epic 2.)
- **AC-3**: On successful run: the run button briefly shows "✓ Run complete" for 2s (green fill, disabled), then transitions to the next-cycle state. A green success toast appears: "Payroll run completed — zero post-run corrections" (auto-dismisses in 3.2s). The First-pass accuracy metric in the Metrics section updates to "99.6% (this run: zero corrections)".
- **AC-4**: The prevented-error counter in the Metrics section ("Errors prevented this run") shows the total count of blockers resolved before this run. The counter pulses with the existing `pulse-num` animation on increment. This value is locked in at run time and does not increment further until the next cycle.
- **AC-5**: After the success confirmation (2s post-run), the dashboard resets for the next cycle: `resolved` Set clears, `prevented` counter resets to 0, blockers re-appear (prototype: reinitialise from the original `blockers` array), gauge recomputes to starting score, and "Errors prevented this run" shows 0. The run button returns to blocked state.
- **AC-6**: If the run encounters an error (demo toggle: "Demo: fail run"), the run button re-enables to its pre-run ready state ("▶ Run Payroll — 248 employees"), and a **red** error toast appears: "Payroll run failed — Compliance Engine error" (auto-dismisses in 3.2s). No counter increment. No cycle reset.
- **AC-7**: The run continues idempotently in the backend even if the user navigates away. (Prototype note: no actual navigation needed; ensure no state corruption if the demo is re-run after navigating away.)
- **AC-8**: The toast auto-dismisses in 3.2s. Priya can also manually close it by clicking the toast. (The 3.2s `showToast()` function already exists — reuse it; add error variant.)

## Tasks / Subtasks

- [x] Task 1: Add run confirmation modal HTML (AC-1)
  - [x] 1.1 Add `<div class="modal" id="runConfirmModal">` HTML below the toast element, following the same modal pattern as `ffModal` and `changeModal` — semi-opaque backdrop, centered white/surface card, heading, body text, Cancel + Confirm buttons
  - [x] 1.2 Modal title: "Ready to run payroll?" · body: "June 2026 · 248 employees · All pre-flight checks passed." · buttons: `[Cancel]` (secondary) `[Confirm & Run]` (primary green)
  - [x] 1.3 Add `openRunConfirmModal()`, `closeRunConfirmModal()` JS functions (match existing modal open/close pattern: `modal.classList.add('show')` / `remove('show')`)
  - [x] 1.4 Wire `runBtn.onclick` → `openRunConfirmModal()` (replace the existing direct `showToast(...)` call at line 1095–1098)
  - [x] 1.5 Wire modal backdrop click → `closeRunConfirmModal()` (match existing modal pattern)

- [x] Task 2: Implement run execution flow (AC-2, AC-3)
  - [x] 2.1 Add `confirmPayrollRun()` function: closes modal, sets button to `⏳ Running payroll…` (`.blocked` class, disabled)
  - [x] 2.2 After 1.5s `setTimeout`: call `completePayrollRun()` (success path) or `failPayrollRun()` (error path, controlled by `runShouldFail` demo flag)
  - [x] 2.3 `completePayrollRun()`: set button text to `✓ Run complete` (`.ready` class, disabled), update First-pass accuracy metric to `"99.6%<small> (this run: zero corrections)</small>"`, call `showToast('✅ Payroll run completed — zero post-run corrections')`
  - [x] 2.4 After 2s, call `resetCycle()` to start the next cycle (AC-5)

- [x] Task 3: Prevented-error counter lock-in at run time (AC-4)
  - [x] 3.1 In `confirmPayrollRun()`, capture `const runPreventedCount = prevented` — this is the final count for this run
  - [x] 3.2 In `completePayrollRun()`, update `preventedNum.textContent = runPreventedCount` and trigger the `pulse-num` animation (match existing pattern in `resolve()`: remove class, force reflow, add class)
  - [x] 3.3 The `prevented` variable continues to be incremented by `resolve()` during the run's in-progress window (1.5s) — but `runPreventedCount` is captured at confirm-click, not at completion, so the final display reflects blockers resolved before the run was confirmed

- [x] Task 4: Next-cycle reset (AC-5)
  - [x] 4.1 Add `resetCycle()` function: clears `resolved` Set (`resolved.clear()`), resets `prevented = 0`, resets `preventedNum.textContent = 0`, resets First-pass accuracy metric to original static value (`"99.6%<small> / target ≥99.5%</small>"`), calls `renderList()` and `renderGauge(false)`
  - [x] 4.2 Verify `renderGauge(false)` after reset correctly flips the run button back to blocked state — it should, since `resolved.size < blockers.length` → `score < 100`

- [x] Task 5: Error path (AC-6)
  - [x] 5.1 Add `let runShouldFail = false` flag
  - [x] 5.2 Add `failPayrollRun()`: set button back to ready state (`▶ Run Payroll — 248 employees`, `.ready` class, enabled), call `showToast('❌ Payroll run failed — Compliance Engine error', 'error')`
  - [x] 5.3 Update `showToast(msg, type='success')`: when `type === 'error'`, set `t.style.background = 'var(--red)'` before adding `.show`; clear it on dismiss (or set back to `var(--green)`)
  - [x] 5.4 Add "Demo: fail run" toggle button in the footnote area (next to the existing pre-flight loading demo button), toggling `runShouldFail` — button text should reflect current state ("Demo: fail run" / "Demo: succeed run")

- [x] Task 6: Manual toast close (AC-8)
  - [x] 6.1 Add `onclick` to the toast element: `document.getElementById('toast').onclick = () => document.getElementById('toast').classList.remove('show')`; add `cursor:pointer` to `.toast` CSS

- [x] Task 7: Update sprint-status.yaml — story 1-8 → "done" when implementation complete

## Dev Notes

### Architecture Context

**This story is prototype-only** (`app/index.html`, single-file, zero dependencies). No `service.ts` changes needed — the Compliance Engine integration (`runPayroll()`) is Epic 2. Story 1-8 simulates the full run flow in the frontend prototype.

**Prototype file**: `app/index.html` — 1042 lines, vanilla HTML/CSS/JS, no build step, no imports.

### What Already Exists — Do NOT Reinvent

| Existing thing | Location | Notes |
|---|---|---|
| `showToast(msg)` | `app/index.html` line 1087 | Auto-dismisses at 3.2s. Extend with optional `type` param for error variant. |
| Toast HTML | `app/index.html` line 333 | `<div class="toast" id="toast">` — reuse; dynamically set background for error |
| `runBtn.onclick` stub | `app/index.html` line 1095–1098 | **Replace** this with `openRunConfirmModal()` call |
| `prevented` counter | `app/index.html` line 482 | `let prevented = 0` — already tracks resolved blocker count |
| `preventedNum` element | `app/index.html` line 322 | `id="preventedNum"` — already displays counter |
| `.pulse-num` animation | `app/index.html` CSS line 98–99 | `countPulse .4s ease-out` — reuse in run complete step |
| `pulse-num` trigger pattern | `resolve()` fn, lines 607–611 | Remove class → force reflow → add class → setTimeout remove |
| Modal pattern (open/close) | `ffModal`/`changeModal` JS | `modal.classList.add('show')` / `remove('show')` |
| Modal CSS | existing `.modal` / `.modal-content` styles | Reuse completely — no new CSS classes needed |
| `renderGauge(animate)` | `app/index.html` line 529 | Pass `false` on cycle reset (no animation needed on reset) |
| `renderList()` | `app/index.html` | Handles all-clear card + blocker rows — call after `resolved.clear()` |
| `blockers` array | `app/index.html` line 483 | The 4 mock blockers (exits, ctc, attend, pf) — cleared resolved Set re-shows all of them |
| First-pass accuracy metric | `app/index.html` line 321 | Static HTML `"99.6%<small> / target ≥99.5%</small>"` — update via `.querySelector` or direct DOM ref |
| `--red` CSS variable | `app/index.html` root styles | Already defined for error state colors |

### Modal HTML Pattern (from ffModal — follow exactly)

```html
<!-- Follow this exact structure for runConfirmModal -->
<div class="modal" id="runConfirmModal">
  <div class="modal-content" style="max-width:400px">
    <div class="modal-head">
      <h3>Ready to run payroll?</h3>
      <button class="modal-close" onclick="closeRunConfirmModal()">✕</button>
    </div>
    <div class="modal-body">
      <p style="margin:0 0 20px;color:var(--muted);">June 2026 · 248 employees · All pre-flight checks passed.</p>
      <div style="display:flex;gap:12px;justify-content:flex-end;">
        <button onclick="closeRunConfirmModal()"
          style="padding:10px 20px;border:1px solid var(--line);border-radius:8px;background:none;color:var(--txt);cursor:pointer;">
          Cancel
        </button>
        <button onclick="confirmPayrollRun()"
          style="padding:10px 24px;border:0;border-radius:8px;background:var(--green);color:#fff;font-weight:700;cursor:pointer;">
          Confirm & Run
        </button>
      </div>
    </div>
  </div>
</div>
```

### Run Execution Flow (AC-2 / AC-3 / AC-4 / AC-5)

```javascript
let runShouldFail = false;

function openRunConfirmModal() {
  document.getElementById('runConfirmModal').classList.add('show');
}

function closeRunConfirmModal() {
  document.getElementById('runConfirmModal').classList.remove('show');
}

function confirmPayrollRun() {
  closeRunConfirmModal();
  const runPreventedCount = prevented;  // capture before 1.5s window
  runBtn.className = 'runbtn blocked';
  runBtn.disabled = true;
  runBtn.textContent = '⏳ Running payroll…';

  setTimeout(() => {
    if (runShouldFail) {
      failPayrollRun();
    } else {
      completePayrollRun(runPreventedCount);
    }
  }, 1500);
}

function completePayrollRun(runPreventedCount) {
  // AC-3: run complete state
  runBtn.className = 'runbtn ready';
  runBtn.disabled = true;
  runBtn.textContent = '✓ Run complete';

  // AC-3: update First-pass accuracy metric
  const fpaEl = document.querySelector('.metric.good .v');  // first .good metric
  if (fpaEl) fpaEl.innerHTML = '99.6%<small> (this run: zero corrections)</small>';

  // AC-4: lock in counter with pulse animation
  const prevEl = document.getElementById('preventedNum');
  prevEl.textContent = runPreventedCount;
  prevEl.classList.remove('pulse-num');
  void prevEl.offsetWidth;
  prevEl.classList.add('pulse-num');
  setTimeout(() => prevEl.classList.remove('pulse-num'), 400);

  showToast('✅ Payroll run completed — zero post-run corrections');

  // AC-5: reset for next cycle after 2s
  setTimeout(resetCycle, 2000);
}

function failPayrollRun() {
  // AC-6: restore ready state, show red toast
  runBtn.className = 'runbtn ready';
  runBtn.disabled = false;
  runBtn.textContent = '▶ Run Payroll — 248 employees';
  showToast('❌ Payroll run failed — Compliance Engine error', 'error');
}

function resetCycle() {
  // AC-5: clear all per-run state
  resolved.clear();
  prevented = 0;
  document.getElementById('preventedNum').textContent = '0';
  // restore First-pass accuracy to static value
  const fpaEl = document.querySelector('.metric.good .v');
  if (fpaEl) fpaEl.innerHTML = '99.6%<small> / target ≥99.5%</small>';
  renderList();
  renderGauge(false);  // no animation on reset
}
```

### `showToast()` Error Variant (AC-6 / AC-8)

```javascript
// Update the existing showToast() function (currently at line 1087)
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = type === 'error' ? 'var(--red)' : 'var(--green)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}
```

Note: `var(--red)` maps to `#e74c3c` (critical color). Verify it's defined in `:root` — it is, used in existing blocker styling.

### Regression Risks — Do NOT Break

1. **`renderGauge()` binary gate** — Do NOT duplicate or move the gate logic. After `resetCycle()`, `renderGauge(false)` will naturally flip the button back to blocked because `resolved.size === 0` and `score < 100`. This is the correct path.

2. **`resolve()` side effects** — `resolve()` still calls `renderList()` + `renderGauge(true)` + increments `prevented`. After `resetCycle()`, `resolved.clear()` means `resolve()` can be called again on the same blocker IDs for the next cycle. Verify the `if (resolved.has(id)) return;` guard (added in Story 1-7 review) works correctly with a cleared Set.

3. **`preFlightLoading` guard** — `renderList()` no-ops when `preFlightLoading === true`. The `resetCycle()` call must not happen during a loading state. In practice: the run button is only enabled at score = 100, which means pre-flight loading would have been resolved. No conflict expected, but verify.

4. **Toast element reuse** — The toast element `id="toast"` is shared by `showToast()`, `confirmFFSettlement()` (line 1073), and the source re-sync flow (line 846). Adding a `type` param and dynamically setting `style.background` is safe — each call resets it.

5. **`ffClock` during reset** — `resetCycle()` does NOT reset `ffClock` or `ffSettled`. The F&F clock is driven by the `ffExitData` state, which is separate from blockers. After cycle reset, the `exits` blocker re-appears, but `ffSettled` may still be `true` from the previous cycle. This is acceptable prototype behavior — no fix needed.

6. **First-pass accuracy metric selector** — `document.querySelector('.metric.good .v')` selects the first `.metric.good`'s `.v` element, which is the "First-pass accuracy" metric. Verify the HTML order hasn't changed: line 321 shows First-pass accuracy is first, Errors prevented is second. Use `document.querySelectorAll('.metric.good .v')[0]` if needed to be explicit.

### Demo Toggle Placement

Add the "Demo: fail run" button to the existing footnote area (line 330):

```html
<p class="footnote">
  Prototype · mock data · the green gauge is the product. Resolve every blocker to unlock the run.
  <button onclick="showPreFlightLoading()" ...>Demo: pre-flight loading</button>
  <button id="failRunToggle" onclick="runShouldFail=!runShouldFail; this.textContent='Demo: '+(runShouldFail?'succeed run':'fail run')"
    style="font-size:11px;color:var(--muted);background:none;border:1px solid var(--line);border-radius:6px;padding:2px 8px;cursor:pointer;margin-left:6px;">
    Demo: fail run
  </button>
</p>
```

### Prototype-Only Constraint

Zero-dependency, no build step, no framework, no CDN references. All changes in `app/index.html` only. No `service.ts` changes — the Compliance Engine (`runPayroll()`) is Epic 2's domain.

### No `service.ts` Changes Needed

Story 1-8 is purely a **prototype frontend story**. The backend `runPayroll()` integration point with the Compliance Engine is defined in Epic 2 stories. `service.ts` already has `runPreFlightChecks()` from Story 1-7, which is the gate method for this story's precondition.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes List

- **Confirmation modal (AC-1)**: Added `<div class="modal" id="runConfirmModal">` HTML following the existing ffModal/changeModal pattern. Backdrop click dismisses via `onclick` on the modal root. `openRunConfirmModal()` / `closeRunConfirmModal()` wired to `runBtn.onclick` (replaced the old direct-toast stub).
- **Run execution flow (AC-2/3)**: `confirmPayrollRun()` captures `prevented` count at confirm time, sets button to "⏳ Running payroll…" (disabled), then after 1.5s calls `completePayrollRun()` or `failPayrollRun()` based on `runShouldFail`. `completePayrollRun()` shows "✓ Run complete", updates FPA metric, fires success toast, then calls `resetCycle()` after 2s.
- **Prevented-error counter lock-in (AC-4)**: Counter captured as `runPreventedCount` at confirm time; `pulse-num` animation fired in `completePayrollRun()` using the exact same pattern as `resolve()`.
- **Next-cycle reset (AC-5)**: `resetCycle()` clears `resolved` Set, resets `prevented = 0`, restores FPA metric HTML, calls `renderList()` + `renderGauge(false)`. Confirmed via browser test: gauge dropped from 100% → 48%, run button returned to blocked, counter showed 0, FPA metric restored.
- **Error path (AC-6)**: `failPayrollRun()` restores run button to ready state without triggering cycle reset. `showToast()` updated with optional `type` parameter; `'error'` sets `t.style.background = 'var(--red)'`. "Demo: fail run" toggle in footnote toggles `runShouldFail` with live button text update.
- **Toast click-to-dismiss (AC-8)**: `onclick="this.classList.remove('show')"` added to toast element. `.toast` CSS gets `cursor: pointer`; `.toast.show` gets `pointer-events: auto` so clicks register. Auto-dismiss at 3.2s unchanged.
- **Visual verification**: Browser testing via Playwright confirmed — blocked state (48%), run confirmation modal, success path with cycle reset to 48%, error path re-enabling the ready button.
- **Tests**: 167 existing tests pass. No service.ts changes (Compliance Engine is Epic 2). 3 pre-existing TS compile failures in unrelated Epic 4 files unchanged.

### File List

- `app/index.html` — confirmation modal HTML, run execution JS flow (`openRunConfirmModal`, `closeRunConfirmModal`, `confirmPayrollRun`, `completePayrollRun`, `failPayrollRun`, `resetCycle`), updated `showToast` with error variant, "Demo: fail run" toggle button, toast `onclick` + `cursor:pointer` CSS
- `_bmad-output/implementation_artifacts/sprint-status.yaml` — story 1-8 status updated

### Review Findings

- [x] [Review][Patch] Double-click race on "Confirm & Run" — fixed: `runInProgress` flag in `confirmPayrollRun` [app/index.html — confirmPayrollRun]
- [x] [Review][Patch] `resetCycle` incomplete — fixed: resets `ffSettled`, `secs`, `bannerDismissed`, `changeRecords`, ctcBlocker, `sources[0]` [app/index.html — resetCycle]
- [x] [Review][Patch] Blocker action buttons clickable during 2s "Run complete" window — fixed: `renderGauge` won't re-enable button while `runInProgress` is true [app/index.html — renderGauge]
- [x] [Review][Patch] `openSourceModal` appends to `timeline` without clearing — dismissed: already clears `timeline.innerHTML = ''` at line 888 (false positive)
- [x] [Review][Patch] `saveSignoffDecisions` double-renders after `resolve('ctc')` — fixed: removed redundant `renderList`/`renderGauge` calls [app/index.html — saveSignoffDecisions]
- [x] [Review][Patch] Toast `setTimeout` not cleared between calls — fixed: `clearTimeout(toastTimer)` before each new toast [app/index.html — showToast]
- [x] [Review][Patch] `ffWarningBanner` dismiss non-functional — fixed: `bannerDismissed` flag; dismiss button sets it; `updateFFClock` checks it [app/index.html — updateFFClock]
- [x] [Review][Patch] `showPreFlightLoading` not guarded during active run — fixed: early return if `runInProgress` [app/index.html — showPreFlightLoading]
- [x] [Review][Patch] `fpaMetrics[0]` positional selector — fixed: added `id="fpaValue"` to HTML, use `getElementById` in JS [app/index.html]
- [x] [Review][Patch] AC-1: Modal title — fixed: h3 now reads "Ready to run payroll for June 2026?" [app/index.html — runConfirmModal HTML]
- [x] [Review][Defer] `reducedMotion` dead code — both if/else branches in `setInterval` call `updateFFClock()` identically; no actual reduced-motion accommodation [app/index.html ~line 497] — deferred, cosmetic/low-impact
- [x] [Review][Defer] `simulatePostSignoffChange` permanently mutates `changeRecords` — repeated clicks compound 3% CTC increases with no reset path [app/index.html — simulatePostSignoffChange] — deferred, demo-only code
- [x] [Review][Defer] `pulse-num` timer pile-up — rapid `resolve()` calls queue multiple 400ms remove-class timers that race with `completePayrollRun`'s animation [app/index.html — resolve/completePayrollRun] — deferred, minor visual glitch

## Change Log

- 2026-06-10: Story created — Run Payroll Execution & Prevented-Error Counter
- 2026-06-10: Implementation complete — all 8 ACs satisfied, status → review
- 2026-06-10: Code review complete — 10 patches, 3 deferred, 7 dismissed
