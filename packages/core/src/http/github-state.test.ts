import { describe, expect, it } from 'vitest';
import { SignJWT } from 'jose';
import { AUTH_LIMITS } from '../config/rules';
import {
  GITHUB_STATE_COOKIE,
  GITHUB_STATE_COOKIE_PATH,
  buildGitHubStateCookie,
  clearGitHubStateCookie,
  readGitHubStateCookie,
  signGitHubStateToken,
  verifyGitHubStateToken,
  type GitHubStateClaims,
} from './github-state';

const SECRET = 'a'.repeat(32);
const now = new Date('2026-10-18T12:00:00Z');
const minutes = (n: number) => new Date(now.getTime() + n * 60_000);
const claims: GitHubStateClaims = { state: 'st', codeVerifier: 'cv', role: 'mentor', next: '/mentors/7?slot=1' };
const sign = (body: Record<string, unknown>) =>
  new SignJWT(body).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1h').sign(new TextEncoder().encode(SECRET));

describe('GitHub state token', () => {
  it('round-trips state, verifier, role and next; omits what was not given', async () => {
    expect(await verifyGitHubStateToken(await signGitHubStateToken(claims, SECRET, now), SECRET, now)).toEqual(claims);
    const minimal = { state: 's', codeVerifier: 'c' };
    const verified = await verifyGitHubStateToken(await signGitHubStateToken(minimal, SECRET, now), SECRET, now);
    expect(verified).toEqual(minimal);
    expect(verified && 'role' in verified).toBe(false);
    expect(await verifyGitHubStateToken(await signGitHubStateToken(minimal, SECRET), SECRET)).toEqual(minimal);
  });

  it('expires after 10 minutes — a consent screen takes minutes, not hours', async () => {
    const token = await signGitHubStateToken(claims, SECRET, now);
    expect(AUTH_LIMITS.githubStateMinutes).toBe(10);
    expect(await verifyGitHubStateToken(token, SECRET, minutes(9.9))).toEqual(claims);
    expect(await verifyGitHubStateToken(token, SECRET, minutes(10.1))).toBeNull();
  });

  it('rejects tampering, another secret, garbage and the wrong claim shapes (role is mentor or nothing)', async () => {
    const token = await signGitHubStateToken(claims, SECRET, now);
    const [header, , signature] = token.split('.') as [string, string, string];
    const forged = Buffer.from(JSON.stringify({ ...claims, role: 'admin' })).toString('base64url');
    expect(await verifyGitHubStateToken(`${header}.${forged}.${signature}`, SECRET, now)).toBeNull();
    expect(await verifyGitHubStateToken(token, 'b'.repeat(32), now)).toBeNull();
    expect(await verifyGitHubStateToken('nope', SECRET, now)).toBeNull();
    expect(await verifyGitHubStateToken(await sign({ codeVerifier: 'c' }), SECRET)).toBeNull();
    expect(await verifyGitHubStateToken(await sign({ state: 's' }), SECRET)).toBeNull();
    expect(
      await verifyGitHubStateToken(await sign({ state: 's', codeVerifier: 'c', role: 'admin' }), SECRET),
    ).toBeNull();
    expect(
      await verifyGitHubStateToken(await sign({ state: 's', codeVerifier: 'c', role: 'mentee' }), SECRET),
    ).toBeNull();
    expect(await verifyGitHubStateToken(await sign({ state: 's', codeVerifier: 'c', next: 7 }), SECRET)).toBeNull();
    expect(await verifyGitHubStateToken(await sign({ state: 1, codeVerifier: 'c' }), SECRET)).toBeNull();
  });
});

describe('GitHub state cookie', () => {
  it('is httpOnly, lax, scoped to the GitHub routes, 10 minutes, Secure only in production', () => {
    expect(GITHUB_STATE_COOKIE).toBe('mh_github');
    expect(GITHUB_STATE_COOKIE_PATH).toBe('/api/auth/github');
    expect(buildGitHubStateCookie('tok', { NODE_ENV: 'development' })).toBe(
      'mh_github=tok; Path=/api/auth/github; HttpOnly; SameSite=Lax; Max-Age=600',
    );
    expect(buildGitHubStateCookie('tok', { NODE_ENV: 'production' })).toBe(
      'mh_github=tok; Path=/api/auth/github; HttpOnly; SameSite=Lax; Max-Age=600; Secure',
    );
  });

  it('clears with Max-Age=0 on the same path, and reads back by name', () => {
    expect(clearGitHubStateCookie({ NODE_ENV: 'development' })).toBe(
      'mh_github=; Path=/api/auth/github; HttpOnly; SameSite=Lax; Max-Age=0',
    );
    const request = new Request('http://x', { headers: { cookie: 'mh_session=a; mh_github=b.c.d' } });
    expect(readGitHubStateCookie(request)).toBe('b.c.d');
    expect(readGitHubStateCookie(new Request('http://x', { headers: { cookie: 'mh_github=' } }))).toBe('');
    expect(readGitHubStateCookie(new Request('http://x'))).toBeUndefined();
  });
});
