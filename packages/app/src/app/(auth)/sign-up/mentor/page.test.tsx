import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

const apiCall = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());
vi.mock('@mentorhub/ui', async (original) => ({ ...(await original<typeof import('@mentorhub/ui')>()), apiCall }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import MentorSignUpPage, { NO_BANK_DETAILS } from './page';

afterEach(cleanup);
beforeEach(() => {
  apiCall.mockReset();
  push.mockReset();
});

async function renderPage(params: Record<string, string> = {}) {
  render(await MentorSignUpPage({ searchParams: Promise.resolve(params) }));
}

const submit = async (email: string) => {
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: email } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Send me a sign-up link' }));
  });
};

describe('/sign-up/mentor', () => {
  it('renders the mentor copy: profile setup heading, the R07 line, the e-mail form and no GitHub button yet', async () => {
    await renderPage();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Set up your mentor profile');
    expect(screen.getByText(NO_BANK_DETAILS)).toBeTruthy();
    expect(NO_BANK_DETAILS).toBe('No bank details needed until someone books you.');
    expect(screen.getByLabelText('E-mail').getAttribute('type')).toBe('email');
    expect(screen.getByText("No password. We'll e-mail you a link that signs you in.")).toBeTruthy();
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Send me a sign-up link']);
    expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe('/sign-in');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('requests the link with intentRole mentor and moves to /check-email carrying the role for a resend', async () => {
    apiCall.mockResolvedValue({ ok: true, data: { sent: true }, status: 200 });
    await renderPage();
    await submit('mentor@example.com');
    expect(apiCall).toHaveBeenCalledWith('/api/auth/email/start', {
      method: 'POST',
      body: JSON.stringify({ email: 'mentor@example.com', intentRole: 'mentor' }),
    });
    expect(push).toHaveBeenCalledWith('/check-email?email=mentor%40example.com&role=mentor');
  });

  it('behaves the same whether or not the e-mail has an account (the server answers 200 either way)', async () => {
    apiCall.mockResolvedValue({ ok: true, data: { sent: true }, status: 200 });
    await renderPage();
    await submit('taken@example.com');
    expect(push).toHaveBeenCalledWith('/check-email?email=taken%40example.com&role=mentor');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows a server error as a focused alert and the message behind ?error=', async () => {
    apiCall.mockResolvedValueOnce({
      ok: false,
      status: 429,
      error: { code: 'rate_limited', message: 'Too many requests.' },
    });
    await renderPage();
    await submit('mentor@example.com');
    expect(screen.getByRole('alert').textContent).toBe('Too many requests.');
    expect(document.activeElement).toBe(screen.getByRole('alert'));
    expect(push).not.toHaveBeenCalled();
    cleanup();
    await renderPage({ error: 'link_invalid' });
    expect(screen.getByRole('alert').textContent).toBe('This link has expired or was already used — send a new one.');
    cleanup();
    await renderPage({ error: ['something_else', 'link_invalid'] as unknown as string }); // first of repeated params
    expect(screen.getByRole('alert').textContent).toBe("Sign-in didn't complete — please try again.");
  });
});
