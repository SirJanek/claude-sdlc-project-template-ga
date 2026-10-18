import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { EXISTING_ACCOUNT_NOTICE } from '@mentorhub/ui';

const apiCall = vi.hoisted(() => vi.fn());
const pageAccess = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT ${path}`);
  }),
);
const requestHeaders = new Headers({ cookie: 'mh_session=jwt' });
// SessionMenu (in ui) imports apiCall by relative path, so the mock targets that module, not the package entry.
vi.mock('../../../../../../ui/src/backend/api/apiCall', () => ({ apiCall }));
vi.mock('@mentorhub/core', async (original) => ({
  ...(await original<typeof import('@mentorhub/core')>()),
  pageAccess,
}));
vi.mock('next/headers', () => ({ headers: async () => requestHeaders }));
vi.mock('next/navigation', () => ({ redirect }));

import MentorProfilePage, { dynamic } from './page';

const account = { id: 'u1', email: 'ann@example.com', name: null, role: 'mentor', emailVerified: true };
const session = { userId: 'u1', role: 'mentor', isDevSession: false, emailVerified: true };

afterEach(cleanup);
beforeEach(() => {
  apiCall.mockReset().mockResolvedValue({ ok: true, data: account, status: 200 });
  pageAccess.mockReset().mockResolvedValue({ kind: 'granted', session, account });
  redirect.mockClear();
});

async function renderPage(params: Record<string, string | string[]> = {}) {
  await act(async () => {
    render(await MentorProfilePage({ searchParams: Promise.resolve(params) }));
  });
}

describe('/mentor/profile', () => {
  it('renders per request and asks core for mentor access with the request headers and its own path', async () => {
    expect(dynamic).toBe('force-dynamic');
    await renderPage();
    expect(pageAccess).toHaveBeenCalledWith(requestHeaders, { role: 'mentor', path: '/mentor/profile' });
  });

  it('AC1 (#26): a mentor sees profile setup, named by e-mail until a name is set, with the header menu', async () => {
    await renderPage();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Set up your mentor profile');
    expect(document.querySelector('[data-slot=account-name]')!.textContent).toBe('ann@example.com');
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy(); // SessionMenu in the header
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    cleanup();
    pageAccess.mockResolvedValue({ kind: 'granted', session, account: { ...account, name: 'Ann' } });
    await renderPage();
    expect(document.querySelector('[data-slot=account-name]')!.textContent).toBe('Ann');
  });

  it('AC2 (#26, R07): the onboarding shown to a new mentor has no payout, bank or card field or step', async () => {
    await renderPage();
    expect(document.querySelectorAll('main input, main select, main textarea, main form')).toHaveLength(0);
    expect(document.body.textContent).not.toMatch(/payout|bank|iban|stripe|card|billing/i);
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Coming next');
    expect(screen.getByText(/E02-S01/)).toBeTruthy(); // the placeholder says what fills it
  });

  it('AC3 (#26): shows the existing-account notice once, from the validated ?notice= parameter only', async () => {
    await renderPage({ notice: 'existing_account' });
    expect(screen.getByRole('status').textContent).toBe(EXISTING_ACCOUNT_NOTICE);
    cleanup();
    await renderPage({ notice: 'anything_else' });
    expect(screen.queryByRole('status')).toBeNull();
    cleanup();
    await renderPage({ notice: ['existing_account', 'x'] });
    expect(screen.getByRole('status')).toBeTruthy(); // the first value counts, like every (auth) page
  });

  it('sends a signed-out visitor to /sign-in with the return path and renders nothing', async () => {
    pageAccess.mockResolvedValue({ kind: 'sign-in', signInPath: '/sign-in?next=%2Fmentor%2Fprofile' });
    await expect(MentorProfilePage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      'NEXT_REDIRECT /sign-in?next=%2Fmentor%2Fprofile',
    );
    expect(redirect).toHaveBeenCalledWith('/sign-in?next=%2Fmentor%2Fprofile');
  });

  it('refuses another role with a message and no profile content (also with a notice in the URL)', async () => {
    pageAccess.mockResolvedValue({ kind: 'forbidden' });
    await renderPage({ notice: 'existing_account' });
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Mentor account required');
    expect(screen.getByRole('alert').textContent).toContain('not a mentor');
    expect(screen.getByRole('link', { name: '/sign-up/mentor' }).getAttribute('href')).toBe('/sign-up/mentor');
    expect(screen.queryByText('Set up your mentor profile')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
    expect(redirect).not.toHaveBeenCalled();
  });
});
