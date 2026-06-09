/**
 * useReadinessScore Hook
 *
 * Frontend subscription to live Readiness Score updates
 * AC-4: Frontend Score Subscription — Initial Load
 * AC-5: Frontend Score Subscription — Live Updates (polling implementation)
 * AC-6: Gauge Animation on Score Change
 *
 * This hook:
 * 1. Fetches initial score on mount
 * 2. Polls for updates every 5 seconds (AC-5 implementation strategy)
 * 3. Tracks previous score to trigger re-animation on change
 * 4. Handles loading and error states
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { ReadinessScoreDTO, BlockerDTO, ScoreState } from '../../types/readiness';

export interface UseReadinessScoreReturn {
  score: number | null;
  state: ScoreState | null;
  blockers: BlockerDTO[];
  isLoading: boolean;
  error: Error | null;
  lastComputedAt: string | null;
  computationStatus: 'ready' | 'reconciling' | null;
  previousScore: number | null;
}

const POLLING_INTERVAL_MS = 5000; // 5 seconds (AC-5: polling fallback)
const API_BASE_URL = '/api'; // Configurable for different environments

/**
 * Hook to fetch and subscribe to readiness score updates
 *
 * AC-4: Initial load fetches current score and blockers
 * AC-5: Polling every 5 seconds for live updates (fallback implementation without WebSocket)
 * AC-6: Returns previousScore to enable gauge re-animation detection
 *
 * @param tenantId - Tenant ID for the score query (optional, uses default if not provided)
 * @param enabled - Whether to enable polling (default: true)
 * @returns Score data, loading/error states, and previous score for animation
 */
export function useReadinessScore(
  tenantId: string = 'default-tenant',
  enabled: boolean = true
): UseReadinessScoreReturn {
  const [score, setScore] = useState<number | null>(null);
  const [state, setState] = useState<ScoreState | null>(null);
  const [blockers, setBlockers] = useState<BlockerDTO[]>([]);
  const [lastComputedAt, setLastComputedAt] = useState<string | null>(null);
  const [computationStatus, setComputationStatus] = useState<'ready' | 'reconciling' | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [previousScore, setPreviousScore] = useState<number | null>(null);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch score from backend API (AC-1 endpoint)
   */
  const fetchScore = useCallback(async () => {
    try {
      const queryString = new URLSearchParams({
        tenant_id: tenantId,
      }).toString();

      const response = await fetch(`${API_BASE_URL}/readiness/score?${queryString}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch readiness score`);
      }

      const data: ReadinessScoreDTO = await response.json();

      // Track previous score for animation triggers (AC-6)
      setScore((prev) => {
        if (prev !== data.score) {
          setPreviousScore(prev);
        }
        return data.score;
      });

      setState(data.state);
      setBlockers(data.blockers);
      setLastComputedAt(data.last_computed_at);
      setComputationStatus(data.computation_status);
      setError(null);
      setIsLoading(false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setIsLoading(false);
    }
  }, [tenantId]);

  /**
   * Initial load: fetch score on mount (AC-4)
   */
  useEffect(() => {
    if (!enabled) return;

    fetchScore();
  }, [enabled, fetchScore]);

  /**
   * Set up polling for live updates (AC-5)
   * Polls every 5 seconds (can be optimized to WebSocket later without changing component interface)
   */
  useEffect(() => {
    if (!enabled) return;

    // Set up polling interval
    pollingIntervalRef.current = setInterval(() => {
      fetchScore();
    }, POLLING_INTERVAL_MS);

    // Cleanup interval on unmount or when enabled changes
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [enabled, fetchScore]);

  return {
    score,
    state,
    blockers,
    isLoading,
    error,
    lastComputedAt,
    computationStatus,
    previousScore,
  };
}

export default useReadinessScore;
