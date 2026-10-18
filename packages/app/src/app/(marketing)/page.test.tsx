import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { RULES } from '@mentorhub/core';

const apiCall = vi.hoisted(() => vi.fn());
// SessionMenu (in ui) imports apiCall by relative path, so the mock targets that module, not the package entry.
vi.mock('../../../ui/src/backend/api/apiCall', () => ({ apiCall }));

import HomePage from './page';

afterEach(cleanup);

describe('landing page', () => {
  it('renders the hero, the call to action and the three steps with values from RULES', async () => {
    apiCall.mockResolvedValue({
      ok: false,
      status: 401,
      error: { code: 'unauthorized', message: 'Sign-in required.' },
    });
    await act(async () => {
      render(<HomePage />);
    });
    expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe('/sign-in');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Grow faster with a mentor who has done it before',
    );
    expect(screen.getByRole('link', { name: 'Find a mentor' }).getAttribute('href')).toBe('#how');
    expect(screen.getByText(new RegExp(`${RULES.introMinutes}-minute intro`))).toBeTruthy();
    expect(screen.getByText(new RegExp(`up to ${RULES.freeCancelHours} h before`))).toBeTruthy();
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Find your mentor',
      'Book an intro',
      'Keep growing',
    ]);
  });
});
