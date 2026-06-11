# Parallel Development Plan — payroll-webapp

## Current State (as of 2026-06-10)

| Story | Status |
|-------|--------|
| 1-1 Readiness Service Foundation | done |
| 1-2 Home Screen UI Shell | done |
| 1-3 Live Readiness Score | done |
| 1-4 Data Freshness Vitals | done |
| 1-5 Change Handshake | done |
| 1-6 Lifecycle-to-Payroll Clock | done |
| 1-7 Pre-Flight Checklist | done |
| 1-8 Run Payroll Execution | done |
| 2-1 Compliance Rules DB | done |
| 2-2 Pure Calculation Core | done |
| 4-1 Onboarding Flow UI | done |
| 4-2 Data-Complete Detection / TTFP Clock | done |
| 5-1 Employee Portal Auth | done |
| 6-1 Adapter Pattern Foundation | done |
| 6-4 CSV Employee Master Import | done |
| 6-5 Source Freshness Heartbeat Integration | done |
| 2-3, 2-4, 3-1 through 3-3, 4-3, 5-2 through 5-4, 6-2, 6-3 | backlog |

---

## Dependency Map

```
✅ 1-1 ──→ ✅ 1-2 ──→ ✅ 1-3 ──→ ✅ 1-4
                                    │
                               ┌────┴────┐
                               ▼         ▼
                            ✅ 1-5    ✅ 1-6
                               └────┬────┘
                                    ▼
                                 ✅ 1-7 ──→ ✅ 1-8
                                               │
                                               └──→ 6-3 (backlog)

✅ 2-1 ──→ ✅ 2-2 ──→ 2-3 (backlog)
                    └──→ 2-4 (backlog)
                    └──→ 3-1 ──→ 3-2 ──→ 3-3 (all backlog)
                    └──→ 5-2 (also needs 5-1 ✅) (backlog)

✅ 6-1 ──→ 6-2 (backlog, also needs ✅ 1-5)
       └──→ ✅ 6-5
       └──→ ✅ 4-2

✅ 6-4
✅ 5-1
✅ 4-1

✅ 4-1 ──→ ✅ 4-2 ──→ 4-3 (backlog)

✅ 5-1 ──→ 5-2 (backlog, also needs 2-3)
       └──→ 5-3 (backlog, also needs ✅ 1-6)
       └──→ 5-4 (needs 5-2 + 5-3)
```

---

## Development Tracks

Six independent tracks that can run in parallel across developers/agents.

### Track A — Dashboard Completion (Epic 1)
*Owns: FR-1 to FR-10. Must complete before Track C (6-3) and Track D (5-3) unblock.*

```
[review 1-4] → dev 1-5 ──┐
                           ├──→ 1-7 ──→ 1-8
              dev 1-6 ──┘
```

- **1-5 and 1-6 are parallel** — both depend only on 1-1/1-2/1-3 (done).
- **1-7** must wait for 1-4 approved + 1-5 + 1-6.
- **1-8** must wait for 1-7 + at minimum 2-2 (pure calc core from Track B).

### Track B — Compliance Engine (Epic 2)
*Owns: FR-11, FR-12. Unblocks Track A (1-8), Track C (6-3), Track D (5-2), Track E (3-1).*

```
2-1 ──→ 2-2 ──┬──→ 2-3
               └──→ 2-4
```

- **2-1** has no upstream deps — can start immediately.
- **2-3 and 2-4** are parallel after 2-2.

### Track C — Integrations (Epic 6)
*Owns: FR-17 to FR-20.*

```
6-4  [start immediately, independent]

1-1 ✓ ──→ 6-1 ──┬──→ 6-2 (also needs 1-5 from Track A)
                  └──→ 6-5 (also needs 1-4 approved)

1-8 (Track A) ──→ 6-3
```

- **6-4** (CSV import) has no upstream deps — start immediately.
- **6-1** (adapter pattern) depends only on 1-1 (done) — start immediately.
- **6-2** needs 6-1 + 1-5 (Track A).
- **6-5** needs 6-1 + 1-4 approved.
- **6-3** (bank disbursement) is the last story — needs 1-8.

### Track D — Employee Portal (Epic 5)
*Owns: FR-16. Depends on Track A (1-6) and Track B (2-3).*

```
5-1 [start immediately] ──┬──→ 5-2 (also needs 2-3 from Track B)
                           ├──→ 5-3 (also needs 1-6 from Track A)
                           └──→ 5-4 (needs 5-2 + 5-3)
```

- **5-1** (auth/tenant isolation) has no upstream deps — start immediately.
- **5-2** and **5-3** are parallel after their respective blockers clear.
- **5-4** is last, needs 5-2 + 5-3.

### Track E — Restructuring Assistant (Epic 3)
*Owns: FR-13. Depends on Track B (2-2) and Track A (1-5).*

```
2-2 (Track B) ──→ 3-1 ──→ 3-2 ──→ 3-3 (also needs 1-5 from Track A)
```

- Fully sequential within the track.
- Cannot start until 2-2 is done.

### Track F — Onboarding & TTFP (Epic 4)
*Owns: FR-14, FR-15. Depends on Track C (6-1, 6-4).*

```
4-1 [start immediately] ──→ 4-2 (also needs 6-1 from Track C) ──→ 4-3
```

- **4-1** (onboarding UI) can be built independently (mock the integrations).
- **4-2** needs 6-1 + 4-1.

---

## Wave View (What Can Be Done Simultaneously)

| Wave | Stories (parallel within wave) | Status |
|------|-------------------------------|--------|
| **Wave 0** | 1-1, 1-2, 1-3 | ✅ done |
| **Wave 1** | 1-5, 1-6 · 2-1 · 6-1, 6-4 · 5-1 · 4-1 | ✅ done |
| **Wave 2** | 1-7 · 2-2 · 6-5 · 4-2 | ✅ done (6-2 still backlog) |
| **Wave 3** | 1-8 · 4-3 · (2-3, 2-4, 3-1, 5-2, 5-3 — backlog) | 🔄 partial — 1-8 done, 4-3 ready; 2-3 is the key blocker |
| **Wave 4** | **6-3** (ready) · 3-2, 5-4 (blocked on Wave 3 backlog) | 🔄 in progress |
| **Wave 5** | **3-3** (needs 3-2 + ✅ 1-5) | backlog |

**Maximum theoretical parallelism: Wave 1 runs 6 stories simultaneously.**

---

## Immediate Next Steps (right now)

Waves 0–3 are fully complete. The project is in **Wave 4**.

**Wave 4 — currently unblocked:**
- **6-3** Bank Disbursement (needs ✅ 1-8) — Track C
- **3-2** Impact Preview / Restructuring Simulator (needs 3-1 — backlog) — Track E, still blocked
- **5-4** Mobile-Friendly Responsive Design (needs 5-2 + 5-3 — both backlog) — Track D, still blocked

**To enter Wave 4 for Track C:** dev 6-3 immediately (all deps met).

**Still blocked (need 2-3 first):**
- 2-3 → 2-4, 5-2, 3-1 chain all blocked on 2-3 (payslip rendering)
- 4-3 (TTFP measurement) — needs ✅ 4-2, can start now

**To unblock the most downstream work:** dev 2-3 (payslip rendering) — gates 2-4, 5-2, and the entire Track E chain.

---

## Cross-Track Hard Dependencies (gates that serialize tracks)

| Blocked story | Waiting on | Track |
|--------------|-----------|-------|
| 1-7 | 1-5 + 1-6 | A waits on A |
| 1-8 | 1-7 + 2-2 | A waits on B |
| 6-2 | 1-5 | C waits on A |
| 6-3 | 1-8 | C waits on A |
| 6-5 | 1-4 approved | C waits on A |
| 5-2 | 2-3 | D waits on B |
| 5-3 | 1-6 | D waits on A |
| 3-1 | 2-2 | E waits on B |
| 3-3 | 1-5 | E waits on A |
| 4-2 | 6-1 | F waits on C |

**Critical path: 1-4 → 1-5/1-6 → 1-7 → 1-8** (Track A is the longest chain and gates the most downstream work.)

---

## Note on Single-File Constraint

The current prototype is a single `app/index.html`. Stories on **Track A** all touch the same file — develop them on separate feature branches and merge sequentially. Stories on other tracks (B, C, D, E, F) are primarily backend or separate surfaces and can branch freely without conflicts.
