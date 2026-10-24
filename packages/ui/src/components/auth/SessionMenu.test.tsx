import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

const apiCall = vi.hoisted(() => vi.fn());
vi.mock('../../backend/api/apiCall', () => ({ apiCall }));

import { SessionMenu } from './SessionMenu';

afterEach(() => {
  cleanup();
  apiCall.mockReset();
});

const user = { id: 'u1', email: 'ann@example.com', name: 'Ann', role: 'mentee', emailVerified: true };

async function renderMenu(props: Parameters<typeof SessionMenu>[0] = {}) {
  await act(async () => {
    render(<SessionMenu {...props} />);
  });
}

describe('SessionMenu', () => {
  it('shows the name and a Sign out button for a signed-in person', async () => {
    apiCall.mockResolvedValue({ ok: true, data: user, status: 200 });
    await renderMenu();
    expect(apiCall).toHaveBeenCalledWith('/api/auth/me');
    expect(screen.getByText('Ann')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy();
    expect(screen.queryByText('Dev admin — local only')).toBeNull();
  });

  it('falls back to the e-mail while the name is not set, and marks the local dev admin', async () => {
    apiCall.mockResolvedValue({ ok: true, data: { ...user, name: null }, status: 200 });
    await renderMenu();
    expect(screen.getByText('ann@example.com')).toBeTruthy();
    cleanup();
    apiCall.mockResolvedValue({ ok: true, data: { ...user, id: 'dev-admin', name: 'Dev admin' }, status: 200 });
    await renderMenu();
    expect(screen.getByText('Dev admin — local only')).toBeTruthy();
  });

  it('shows a Sign in link for a guest (401) or when the request fails', async () => {
    apiCall.mockResolvedValue({
      ok: false,
      status: 401,
      error: { code: 'unauthorized', message: 'Sign-in required.' },
    });
    await renderMenu({ signInHref: '/sign-in?next=%2Fmentors' });
    expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe('/sign-in?next=%2Fmentors');
    cleanup();
    apiCall.mockResolvedValue({ ok: false, status: 0, error: { code: 'network_error', message: 'Network error' } });
    await renderMenu();
    expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe('/sign-in');
  });

  it('signs out through a POST with the CSRF header (apiCall) and then calls onSignedOut', async () => {
    apiCall
      .mockResolvedValueOnce({ ok: true, data: user, status: 200 })
      .mockResolvedValueOnce({ ok: true, data: { signedOut: true }, status: 200 });
    const onSignedOut = vi.fn();
    await renderMenu({ onSignedOut });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Sign out' })));
    expect(apiCall).toHaveBeenLastCalledWith('/api/auth/sign-out', { method: 'POST', body: '{}' });
    expect(onSignedOut).toHaveBeenCalledTimes(1);
  });

  it('reloads the site root after sign-out by default', async () => {
    apiCall
      .mockResolvedValueOnce({ ok: true, data: user, status: 200 })
      .mockResolvedValueOnce({ ok: true, data: { signedOut: true }, status: 200 });
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', { value: { ...original, assign }, writable: true, configurable: true });
    await renderMenu();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Sign out' })));
    expect(assign).toHaveBeenCalledWith('/');
    Object.defineProperty(window, 'location', { value: original, writable: true, configurable: true });
  });

  it('renders a placeholder while loading and ignores a response after unmount', async () => {
    let resolve!: (value: unknown) => void;
    apiCall.mockReturnValue(new Promise((r) => (resolve = r)));
    const { unmount } = render(<SessionMenu />);
    expect(screen.getByRole('generic', { busy: true })).toBeTruthy();
    unmount();
    await act(async () => resolve({ ok: true, data: user, status: 200 }));
    expect(screen.queryByText('Ann')).toBeNull();
  });
});
