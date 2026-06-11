/**
 * Time-to-First-Payroll (TTFP) measurement utilities.
 *
 * Business-day counting uses local-time date arithmetic throughout to avoid
 * the UTC/local mixing bug present in service.ts:computeWorkingDayDeadline.
 * A business day is Mon–Fri excluding INDIA_HOLIDAYS_2026.
 */

export const INDIA_HOLIDAYS_2026: string[] = [
  '2026-01-26', // Republic Day
  '2026-03-25', // Holi
  '2026-04-10', // Good Friday
  '2026-04-14', // Ambedkar Jayanti
  '2026-05-01', // Labour Day
  '2026-08-15', // Independence Day
  '2026-10-02', // Gandhi Jayanti
  '2026-10-21', // Dussehra (approx)
  '2026-11-04', // Diwali (approx)
  '2026-12-25', // Christmas
];

export interface TTFPPause {
  id: string;
  startedAt: string; // ISO date string
  resolvedAt?: string; // ISO date string, absent if still active
}

export interface TTFPResult {
  /** Total business days (net of external pauses). Null if clock not started. */
  ttfpBusinessDays: number | null;
  /** True when payroll has run; false while still in progress. */
  firstRunComplete: boolean;
  /** First-run accuracy label (zero corrections while prototype). */
  firstRunAccuracy: string | null;
  /** Business days consumed by external pauses. */
  externalLatencyDays: number;
  /** True if at least one active pause is in effect right now. */
  isPaused: boolean;
  /** Human-readable reason for current pause(s), or null. */
  pauseReason: string | null;
}

/** toDateKey returns 'YYYY-MM-DD' in local time for a Date. */
function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isWeekend(d: Date): boolean {
  const dow = d.getDay();
  return dow === 0 || dow === 6;
}

function isHoliday(d: Date, holidaySet: Set<string>): boolean {
  return holidaySet.has(toDateKey(d));
}

/**
 * Counts business days between start (exclusive) and end (inclusive).
 * Uses local-time arithmetic; pass holidays as 'YYYY-MM-DD' strings.
 * Returns 0 when end <= start.
 */
export function computeBusinessDays(
  start: Date,
  end: Date,
  holidays: string[] = INDIA_HOLIDAYS_2026
): number {
  const holidaySet = new Set(holidays);
  let count = 0;
  const cursor = new Date(start);
  // Normalise to start-of-local-day so we advance by whole days
  cursor.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);

  while (cursor < endDay) {
    cursor.setDate(cursor.getDate() + 1);
    if (!isWeekend(cursor) && !isHoliday(cursor, holidaySet)) {
      count++;
    }
  }
  return count;
}

const PAUSE_LABELS: Record<string, string> = {
  pf_registration: 'PF registration',
  esi_registration: 'ESI registration',
  bank_verification: 'Bank IFSC verification',
};

/**
 * Computes TTFP from raw timestamp strings and pause records.
 * Designed to be called with values read directly from localStorage.
 *
 * @param ttfpStartAt  - ISO string from pweb_ttfp_start; null if clock not started
 * @param firstRunAt   - ISO string from pweb_first_run_at; null if no run yet
 * @param pauses       - Array from pweb_ttfp_pauses
 * @param now          - Injectable "now" for testability; defaults to new Date()
 */
export function computeTTFP(
  ttfpStartAt: string | null,
  firstRunAt: string | null,
  pauses: TTFPPause[],
  now: Date = new Date()
): TTFPResult {
  if (!ttfpStartAt) {
    return {
      ttfpBusinessDays: null,
      firstRunComplete: false,
      firstRunAccuracy: null,
      externalLatencyDays: 0,
      isPaused: false,
      pauseReason: null,
    };
  }

  const startDate = new Date(ttfpStartAt);
  const endDate = firstRunAt ? new Date(firstRunAt) : now;

  const grossDays = computeBusinessDays(startDate, endDate);

  // Compute external latency: sum paused biz-day intervals
  let externalLatencyDays = 0;
  const activePauses: TTFPPause[] = [];

  for (const pause of pauses) {
    // Clamp pause start to TTFP start so pre-Go-Live toggles don't over-deduct
    const rawPauseStart = new Date(pause.startedAt);
    const pauseStart = rawPauseStart > startDate ? rawPauseStart : startDate;
    const pauseEnd = pause.resolvedAt ? new Date(pause.resolvedAt) : now;
    externalLatencyDays += computeBusinessDays(pauseStart, pauseEnd);
    if (!pause.resolvedAt) {
      activePauses.push(pause);
    }
  }

  const netDays = Math.max(0, grossDays - externalLatencyDays);

  const isPaused = activePauses.length > 0;
  let pauseReason: string | null = null;
  if (isPaused) {
    const labels = activePauses.map(p => PAUSE_LABELS[p.id] ?? p.id).join(', ');
    pauseReason = `Waiting for ${labels} — TTFP clock pauses for external dependencies.`;
  }

  return {
    ttfpBusinessDays: netDays,
    firstRunComplete: firstRunAt !== null,
    firstRunAccuracy: firstRunAt !== null ? 'zero corrections' : null,
    externalLatencyDays,
    isPaused,
    pauseReason,
  };
}
