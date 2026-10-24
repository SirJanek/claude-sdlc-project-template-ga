// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const core = vi.hoisted(() => ({ currentUser: vi.fn(), requireSession: vi.fn() }));
vi.mock('@mentorhub/core', async (original) => {
  const real = await original<typeof import('@mentorhub/core')>();
  return {
    ...real,
    requireSession: core.requireSession,
    withScope: (fn: (cradle: unknown) => Promise<unknown>) => fn({ authService: { currentUser: core.currentUser } }),
  };
});

import { UnauthorizedError } from '@mentorhub/core';
import { GET, dynamic } from './route';

const context = { params: Promise.resolve({}) };
const request = new Request('http://x/api/auth/me');
const session = { userId: 'u1', role: 'mentee', isDevSession: false, emailVerified: true };
const user = { id: 'u1', email: 'ann@example.com', name: null, role: 'mentee', emailVerified: true };

beforeEach(() => {
  core.currentUser.mockReset().mockResolvedValue(user);
  core.requireSession.mockReset().mockResolvedValue(session);
});

describe('GET /api/auth/me', () => {
  it('renders per request', () => {
    expect(dynamic).toBe('force-dynamic');
  });

  it('returns the signed-in user in the envelope', async () => {
    const res = await GET(request, context);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: user });
    expect(core.requireSession).toHaveBeenCalledWith(request);
    expect(core.currentUser).toHaveBeenCalledWith(session);
  });

  it('answers 401 without a session and never touches the service', async () => {
    core.requireSession.mockRejectedValueOnce(new UnauthorizedError());
    const res = await GET(request, context);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, error: { code: 'unauthorized', message: 'Sign-in required.' } });
    expect(core.currentUser).not.toHaveBeenCalled();
  });
});
