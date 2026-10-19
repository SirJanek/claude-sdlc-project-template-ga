import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

const apiCall = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());
/** What the page's `getEnv()` answers: GitHub off by default, `fake` to show the button. */
const github = vi.hoisted(() => ({ adapter: undefined as 'fake' | undefined }));
vi.mock('@mentorhub/ui', async (original) => ({ ...(await original<typeof import('@mentorhub/ui')>()), apiCall }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@mentorhub/core', async (original) => {
  const real = await original<typeof import('@mentorhub/core')>();
  return { ...real, getEnv: () => real.parseEnv({ NODE_ENV: 'test', GITHUB_ADAPTER: github.adapter }) };
});

import SignInPage from './page';
import { errorMessage } from '../EmailLinkForm';

afterEach(cleanup);
beforeEach(() => {
  apiCall.mockReset();
  push.mockReset();
  github.adapter = undefined;
});

async function renderPage(params: Record<string, string> = {}) {
  const page = await SignInPage({ searchParams: Promise.resolve(params) });
  render(page);
}

const submit = async (email: string) => {
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: email } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Send me a sign-in link' }));
  });
};

describe('/sign-in', () => {
  it('renders the e-mail form with the no-password copy', async () => {
    await renderPage();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sign in');
    expect(screen.getByLabelText('E-mail').getAttribute('type')).toBe('email');
    expect(screen.getByText("No password. We'll e-mail you a link that signs you in.")).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Sign up as a mentor' }).getAttribute('href')).toBe('/sign-up/mentor');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Continue with GitHub' })).toBeNull(); // GITHUB_* not configured
  });

  it('shows "Continue with GitHub" only when GitHub is configured, carrying the validated next (never an off-site one)', async () => {
    github.adapter = 'fake';
    await renderPage({ next: '/mentors/7?slot=1' });
    expect(screen.getByRole('link', { name: 'Continue with GitHub' }).getAttribute('href')).toBe(
      '/api/auth/github/start?next=%2Fmentors%2F7%3Fslot%3D1',
    );
    cleanup();
    await renderPage({ next: 'https://evil.com' });
    expect(screen.getByRole('link', { name: 'Continue with GitHub' }).getAttribute('href')).toBe(
      '/api/auth/github/start',
    );
  });

  it('renders the GitHub error messages behind ?error= (spec › Edge Cases copy)', async () => {
    await renderPage({ error: 'github_failed' });
    expect(screen.getByRole('alert').textContent).toBe("GitHub sign-in didn't complete — try again.");
    cleanup();
    await renderPage({ error: 'github_email_unverified' });
    expect(screen.getByRole('alert').textContent).toBe(
      "Your GitHub e-mail isn't verified — verify it on GitHub or use an e-mail link.",
    );
    cleanup();
    await renderPage({ error: 'invalid_request' });
    expect(screen.getByRole('alert').textContent).toBe('That sign-in request was not valid — please try again.');
  });

  it('requests a link and moves to /check-email with the address and the return path', async () => {
    apiCall.mockResolvedValue({ ok: true, data: { sent: true }, status: 200 });
    await renderPage({ next: '/mentors/7?slot=1' });
    await submit('ann@example.com');
    expect(apiCall).toHaveBeenCalledWith('/api/auth/email/start', {
      method: 'POST',
      body: JSON.stringify({ email: 'ann@example.com', next: '/mentors/7?slot=1' }),
    });
    expect(push).toHaveBeenCalledWith('/check-email?email=ann%40example.com&next=%2Fmentors%2F7%3Fslot%3D1');
  });

  it('drops an off-site next (open redirect) and sends none', async () => {
    apiCall.mockResolvedValue({ ok: true, data: { sent: true }, status: 200 });
    await renderPage({ next: 'https://evil.com' });
    await submit('ann@example.com');
    expect(apiCall).toHaveBeenCalledWith('/api/auth/email/start', {
      method: 'POST',
      body: JSON.stringify({ email: 'ann@example.com' }),
    });
    expect(push).toHaveBeenCalledWith('/check-email?email=ann%40example.com');
  });

  it('shows a server error as a focused alert — the field error for the e-mail, else the message', async () => {
    apiCall.mockResolvedValueOnce({
      ok: false,
      status: 422,
      error: {
        code: 'validation_failed',
        message: 'Some fields are invalid.',
        fieldErrors: { email: ['Invalid email address'] },
      },
    });
    await renderPage();
    await submit('nope');
    expect(screen.getByRole('alert').textContent).toBe('Invalid email address');
    expect(document.activeElement).toBe(screen.getByRole('alert'));
    apiCall.mockResolvedValueOnce({
      ok: false,
      status: 429,
      error: { code: 'rate_limited', message: 'Too many requests.' },
    });
    await submit('ann@example.com');
    expect(screen.getByRole('alert').textContent).toBe('Too many requests.');
    expect(push).not.toHaveBeenCalled();
  });

  it('shows the message behind ?error= as an alert, generic for unknown codes', async () => {
    await renderPage({ error: 'link_invalid' });
    expect(screen.getByRole('alert').textContent).toBe('This link has expired or was already used — send a new one.');
    cleanup();
    await renderPage({ error: ['something_else'] as unknown as string });
    expect(screen.getByRole('alert').textContent).toBe("Sign-in didn't complete — please try again.");
    expect(errorMessage(undefined)).toBeNull();
  });
});
