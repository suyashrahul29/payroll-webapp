/**
 * Run Button Component — Binary ready/blocked gate for payroll execution
 *
 * AC-7: Ready state (enabled, green, "▶ Run Payroll — N employees")
 * AC-8: Blocked state (disabled, muted, "🔒 Run Payroll — blocked by pre-flight")
 *
 * CRITICAL: No "run anyway" option. The button implements the hard gate (FR-9).
 */

import React from 'react';
import { RunButtonProps } from '../../types';
import './RunButton.css';

export const RunButton: React.FC<RunButtonProps> = ({
  state,
  employeeCount,
  onClick,
  disabled = false,
  className = '',
}) => {
  const isReady = state === 'ready' && !disabled;
  const isBlocked = state === 'blocked' || disabled;

  const handleClick = () => {
    if (isReady && onClick) {
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    // Only allow Enter and Space to trigger click if ready
    if (isReady && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <button
      className={`run-button run-button--${state} ${className}`.trim()}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={isBlocked}
      aria-pressed={isReady}
      aria-disabled={isBlocked}
      type="button"
    >
      <span className="run-button__icon">
        {isReady ? '▶' : '🔒'}
      </span>
      <span className="run-button__text">
        Run Payroll{' '}
        {isReady
          ? `— ${employeeCount} employees`
          : '— blocked by pre-flight'}
      </span>
    </button>
  );
};

export default RunButton;
