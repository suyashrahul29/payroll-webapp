---
story_id: 2.2
story_key: 2-2-pure-calculation-core-statutory-computation-pf-esi-tds-pt
epic: 2
title: Pure Calculation Core — Statutory Computation (PF/ESI/TDS/PT)
status: done
created: 2026-06-10
---

## Summary

Implemented `src/domain/compliance/calculator.ts` — a pure, side-effect-free statutory
computation engine for Indian payroll (PF, ESI, TDS, PT).

## Files

- `src/domain/compliance/calculator.ts` — core implementation
- `src/domain/compliance/calculator.test.ts` — 28 tests (all green)

## Key design decisions

- All money as integer paise; `Math.floor()` on every division.
- Rates and thresholds read exclusively from resolved rule-set params (no hard-coded values).
- `resolveRulesForPeriod(jurisdiction, period)` builds a `ResolvedRules` map that is passed
  into `compute()`, keeping the pure function decoupled from the store.
- February PT override for Maharashtra handled inside `computePT`.
- 87A rebate applied when annual taxable income ≤ ₹7L.

## Test coverage

| Scenario | Tests |
|---|---|
| AC-1: ₹50k MH Jun 2026 (PF, ESI=0, PT MH, TDS, net) | 9 |
| AC-2: ₹50k TN Jun 2026 (PT differs from MH) | 5 |
| AC-3: Historical May 2025 | 2 |
| ESI: ₹15k gross (esiEmployee=11,250, esiEmployer=48,750) | 2 |
| PF opt-out | 1 |
| February PT override (MH) | 1 |
| Delhi PT = 0 | 1 |
| Referential transparency (pure function) | 1 |
| All fields are non-negative integers (6 scenarios) | 6 |
| **Total** | **28** |
