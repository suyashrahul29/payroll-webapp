/**
 * Gauge Component — SVG progress ring for Readiness Score
 * Displays score as 0–100%, with color coding and animated sweep
 *
 * AC-4: Critical state (score 65)
 * AC-5: Ready state (score 100)
 * AC-6: Score-to-hue mapping
 */

import React, { useMemo, useEffect, useState } from 'react';
import { GaugeProps, ScoreState } from '../../types';
import { scoreToState } from '../../../utils/score-state';

/**
 * Get color (hue) based on score state
 * - ready (≥100) → green #2ecc71
 * - warning (80–99) → amber #f5a623
 * - critical (<80) → red #e74c3c
 */

function getArcColor(state: ScoreState): string {
  const colors = {
    ready: '#2ecc71',
    warning: '#f5a623',
    critical: '#e74c3c',
  };
  return colors[state];
}

/**
 * Calculate SVG arc properties
 * Center: (115, 115), Radius: 105px, 18px stroke
 * Arc starts at top (0°) and goes clockwise
 */
function calculateArcPath(scorePercent: number, radius: number = 105): {
  circumference: number;
  dashoffset: number;
} {
  const circumference = 2 * Math.PI * radius;
  const percent = Math.min(100, Math.max(0, scorePercent)) / 100;
  const dashoffset = circumference * (1 - percent);

  return { circumference, dashoffset };
}

export const Gauge: React.FC<GaugeProps> = ({
  score,
  animate = true,
  className = '',
  'aria-label': ariaLabel,
}) => {
  const state = scoreToState(score);
  const arcColor = getArcColor(state);
  const { circumference, dashoffset } = calculateArcPath(score);

  // Check for reduced motion preference
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check media query for prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const transitionStyle = useMemo(() => {
    if (!animate || prefersReducedMotion) {
      return 'none';
    }
    return 'stroke-dashoffset 0.6s ease';
  }, [animate, prefersReducedMotion]);

  const containerClasses = `gauge ${state} ${className}`.trim();

  return (
    <div
      className={containerClasses}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: 'var(--gauge-size)',
        height: 'var(--gauge-size)',
      }}
      aria-label={ariaLabel || `Payroll readiness score: ${score}%`}
      role="img"
    >
      <svg
        viewBox="0 0 230 230"
        width="230"
        height="230"
        style={{
          transform: 'rotate(-90deg)',
          marginBottom: '8px',
        }}
      >
        {/* Track circle (background) */}
        <circle
          cx="115"
          cy="115"
          r="105"
          fill="none"
          stroke="var(--color-line)"
          strokeWidth="18"
          strokeLinecap="round"
          style={{ transition: 'stroke 0.3s ease' }}
        />

        {/* Progress arc */}
        <circle
          cx="115"
          cy="115"
          r="105"
          fill="none"
          stroke={arcColor}
          strokeWidth="18"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          style={{
            transition: transitionStyle,
          }}
        />
      </svg>

      {/* Center numeral (score percentage) */}
      <div
        style={{
          fontSize: 'var(--font-size-display)',
          fontWeight: 'var(--font-weight-display)',
          lineHeight: 'var(--line-height-display)',
          color: arcColor,
          transition: 'color 0.3s ease',
          fontVariantNumeric: 'tabular-nums',
          marginBottom: '4px',
        }}
      >
        {Math.round(score)}
      </div>

      {/* Label */}
      <div
        style={{
          fontSize: 'var(--font-size-h-card)',
          fontWeight: 'var(--font-weight-h-card)',
          letterSpacing: 'var(--letter-spacing-h-card)',
          textTransform: 'uppercase',
          color: 'var(--color-muted)',
        }}
      >
        READY
      </div>
    </div>
  );
};

export default Gauge;
