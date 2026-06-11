---
stepsCompleted: [step-01-document-discovery, step-02-prd-analysis, step-03-epic-coverage-validation, step-04-ux-alignment, step-05-epic-quality-review, step-06-final-assessment]
documentsInventoried:
  prd: _bmad-output/planning-artifacts/prds/prd-payroll-webapp-2026-06-09/prd.md
  architecture: _bmad-output/planning-artifacts/architecture.md
  epics: _bmad-output/planning-artifacts/epics.md
  ux_design: _bmad-output/planning-artifacts/ux-designs/ux-payroll-webapp-2026-06-09/DESIGN.md
  ux_experience: _bmad-output/planning-artifacts/ux-designs/ux-payroll-webapp-2026-06-09/EXPERIENCE.md
  story: _bmad-output/implementation_artifacts/4-3-ttfp-measurement-instrumentation.md
---

# Implementation Readiness Assessment Report

**Date:** 2026-06-11
**Project:** payroll-webapp

---

## PRD Analysis

### Functional Requirements

FR-1: Live Readiness Score — Priya can see a single Payroll Readiness Score for the current cycle on the home screen, updated continuously as upstream state changes.
FR-2: Blocker decomposition — Priya can expand the score into a list of named, countable Blockers, each linking to the input that owns it.
FR-3: Per-source freshness state — Priya can see, per Upstream Source, the last-synced timestamp and a freshness state of fresh / stale / dead.
FR-4: Freshness feeds the score — A stale or dead source raises a Blocker that holds the Readiness Score below 100% until resolved.
FR-5: Change diff with sign-off gate — Priya can review a per-record before/after diff of all CTC Changes since the last run, and must sign off before any changed record enters the run.
FR-6: Post-sign-off change re-blocks — A CTC Change arriving after Sign-off but before Run Payroll re-opens the gate for the affected records.
FR-7: Escalating settlement countdown — Priya can see, per exit, a countdown to the statutory F&F deadline that escalates green → amber → red as the deadline approaches.
FR-8: F&F status visibility — Priya can view and progress each exit's F&F state, and the resolved status propagates to the exiting employee's self-service view.
FR-9: Run gate enforcement — Priya cannot trigger Run Payroll while any Pre-Flight item is failing.
FR-10: Prevented-error capture — Each input issue caught at the Pre-Flight gate before reaching a payslip is counted toward the Prevented-Error Rate.
FR-11: Statutory computation — The Compliance Engine computes PF, ESI, TDS, and PT for each employee per the rules in force for the pay period and the employee's applicable state.
FR-12: Rule versioning — The product can carry multiple dated versions of a compliance rule and apply the correct version per run period.
FR-13: Restructuring with impact preview — Priya can run a bulk restructuring that brings salary structures into 50%-wage-rule compliance and preview the per-employee impact before applying.
FR-14: Guided setup to data-complete — A new customer can complete employee-master import, statutory IDs, and at least one attendance sync through a guided flow that detects the Data-Complete state.
FR-15: Time-to-First-Payroll measurement — The product measures Time-to-First-Payroll as business days from the Data-Complete timestamp to the first correct payroll run.
FR-16: Read-only payslip & F&F access — An employee can view their own payslips; an exiting employee can additionally view their F&F status.
FR-17: Biometric attendance ingestion — The product ingests attendance from eSSL, ZKTeco, Biomax, and Matrix COSEC devices.
FR-18: Finance/accounting ingestion — The product ingests CTC/structure data from Tally, Zoho Books, and QuickBooks.
FR-19: Bank disbursement — The product supports salary disbursement via bank portals; a disbursement file/instruction is produced from a completed run.
FR-20: CSV employee-master import — Priya can import the employee master via CSV with field validation and row-rejection reporting.

**Total FRs: 20**

### Non-Functional Requirements

NFR-1 (Recompute freshness): Readiness Score and Blocker decomposition reflect ingested changes within the agreed latency window; target <60s after an ingested change. (§4.1 / OQ-5)
NFR-2 (Auditability): Every Sign-off, hold, rejection, override, F&F resolution, and rule-version application is recorded with actor, timestamp, and the state acknowledged. (§4.3, §10)
NFR-3 (Multi-state correctness): Compliance computation must be correct across all states where design-partner employees are based; the engine must never assume a single jurisdiction. (§4.6, §10)
NFR-4 (Accuracy integrity): No payslip is produced from stale, dead, or unacknowledged input. (§10 / FR-4, FR-5, FR-9)
NFR-5 (Honest state): The system never displays a fabricated green/healthy state; unknown or failed sync is shown as such. (§10 / FR-3)
NFR-6 (Availability around the cycle): Heightened reliability expectation in the run window (days before payday); specific SLA TBD with design partners. (§10)
NFR-7 (Tenant isolation & privacy): The product holds sensitive PII and salary data; tenant isolation and least-privilege access are baseline. India data-residency expectations apply. (§13)

**Total NFRs: 7**

### Additional Requirements / Constraints

- No silent overrides: any deviation from a passing Pre-Flight is explicit and audited (OQ-1, §13).
- Working-day calendar must be configurable per state/employer holiday list (OQ-2, FR-7).
- Staleness thresholds are per-source-type and configurable; defaults TBD with design partners (OQ-2, FR-3).
- Historical-period re-run assumed in v1 scope (ASSUMPTION, FR-12).
- Restructuring output is itself a tracked change set routed through the Change Handshake (ASSUMPTION, FR-13).
- Rules-versioning is a compliance requirement, not an optimization — rules still landing through 2026.

### PRD Completeness Assessment

The PRD is thorough and well-structured. All 20 FRs are numbered, have testable consequences, and map to user journeys. NFRs are partially feature-local and partially aggregated in §10. Open questions (OQ-1 through OQ-7) and assumptions are indexed — a good hygiene practice. Minor gap: NFR-6 (availability SLA) and NFR-7 (data residency) are stated as TBD assumptions, which will need resolution before implementation of those surfaces.

---

## Epic Coverage Validation

### Coverage Matrix

| FR | PRD Requirement | Epic / Story Coverage | Status |
|---|---|---|---|
| FR-1 | Live Readiness Score | Epic 1 (Stories 1.1, 1.2, 1.3) | ✓ Covered |
| FR-2 | Blocker decomposition | Epic 1 (Stories 1.1, 1.3) | ✓ Covered |
| FR-3 | Per-source freshness state | Epic 1 (Story 1.4) | ✓ Covered |
| FR-4 | Freshness feeds the score | Epic 1 (Story 1.4) | ✓ Covered |
| FR-5 | Change diff with sign-off gate | Epic 1 (Story 1.5) | ✓ Covered |
| FR-6 | Post-sign-off change re-blocks | Epic 1 (Story 1.5) | ✓ Covered |
| FR-7 | Escalating settlement countdown | Epic 1 (Story 1.6) | ✓ Covered |
| FR-8 | F&F status visibility | Epic 1 (Story 1.6) | ✓ Covered |
| FR-9 | Run gate enforcement | Epic 1 (Stories 1.7, 1.8) | ✓ Covered |
| FR-10 | Prevented-error capture | Epic 1 (Stories 1.7, 1.8) | ✓ Covered |
| FR-11 | Statutory computation (PF/ESI/TDS/PT) | Epic 2 (Stories 2.2, 2.3, 2.4) | ✓ Covered |
| FR-12 | Rule versioning | Epic 2 (Story 2.1) | ✓ Covered |
| FR-13 | Restructuring with impact preview | Epic 3 (Stories 3.1, 3.2, 3.3) | ✓ Covered |
| FR-14 | Guided setup to data-complete | Epic 4 (Stories 4.1, 4.2) | ✓ Covered |
| FR-15 | Time-to-First-Payroll measurement | Epic 4 (Story 4.3) | ✓ Covered |
| FR-16 | Read-only payslip & F&F access | Epic 5 (Stories 5.1–5.4) | ✓ Covered |
| FR-17 | Biometric attendance ingestion | Epic 6 (Stories 6.1, 6.5) | ✓ Covered |
| FR-18 | Finance/accounting ingestion | Epic 6 (Stories 6.2, 6.5) | ✓ Covered |
| FR-19 | Bank disbursement | Epic 6 (Stories 6.3, 6.5) | ✓ Covered |
| FR-20 | CSV employee-master import | Epic 6 (Story 6.4) | ✓ Covered |

### Missing Requirements

None — all 20 FRs have traceable coverage in epics and stories.

### Coverage Statistics

- Total PRD FRs: 20
- FRs covered in epics: 20
- Coverage percentage: **100%**

---

## UX Alignment Assessment

### UX Document Status

**Found** — two UX spines:
- `ux-designs/ux-payroll-webapp-2026-06-09/DESIGN.md` (Visual Identity: tokens, components, color system)
- `ux-designs/ux-payroll-webapp-2026-06-09/EXPERIENCE.md` (Behavior: IA, flows, states, accessibility)

Both source from the PRD and the canonical prototype at `app/index.html`.

### Alignment Issues

**UX ↔ PRD: Strongly aligned.** All four UX key flows (KF-1 through KF-4) map 1:1 to PRD user journeys (UJ-1 through UJ-4). All 20 FRs are reachable from a UX surface. The 48 UX-DR items in epics.md correctly trace UX requirements to stories.

**UX ↔ Architecture — Known intentional divergence:**
- EXPERIENCE.md specifies "hand-built, zero-dependency HTML/CSS/JS (project convention), no framework."
- Architecture (AR-1) calls for React + TypeScript production frontend.
- This is **not a defect** — the architecture document explicitly acknowledges it (§2: "Keep vanilla `app/index.html` as-is... Production front-end: React + TypeScript"). The prototype and production app are deliberately separate tracks.

**UX-DR-14 (Sticky header TTFP) — partial coverage gap for story 4-3:**
- The sticky header requires "live Time-to-First-Payroll." Story 4-3 tasks update the Metrics section but the header TTFP value is not explicitly listed in the story's "Files to Modify." This needs verification during dev.

**Drill-down surfaces — deferred layout:**
- EXPERIENCE.md explicitly defers visual layout for drill-downs (Change Handshake, F&F settlement, Source re-sync, Compliance action) to the build stage. All four surfaces have behavioral specs; no mocks were created. This is a known intentional deferral, not a gap.

**Employee portal responsive layout:**
- EXPERIENCE.md marks portal responsive layout as "follow-up UX pass; v1 spec here is behavioral only." Epic 5 stories implement mobile-friendliness from the behavioral spec, which is adequate for prototype scope.

### Warnings

⚠️ **Minor:** The sticky header TTFP live value is a UX-DR-14 requirement. Story 4-3 should explicitly confirm whether its header update is in scope or deferred.

ℹ️ **Note:** WCAG AA contrast for `{colors.muted}` (#93a1b1) on `{colors.surface}` (#18202b) is flagged as "likely AA-large only" in EXPERIENCE.md. Should be verified at final UI polish.

---

## Epic Quality Review

### Epic Structure Validation

**Epic 1: Payroll Readiness Dashboard**
- ✓ User-centric outcome — Priya can see and resolve blockers from one screen.
- ✓ Can stand alone. All other epics build on it.
- ⚠️ Story 1.1 ("Readiness Service Foundation & Event Model") is partially a technical infrastructure story (role: Backend Engineer, creates DB schema + event model). Acceptable as the foundation story of Epic 1; without it there is no user value to deliver. Pattern is standard.
- 🔴 **Critical cross-epic dependency:** Story 1.8 AC explicitly invokes `the Compliance Engine (Epic 2)` during the Run Payroll execution path. The story cannot be fully demonstrated without Epic 2 in place.

**Epic 2: Compliance Engine**
- ✓ User-centric outcome — correct statutory computations per period and state.
- ✓ Internally independent; depends only on Epic 1 data shapes (rule-set resolution, employee records).

**Epic 3: 50%-Wage-Rule Restructuring Assistant**
- ✓ User-centric outcome — Priya can restructure salaries and preview impact.
- ✓ Story 3.2 uses the Compliance Engine (Epic 2) for impact calculation — backward dependency only.
- ✓ Story 3.3 routes through the Change Handshake (Epic 1, Story 1.5) — backward dependency only.

**Epic 4: Guided Onboarding & TTFP**
- ✓ User-centric outcome — new tenant reaches first correct payroll in ≤3 days.
- 🟠 Story 4.1 references FR-20 (CSV import) in its onboarding flow AC. FR-20 is assigned to Epic 6 (Story 6.4). If epics are implemented in order 1→6, Story 4.1 would be built before Epic 6 CSV import. In prototype scope this is resolved by scoping CSV import into 4.1 directly; in production the dependency ordering should be explicit.

**Epic 5: Employee Self-Service Portal**
- ✓ User-centric outcome — employees view payslips and F&F status.
- ✓ Story 5.3 references settled F&F state from Epic 1, Story 1.6 — backward dependency only.

**Epic 6: Integrations**
- ✓ User-centric outcome — live data from biometric, finance, bank, and CSV sources.
- ✓ All cross-epic references are backward (to Epic 1 event model).

---

### Story 4-3 Deep Inspection

**Story identity:**
- ✓ Title: TTFP Measurement & Instrumentation — directly instruments the second North-Star metric (SM-2).
- ✓ FR traced: FR-15, SM-2.
- ✓ Predecessor stories (4-1, 4-2) are completed; backward dependencies only.

**Acceptance criteria quality:**

| AC | Format | Testable | Concerns |
|---|---|---|---|
| AC-1 | Given/When/Then ✓ | ✓ Business-day count | Clear |
| AC-2 | Given/When/Then ✓ | ✓ UI banner presence | Clear |
| AC-3 | Given/When/Then ✓ | ✓ Specific metric fields | Clear |
| AC-4 | Constraint rule | ✓ Calendar logic | References story 1-6 pattern (backward) ✓ |
| AC-5 | Given/When/Then ✓ | ✓ localStorage key read | Prototype-specific; production behavior not covered (by design) |

**Task completeness:**
- ✓ All 6 tasks map to specific files and changes.
- ✓ Unit test file created (`ttfp.test.ts`) with explicit test cases.
- ✓ `completePayrollRun()` hook is minimal and does not break frozen logic.
- ✓ localStorage keys are documented and non-conflicting with established keys.

**Issues found:**

🟡 **Minor — Actor mismatch:** Story is written "As a Backend Engineer" but 3 of 6 tasks are frontend HTML updates (`app/onboarding.html`, `app/index.html`). Functionally a cross-stack story. No functional impact; label is slightly misleading.

🟠 **Major — Potential coverage gap for sticky header TTFP:** Git Intelligence in the story states "TTFP metric currently hardcoded in `app/index.html:266` and `:333`." The tasks spec only addresses the Metrics section (~line 333). If line 266 is the sticky header TTFP value (UX-DR-14: "live Time-to-First-Payroll" in header), the story may leave one of two hardcoded occurrences un-updated. **The story's scope should explicitly clarify whether both occurrences are addressed or only the Metrics section one.**

🟡 **Minor — AC-5 is prototype-scoped but not labeled as such:** AC-5 describes localStorage-backed computation. This is correct for the prototype but would not apply to production. The guardrails section correctly flags this context; the AC itself could add "(prototype scope)" notation for clarity.

🟡 **Minor — Holiday list is hardcoded (2026 only):** The business-day rules hardcode 10 holidays for 2026. This is appropriate for the prototype but should be noted for production (needs configurable calendar per OQ-2, FR-7). No action needed in this story; just a known deferral.

---

### Best Practices Compliance Summary

| Epic | User Value | Independently Functional | Stories Sized Right | No Forward Deps | Clear ACs |
|---|---|---|---|---|---|
| 1 | ✓ | ✓ | ✓ | ⚠️ Story 1.8 → Epic 2 | ✓ |
| 2 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 3 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 4 | ✓ | ✓ | ✓ | 🟠 Story 4.1 → Epic 6 | ✓ |
| 5 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 6 | ✓ | ✓ | ✓ | ✓ | ✓ |

**Story 4-3 specifically:** Structure is sound. Two findings (header-TTFP gap, actor label) require clarification/fix before dev start.

---

## Summary and Recommendations

### Overall Readiness Status

**Story 4-3: NEEDS MINOR WORK** — one actionable gap must be resolved before dev start. The remainder of the assessment is clean.

### Issues by Severity

#### 🔴 Critical (Epic-level — not blocking story 4-3 specifically)

1. **Story 1.8 forward dependency on Compliance Engine (Epic 2):** The Run Payroll execution story explicitly invokes the Compliance Engine. In prototype scope this is handled by mock data, but in production implementation order, Epic 2 must be available before Story 1.8 can be fully functional. Add a story-level dependency note to 1.8: "depends on Epic 2 being available."

#### 🟠 Major (Story 4-3 — must fix before dev start)

2. **Sticky header TTFP value not addressed:** Git Intelligence in story 4-3 records that the TTFP metric is hardcoded at `app/index.html:266` AND `:333`. The tasks spec covers only the Metrics section (~line 333). UX-DR-14 requires a "live Time-to-First-Payroll" in the sticky header. If line 266 is the header value, the story is incomplete — it will leave a hardcoded value in the header after the Metrics section is updated, creating inconsistency on the live dashboard.
   - **Action:** Before dev start, confirm whether line 266 is the header display. If yes, add a task: "Update `app/index.html` sticky header TTFP display at ~line 266 to use the same `computeBusinessDaysDisplay()` function."

#### 🟠 Major (Epic-level)

3. **Epic 4 Story 4.1 depends on Epic 6 CSV import:** Story 4.1's onboarding flow AC references FR-20 (CSV import), which belongs to Epic 6. If implementation proceeds 1→6 in order, this dependency should be explicitly noted and the CSV import sub-scope scoped into Story 4.1 itself for the prototype phase.

#### 🟡 Minor (Story 4-3)

4. **Actor mismatch:** "As a Backend Engineer" for a cross-stack story (3 of 6 tasks are frontend HTML). Recommend changing actor to "As a Full-Stack Engineer" or adding a note that this story touches both backend domain logic and frontend prototype files.

5. **AC-5 not labeled as prototype-scope:** AC-5 describes localStorage-backed computation. Add "(prototype scope)" to AC-5 to distinguish it from production-readiness expectations.

6. **Holiday list is 2026-only:** The hardcoded `INDIA_HOLIDAYS_2026` array is appropriate for the prototype but not production. Add a `// TODO(prod): replace with configurable calendar from OQ-2` comment in the code.

### Recommended Next Steps

1. **Fix the header TTFP gap (Issue #2):** Open `app/index.html`, locate line 266, and confirm whether it's the header TTFP. Add a task to story 4-3 to cover it if so. This is the only blocking action before dev start.
2. **Annotate Story 1.8:** Add "Epic 2 must be available before this story is fully functional" as a dependency note. No story rewrite needed.
3. **Annotate Story 4.1:** Add "CSV import sub-scope is self-contained in prototype; Epic 6 Story 6.4 covers production implementation" to avoid confusion in sprint planning.
4. **Proceed with story 4-3 dev** once Issue #2 is confirmed/resolved. All other findings are minor and do not block implementation.

### Final Note

This assessment identified **6 issues** across **3 categories** (critical epic-level, major story-level, minor). The PRD, UX, Architecture, and Epics are **100% aligned** on FR coverage. Story 4-3's structure is sound — clear ACs, complete task list, thorough test specification, and proper predecessor references. The single actionable blocker is a potential coverage gap in the sticky header TTFP display that takes ~5 minutes to confirm and fix.

**Assessment date:** 2026-06-11 | **Assessor:** Claude (bmad-check-implementation-readiness)
