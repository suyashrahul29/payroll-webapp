/**
 * Readiness Score API Service
 *
 * Handles score computation and DTO mapping for API consumption.
 * Provides functions that convert internal domain models to frontend-consumable DTOs.
 */

import { Blocker } from '../domain/models/blocker.js';
import { SourceFreshness } from '../domain/models/source-freshness.js';
import { BlockerDTO, ReadinessScoreDTO } from '../types/readiness.js';
import { computeScore } from '../domain/readiness/score.js';
import { scoreToState } from '../utils/score-state.js';

/**
 * Map internal Blocker model to BlockerDTO for API response
 */
function mapBlockerToDTO(blocker: Blocker): BlockerDTO {
  // Map blocker_type (enum) to type (string for API)
  type BlockerTypeMap = {
    FRESHNESS_VITALS: 'FRESHNESS_VITALS';
    CHANGE_HANDSHAKE: 'CHANGE_HANDSHAKE';
    LIFECYCLE_CLOCK: 'LIFECYCLE_CLOCK';
    PREFLIGHT: 'PREFLIGHT';
  };

  const typeMap: BlockerTypeMap = {
    FRESHNESS_VITALS: 'FRESHNESS_VITALS',
    CHANGE_HANDSHAKE: 'CHANGE_HANDSHAKE',
    LIFECYCLE_CLOCK: 'LIFECYCLE_CLOCK',
    PREFLIGHT: 'PREFLIGHT',
  };

  return {
    id: blocker.id,
    type: typeMap[blocker.blocker_type] || 'PREFLIGHT',
    severity: blocker.severity as 'LOW' | 'MEDIUM' | 'HIGH',
    category: blocker.blocker_category,
    description: blocker.description,
    blocking_record_ids: blocker.blocking_record_ids,
    created_at: blocker.created_at.toISOString(),
    resolved_at: blocker.resolved_at ? blocker.resolved_at.toISOString() : null,
    reopened_at: blocker.reopened_at ? blocker.reopened_at.toISOString() : null,
  };
}

/**
 * Compute Readiness Score and return as API-consumable DTO
 *
 * AC-1: Returns score, state, blockers, last_computed_at, computation_status
 * AC-3: Implements score computation logic with severity weighting and DEAD source capping
 *
 * @param blockers All blockers for the tenant
 * @param sourceFreshness All source freshness records for the tenant
 * @returns ReadinessScoreDTO with all required fields
 */
export function computeReadinessScoreDTO(
  blockers: Blocker[],
  sourceFreshness: SourceFreshness[]
): ReadinessScoreDTO {
  // Use existing pure function to compute score
  const scoreResult = computeScore(blockers, sourceFreshness);

  // Derive state from score (AC-2)
  const state = scoreToState(scoreResult.score);

  // Map blockers to DTOs (AC-9: only include active blockers)
  const blockerDTOs = scoreResult.activeBlockers.map(mapBlockerToDTO);

  // Current timestamp for computation
  const now = new Date().toISOString();

  return {
    score: scoreResult.score,
    state,
    blockers: blockerDTOs,
    last_computed_at: now,
    computation_status: 'ready', // In this implementation, always ready (no async recomputation)
  };
}
