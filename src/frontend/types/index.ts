/**
 * Frontend Types — Payroll Readiness Dashboard
 * Shared types for components, hooks, and state
 */

export type ScoreState = 'critical' | 'warning' | 'ready';

export interface Blocker {
  id: string;
  type: 'FRESHNESS_VITALS' | 'CHANGE_HANDSHAKE' | 'LIFECYCLE_CLOCK' | 'PREFLIGHT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  action_button: string;
  resolved?: boolean;
}

export interface ReadinessScore {
  score: number; // 0–100
  blockers: Blocker[];
  dead_sources: boolean;
  timestamp: string;
}

export type RunButtonState = 'ready' | 'blocked';

export interface CycleContext {
  month: string;
  employer: string;
  dueDate: string;
  employeeCount: number;
}

export interface MetricValue {
  label: string;
  value: string | number;
  state?: ScoreState;
}

export interface DashboardState {
  score: ReadinessScore | null;
  cycleContext: CycleContext | null;
  ttfp: number | null; // Time-to-First-Payroll in days
  isLoading: boolean;
  error: string | null;
}

/**
 * Component Props
 */

export interface GaugeProps {
  score: number; // 0–100
  animate?: boolean; // default: true
  className?: string;
  'aria-label'?: string;
}

export interface RunButtonProps {
  state: RunButtonState;
  employeeCount: number;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export interface StatusLineProps {
  message: string;
  state?: ScoreState;
  className?: string;
}

export interface HeaderProps {
  cycleContext: CycleContext | null;
  ttfp: number | null;
  className?: string;
}

export interface ReadinessRailProps {
  score: number;
  statusMessage: string;
  buttonState: RunButtonState;
  employeeCount: number;
  onRunClick?: () => void;
  className?: string;
}

export interface MetricTileProps {
  label: string;
  value: string | number;
  state?: ScoreState;
  className?: string;
}

export interface SectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}
