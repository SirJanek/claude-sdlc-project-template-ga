import { describe, expect, it, vi } from 'vitest';
import { parseEnv } from '../config/env';
import type { CurrentUser } from '../services/auth/auth.service';
import type { SessionUser } from './auth';
import { pageAccess } from './page-access';
import { SESSION_COOKIE, signSessionToken } from './session';

const withScopeMock = vi.hoisted(() => vi.fn());
vi.mock('../container/container', () => ({ withScope: withScopeMock }));

const SECRET = 'x'.repeat(32);
const env =
  (vars: Record<string, string> = {}) =>
  () =>
    parseEnv({ AUTH_SECRET: SECRET, ...vars });
const mentor: SessionUser = {
  id: 'u1',
  email: 'ann@example.com',
  name: null,
  role: 'mentor',
  sessionVersion: 0,
  emailVerifiedAt: new Date('2026-10-18T10:00:00Z'),
};
const account: CurrentUser = { id: 'u1', email: 'ann@example.com', name: null, role: 'mentor', emailVerified: true };
const headersWith = async (cookie?: string) =>
  new Headers({ cookie: cookie ?? `${SESSION_COOKIE}=${await signSessionToken({ sub: 'u1', sv: 0 }, SECRET)}` });
const target = { role: 'mentor' as const, path: '/mentor/profile' };

describe('pageAccess', () => {
  it('grants a session with the required role and loads its account through the injected lookup', async () => {
    const lookup = vi.fn(async () => mentor);
    const load = vi.fn(async () => account);
    await expect(pageAccess(await headersWith(), target, { env: env(), lookup, account: load })).resolves.toEqual({
      kind: 'granted',
      session: { userId: 'u1', role: 'mentor', isDevSession: false, emailVerified: true },
      account,
    });
    expect(lookup).toHaveBeenCalledWith('u1');
    expect(load).toHaveBeenCalledWith({ userId: 'u1', role: 'mentor', isDevSession: false, emailVerified: true });
  });

  it('sends a signed-out visitor to /sign-in with the page as the return path (no cookie, bad cookie, stale version)', async () => {
    const lookup = vi.fn(async () => mentor);
    const expected = { kind: 'sign-in', signInPath: '/sign-in?next=%2Fmentor%2Fprofile' };
    await expect(pageAccess(new Headers(), target, { env: env(), lookup })).resolves.toEqual(expected);
    await expect(
      pageAccess(await headersWith(`${SESSION_COOKIE}=garbage`), target, { env: env(), lookup }),
    ).resolves.toEqual(expected);
    const stale = `${SESSION_COOKIE}=${await signSessionToken({ sub: 'u1', sv: 9 }, SECRET)}`;
    await expect(pageAccess(await headersWith(stale), target, { env: env(), lookup })).resolves.toEqual(expected);
    expect(new URLSearchParams(expected.signInPath.split('?')[1]).get('next')).toBe('/mentor/profile');
  });

  it('refuses a session with another role without loading the account — also the local dev admin', async () => {
    const load = vi.fn(async () => account);
    const mentee = vi.fn(async () => ({ ...mentor, role: 'mentee' as const }));
    await expect(
      pageAccess(await headersWith(), target, { env: env(), lookup: mentee, account: load }),
    ).resolves.toEqual({
      kind: 'forbidden',
    });
    const devAdmin = env({ ALLOW_DEV_ADMIN: '1', NODE_ENV: 'development' });
    await expect(pageAccess(new Headers(), target, { env: devAdmin, account: load })).resolves.toEqual({
      kind: 'forbidden',
    });
    expect(load).not.toHaveBeenCalled();
  });

  it('loads the account through the request scope by default', async () => {
    const currentUser = vi.fn(async () => account);
    withScopeMock.mockImplementation((fn: (cradle: unknown) => unknown) => fn({ authService: { currentUser } }));
    const lookup = vi.fn(async () => mentor);
    const result = await pageAccess(await headersWith(), target, { env: env(), lookup });
    expect(result).toMatchObject({ kind: 'granted', account });
    expect(currentUser).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1' }));
  });
});
