/**
 * Metric Tile Component — Large value with label
 * Used in the Metrics section for First-pass accuracy, Errors prevented, F&F clock, TTFP
 */

import React from 'react';
import { MetricTileProps } from '../../types';
import './MetricTile.css';

export const MetricTile: React.FC<MetricTileProps> = ({
  label,
  value,
  state,
  className = '',
}) => {
  return (
    <div className={`metric-tile metric-tile--${state || 'default'} ${className}`.trim()}>
      <div className="metric-tile__label">{label}</div>
      <div className="metric-tile__value">{value}</div>
    </div>
  );
};

export default MetricTile;
