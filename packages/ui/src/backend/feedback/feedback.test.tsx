import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';
import { ErrorMessage } from './ErrorMessage';
import { LoadingMessage } from './LoadingMessage';

afterEach(cleanup);

describe('feedback components', () => {
  it('LoadingMessage announces a default or custom label', () => {
    render(<LoadingMessage />);
    expect(screen.getByRole('status').textContent).toContain('Loading…');
    cleanup();
    render(<LoadingMessage label="Fetching users…" />);
    expect(screen.getByRole('status').textContent).toContain('Fetching users…');
  });

  it('ErrorMessage shows title and message, and a retry button only with onRetry', () => {
    render(<ErrorMessage message="Server down." />);
    expect(screen.getByRole('alert').textContent).toContain('Something went wrong');
    expect(screen.queryByRole('button')).toBeNull();
    cleanup();
    const onRetry = vi.fn();
    render(<ErrorMessage title="Oops" message="Try later." onRetry={onRetry} />);
    expect(screen.getByRole('alert').textContent).toContain('Oops');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('EmptyState renders title, optional description and action', () => {
    render(<EmptyState title="No users yet." />);
    expect(screen.getByText('No users yet.')).toBeTruthy();
    cleanup();
    render(<EmptyState title="Nothing" description="Add one." action={<button>Add</button>} />);
    expect(screen.getByText('Add one.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add' })).toBeTruthy();
  });
});
