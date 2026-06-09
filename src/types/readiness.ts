/**
 * Readiness API Types — Frontend/Backend Contract
 *
 * This file defines the types exchanged between backend API and frontend consumers.
 * AC-1: Readiness Score API Endpoint response shape
 */

export type ScoreState = 'critical' | 'warning' | 'ready';

export interface BlockerDTO {
  id: string;
  type: 'FRESHNESS_VITALS' | 'CHANGE_HANDSHAKE' | 'LIFECYCLE_CLOCK' | 'PREFLIGHT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  category: string;
  description: string;
  blocking_record_ids: string[];
  created_at: string;
  resolved_at: string | null;
  reopened_at: string | null;
}

export interface ReadinessScoreDTO {
  score: number; // 0–100
  state: ScoreState; // Derived from score (AC-2)
  blockers: BlockerDTO[]; // Active blockers (resolved_at IS NULL)
  last_computed_at: string; // ISO 8601 timestamp
  computation_status: 'ready' | 'reconciling'; // AC-1: 'ready' or 'reconciling'
}

/**
 * Frontend hook return type for useReadinessScore
 */
export interface UseReadinessScoreReturn {
  score: number | null;
  state: ScoreState | null;
  blockers: BlockerDTO[];
  isLoading: boolean;
  error: Error | null;
  lastComputedAt: string | null;
  computationStatus: 'ready' | 'reconciling' | null;
}
