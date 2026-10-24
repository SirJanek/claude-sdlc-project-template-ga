// @vitest-environment node
import { randomBytes } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const core = vi.hoisted(() => ({ consumeEmailLink: vi.fn(), startSession: vi.fn() }));
vi.mock('@mentorhub/core', async (original) => {
  const real = await original<typeof import('@mentorhub/core')>();
  return {
    ...real,
    withScope: (fn: (cradle: unknown) => Promise<unknown>) =>
      fn({ authService: { consumeEmailLink: core.consumeEmailLink, startSession: core.startSession } }),
  };
});

import { GoneError, REQUEST_HEADER } from '@mentorhub/core';
import { POST, dynamic } from './route';

const context = { params: Promise.resolve({}) };
const token = randomBytes(32).toString('base64url');
const post = (body: unknown, headers: Record<string, string> = { [REQUEST_HEADER]: '1' }) =>
  POST(
    new Request('http://x/api/auth/email/consume', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    }),
    context,
  );

beforeEach(() => {
  core.consumeEmailLink.mockReset().mockResolvedValue({ userId: 'u1', sessionVersion: 2, next: '/mentors/1' });
  core.startSession.mockReset().mockResolvedValue('mh_session=jwt; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800');
});

describe('POST /api/auth/email/consume', () => {
  it('renders per request', () => {
    expect(dynamic).toBe('force-dynamic');
  });

  it('consumes the token, sets the session cookie and returns the return path', async () => {
    const res = await post({ token });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: { next: '/mentors/1' } });
    expect(res.headers.get('set-cookie')).toBe('mh_session=jwt; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800');
    expect(core.consumeEmailLink).toHaveBeenCalledWith(token);
    expect(core.startSession).toHaveBeenCalledWith({ userId: 'u1', sessionVersion: 2, next: '/mentors/1' });
  });

  it('answers 410 link_invalid for a used, expired or unknown token — no cookie', async () => {
    core.consumeEmailLink.mockRejectedValueOnce(new GoneError());
    const res = await post({ token });
    expect(res.status).toBe(410);
    expect(await res.json()).toMatchObject({ ok: false, error: { code: 'link_invalid' } });
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(core.startSession).not.toHaveBeenCalled();
  });

  it('answers 422 for a malformed token and 403 without the CSRF header, never reaching the service', async () => {
    expect((await post({ token: 'short' })).status).toBe(422);
    expect((await post({})).status).toBe(422);
    expect((await post({ token }, {})).status).toBe(403);
    expect(core.consumeEmailLink).not.toHaveBeenCalled();
  });
});
