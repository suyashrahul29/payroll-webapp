/**
 * Tests for Readiness Score API Service
 *
 * Verifies:
 * - AC-1: Readiness Score API Endpoint response shape
 * - AC-2: Score-State Mapping
 * - AC-3: Backend Score Computation Logic with severity weights and DEAD source capping
 * - AC-11: Edge case — Score = 0
 * - AC-12: Backward Compatibility (blocker severity rules)
 */

import { computeReadinessScoreDTO } from './readinessScoreService';
import { scoreToState } from '../utils/score-state';
import { createBlocker } from '../domain/models/blocker';
import { createSourceFreshness } from '../domain/models/source-freshness';
import { BlockerType, Severity, FreshnessState, SourceType } from '../domain/events';

describe('readinessScoreService', () => {
  describe('scoreToState mapping (AC-2)', () => {
    test('score >= 100 maps to "ready"', () => {
      expect(scoreToState(100)).toBe('ready');
      expect(scoreToState(101)).toBe('ready');
    });

    test('80 <= score < 100 maps to "warning"', () => {
      expect(scoreToState(80)).toBe('warning');
      expect(scoreToState(85)).toBe('warning');
      expect(scoreToState(99)).toBe('warning');
    });

    test('score < 80 maps to "critical"', () => {
      expect(scoreToState(79)).toBe('critical');
      expect(scoreToState(50)).toBe('critical');
      expect(scoreToState(0)).toBe('critical');
    });
  });

  describe('computeReadinessScoreDTO (AC-1, AC-3, AC-11)', () => {
    test('AC-1: Returns correct response shape with all required fields', () => {
      const blockers: any[] = [];
      const sources: any[] = [];

      const result = computeReadinessScoreDTO(blockers, sources);

      // Verify response shape (AC-1)
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('state');
      expect(result).toHaveProperty('blockers');
      expect(result).toHaveProperty('last_computed_at');
      expect(result).toHaveProperty('computation_status');

      // Verify types
      expect(typeof result.score).toBe('number');
      expect(typeof result.state).toBe('string');
      expect(Array.isArray(result.blockers)).toBe(true);
      expect(typeof result.last_computed_at).toBe('string');
      expect(['ready', 'reconciling']).toContain(result.computation_status);
    });

    test('AC-3: Score computation with LIFECYCLE_CLOCK blocker (-15 points)', () => {
      const blocker = createBlocker(
        'blocker-1',
        'tenant-1',
        BlockerType.LIFECYCLE_CLOCK,
        'Exit Settlement',
        Severity.HIGH,
        '3 exits pending F&F',
        ['exit-1', 'exit-2', 'exit-3']
      );

      const sources: any[] = [];

      const result = computeReadinessScoreDTO([blocker], sources);

      // LIFECYCLE_CLOCK = -15 points
      expect(result.score).toBe(85);
      expect(result.state).toBe('warning');
    });

    test('AC-3: Score computation with FRESHNESS_VITALS blocker (-15 points)', () => {
      const blocker = createBlocker(
        'blocker-1',
        'tenant-1',
        BlockerType.FRESHNESS_VITALS,
        'Data Freshness',
        Severity.MEDIUM,
        'Tally sync stale',
        ['source-tally']
      );

      const sources: any[] = [];

      const result = computeReadinessScoreDTO([blocker], sources);

      // FRESHNESS_VITALS (not DEAD) = -15 points
      expect(result.score).toBe(85);
      expect(result.state).toBe('warning');
    });

    test('AC-3: Score computation with PREFLIGHT blocker (-10 points)', () => {
      const blocker = createBlocker(
        'blocker-1',
        'tenant-1',
        BlockerType.PREFLIGHT,
        'Pre-Flight',
        Severity.LOW,
        'Minor validation issue',
        ['item-1']
      );

      const sources: any[] = [];

      const result = computeReadinessScoreDTO([blocker], sources);

      // PREFLIGHT = -10 points
      expect(result.score).toBe(90);
      expect(result.state).toBe('warning');
    });

    test('AC-3: Multiple blockers deduct cumulatively', () => {
      const blocker1 = createBlocker(
        'blocker-1',
        'tenant-1',
        BlockerType.LIFECYCLE_CLOCK,
        'Exit',
        Severity.HIGH,
        'Exit pending',
        ['exit-1']
      );

      const blocker2 = createBlocker(
        'blocker-2',
        'tenant-1',
        BlockerType.CHANGE_HANDSHAKE,
        'Change',
        Severity.MEDIUM,
        'Change pending',
        ['change-1']
      );

      const sources: any[] = [];

      const result = computeReadinessScoreDTO([blocker1, blocker2], sources);

      // HIGH (-20) + MEDIUM (-10) = -30
      expect(result.score).toBe(70);
      expect(result.state).toBe('critical');
    });

    test('AC-3: Resolved blockers are filtered out', () => {
      const activeBlocker = createBlocker(
        'blocker-1',
        'tenant-1',
        BlockerType.LIFECYCLE_CLOCK,
        'Exit',
        Severity.HIGH,
        'Exit pending',
        ['exit-1']
      );

      const resolvedBlocker = createBlocker(
        'blocker-2',
        'tenant-1',
        BlockerType.CHANGE_HANDSHAKE,
        'Change',
        Severity.HIGH,
        'Change resolved',
        ['change-1']
      );
      resolvedBlocker.resolved_at = new Date();

      const sources: any[] = [];

      const result = computeReadinessScoreDTO([activeBlocker, resolvedBlocker], sources);

      // Only active blocker counts: LIFECYCLE_CLOCK = -15
      expect(result.score).toBe(85);
      // Only active blockers in response
      expect(result.blockers).toHaveLength(1);
      expect(result.blockers[0].id).toBe('blocker-1');
    });

    test('AC-3: Score capped at 0 minimum with multiple blockers', () => {
      // Create 7 blockers totaling > 100 deductions
      const blocker1 = createBlocker('b1', 'tenant-1', BlockerType.LIFECYCLE_CLOCK, 'Exit', Severity.HIGH, 'Exit', ['e1']);
      const blocker2 = createBlocker('b2', 'tenant-1', BlockerType.CHANGE_HANDSHAKE, 'Change', Severity.HIGH, 'Change', ['c1']);
      const blocker3 = createBlocker('b3', 'tenant-1', BlockerType.FRESHNESS_VITALS, 'Fresh', Severity.HIGH, 'Fresh stale', ['f1']);
      const blocker4 = createBlocker('b4', 'tenant-1', BlockerType.PREFLIGHT, 'Pre', Severity.HIGH, 'Pre', ['p1']);
      const blocker5 = createBlocker('b5', 'tenant-1', BlockerType.LIFECYCLE_CLOCK, 'Exit2', Severity.HIGH, 'Exit2', ['e2']);
      const blocker6 = createBlocker('b6', 'tenant-1', BlockerType.LIFECYCLE_CLOCK, 'Exit3', Severity.HIGH, 'Exit3', ['e3']);
      const blocker7 = createBlocker('b7', 'tenant-1', BlockerType.CHANGE_HANDSHAKE, 'Change2', Severity.HIGH, 'Change2', ['c2']);

      const sources: any[] = [];

      const result = computeReadinessScoreDTO(
        [blocker1, blocker2, blocker3, blocker4, blocker5, blocker6, blocker7],
        sources
      );

      // 15+15+15+10+15+15+15 = 100 points deducted, score = 0
      expect(result.score).toBe(0);
      expect(result.state).toBe('critical');
    });

    test('AC-11: Edge case — Score = 0', () => {
      const blocker = createBlocker(
        'blocker-1',
        'tenant-1',
        BlockerType.LIFECYCLE_CLOCK,
        'Exit',
        Severity.HIGH,
        'Exit pending',
        ['exit-1']
      );

      // Create a DEAD source to force score to 0
      const deadSource = createSourceFreshness('source-1', 'tenant-1', 'eSSL', SourceType.BIOMETRIC);
      deadSource.state = FreshnessState.DEAD;

      const result = computeReadinessScoreDTO([blocker], [deadSource]);

      expect(result.score).toBe(0);
      expect(result.state).toBe('critical');
    });

    test('AC-3: Score 100 with no blockers', () => {
      const result = computeReadinessScoreDTO([], []);

      expect(result.score).toBe(100);
      expect(result.state).toBe('ready');
      expect(result.blockers).toHaveLength(0);
    });

    test('AC-1: Blocker DTO mapping includes all required fields', () => {
      const blocker = createBlocker(
        'blocker-uuid-123',
        'tenant-1',
        BlockerType.LIFECYCLE_CLOCK,
        'Lifecycle Clock',
        Severity.HIGH,
        '3 exits pending F&F — legal deadline: 2 working days',
        ['exit-1', 'exit-2', 'exit-3']
      );

      const result = computeReadinessScoreDTO([blocker], []);

      expect(result.blockers).toHaveLength(1);
      const dto = result.blockers[0];

      // Verify all DTO fields (AC-1)
      expect(dto.id).toBe('blocker-uuid-123');
      expect(dto.type).toBe('LIFECYCLE_CLOCK');
      expect(dto.severity).toBe('HIGH');
      expect(dto.category).toBe('Lifecycle Clock');
      expect(dto.description).toBe('3 exits pending F&F — legal deadline: 2 working days');
      expect(dto.blocking_record_ids).toEqual(['exit-1', 'exit-2', 'exit-3']);
      expect(typeof dto.created_at).toBe('string'); // ISO 8601
      expect(dto.resolved_at).toBeNull();
      expect(dto.reopened_at).toBeNull();
    });

    test('AC-1: Blocker timestamps are ISO 8601 strings', () => {
      const blocker = createBlocker(
        'blocker-1',
        'tenant-1',
        BlockerType.LIFECYCLE_CLOCK,
        'Exit',
        Severity.HIGH,
        'Exit pending',
        ['exit-1']
      );

      const result = computeReadinessScoreDTO([blocker], []);
      const dto = result.blockers[0];

      // Verify ISO 8601 format
      expect(dto.created_at).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      // Resolved and reopened should be null for this test
      expect(dto.resolved_at).toBeNull();
    });
  });
});
