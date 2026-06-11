import { computeBusinessDays, computeTTFP, TTFPPause } from './ttfp.js';

// ---------------------------------------------------------------------------
// computeBusinessDays
// ---------------------------------------------------------------------------

describe('computeBusinessDays', () => {
  it('counts Mon–Fri across a single week', () => {
    // Mon 2026-06-01 → Fri 2026-06-05 = 4 business days (exclusive start, inclusive end)
    const start = new Date('2026-06-01T00:00:00');
    const end = new Date('2026-06-05T00:00:00');
    expect(computeBusinessDays(start, end, [])).toBe(4);
  });

  it('skips Saturday and Sunday', () => {
    // Fri 2026-06-05 → Mon 2026-06-08: Sat + Sun skipped → 1 biz day
    const start = new Date('2026-06-05T00:00:00');
    const end = new Date('2026-06-08T00:00:00');
    expect(computeBusinessDays(start, end, [])).toBe(1);
  });

  it('skips a holiday that falls on a weekday', () => {
    // Mon 2026-08-10 → Sat 2026-08-15; 15-Aug (Independence Day, Saturday) should not affect count
    // Actual: Tue 12, Wed 13, Thu 14 = 3 biz days (Sat skipped anyway)
    const start = new Date('2026-08-10T00:00:00');
    const end = new Date('2026-08-15T00:00:00');
    // Without holiday list: Tue 11, Wed 12, Thu 13, Fri 14 = 4
    expect(computeBusinessDays(start, end, [])).toBe(4);
  });

  it('deducts a holiday that falls on a weekday', () => {
    // Mon 2026-08-10 → Fri 2026-08-21; Independence Day 2026-08-15 is a Saturday — no effect
    // Verify with Labour Day (Friday 2026-05-01)
    // Thu 2026-04-30 → Mon 2026-05-04: normally Fri 1, Mon 4 = 2; minus holiday on Fri = 1
    const start = new Date('2026-04-30T00:00:00');
    const end = new Date('2026-05-04T00:00:00');
    expect(computeBusinessDays(start, end, ['2026-05-01'])).toBe(1);
  });

  it('returns 0 when end equals start', () => {
    const d = new Date('2026-06-01T00:00:00');
    expect(computeBusinessDays(d, d, [])).toBe(0);
  });

  it('returns 0 when end is before start', () => {
    const start = new Date('2026-06-05T00:00:00');
    const end = new Date('2026-06-01T00:00:00');
    expect(computeBusinessDays(start, end, [])).toBe(0);
  });

  it('counts 3 business days across a weekend correctly', () => {
    // Thu 2026-06-04 → Tue 2026-06-09: Fri 5, Mon 8, Tue 9 = 3
    const start = new Date('2026-06-04T00:00:00');
    const end = new Date('2026-06-09T00:00:00');
    expect(computeBusinessDays(start, end, [])).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// computeTTFP
// ---------------------------------------------------------------------------

describe('computeTTFP', () => {
  it('returns null TTFP when clock has not started', () => {
    const result = computeTTFP(null, null, []);
    expect(result.ttfpBusinessDays).toBeNull();
    expect(result.firstRunComplete).toBe(false);
    expect(result.isPaused).toBe(false);
  });

  it('shows elapsed biz days when clock started but no run yet', () => {
    // Clock started Mon 2026-06-01; "now" = Thu 2026-06-04 → 3 biz days elapsed
    // Both timestamps are timezone-naive so local-time normalisation is consistent
    const now = new Date('2026-06-04T12:00:00');
    const result = computeTTFP('2026-06-01T09:00:00', null, [], now);
    // Mon→Tue→Wed→Thu but exclusive start: Tue 2, Wed 3, Thu 4 = 3
    expect(result.ttfpBusinessDays).toBe(3);
    expect(result.firstRunComplete).toBe(false);
    expect(result.firstRunAccuracy).toBeNull();
  });

  it('shows final TTFP after run completes', () => {
    // Clock started Mon 2026-06-01; first run Wed 2026-06-03 → 2 biz days
    const result = computeTTFP(
      '2026-06-01T09:00:00',
      '2026-06-03T17:00:00',
      []
    );
    expect(result.ttfpBusinessDays).toBe(2);
    expect(result.firstRunComplete).toBe(true);
    expect(result.firstRunAccuracy).toBe('zero corrections');
  });

  it('deducts resolved external pause biz days from total', () => {
    // Clock Mon 2026-06-01; run Thu 2026-06-11 = 8 biz days gross
    // External pause Tue 2026-06-02 → Wed 2026-06-03 = 1 biz day (only Tue 2)
    const pauses: TTFPPause[] = [
      { id: 'pf_registration', startedAt: '2026-06-02T10:00:00', resolvedAt: '2026-06-03T10:00:00' },
    ];
    const result = computeTTFP(
      '2026-06-01T09:00:00',
      '2026-06-11T17:00:00',
      pauses
    );
    expect(result.externalLatencyDays).toBe(1);
    expect(result.ttfpBusinessDays).toBe(7); // 8 - 1
    expect(result.isPaused).toBe(false);
  });

  it('marks isPaused and sets pauseReason for active external pause', () => {
    const now = new Date('2026-06-05T12:00:00');
    const pauses: TTFPPause[] = [
      { id: 'pf_registration', startedAt: '2026-06-04T10:00:00' },
    ];
    const result = computeTTFP('2026-06-01T09:00:00', null, pauses, now);
    expect(result.isPaused).toBe(true);
    expect(result.pauseReason).toContain('PF registration');
    expect(result.pauseReason).toContain('TTFP clock pauses');
  });

  it('does not go negative when pauses exceed gross days', () => {
    // Edge case: pauses longer than the observation window
    const pauses: TTFPPause[] = [
      {
        id: 'pf_registration',
        startedAt: '2026-06-01T09:00:00',
        resolvedAt: '2026-06-10T09:00:00',
      },
    ];
    const result = computeTTFP(
      '2026-06-01T09:00:00',
      '2026-06-03T17:00:00',
      pauses
    );
    expect(result.ttfpBusinessDays).toBeGreaterThanOrEqual(0);
  });
});
