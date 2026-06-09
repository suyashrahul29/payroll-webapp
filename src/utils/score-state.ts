/**
 * Score state utility — shared across frontend and service layers
 * Maps numeric score to state string
 */

import { ScoreState } from '../types/readiness';

/**
 * Map score value to state
 * - score >= 100 → 'ready'
 * - 80 <= score < 100 → 'warning'
 * - score < 80 → 'critical'
 */
export function scoreToState(score: number): ScoreState {
  if (score >= 100) return 'ready';
  if (score >= 80) return 'warning';
  return 'critical';
}
