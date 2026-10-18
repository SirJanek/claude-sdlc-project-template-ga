import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AUTH_LIMITS } from '@mentorhub/core';

const apiCall = vi.hoisted(() => vi.fn());
vi.mock('@mentorhub/ui', async (original) => ({ ...(await original<typeof import('@mentorhub/ui')>()), apiCall }));

import CheckEmailPage from './page';

/** One act per second: each tick schedules the next timeout only after React re-rendered. */
async function tick(seconds: number) {
  for (let i = 0; i < seconds; i += 1) {
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
  }
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
beforeEach(() => apiCall.mockReset());

async function renderPage(params: Record<string, string> = {}) {
  render(await CheckEmailPage({ searchParams: Promise.resolve(params) }));
}

describe('/check-email', () => {
  it('names the address the person typed and the link lifetime', async () => {
    await renderPage({ email: 'ann@example.com' });
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Check your inbox');
    expect(screen.getByText('ann@example.com').tagName).toBe('STRONG');
    expect(screen.getByText(new RegExp(`within ${AUTH_LIMITS.linkTtlMinutes} minutes`))).toBeTruthy();
  });

  it('works without an address (no resend possible then) and takes the first of repeated params', async () => {
    await renderPage({ email: ['ann@example.com', 'other@example.com'] } as unknown as Record<string, string>);
    expect(screen.getByText('ann@example.com')).toBeTruthy();
    cleanup();
    await renderPage();
    expect(screen.getByText(/We sent you a sign-in link/)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('lets the person resend only after the cool-down, with the same return path, and reports the outcome', async () => {
    vi.useFakeTimers();
    apiCall.mockResolvedValueOnce({ ok: true, data: { sent: true }, status: 200 });
    await renderPage({ email: 'ann@example.com', next: '/mentors/7' });
    const button = () => screen.getByRole('button') as HTMLButtonElement;
    expect(button().disabled).toBe(true);
    expect(button().textContent).toBe(`Send a new link (${AUTH_LIMITS.resendAfterSeconds}s)`);
    await tick(AUTH_LIMITS.resendAfterSeconds - 1);
    expect(button().disabled).toBe(true);
    await tick(1);
    expect(button().disabled).toBe(false);
    expect(button().textContent).toBe('Send a new link');
    await act(async () => {
      fireEvent.click(button());
    });
    expect(apiCall).toHaveBeenCalledWith('/api/auth/email/start', {
      method: 'POST',
      body: JSON.stringify({ email: 'ann@example.com', next: '/mentors/7' }),
    });
    expect(screen.getByRole('status').textContent).toBe('A new link is on its way.');
    expect(button().disabled).toBe(true);
  });

  it('shows a failed resend as an alert', async () => {
    vi.useFakeTimers();
    apiCall.mockResolvedValueOnce({
      ok: false,
      status: 429,
      error: { code: 'rate_limited', message: 'Too many requests.' },
    });
    await renderPage({ email: 'ann@example.com', next: '//evil.com' });
    await tick(AUTH_LIMITS.resendAfterSeconds);
    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(apiCall).toHaveBeenCalledWith('/api/auth/email/start', {
      method: 'POST',
      body: JSON.stringify({ email: 'ann@example.com' }),
    });
    expect(screen.getByRole('alert').textContent).toBe('Too many requests.');
  });
});
