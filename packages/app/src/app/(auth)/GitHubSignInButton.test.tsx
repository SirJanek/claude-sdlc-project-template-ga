import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { GitHubSignInButton } from './GitHubSignInButton';

afterEach(cleanup);

describe('GitHubSignInButton', () => {
  it('links to the start route, with role and next only when given', () => {
    render(<GitHubSignInButton />);
    const link = screen.getByRole('link', { name: 'Continue with GitHub' });
    expect(link.getAttribute('href')).toBe('/api/auth/github/start');
    expect(screen.getByText('Your GitHub e-mail must be verified on GitHub.')).toBeTruthy();
    cleanup();
    render(<GitHubSignInButton role="mentor" />);
    expect(screen.getByRole('link', { name: 'Continue with GitHub' }).getAttribute('href')).toBe(
      '/api/auth/github/start?role=mentor',
    );
    cleanup();
    render(<GitHubSignInButton next="/mentors/7?slot=1" />);
    expect(screen.getByRole('link', { name: 'Continue with GitHub' }).getAttribute('href')).toBe(
      '/api/auth/github/start?next=%2Fmentors%2F7%3Fslot%3D1',
    );
  });
});
