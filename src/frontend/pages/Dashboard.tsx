/**
 * Dashboard Page Component — Main Payroll Readiness Dashboard
 *
 * AC-1: Sticky header
 * AC-2: Two-column responsive layout
 * AC-9: Working column with sections
 * AC-10: Design token compliance
 * AC-11 & AC-12: Responsive behavior
 */

import React, { useState, useEffect, useMemo } from 'react';
import Header from '../components/layout/Header';
import ReadinessRail from '../components/layout/ReadinessRail';
import MetricTile from '../components/shared/MetricTile';
import Card from '../components/shared/Card';
import { CycleContext, DashboardState, RunButtonState, Blocker } from '../types';
import { BlockerDTO } from '../../types/readiness';
import useReadinessScore from '../hooks/useReadinessScore';
import '../styles/tokens.css';
import './Dashboard.css';

// Mock data for development/demo (will be fetched from backend in AC-4)
const mockCycleContext: CycleContext = {
  month: 'June 2026',
  employer: 'TechCorp India',
  dueDate: '12 Jun',
  employeeCount: 248,
};

/**
 * Map blocker DTO from API to dashboard blocker format
 */
function mapBlockerToDisplay(blocker: BlockerDTO): Blocker {
  return {
    id: blocker.id,
    type: blocker.type,
    severity: blocker.severity,
    description: blocker.description,
    action_button: 'Resolve', // Resolved via button (UX default, actual action from API)
    resolved: false,
  };
}

export const Dashboard: React.FC = () => {
  // AC-4: Fetch readiness score from backend API (initial load)
  // AC-5: Live updates via polling (every 5 seconds)
  const {
    score,
    state: scoreState,
    blockers,
    isLoading,
    error,
  } = useReadinessScore('default-tenant', true);

  // Memoize blocker mapping to avoid recreation on every render
  const mappedBlockers = useMemo(
    () => blockers.map(mapBlockerToDisplay),
    [blockers]
  );

  // Build dashboard state from hook
  const [state, setState] = useState<DashboardState>({
    score: score ? {
      score,
      blockers: mappedBlockers,
      dead_sources: false,
      timestamp: new Date().toISOString(),
    } : null,
    cycleContext: mockCycleContext,
    ttfp: 3.2,
    isLoading,
    error: error ? error.message : null,
  });

  // Update state when score changes (for AC-6 gauge animation)
  useEffect(() => {
    setState(prev => ({
      ...prev,
      score: score ? {
        score,
        blockers: mappedBlockers,
        dead_sources: false,
        timestamp: new Date().toISOString(),
      } : null,
      isLoading,
      error: error ? error.message : null,
    }));
  }, [score, scoreState, mappedBlockers, isLoading, error]);

  // Determine button state based on score
  const buttonState: RunButtonState = (state.score?.score ?? 0) >= 100 ? 'ready' : 'blocked';

  // Determine status message based on state
  const getStatusMessage = (): string => {
    if (state.isLoading) return 'Reconciling upstream inputs…';
    if (state.score && state.score.score === 100) return 'All clear';
    if (state.score && state.score.score >= 80) return 'Mostly ready';
    return 'Action required';
  };

  const handleRunPayroll = () => {
    // Only allow payroll run when score is 100
    if (buttonState !== 'ready') {
      return;
    }
    alert('Run Payroll clicked! This would trigger the payroll execution.');
    // In a real implementation, this would call the backend API
  };

  return (
    <div className="dashboard">
      {/* Sticky Header */}
      <Header
        cycleContext={state.cycleContext}
        ttfp={state.ttfp}
      />

      {/* Main Layout Container */}
      <main className="dashboard__main">
        <div className="dashboard__container">
          {/* Left Column: Readiness Rail */}
          <ReadinessRail
            score={state.score?.score ?? 0}
            statusMessage={getStatusMessage()}
            buttonState={buttonState}
            employeeCount={state.cycleContext?.employeeCount ?? 0}
            onRunClick={handleRunPayroll}
          />

          {/* Right Column: Working Column */}
          <div className="dashboard__working-column">
            {/* Pre-Flight Checklist Section */}
            <Card title="What's blocking 100%">
              <div style={{
                color: 'var(--color-muted)',
                fontSize: 'var(--font-size-body)',
                textAlign: 'center',
                padding: 'var(--spacing-card-pad)',
              }}>
                ✓ All clear. Payroll is ready to run.
              </div>
            </Card>

            {/* Data Freshness Vitals Section */}
            <Card title="Data Freshness Vitals">
              <div style={{
                color: 'var(--color-muted)',
                fontSize: 'var(--font-size-body)',
                textAlign: 'center',
                padding: 'var(--spacing-card-pad)',
              }}>
                Vitals grid will be populated by Story 1.4
              </div>
            </Card>

            {/* Metrics Section */}
            <Card title="Metrics">
              <div className="dashboard__metrics-grid">
                <MetricTile
                  label="First-pass accuracy"
                  value="99.6%"
                  state="ready"
                />
                <MetricTile
                  label="Errors prevented"
                  value="6"
                  state="ready"
                />
                <MetricTile
                  label="Days to F&F deadline"
                  value="2"
                  state={state.score && state.score.score >= 100 ? 'ready' : 'warning'}
                />
                <MetricTile
                  label="Time-to-First-Payroll"
                  value="3.2 days"
                  state="ready"
                />
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
