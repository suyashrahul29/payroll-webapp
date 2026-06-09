---
story_id: 1.4
story_key: 1-4-data-freshness-vitals-source-tracking-display
epic: 1
title: Data Freshness Vitals — Source Tracking & Display
status: ready-for-dev
created: 2026-06-10
baseline_commit: 478dead
document_owner: Frontend + Backend Integration
---

# Story 1.4: Data Freshness Vitals — Source Tracking & Display

## Overview

This story delivers the **Data Freshness Vitals** blocker system — the second pillar of the Payroll Readiness Score. It displays a live pulse for every upstream data source (biometric, HRMS, finance), showing when each source last synced successfully and marking stale/dead sources as blockers.

**What this story delivers:**
- UI component showing all upstream data sources and their sync status
- Live indicators: green (synced ≤24h ago), amber (stale 24h+), red (dead 48h+)
- "Last synced" timestamps for each source
- "Stale since X hours" and "Dead since X hours" messages
- Integrated into Readiness Score: stale source = 15pt deduction, dead source = 100pt deduction (forces score to 0)
- Real-time updates when SourceSynced / SourceWentStale / SourceDead events arrive

**Why this matters:**
The payroll manager's #1 pain: "I ran payroll but attendance was stale — the LOP landed wrong and I didn't notice until an employee complained." Data Freshness Vitals makes that impossible — stale/dead sources are **visible and quantified** as blockers.

---

## User Story Statement

As a **Payroll Manager (Priya)**,
I want to see exactly which upstream data sources are fresh, stale, or dead,
So that I know why payroll readiness is blocked and can contact the right team to fix the data sync.

---

## Acceptance Criteria

### AC-1: Source Freshness Display Component

**Given** the Readiness Score dashboard is rendered,
**When** I look at the Readiness Score card,
**Then** I see a "Data Freshness Vitals" section showing:
- A list of all tracked upstream sources (e.g., "eSSL Biometric", "HRMS CSV", "Tally Finance")
- For each source, a colored pulse indicator (●):
  - **🟢 Green** = synced successfully in last 24 hours → label "Live"
  - **🟡 Amber** = last sync was 24h to 48h ago → label "Stale for X hours"
  - **🔴 Red** = no successful sync in 48+ hours → label "Dead for X hours"
- Each source line shows: `[●] Source Name — Last synced: 2h ago`

**Example visual:**
```
Data Freshness Vitals
─────────────────────
🟢 eSSL Biometric — Last synced: 2h ago
🟡 HRMS CSV — Stale for 28h (last synced yesterday)
🔴 Tally Finance — Dead for 72h (last synced 3 days ago)
```

### AC-2: Source Sync Event Integration

**Given** a SourceSynced event is received by the Readiness Service,
**When** the frontend polls or subscribes to score updates,
**Then** the source indicator immediately changes to 🟢 Green and displays the new "Last synced" timestamp.

**Given** a SourceWentStale event is received,
**When** the frontend updates,
**Then** the source indicator changes to 🟡 Amber and shows "Stale for X hours".

**Given** a SourceDead event is received,
**When** the frontend updates,
**Then** the source indicator changes to 🔴 Red and shows "Dead for X hours".

### AC-3: Readiness Score Impact

**Given** a source is marked stale (24h+ without sync),
**When** the Readiness Service recomputes the score,
**Then** a FRESHNESS_VITALS blocker is created with:
- `severity: MEDIUM`
- `description: "{source_name} sync stale X hours — {impact}"`
  - Example: "Tally sync stale 28h — inventory corrections at risk"
- `score_deduction: 15` (score reduced by 15 points)

**Given** a source is marked dead (48h+ without sync),
**When** the Readiness Service recomputes the score,
**Then** a FRESHNESS_VITALS blocker is created with:
- `severity: HIGH`
- `description: "{source_name} sync dead — no successful sync in 48h. Payroll at risk."`
- `score_deduction: 100` (forces score to 0, bypassing all other blockers)

**[RULE]** A dead source **immediately forces the Readiness Score to 0**, regardless of other blockers. This is the highest-priority signal: "Do not run payroll until the dead source is restored."

### AC-4: Source State Machine

**Given** the ReadinessService tracks source freshness,
**When** state transitions occur,
**Then** the service follows this state machine:

```
[Live] —(24h elapse)—> [Stale] —(24h elapse)—> [Dead]
  ↓                       ↓                       ↓
[SourceSynced]      [SourceSynced]         [SourceSynced]
  └─────────────────────────────────────────────────┘
                     Reset to [Live]
```

**[RULE]** Once a source reaches [Dead], a SourceSynced event must explicitly reset it to [Live]. Stale blockers do not auto-clear as time passes.

### AC-5: Thresholds (India Compliance Context)

**Given** the critical payroll deadlines in India,
**When** determining freshness thresholds,
**Then** use these values:
- **Live**: ≤24 hours since last sync (standard daily batch)
- **Stale**: 24h to 48h (approaching deadline risk; PF/ESI by 15th, TDS by 7th)
- **Dead**: 48h+ (breach-level risk; legal final-settlement deadline is 2 working days)

These thresholds align with the 2-working-day F&F deadline and statutory deadline clusters (7th, 15th, 30th of month).

---

## Technical Requirements

### Backend (ReadinessService Extensions)

**SourceFreshness Model** (TypeScript):
```typescript
interface SourceFreshness {
  source_id: string;
  source_type: "biometric" | "hrms" | "finance" | "attendance" | "leave";
  last_synced_at: Date | null; // ISO 8601 timestamp
  created_at: Date;
  is_stale: boolean; // true if > 24h since last_synced_at
  is_dead: boolean;  // true if > 48h since last_synced_at
  stale_since_timestamp?: Date; // when it transitioned to stale
  dead_since_timestamp?: Date;  // when it transitioned to dead
}
```

**Event Handlers to Implement** (in ReadinessService):
- `handleSourceSynced(event: SourceSynced)`: Mark source as live, clear stale/dead flags, emit score recompute
- `handleSourceWentStale(event: SourceWentStale)`: Mark `is_stale = true`, create FRESHNESS_VITALS blocker
- `handleSourceDead(event: SourceDead)`: Mark `is_dead = true`, replace stale blocker with dead blocker, force score to 0

**Score Deduction Logic**:
- Sum all FRESHNESS_VITALS blocker deductions
- Stale source = 15 points each
- Dead source = 100 points (any single dead source forces score = 0)

**API Update**:
The existing `GET /api/readiness/score` endpoint (from story 1-3) now includes sources in the response:
```json
{
  "score": 85,
  "state": "warning",
  "blockers": [...],
  "sources": [
    {
      "source_id": "essl-biometric",
      "name": "eSSL Biometric",
      "status": "live",
      "last_synced_at": "2026-06-10T14:32:00Z"
    },
    {
      "source_id": "tally-finance",
      "name": "Tally Finance",
      "status": "dead",
      "dead_since_timestamp": "2026-06-07T14:32:00Z"
    }
  ]
}
```

### Frontend (UI Component)

**Component Location**: `app/index.html` (existing single-file structure)

**Component Structure**:
```html
<section id="data-freshness-vitals">
  <h3>Data Freshness Vitals</h3>
  <ul id="source-list">
    <!-- dynamically populated from sources array in score response -->
    <li data-source-id="essl-biometric">
      <span class="status-indicator live">●</span>
      <span class="source-name">eSSL Biometric</span>
      <span class="timestamp">Last synced: 2h ago</span>
    </li>
  </ul>
</section>
```

**Styling Requirements** (use CSS variables from @colours.md):
- Live (🟢): `--color-success` (green)
- Stale (🟡): `--color-warning` (amber/yellow)
- Dead (🔴): `--color-critical` (red)

**Dynamic Updates**:
- On each `ReadinessScoreChanged` event, update the sources list
- Calculate "Last synced X ago" text from `last_synced_at` (relative time)
- Calculate "Stale for X hours" and "Dead for X hours" from stale/dead timestamps

---

## Integration with Previous Stories

**Story 1-1 (Readiness Service)**: Extend ReadinessService with SourceFreshness tracking and the three event handlers. The service already listens for domain events; this adds two new event types.

**Story 1-2 (Home Screen UI)**: The Data Freshness Vitals component sits **below the gauge** on the same hero screen. It's a new section, not a replacement of the gauge.

**Story 1-3 (Live Score Computation)**: The score API now includes the sources array. Frontend subscribes to the same `ReadinessScoreChanged` event but now also renders the sources list.

---

## Testing Requirements

### Unit Tests (ReadinessService)

- ✅ SourceSynced event resets source to live state
- ✅ SourceWentStale event creates FRESHNESS_VITALS blocker with 15pt deduction
- ✅ SourceDead event creates FRESHNESS_VITALS blocker with 100pt deduction
- ✅ Dead source forces score to 0 (overrides all other blockers)
- ✅ Multiple dead sources still result in score = 0 (no double-deduction)
- ✅ Clearing a dead blocker via PreFlightItemChanged restores score computation

### Integration Tests (Frontend + API)

- ✅ Score API includes sources array with all tracked sources
- ✅ Source status transitions (live → stale → dead → live) update UI correctly
- ✅ Timestamps display in human-readable format ("2h ago", "Stale for 28h")
- ✅ Dead source indicator is visually prominent (red) and captures attention
- ✅ UI remains responsive when sources array changes

### Edge Cases

- Source has never synced (null `last_synced_at`): treat as dead immediately
- Source synced exactly 24h ago: still green (threshold is >24h for stale)
- Multiple sources dead: all display red, score = 0 (not cumulative 200 deduction)

---

## Definition of Done

- [ ] SourceFreshness model added to domain/models/
- [ ] Three event handlers implemented in ReadinessService
- [ ] FRESHNESS_VITALS blocker creation logic added to score computation
- [ ] API endpoint returns sources array with current status
- [ ] Frontend component displays Data Freshness Vitals with live/stale/dead indicators
- [ ] All unit tests pass
- [ ] Manual test: trigger SourceWentStale event, verify UI updates in real-time
- [ ] Manual test: trigger SourceDead event, verify score drops to 0
- [ ] Manual test: trigger SourceSynced event, verify source returns to green
- [ ] Visual design matches @colours.md color system
- [ ] No regressions in stories 1-1 through 1-3

---

## Dev Notes for Next Story

After completing story 1-4, the next story (1-5: Change Handshake) will introduce another blocker type (CHANGE_HANDSHAKE) that shows pending CTC/structure diffs. The pattern established here (event handler → blocker creation → score deduction → UI display) will repeat for all remaining blockers.

Key learning from this story:
- The Readiness Service event loop is the **single source of truth** for score computation
- The frontend simply renders what the API returns; all state logic lives in the backend
- Blocker deductions are **additive** for multiple blockers of the same type, but a **single dead source overrides everything**

---

## Story Completion Tracking

**Status**: ready-for-dev
**Created**: 2026-06-10
**Last Updated**: 2026-06-10
**Implementation Ready**: Yes — all acceptance criteria are BDD-formatted and testable
