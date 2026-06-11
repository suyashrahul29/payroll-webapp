# Deferred Work

## Deferred from: code review of 1-4-data-freshness-vitals-source-tracking-display (2026-06-10)

- Threshold constants: `staleness_threshold_seconds` defaults to 7200s (2h) not 24h as AC-5 requires — `src/domain/readiness/source-freshness.ts`
- Dead threshold in `determineFreshnessState` is 86400s (24h) not 172800s (48h) per AC-5 — `src/domain/readiness/source-freshness.ts`
- `markAsStale` accepts DEAD state without a guard, violating AC-4 state machine — `src/domain/readiness/source-freshness.ts`
- `detectSourceType` checks PascalCase IDs (`"eSSL"`, `"ZK"`) but canonical IDs are kebab-case — always returns `MANUAL` — `src/domain/readiness/source-freshness.ts`
- `renderSources` wipes and rebuilds entire DOM on every `updateUI` call — DOM thrashing, pre-existing pattern — `app/index.html`
- `openVitalsModal` dead code still present alongside new `openSourceModal` — `app/index.html`
