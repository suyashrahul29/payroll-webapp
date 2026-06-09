/**
 * Tests for useReadinessScore Hook
 *
 * Verifies:
 * - AC-4: Frontend Score Subscription — Initial Load
 * - AC-5: Frontend Score Subscription — Live Updates (polling)
 * - AC-6: Gauge Animation (previousScore tracking)
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useReadinessScore } from './useReadinessScore';
import { ReadinessScoreDTO } from '../../types/readiness';

// Mock fetch
global.fetch = jest.fn();

const mockScoreResponse: ReadinessScoreDTO = {
  score: 85,
  state: 'warning',
  blockers: [
    {
      id: 'blocker-1',
      type: 'LIFECYCLE_CLOCK',
      severity: 'HIGH',
      category: 'Lifecycle Clock',
      description: '3 exits pending F&F',
      blocking_record_ids: ['exit-1', 'exit-2', 'exit-3'],
      created_at: '2026-06-10T08:15:00Z',
      resolved_at: null,
      reopened_at: null,
    },
  ],
  last_computed_at: '2026-06-10T08:15:23Z',
  computation_status: 'ready',
};

describe('useReadinessScore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('AC-4: Initial load fetches current score on mount', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockScoreResponse,
    });

    const { result } = renderHook(() => useReadinessScore('tenant-1', true));

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.score).toBeNull();

    // Wait for fetch to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verify score is loaded
    expect(result.current.score).toBe(85);
    expect(result.current.state).toBe('warning');
    expect(result.current.blockers).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  test('AC-4: API endpoint called with correct tenant_id parameter', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockScoreResponse,
    });

    renderHook(() => useReadinessScore('my-tenant-123', true));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const call = (global.fetch as jest.Mock).mock.calls[0];
    expect(call[0]).toContain('tenant_id=my-tenant-123');
  });

  test('AC-5: Polling updates score on interval', async () => {
    const initialResponse = { ...mockScoreResponse, score: 85 };
    const updatedResponse = { ...mockScoreResponse, score: 90 };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => initialResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => updatedResponse,
      });

    const { result } = renderHook(() => useReadinessScore('tenant-1', true));

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.score).toBe(85);
    });

    // Advance time by 5 seconds to trigger polling
    jest.advanceTimersByTime(5000);

    // Wait for second fetch
    await waitFor(() => {
      expect(result.current.score).toBe(90);
    });

    expect((global.fetch as jest.Mock).mock.calls).toHaveLength(2);
  });

  test('AC-6: Tracks previousScore for gauge re-animation detection', async () => {
    const response1 = { ...mockScoreResponse, score: 85 };
    const response2 = { ...mockScoreResponse, score: 92 };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => response1,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => response2,
      });

    const { result } = renderHook(() => useReadinessScore('tenant-1', true));

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.score).toBe(85);
    });

    expect(result.current.previousScore).toBeNull(); // No previous score on first load

    // Advance time to trigger polling
    jest.advanceTimersByTime(5000);

    // Wait for score to update
    await waitFor(() => {
      expect(result.current.score).toBe(92);
    });

    // Now previousScore should be set to 85
    expect(result.current.previousScore).toBe(85);
  });

  test('AC-4: Handles API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useReadinessScore('tenant-1', true));

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error?.message).toContain('HTTP 500');
    expect(result.current.score).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  test('AC-5: Can disable polling with enabled flag', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockScoreResponse,
    });

    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useReadinessScore('tenant-1', enabled),
      { initialProps: { enabled: true } }
    );

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.score).toBe(85);
    });

    // Disable polling
    rerender({ enabled: false });

    // Clear all mocks
    jest.clearAllMocks();

    // Advance time
    jest.advanceTimersByTime(10000);

    // No additional fetches should have happened
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('AC-4: Returns all required properties in return object', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockScoreResponse,
    });

    const { result } = renderHook(() => useReadinessScore('tenant-1', true));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verify all properties are present
    expect(result.current).toHaveProperty('score');
    expect(result.current).toHaveProperty('state');
    expect(result.current).toHaveProperty('blockers');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('lastComputedAt');
    expect(result.current).toHaveProperty('computationStatus');
    expect(result.current).toHaveProperty('previousScore');
  });

  test('AC-5: Cleans up polling interval on unmount', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockScoreResponse,
    });

    const { unmount } = renderHook(() => useReadinessScore('tenant-1', true));

    // Wait for initial fetch
    await waitFor(() => {
      expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(0);
    });

    const initialCallCount = (global.fetch as jest.Mock).mock.calls.length;

    // Unmount
    unmount();

    // Advance time
    jest.advanceTimersByTime(10000);

    // No new fetches after unmount
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(initialCallCount);
  });
});
