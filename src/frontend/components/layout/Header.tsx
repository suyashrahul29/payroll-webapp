/**
 * Header Component — Sticky header with brand, cycle context, and TTFP metric
 *
 * AC-1: Sticky header with cycle context
 * - Brand + readiness status dot (left)
 * - Cycle context: month, employer, due date, employee count (center)
 * - Live Time-to-First-Payroll metric (right)
 */

import React from 'react';
import { HeaderProps } from '../../types';
import './Header.css';

export const Header: React.FC<HeaderProps> = ({
  cycleContext,
  ttfp,
  className = '',
}) => {
  return (
    <header className={`header ${className}`.trim()}>
      {/* Brand & readiness dot */}
      <div className="header__brand">
        <div className="header__brand-dot" />
        <span className="header__brand-text">Payroll Readiness</span>
      </div>

      {/* Cycle context (center) */}
      <div className="header__cycle">
        {cycleContext ? (
          <>
            <div className="header__cycle-item">
              <span className="header__cycle-label">Cycle</span>
              <span className="header__cycle-value">{cycleContext.month}</span>
            </div>
            <div className="header__cycle-item">
              <span className="header__cycle-label">Employer</span>
              <span className="header__cycle-value">{cycleContext.employer}</span>
            </div>
            <div className="header__cycle-item">
              <span className="header__cycle-label">Due</span>
              <span className="header__cycle-value">{cycleContext.dueDate}</span>
            </div>
            <div className="header__cycle-item">
              <span className="header__cycle-label">Employees</span>
              <span className="header__cycle-value">{cycleContext.employeeCount}</span>
            </div>
          </>
        ) : (
          <div style={{ color: 'var(--color-muted)' }}>Loading cycle context...</div>
        )}
      </div>

      {/* TTFP metric (right) */}
      <div className="header__ttfp">
        <div className="header__ttfp-label">Time-to-First-Payroll</div>
        <div className="header__ttfp-value">
          {ttfp !== null ? `${ttfp.toFixed(1)} days` : '—'}
        </div>
      </div>
    </header>
  );
};

export default Header;
