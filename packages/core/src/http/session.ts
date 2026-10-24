import { SignJWT, jwtVerify } from 'jose';
import { AUTH_LIMITS } from '../config/rules';

/** Name of the session cookie — a protected surface (BACKWARD_COMPATIBILITY §7). */
export const SESSION_COOKIE = 'mh_session';

const ALGORITHM = 'HS256';
const SECONDS_PER_DAY = 86_400;

/** Claims the session JWT carries: the user id and the session version it was issued with. */
export interface SessionClaims {
  sub: string;
  sv: number;
}

const key = (secret: string) => new TextEncoder().encode(secret);
const toSeconds = (date: Date) => Math.floor(date.getTime() / 1000);

/** Signs a session JWT with a fixed expiry of AUTH_LIMITS.sessionDays — no refresh, no sliding window. */
export async function signSessionToken(claims: SessionClaims, secret: string, now = new Date()): Promise<string> {
  const issuedAt = toSeconds(now);
  return new SignJWT({ sv: claims.sv })
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(claims.sub)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + AUTH_LIMITS.sessionDays * SECONDS_PER_DAY)
    .sign(key(secret));
}

/**
 * Verifies signature, algorithm and expiry; returns the claims or `null` for any token that must not
 * be trusted (tampered, expired, wrong secret, malformed, wrong claim types). Never throws.
 */
export async function verifySessionToken(
  token: string,
  secret: string,
  now = new Date(),
): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: [ALGORITHM], currentDate: now });
    if (typeof payload.sub !== 'string' || !Number.isInteger(payload.sv)) return null;
    return { sub: payload.sub, sv: payload.sv as number };
  } catch {
    return null;
  }
}

/** Flags every session cookie carries (engineering standards › Cookies); `Secure` only in production. */
function cookieAttributes(env: { NODE_ENV: string }, maxAgeSeconds: number): string {
  const attributes = ['Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAgeSeconds}`];
  if (env.NODE_ENV === 'production') attributes.push('Secure');
  return attributes.join('; ');
}

/** `Set-Cookie` value that stores the token for the session lifetime. */
export function buildSessionCookie(token: string, env: { NODE_ENV: string }): string {
  return `${SESSION_COOKIE}=${token}; ${cookieAttributes(env, AUTH_LIMITS.sessionDays * SECONDS_PER_DAY)}`;
}

/** `Set-Cookie` value that removes the session cookie from this device. */
export function clearSessionCookie(env: { NODE_ENV: string }): string {
  return `${SESSION_COOKIE}=; ${cookieAttributes(env, 0)}`;
}

/**
 * The session cookie's value, or `undefined` only when the request carries NO `mh_session` cookie.
 * A present but empty cookie (`mh_session=`) returns `''`: presence is a credential the caller must
 * verify and deny, never a reason to fall back to anything (review round 2, finding 1).
 */
export function readSessionCookie(request: Request): string | undefined {
  const header = request.headers.get('cookie');
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === SESSION_COOKIE) return rest.join('=');
  }
  return undefined;
}
