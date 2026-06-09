/**
 * Gauge Component Tests
 * Tests for SVG rendering, animation, color mapping, accessibility
 */

import { render, screen } from '@testing-library/react';
import Gauge from './Gauge';
import '@testing-library/jest-dom';

describe('Gauge Component', () => {
  describe('Rendering (AC-4, AC-5)', () => {
    it('should render SVG gauge with correct dimensions', () => {
      const { container } = render(<Gauge score={65} />);
      const svg = container.querySelector('svg');

      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('viewBox', '0 0 230 230');
      expect(svg).toHaveAttribute('width', '230');
      expect(svg).toHaveAttribute('height', '230');
    });

    it('should display score numeral', () => {
      render(<Gauge score={65} />);
      expect(screen.getByText('65')).toBeInTheDocument();
    });

    it('should display "READY" label', () => {
      render(<Gauge score={100} />);
      expect(screen.getByText('READY')).toBeInTheDocument();
    });

    it('should render with proper aria-label for accessibility', () => {
      const { container } = render(
        <Gauge score={75} aria-label="Payroll readiness gauge" />
      );
      const gauge = container.querySelector('[role="img"]');
      expect(gauge).toHaveAttribute('aria-label', 'Payroll readiness gauge');
    });

    it('should default aria-label to score-based text', () => {
      const { container } = render(<Gauge score={80} />);
      const gauge = container.querySelector('[role="img"]');
      expect(gauge).toHaveAttribute('aria-label', 'Payroll readiness score: 80%');
    });
  });

  describe('Color Mapping (AC-6)', () => {
    it('should color arc red (critical) for scores < 80', () => {
      const { container } = render(<Gauge score={65} />);
      const arc = container.querySelectorAll('circle')[1];
      expect(arc).toHaveAttribute('stroke', '#e74c3c');
    });

    it('should color arc amber (warning) for scores 80–99', () => {
      const { container } = render(<Gauge score={85} />);
      const arc = container.querySelectorAll('circle')[1];
      expect(arc).toHaveAttribute('stroke', '#f5a623');
    });

    it('should color arc green (ready) for scores ≥100', () => {
      const { container } = render(<Gauge score={100} />);
      const arc = container.querySelectorAll('circle')[1];
      expect(arc).toHaveAttribute('stroke', '#2ecc71');
    });

    it('should update arc color on score change', () => {
      const { container, rerender } = render(<Gauge score={65} />);
      let arc = container.querySelectorAll('circle')[1];
      expect(arc).toHaveAttribute('stroke', '#e74c3c'); // critical

      rerender(<Gauge score={85} />);
      arc = container.querySelectorAll('circle')[1];
      expect(arc).toHaveAttribute('stroke', '#f5a623'); // warning

      rerender(<Gauge score={100} />);
      arc = container.querySelectorAll('circle')[1];
      expect(arc).toHaveAttribute('stroke', '#2ecc71'); // ready
    });
  });

  describe('Arc Animation (AC-4, AC-5)', () => {
    it('should apply sweep transition when animate=true', () => {
      const { container } = render(<Gauge score={65} animate={true} />);
      const arc = container.querySelectorAll('circle')[1];
      const style = arc.getAttribute('style');
      expect(style).toContain('stroke-dashoffset 0.6s ease');
    });

    it('should not apply animation when animate=false', () => {
      const { container } = render(<Gauge score={65} animate={false} />);
      const arc = container.querySelectorAll('circle')[1];
      const style = arc.getAttribute('style');
      expect(style).toContain('transition: none');
    });
  });

  describe('Arc Calculation', () => {
    it('should set dash offset for 0% score', () => {
      const { container } = render(<Gauge score={0} />);
      const arc = container.querySelectorAll('circle')[1];
      const offset = arc.getAttribute('stroke-dashoffset');
      expect(offset).toBeDefined();
      expect(parseFloat(offset || '0')).toBeGreaterThan(600); // Full circumference
    });

    it('should set smaller dash offset for 50% score', () => {
      const { container } = render(<Gauge score={50} />);
      const arc = container.querySelectorAll('circle')[1];
      const offset = arc.getAttribute('stroke-dashoffset');
      expect(offset).toBeDefined();
      expect(parseFloat(offset || '0')).toBeGreaterThan(200); // ~50% of circumference
      expect(parseFloat(offset || '0')).toBeLessThan(400);
    });

    it('should set minimal dash offset for 100% score', () => {
      const { container } = render(<Gauge score={100} />);
      const arc = container.querySelectorAll('circle')[1];
      const offset = arc.getAttribute('stroke-dashoffset');
      expect(offset).toBeDefined();
      expect(parseFloat(offset || '0')).toBeLessThan(10); // Nearly 0
    });

    it('should clamp negative scores to 0', () => {
      const { container } = render(<Gauge score={-10} />);
      const arc = container.querySelectorAll('circle')[1];
      const offset = arc.getAttribute('stroke-dashoffset');
      expect(parseFloat(offset || '0')).toBeGreaterThan(600);
    });

    it('should clamp scores > 100 to 100', () => {
      const { container } = render(<Gauge score={150} />);
      const arc = container.querySelectorAll('circle')[1];
      const offset = arc.getAttribute('stroke-dashoffset');
      expect(parseFloat(offset || '0')).toBeLessThan(10);
    });
  });

  describe('Score Display (AC-4, AC-5)', () => {
    it('should display score 65 in critical state', () => {
      const { container } = render(<Gauge score={65} />);
      expect(screen.getByText('65')).toBeInTheDocument();
      // Verify critical color in the numeral (browser converts to RGB)
      const numeralDiv = container.querySelector('div:nth-child(2)') as HTMLElement;
      expect(numeralDiv.style.color).toMatch(/e74c3c|231.*76.*60/); // hex or rgb
    });

    it('should display score 100 in ready state', () => {
      const { container } = render(<Gauge score={100} />);
      expect(screen.getByText('100')).toBeInTheDocument();
      const numeralDiv = container.querySelector('div:nth-child(2)') as HTMLElement;
      expect(numeralDiv.style.color).toMatch(/2ecc71|46.*204.*113/); // hex or rgb
    });

    it('should round fractional scores', () => {
      render(<Gauge score={85.7} />);
      expect(screen.getByText('86')).toBeInTheDocument();
    });
  });

  describe('SVG Structure', () => {
    it('should have two circles (track and arc)', () => {
      const { container } = render(<Gauge score={65} />);
      const circles = container.querySelectorAll('circle');
      expect(circles).toHaveLength(2);
    });

    it('should have correct circle properties', () => {
      const { container } = render(<Gauge score={65} />);
      const circles = container.querySelectorAll('circle');

      circles.forEach((circle) => {
        expect(circle).toHaveAttribute('cx', '115');
        expect(circle).toHaveAttribute('cy', '115');
        expect(circle).toHaveAttribute('r', '105');
        expect(circle).toHaveAttribute('fill', 'none');
        expect(circle).toHaveAttribute('stroke-width', '18');
        expect(circle).toHaveAttribute('stroke-linecap', 'round');
      });
    });

    it('should have track circle in line color', () => {
      const { container } = render(<Gauge score={65} />);
      const track = container.querySelectorAll('circle')[0];
      expect(track).toHaveAttribute('stroke', 'var(--color-line)');
    });
  });

  describe('State Transitions', () => {
    it('should update score display on rerender', () => {
      const { rerender } = render(<Gauge score={50} />);
      expect(screen.getByText('50')).toBeInTheDocument();

      rerender(<Gauge score={100} />);
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('should update arc color on rerender', () => {
      const { container, rerender } = render(<Gauge score={50} />);
      let arc = container.querySelectorAll('circle')[1];
      expect(arc).toHaveAttribute('stroke', '#e74c3c'); // critical (< 80)

      rerender(<Gauge score={100} />);
      arc = container.querySelectorAll('circle')[1];
      expect(arc).toHaveAttribute('stroke', '#2ecc71'); // ready (>= 100)
    });
  });

  describe('Accessibility', () => {
    it('should be marked as an image role', () => {
      const { container } = render(<Gauge score={65} />);
      const gauge = container.querySelector('[role="img"]');
      expect(gauge).toBeInTheDocument();
    });

    it('should have descriptive aria-label', () => {
      const { container } = render(<Gauge score={75} />);
      const gauge = container.querySelector('[role="img"]');
      expect(gauge?.getAttribute('aria-label')).toMatch(/75/);
    });

    it('should be readable with color + non-color cues', () => {
      // Gauge has both color (arc color) and text (numeral and label)
      const { container } = render(<Gauge score={65} />);
      // Color cue: arc is colored
      const arc = container.querySelectorAll('circle')[1];
      expect(arc).toHaveAttribute('stroke', '#e74c3c');
      // Non-color cues: numeral and label
      expect(screen.getByText('65')).toBeInTheDocument();
      expect(screen.getByText('READY')).toBeInTheDocument();
    });
  });

  describe('Responsive (AC-12)', () => {
    it('should render with viewBox for scaling', () => {
      const { container } = render(<Gauge score={65} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('viewBox', '0 0 230 230');
    });

    it('should maintain aspect ratio', () => {
      const { container } = render(<Gauge score={65} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '230');
      expect(svg).toHaveAttribute('height', '230');
    });
  });
});
