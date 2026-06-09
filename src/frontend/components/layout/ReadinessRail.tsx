/**
 * Readiness Rail Component — Left sidebar with gauge, status, and run button
 *
 * AC-3: Readiness rail layout (gauge → status line → run button, 12–14px gaps)
 */

import React from 'react';
import { ReadinessRailProps } from '../../types';
import Gauge from '../gauge/Gauge';
import RunButton from '../buttons/RunButton';
import './ReadinessRail.css';

export const ReadinessRail: React.FC<ReadinessRailProps> = ({
  score,
  statusMessage,
  buttonState,
  employeeCount,
  onRunClick,
  className = '',
}) => {
  return (
    <aside className={`readiness-rail ${className}`.trim()}>
      {/* Gauge */}
      <div className="readiness-rail__gauge">
        <Gauge score={score} animate={true} />
      </div>

      {/* Status line */}
      <div className="readiness-rail__status">
        {statusMessage}
      </div>

      {/* Run button */}
      <div className="readiness-rail__button">
        <RunButton
          state={buttonState}
          employeeCount={employeeCount}
          onClick={onRunClick}
        />
      </div>
    </aside>
  );
};

export default ReadinessRail;
