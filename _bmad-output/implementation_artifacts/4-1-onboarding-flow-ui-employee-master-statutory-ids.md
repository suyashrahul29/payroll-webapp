---
story_id: 4.1
story_key: 4-1-onboarding-flow-ui-employee-master-statutory-ids
epic: 4
title: Onboarding Flow UI — Employee Master & Statutory IDs
status: done
baseline_commit: d29d0b2115bf2712f5aa716d59d071530a127781
created: 2026-06-10
---

## Story

As a new tenant logging in for the first time, I want to be guided through a step-by-step onboarding flow so that I can set up my company's payroll quickly and confidently.

## Acceptance Criteria

- [x] AC1: New tenant sees 4-step onboarding flow (Import Employees → Statutory IDs → Connect Biometric → Go Live)
- [x] AC2: Step 1 — Upload valid CSV imports employees, invalid rows reported without silent failure
- [x] AC3: Step 2 — PAN and UAN per employee validated; flow advances when ≥80% complete
- [x] AC4: Step 3 — Connect eSSL/ZKTeco/Biomax/Matrix, test connection, run test sync
- [x] AC5: Step 4 — Pre-flight checklist with all 4 checks, TTFP clock starts on Go Live, links to dashboard

## Tasks

- [x] Create app/onboarding.html with 4-step guided flow
- [x] Step 1: CSV drop zone, template download, validation, import to localStorage
- [x] Step 2: Statutory IDs table with PAN/UAN validation, paste-from-Excel mode, 80% threshold
- [x] Step 3: Device type selection, IP/port fields, simulated connection + test sync
- [x] Step 4: Pre-flight checklist, TTFP clock, Go Live button linking to index.html
- [x] Navigation: Add "New Company Setup" link to index.html header
- [x] Create implementation artifact file
- [x] Update sprint-status.yaml

## File List

- app/onboarding.html (created)
- app/index.html (modified — added New Company Setup link in header)
- _bmad-output/implementation_artifacts/4-1-onboarding-flow-ui-employee-master-statutory-ids.md (created)
- _bmad-output/implementation_artifacts/sprint-status.yaml (modified)

## Dev Agent Record

### Implementation Notes

- Zero-dependency vanilla HTML/CSS/JS, single self-contained file
- Design system matches index.html exactly (same CSS variables, card styles, font stack, button styles)
- India-specific: PAN format validation (XXXXNNNNNX — 5 letters, 4 digits, 1 letter), UAN 12-digit validation, state codes (MH/DL/KA/TN/GJ/UP/WB/AP/KL/RJ), Indian names
- 4-step progress bar with pill indicators: active=blue, done=green, connector lines animate
- Step 1: Drop zone with dragover states, simulated CSV parsing (800ms), invalid file detection, template CSV download via Blob URL
- Step 2: Row-entry mode + paste-from-Excel (tab-separated) mode; real-time PAN/UAN validation with green/red input states; 80% threshold gate
- Step 3: 4 device type cards (eSSL/ZKTeco/Biomax/Matrix COSEC), 1.5s simulated connection delay, 2s simulated sync delay
- Step 4: Pre-flight checklist populated from prior steps' state, TTFP clock counting up in HH:MM:SS, localStorage persistence
- localStorage keys: pweb_employees, pweb_onboarding_step, pweb_biometric_device, pweb_ttfp_start, pweb_onboarding_done

### Change Log

- 2026-06-10: Created app/onboarding.html — full 4-step onboarding flow
- 2026-06-10: Added "New Company Setup" link to index.html header
- 2026-06-10: Updated sprint-status.yaml — 4-1 done, epic-4 in-progress
