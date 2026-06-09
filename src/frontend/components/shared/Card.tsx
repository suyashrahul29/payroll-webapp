/**
 * Card Component — Generic card wrapper for sections
 * Used for Pre-Flight Checklist, Data Freshness Vitals, Metrics sections
 */

import React from 'react';
import { SectionProps } from '../../types';
import './Card.css';

interface CardProps extends SectionProps {
  variant?: 'default' | 'minimal';
}

export const Card: React.FC<CardProps> = ({
  title,
  children,
  className = '',
  variant = 'default',
}) => {
  return (
    <section className={`card card--${variant} ${className}`.trim()}>
      {title && <h2 className="card__title">{title}</h2>}
      <div className="card__content">
        {children}
      </div>
    </section>
  );
};

export default Card;
