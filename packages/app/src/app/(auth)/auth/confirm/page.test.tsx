import { randomBytes } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

const apiCall = vi.hoisted(() => vi.fn());
const peekEmailLink = vi.hoisted(() => vi.fn());
vi.mock('@mentorhub/ui', async (original) => ({ ...(await original<typeof import('@mentorhub/ui')>()), apiCall }));
vi.mock('@mentorhub/core', async (original) => ({
  ...(await original<typeof import('@mentorhub/core')>()),
  withScope: (fn: (cradle: unknown) => Promise<unknown>) => fn({ authService: { peekEmailLink } }),
}));

import ConfirmPage, { dynamic } from './page';
import { ConfirmSignIn } from './ConfirmSignIn';

const token = randomBytes(32).toString('base64url');
const EXPIRED = 'This link has expired or was already used — send a new one.';

afterEach(cleanup);
beforeEach(() => {
  apiCall.mockReset();
  peekEmailLink.mockReset();
});

async function renderPage(params: Record<string, string | string[]> = {}) {
  render(await ConfirmPage({ searchParams: Promise.resolve(params) }));
}

describe('/auth/confirm', () => {
  it('renders per request', () => {
    expect(dynamic).toBe('force-dynamic');
  });

  it('a GET only names the account and consumes nothing', async () => {
    peekEmailLink.mockResolvedValue({ email: 'ann@example.com' });
    await renderPage({ token });
    expect(peekEmailLink).toHaveBeenCalledWith(token);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sign in as ann@example.com?');
    expect(screen.getByRole('button', { name: 'Sign in as ann@example.com' })).toBeTruthy();
    expect(apiCall).not.toHaveBeenCalled(); // no consume on render
  });

  it('shows the expired message for an unknown, used or expired token, and for a malformed one without a lookup', async () => {
    peekEmailLink.mockResolvedValue(null);
    await renderPage({ token });
    expect(screen.getByRole('alert').textContent).toContain(EXPIRED);
    expect(screen.getByRole('link', { name: 'Go to sign-in' }).getAttribute('href')).toBe('/sign-in');
    expect(screen.queryByRole('button')).toBeNull();
    cleanup();
    peekEmailLink.mockClear();
    await renderPage({ token: ['x', 'y'] });
    expect(screen.getByRole('alert').textContent).toContain(EXPIRED);
    await renderPage();
    expect(peekEmailLink).not.toHaveBeenCalled();
  });

  it('the button POSTs the token through apiCall and continues to the returned path', async () => {
    peekEmailLink.mockResolvedValue({ email: 'ann@example.com' });
    apiCall.mockResolvedValue({ ok: true, data: { next: '/mentors/7' }, status: 200 });
    const onSignedIn = vi.fn();
    render(<ConfirmSignIn email="ann@example.com" token={token} onSignedIn={onSignedIn} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Sign in as ann@example.com' }));
    });
    expect(apiCall).toHaveBeenCalledWith('/api/auth/email/consume', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    expect(onSignedIn).toHaveBeenCalledWith('/mentors/7');
  });

  it('navigates with window.location by default', async () => {
    apiCall.mockResolvedValue({ ok: true, data: { next: '/' }, status: 200 });
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', { value: { ...original, assign }, writable: true, configurable: true });
    render(<ConfirmSignIn email="ann@example.com" token={token} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(assign).toHaveBeenCalledWith('/');
    Object.defineProperty(window, 'location', { value: original, writable: true, configurable: true });
  });

  it('shows a 410 from the consume route as a focused alert with a way to a new link', async () => {
    apiCall.mockResolvedValue({ ok: false, status: 410, error: { code: 'link_invalid', message: EXPIRED } });
    render(<ConfirmSignIn email="ann@example.com" token={token} onSignedIn={vi.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain(EXPIRED);
    expect(document.activeElement).toBe(alert);
    expect(screen.getByRole('link', { name: 'Send a new one' }).getAttribute('href')).toBe('/sign-in');
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(false);
  });
});
