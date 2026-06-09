/**
 * Run Button Component Tests
 * Tests for ready/blocked states, click handling, accessibility
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RunButton from './RunButton';
import '@testing-library/jest-dom';

describe('RunButton Component', () => {
  describe('Ready State (AC-7)', () => {
    it('should render with ready-green fill and enabled state', () => {
      const { container } = render(
        <RunButton state="ready" employeeCount={248} />
      );
      const button = container.querySelector('button');
      expect(button).not.toBeDisabled();
      expect(button).toHaveClass('run-button--ready');
    });

    it('should display play icon and correct label in ready state', () => {
      render(<RunButton state="ready" employeeCount={248} />);
      expect(screen.getByText('▶')).toBeInTheDocument();
      expect(screen.getByText(/Run Payroll — 248 employees/)).toBeInTheDocument();
    });

    it('should be clickable when ready', async () => {
      const onClick = jest.fn();
      render(
        <RunButton
          state="ready"
          employeeCount={248}
          onClick={onClick}
        />
      );

      const button = screen.getByRole('button');
      await userEvent.click(button);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should have correct aria attributes in ready state', () => {
      const { container } = render(
        <RunButton state="ready" employeeCount={248} />
      );
      const button = container.querySelector('button');
      expect(button).toHaveAttribute('aria-pressed', 'true');
      expect(button).toHaveAttribute('aria-disabled', 'false');
    });
  });

  describe('Blocked State (AC-8)', () => {
    it('should render with muted fill and disabled state', () => {
      const { container } = render(
        <RunButton state="blocked" employeeCount={248} />
      );
      const button = container.querySelector('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('run-button--blocked');
    });

    it('should display lock icon and blocked label', () => {
      render(<RunButton state="blocked" employeeCount={248} />);
      expect(screen.getByText('🔒')).toBeInTheDocument();
      expect(screen.getByText(/Run Payroll — blocked by pre-flight/)).toBeInTheDocument();
    });

    it('should not be clickable when blocked', async () => {
      const onClick = jest.fn();
      render(
        <RunButton
          state="blocked"
          employeeCount={248}
          onClick={onClick}
        />
      );

      const button = screen.getByRole('button');
      await userEvent.click(button);
      expect(onClick).not.toHaveBeenCalled();
    });

    it('should have correct aria attributes in blocked state', () => {
      const { container } = render(
        <RunButton state="blocked" employeeCount={248} />
      );
      const button = container.querySelector('button');
      expect(button).toHaveAttribute('aria-pressed', 'false');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('should respect disabled prop', () => {
      const { container } = render(
        <RunButton state="ready" employeeCount={248} disabled={true} />
      );
      const button = container.querySelector('button');
      expect(button).toBeDisabled();
    });
  });

  describe('Binary Gate (No "run anyway" escape hatch)', () => {
    it('should not provide a warning state or "run anyway" button', () => {
      const { container } = render(
        <RunButton state="blocked" employeeCount={248} />
      );
      // Check that there's only one button element, not multiple buttons
      const buttons = container.querySelectorAll('button');
      expect(buttons).toHaveLength(1);

      // Check that the button is disabled, not just warned
      const button = buttons[0];
      expect(button).toBeDisabled();
    });
  });

  describe('Employee Count Display', () => {
    it('should display correct employee count in ready state', () => {
      render(<RunButton state="ready" employeeCount={150} />);
      expect(screen.getByText(/Run Payroll — 150 employees/)).toBeInTheDocument();
    });

    it('should handle large employee counts', () => {
      render(<RunButton state="ready" employeeCount={999} />);
      expect(screen.getByText(/999 employees/)).toBeInTheDocument();
    });

    it('should handle employee count of 0', () => {
      render(<RunButton state="ready" employeeCount={0} />);
      expect(screen.getByText(/0 employees/)).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should handle Enter key when ready', async () => {
      const onClick = jest.fn();
      render(
        <RunButton
          state="ready"
          employeeCount={248}
          onClick={onClick}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(onClick).toHaveBeenCalled();
    });

    it('should handle Space key when ready', async () => {
      const onClick = jest.fn();
      render(
        <RunButton
          state="ready"
          employeeCount={248}
          onClick={onClick}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: ' ' });
      expect(onClick).toHaveBeenCalled();
    });

    it('should not trigger on other keys', async () => {
      const onClick = jest.fn();
      render(
        <RunButton
          state="ready"
          employeeCount={248}
          onClick={onClick}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'a' });
      expect(onClick).not.toHaveBeenCalled();
    });

    it('should not trigger keyboard events when blocked', async () => {
      const onClick = jest.fn();
      render(
        <RunButton
          state="blocked"
          employeeCount={248}
          onClick={onClick}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('State Transitions', () => {
    it('should change from blocked to ready', () => {
      const { container, rerender } = render(
        <RunButton state="blocked" employeeCount={248} />
      );
      let button = container.querySelector('button');
      expect(button).toBeDisabled();

      rerender(<RunButton state="ready" employeeCount={248} />);
      button = container.querySelector('button');
      expect(button).not.toBeDisabled();
    });

    it('should change from ready to blocked', () => {
      const { container, rerender } = render(
        <RunButton state="ready" employeeCount={248} />
      );
      let button = container.querySelector('button');
      expect(button).not.toBeDisabled();

      rerender(<RunButton state="blocked" employeeCount={248} />);
      button = container.querySelector('button');
      expect(button).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper button type', () => {
      const { container } = render(
        <RunButton state="ready" employeeCount={248} />
      );
      const button = container.querySelector('button');
      expect(button).toHaveAttribute('type', 'button');
    });

    it('should be in the accessibility tree', () => {
      render(<RunButton state="ready" employeeCount={248} />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should have color + non-color cues (icon + text)', () => {
      const { rerender } = render(
        <RunButton state="ready" employeeCount={248} />
      );
      expect(screen.getByText('▶')).toBeInTheDocument(); // Icon
      expect(screen.getByText(/Run Payroll/)).toBeInTheDocument(); // Text

      rerender(<RunButton state="blocked" employeeCount={248} />);
      expect(screen.getByText('🔒')).toBeInTheDocument(); // Lock icon
      expect(screen.getByText(/blocked by pre-flight/)).toBeInTheDocument(); // Blocked text
    });
  });
});
