import { describe, expect, it } from 'vitest';
import { SignJWT } from 'jose';
import { AUTH_LIMITS } from '../config/rules';
import {
  SESSION_COOKIE,
  buildSessionCookie,
  clearSessionCookie,
  readSessionCookie,
  signSessionToken,
  verifySessionToken,
} from './session';

const SECRET = 'a'.repeat(32);
const OTHER_SECRET = 'b'.repeat(32);
const now = new Date('2026-10-18T12:00:00Z');
const days = (n: number) => new Date(now.getTime() + n * 86_400_000);
const claims = { sub: 'user-1', sv: 3 };

describe('session JWT', () => {
  it('round-trips the subject and session version', async () => {
    const token = await signSessionToken(claims, SECRET, now);
    expect(token.split('.')).toHaveLength(3);
    expect(await verifySessionToken(token, SECRET, now)).toEqual(claims);
  });

  it('expires after exactly 7 days — fixed, no sliding window', async () => {
    const token = await signSessionToken(claims, SECRET, now);
    expect(AUTH_LIMITS.sessionDays).toBe(7);
    expect(await verifySessionToken(token, SECRET, days(6.99))).toEqual(claims);
    expect(await verifySessionToken(token, SECRET, days(7.01))).toBeNull();
  });

  it('rejects a tampered payload, a wrong secret, garbage and an unsigned (alg none) token', async () => {
    const token = await signSessionToken(claims, SECRET, now);
    const [header, payload, signature] = token.split('.') as [string, string, string];
    const forged = Buffer.from(JSON.stringify({ sub: 'user-2', sv: 3 })).toString('base64url');
    expect(await verifySessionToken(`${header}.${forged}.${signature}`, SECRET, now)).toBeNull();
    expect(await verifySessionToken(`${header}.${payload}.${signature.slice(0, -2)}xx`, SECRET, now)).toBeNull();
    expect(await verifySessionToken(token, OTHER_SECRET, now)).toBeNull();
    expect(await verifySessionToken('not-a-jwt', SECRET, now)).toBeNull();
    expect(await verifySessionToken('', SECRET, now)).toBeNull();
    const none = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${payload}.`;
    expect(await verifySessionToken(none, SECRET, now)).toBeNull();
  });

  it('rejects a validly signed token whose claims have the wrong shape', async () => {
    const sign = (body: Record<string, unknown>, subject?: string) => {
      const jwt = new SignJWT(body).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1h');
      return (subject === undefined ? jwt : jwt.setSubject(subject)).sign(new TextEncoder().encode(SECRET));
    };
    expect(await verifySessionToken(await sign({ sv: 1 }), SECRET)).toBeNull();
    expect(await verifySessionToken(await sign({ sv: '1' }, 'u'), SECRET)).toBeNull();
    expect(await verifySessionToken(await sign({ sv: 1.5 }, 'u'), SECRET)).toBeNull();
    expect(await verifySessionToken(await sign({}, 'u'), SECRET)).toBeNull();
    expect(await verifySessionToken(await sign({ sv: 0 }, 'u'), SECRET)).toEqual({ sub: 'u', sv: 0 });
  });

  it('signs with the current time by default', async () => {
    const token = await signSessionToken(claims, SECRET);
    expect(await verifySessionToken(token, SECRET)).toEqual(claims);
  });
});

describe('session cookie', () => {
  it('is httpOnly, lax, path=/ with a 7-day max-age, and Secure only in production', () => {
    const dev = buildSessionCookie('tok', { NODE_ENV: 'development' });
    expect(dev).toBe('mh_session=tok; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800');
    expect(buildSessionCookie('tok', { NODE_ENV: 'test' })).not.toContain('Secure');
    expect(buildSessionCookie('tok', { NODE_ENV: 'production' })).toBe(
      'mh_session=tok; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800; Secure',
    );
  });

  it('clears with an empty value and Max-Age=0, keeping the same flags', () => {
    expect(clearSessionCookie({ NODE_ENV: 'development' })).toBe(
      'mh_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
    );
    expect(clearSessionCookie({ NODE_ENV: 'production' })).toBe(
      'mh_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure',
    );
  });

  it('reads the session cookie among others; absent → undefined, present but empty → "" (still present)', () => {
    const req = (cookie?: string) => new Request('http://local/', { headers: cookie === undefined ? {} : { cookie } });
    expect(readSessionCookie(req(`a=1; ${SESSION_COOKIE}=x.y.z; b=2`))).toBe('x.y.z');
    expect(readSessionCookie(req(`${SESSION_COOKIE}=with=equals`))).toBe('with=equals');
    expect(readSessionCookie(req('a=1; b=2'))).toBeUndefined();
    expect(readSessionCookie(req(`${SESSION_COOKIE}_other=1`))).toBeUndefined();
    expect(readSessionCookie(req())).toBeUndefined();
    expect(readSessionCookie(req(`${SESSION_COOKIE}=`))).toBe('');
    expect(readSessionCookie(req(`a=1; ${SESSION_COOKIE}=; b=2`))).toBe('');
  });
});
