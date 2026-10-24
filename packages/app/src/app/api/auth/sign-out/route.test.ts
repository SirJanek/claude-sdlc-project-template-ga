// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const core = vi.hoisted(() => ({ signOutEverywhere: vi.fn(), requireSession: vi.fn() }));
vi.mock('@mentorhub/core', async (original) => {
  const real = await original<typeof import('@mentorhub/core')>();
  return {
    ...real,
    getEnv: () => ({ NODE_ENV: 'production' }),
    requireSession: core.requireSession,
    withScope: (fn: (cradle: unknown) => Promise<unknown>) =>
      fn({ authService: { signOutEverywhere: core.signOutEverywhere } }),
  };
});

import { DEV_ADMIN_SESSION, REQUEST_HEADER, UnauthorizedError } from '@mentorhub/core';
import { POST, dynamic } from './route';

const context = { params: Promise.resolve({}) };
const CLEARED = 'mh_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure';
const post = (body: unknown, headers: Record<string, string> = { [REQUEST_HEADER]: '1' }) =>
  POST(
    new Request('http://x/api/auth/sign-out', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    context,
  );

beforeEach(() => {
  core.signOutEverywhere.mockReset().mockResolvedValue(undefined);
  core.requireSession
    .mockReset()
    .mockResolvedValue({ userId: 'u1', role: 'mentee', isDevSession: false, emailVerified: true });
});

describe('POST /api/auth/sign-out', () => {
  it('renders per request', () => {
    expect(dynamic).toBe('force-dynamic');
  });

  it('clears the cookie on this device without needing a session (an empty body is fine)', async () => {
    const res = await post(undefined);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: { signedOut: true } });
    expect(res.headers.get('set-cookie')).toBe(CLEARED);
    expect(core.requireSession).not.toHaveBeenCalled();
    expect(core.signOutEverywhere).not.toHaveBeenCalled();
  });

  it('with everywhere: true bumps the session version of the signed-in user and clears the cookie', async () => {
    const res = await post({ everywhere: true });
    expect(res.status).toBe(200);
    expect(res.headers.get('set-cookie')).toBe(CLEARED);
    expect(core.signOutEverywhere).toHaveBeenCalledWith('u1');
  });

  it('everywhere needs a valid session (401 otherwise) and does nothing for the dev admin', async () => {
    core.requireSession.mockRejectedValueOnce(new UnauthorizedError());
    expect((await post({ everywhere: true })).status).toBe(401);
    core.requireSession.mockResolvedValueOnce(DEV_ADMIN_SESSION);
    expect((await post({ everywhere: true })).status).toBe(200);
    expect(core.signOutEverywhere).not.toHaveBeenCalled();
  });

  it('answers 422 for a non-boolean everywhere and 403 without the CSRF header', async () => {
    expect((await post({ everywhere: 'yes' })).status).toBe(422);
    expect((await post({}, {})).status).toBe(403);
  });
});
