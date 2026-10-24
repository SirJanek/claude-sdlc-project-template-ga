import { SignJWT, jwtVerify } from 'jose';
import { AUTH_LIMITS } from '../config/rules';
import type { IntentRole } from '../validators/auth/email-link-start.schema';
import { buildCookie, readCookie } from './session';

/**
 * Name of the short-lived cookie that carries a GitHub sign-in attempt between `start` and
 * `callback` — a protected surface (BACKWARD_COMPATIBILITY §7). Scoped to the GitHub routes only.
 */
export const GITHUB_STATE_COOKIE = 'mh_github';
export const GITHUB_STATE_COOKIE_PATH = '/api/auth/github';

const ALGORITHM = 'HS256';
const SECONDS_PER_MINUTE = 60;

/**
 * What one sign-in attempt remembers: the `state` GitHub must echo (CSRF), the PKCE verifier, the
 * intended role and the validated return path. Signed, so the browser cannot change the role or the
 * path between the two requests; httpOnly, so no script can read the verifier.
 */
export interface GitHubStateClaims {
  state: string;
  codeVerifier: string;
  role?: IntentRole;
  next?: string;
}

const key = (secret: string) => new TextEncoder().encode(secret);
const toSeconds = (date: Date) => Math.floor(date.getTime() / 1000);

/** Signs the attempt with a fixed expiry of AUTH_LIMITS.githubStateMinutes. */
export async function signGitHubStateToken(
  claims: GitHubStateClaims,
  secret: string,
  now = new Date(),
): Promise<string> {
  const issuedAt = toSeconds(now);
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + AUTH_LIMITS.githubStateMinutes * SECONDS_PER_MINUTE)
    .sign(key(secret));
}

const isOptionalString = (value: unknown): value is string | undefined =>
  value === undefined || typeof value === 'string';

/**
 * Verifies signature, algorithm and expiry; returns the claims or `null` for anything that must not
 * be trusted (tampered, expired, wrong secret, malformed, wrong claim types). Never throws.
 */
export async function verifyGitHubStateToken(
  token: string,
  secret: string,
  now = new Date(),
): Promise<GitHubStateClaims | null> {
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: [ALGORITHM], currentDate: now });
    const { state, codeVerifier, role, next } = payload;
    if (typeof state !== 'string' || typeof codeVerifier !== 'string') return null;
    if ((role !== undefined && role !== 'mentor') || !isOptionalString(next)) return null;
    return { state, codeVerifier, ...(role === undefined ? {} : { role }), ...(next === undefined ? {} : { next }) };
  } catch {
    return null;
  }
}

/** `Set-Cookie` value that keeps the attempt for AUTH_LIMITS.githubStateMinutes, on the GitHub routes only. */
export function buildGitHubStateCookie(token: string, env: { NODE_ENV: string }): string {
  return buildCookie(GITHUB_STATE_COOKIE, token, env, {
    maxAgeSeconds: AUTH_LIMITS.githubStateMinutes * SECONDS_PER_MINUTE,
    path: GITHUB_STATE_COOKIE_PATH,
  });
}

/** `Set-Cookie` value that removes the attempt — sent by every callback, success or not. */
export function clearGitHubStateCookie(env: { NODE_ENV: string }): string {
  return buildCookie(GITHUB_STATE_COOKIE, '', env, { maxAgeSeconds: 0, path: GITHUB_STATE_COOKIE_PATH });
}

/** The state cookie's value, `''` when present but empty, `undefined` when absent (see `readCookie`). */
export function readGitHubStateCookie(request: Request): string | undefined {
  return readCookie(request, GITHUB_STATE_COOKIE);
}
