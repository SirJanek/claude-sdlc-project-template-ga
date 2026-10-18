import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { RULES } from '@mentorhub/core';
import { EXISTING_ACCOUNT_NOTICE } from '@mentorhub/ui';

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
      render(await HomePage({ searchParams: Promise.resolve({}) }));
    });
    expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe('/sign-in');
    expect(screen.queryByRole('status')).toBeNull();
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

  it('shows the existing-account notice once when a consumed link lands here with ?notice=, never for other values', async () => {
    apiCall.mockResolvedValue({
      ok: true,
      data: { id: 'u1', email: 'a@x.io', name: null, role: 'mentee' },
      status: 200,
    });
    await act(async () => {
      render(await HomePage({ searchParams: Promise.resolve({ notice: 'existing_account' }) }));
    });
    expect(screen.getByRole('status').textContent).toBe(EXISTING_ACCOUNT_NOTICE);
    cleanup();
    await act(async () => {
      render(await HomePage({ searchParams: Promise.resolve({ notice: ['<b>x</b>', 'existing_account'] }) }));
    });
    expect(screen.queryByRole('status')).toBeNull();
    expect(document.body.textContent).not.toContain('<b>');
  });
});
