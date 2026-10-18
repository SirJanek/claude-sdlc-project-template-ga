import { describe, expect, it, vi } from 'vitest';
import { parseEnv } from '../config/env';
import { DEV_ADMIN_SESSION, requireRole, requireSession, type SessionUser } from './auth';
import { ForbiddenError, UnauthorizedError } from './errors';
import { SESSION_COOKIE, signSessionToken } from './session';

const withScopeMock = vi.hoisted(() => vi.fn());
vi.mock('../container/container', () => ({ withScope: withScopeMock }));

const SECRET = 'x'.repeat(32);
const req = (cookie?: string) =>
  new Request('http://local/api/users', { headers: cookie === undefined ? {} : { cookie } });
const env =
  (vars: Record<string, string> = {}) =>
  () =>
    parseEnv({ AUTH_SECRET: SECRET, ...vars });
const user: SessionUser = {
  id: 'u1',
  email: 'ann@example.com',
  name: null,
  role: 'mentee',
  sessionVersion: 2,
  emailVerifiedAt: new Date('2026-10-18T10:00:00Z'),
};
const cookieFor = async (claims = { sub: 'u1', sv: 2 }) =>
  `${SESSION_COOKIE}=${await signSessionToken(claims, SECRET)}`;
const lookupOf = (result: SessionUser | null) => vi.fn(async () => result);

describe('requireSession — cookie session', () => {
  it('returns the user behind a valid cookie, with emailVerified from the row', async () => {
    const lookup = lookupOf(user);
    await expect(requireSession(req(await cookieFor()), { env: env(), lookup })).resolves.toEqual({
      userId: 'u1',
      role: 'mentee',
      isDevSession: false,
      emailVerified: true,
    });
    expect(lookup).toHaveBeenCalledWith('u1');
    const unverified = lookupOf({ ...user, emailVerifiedAt: null, role: 'admin' });
    await expect(requireSession(req(await cookieFor()), { env: env(), lookup: unverified })).resolves.toMatchObject({
      role: 'admin',
      emailVerified: false,
    });
  });

  it('denies without a cookie, with an invalid cookie, and never looks the user up then', async () => {
    const lookup = lookupOf(user);
    await expect(requireSession(req(), { env: env(), lookup })).rejects.toThrow(UnauthorizedError);
    await expect(requireSession(req(`${SESSION_COOKIE}=garbage`), { env: env(), lookup })).rejects.toThrow(
      UnauthorizedError,
    );
    const otherSecret = `${SESSION_COOKIE}=${await signSessionToken({ sub: 'u1', sv: 2 }, 'y'.repeat(32))}`;
    await expect(requireSession(req(otherSecret), { env: env(), lookup })).rejects.toThrow(UnauthorizedError);
    expect(lookup).not.toHaveBeenCalled();
  });

  it('denies an expired token', async () => {
    const cookie = await cookieFor();
    const now = () => new Date(Date.now() + 8 * 86_400_000);
    await expect(requireSession(req(cookie), { env: env(), lookup: lookupOf(user), now })).rejects.toThrow(
      UnauthorizedError,
    );
  });

  it('denies when the session version differs (signed out everywhere / role changed)', async () => {
    const stale = await cookieFor({ sub: 'u1', sv: 1 });
    await expect(requireSession(req(stale), { env: env(), lookup: lookupOf(user) })).rejects.toThrow(UnauthorizedError);
  });

  it('denies when the user no longer exists', async () => {
    await expect(requireSession(req(await cookieFor()), { env: env(), lookup: lookupOf(null) })).rejects.toThrow(
      UnauthorizedError,
    );
  });

  it('denies (401, fail closed) when loading the user fails — never a 500, never an allow', async () => {
    const lookup = vi.fn(async () => {
      throw new Error('connection refused');
    });
    await expect(requireSession(req(await cookieFor()), { env: env(), lookup })).rejects.toThrow(UnauthorizedError);
  });

  it('loads the user through the request scope by default', async () => {
    const findForSession = vi.fn(async () => user);
    withScopeMock.mockImplementation(async (fn: (cradle: unknown) => Promise<unknown>) =>
      fn({ sessionUserLookup: { findForSession } }),
    );
    const session = await requireSession(req(await cookieFor()), { env: env() });
    expect(session.userId).toBe('u1');
    expect(findForSession).toHaveBeenCalledWith('u1');
  });
});

describe('requireSession — dev admin (fail closed)', () => {
  it('admits the dev admin only with the flag in development, and only without a valid cookie session', async () => {
    const dev = env({ ALLOW_DEV_ADMIN: '1', NODE_ENV: 'development' });
    await expect(requireSession(req(), { env: dev })).resolves.toEqual(DEV_ADMIN_SESSION);
    expect(DEV_ADMIN_SESSION.emailVerified).toBe(true);
    // A real session on make dev is the real user, not the admin.
    await expect(requireSession(req(await cookieFor()), { env: dev, lookup: lookupOf(user) })).resolves.toMatchObject({
      userId: 'u1',
      isDevSession: false,
    });
  });

  it('denies without the flag, with the flag outside development, and when the env cannot be read', async () => {
    await expect(requireSession(req(), { env: env() })).rejects.toThrow(UnauthorizedError);
    await expect(
      requireSession(req(), { env: env({ ALLOW_DEV_ADMIN: '1', NODE_ENV: 'production', ALLOW_TEST_ADAPTERS: '1' }) }),
    ).rejects.toThrow(UnauthorizedError);
    // Regression: a test or staging deploy must not open the flag (found by the integration suite).
    await expect(requireSession(req(), { env: env({ ALLOW_DEV_ADMIN: '1', NODE_ENV: 'test' }) })).rejects.toThrow(
      UnauthorizedError,
    );
    await expect(
      requireSession(req(), {
        env: () => {
          throw new Error('Invalid environment');
        },
      }),
    ).rejects.toThrow(UnauthorizedError);
  });
});

describe('requireRole', () => {
  it('throws ForbiddenError for another role', () => {
    expect(() => requireRole({ ...DEV_ADMIN_SESSION, role: 'mentee' }, 'admin')).toThrow(ForbiddenError);
    expect(() => requireRole(DEV_ADMIN_SESSION, 'admin')).not.toThrow();
  });
});

describe('requireSession — default environment', () => {
  it('reads the process environment and denies without the flag', async () => {
    delete process.env.ALLOW_DEV_ADMIN;
    await expect(requireSession(req())).rejects.toThrow(UnauthorizedError);
  });
});
