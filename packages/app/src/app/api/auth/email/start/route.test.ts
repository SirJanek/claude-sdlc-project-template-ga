// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const core = vi.hoisted(() => ({ requestEmailLink: vi.fn() }));
vi.mock('@mentorhub/core', async (original) => {
  const real = await original<typeof import('@mentorhub/core')>();
  return {
    ...real,
    withScope: (fn: (cradle: unknown) => Promise<unknown>) =>
      fn({ authService: { requestEmailLink: core.requestEmailLink } }),
  };
});

import { REQUEST_HEADER, RateLimitedError, ServiceUnavailableError } from '@mentorhub/core';
import { POST, dynamic } from './route';

const context = { params: Promise.resolve({}) };
const post = (body: unknown, headers: Record<string, string> = { [REQUEST_HEADER]: '1' }) =>
  POST(
    new Request('http://x/api/auth/email/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9', ...headers },
      body: JSON.stringify(body),
    }),
    context,
  );

beforeEach(() => {
  core.requestEmailLink.mockReset().mockResolvedValue(undefined);
});

describe('POST /api/auth/email/start', () => {
  it('renders per request', () => {
    expect(dynamic).toBe('force-dynamic');
  });

  it('answers 200 { sent: true } for a valid body and hands the normalised input plus the client IP to the service', async () => {
    const res = await post({ email: ' Ann@Example.com ', next: '/mentors/1', intentRole: 'mentor', role: 'admin' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: { sent: true } });
    expect(core.requestEmailLink).toHaveBeenCalledWith({
      email: 'ann@example.com',
      next: '/mentors/1',
      intentRole: 'mentor',
      ip: '203.0.113.9',
    });
  });

  it('answers the same 200 whether or not the e-mail has an account (the service decides nothing visible)', async () => {
    expect((await post({ email: 'nobody@example.com' })).status).toBe(200);
    expect((await post({ email: 'existing@example.com' })).status).toBe(200);
  });

  it('answers 422 for an invalid e-mail, an off-site next or an admin intent, without calling the service', async () => {
    for (const body of [
      { email: 'nope' },
      { email: 'a@b.io', next: 'https://evil.com' },
      { email: 'a@b.io', intentRole: 'admin' },
      {},
    ]) {
      const res = await post(body);
      expect(res.status).toBe(422);
      expect(((await res.json()) as { error: { code: string } }).error.code).toBe('validation_failed');
    }
    expect(core.requestEmailLink).not.toHaveBeenCalled();
  });

  it('maps the service errors: 429 rate_limited and 503 mail_not_sent', async () => {
    core.requestEmailLink.mockRejectedValueOnce(new RateLimitedError());
    const limited = await post({ email: 'a@b.io' });
    expect(limited.status).toBe(429);
    expect(await limited.json()).toMatchObject({ ok: false, error: { code: 'rate_limited' } });
    core.requestEmailLink.mockRejectedValueOnce(
      new ServiceUnavailableError("We couldn't send the e-mail — try again.", 'mail_not_sent'),
    );
    const down = await post({ email: 'a@b.io' });
    expect(down.status).toBe(503);
    expect(await down.json()).toMatchObject({ ok: false, error: { code: 'mail_not_sent' } });
  });

  it('rejects a request without the CSRF header (403) before touching the service', async () => {
    expect((await post({ email: 'a@b.io' }, {})).status).toBe(403);
    expect(core.requestEmailLink).not.toHaveBeenCalled();
  });
});
