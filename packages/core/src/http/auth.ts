import type { UserRole } from '@mentorhub/db';
import { getEnv, type Env } from '../config/env';
import { withScope } from '../container/container';
import { EmailUnverifiedError, ForbiddenError, UnauthorizedError } from './errors';
import { readSessionCookie, verifySessionToken } from './session';

export interface Session {
  userId: string;
  role: UserRole;
  /** True for the local dev-admin session (ALLOW_DEV_ADMIN=1 and NODE_ENV=development only). */
  isDevSession: boolean;
  /** False for accounts created another way than a link click or a verified GitHub e-mail (admin POST /api/users). */
  emailVerified: boolean;
}

/** What `requireSession` needs to know about the user behind a token. */
export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  sessionVersion: number;
  emailVerifiedAt: Date | null;
}

/** Narrow read port resolved from the request's container scope (`cradle.sessionUserLookup`). */
export interface SessionUserLookup {
  findForSession(userId: string): Promise<SessionUser | null>;
}

export const DEV_ADMIN_SESSION: Session = {
  userId: 'dev-admin',
  role: 'admin',
  isDevSession: true,
  emailVerified: true,
};

export interface RequireSessionDeps {
  env?: () => Env;
  /** Injection point for tests; defaults to the request scope's `sessionUserLookup`. */
  lookup?: (userId: string) => Promise<SessionUser | null>;
  now?: () => Date;
}

const defaultLookup = (userId: string) => withScope((cradle) => cradle.sessionUserLookup.findForSession(userId));

/**
 * Session from a present `mh_session` cookie: verify the JWT, load the user, compare the session
 * version. Anything doubtful — bad signature, expired, unknown user, version mismatch, a database
 * error — is `null`, which the caller turns into a denial.
 */
async function sessionFromCookie(token: string, env: Env, deps: RequireSessionDeps): Promise<Session | null> {
  const claims = await verifySessionToken(token, env.AUTH_SECRET, deps.now?.());
  if (!claims) return null;
  let user: SessionUser | null;
  try {
    user = await (deps.lookup ?? defaultLookup)(claims.sub);
  } catch {
    return null; // fail closed: an unreadable user is no user
  }
  if (!user || user.sessionVersion !== claims.sv) return null;
  return { userId: user.id, role: user.role, isDevSession: false, emailVerified: user.emailVerifiedAt !== null };
}

/**
 * Returns the caller's session or throws UnauthorizedError — fails closed on any doubt.
 * A present cookie decides on its own: valid → that user; invalid, stale, unknown user or a database
 * error → 401, never the dev admin (review finding 4). Only a request WITHOUT a session cookie may
 * fall back to the local dev admin, and ONLY when ALLOW_DEV_ADMIN=1 and NODE_ENV is exactly
 * "development" (an allowlist: test, staging, production or anything unexpected is denied).
 */
export async function requireSession(request: Request, deps: RequireSessionDeps = {}): Promise<Session> {
  let env: Env;
  try {
    env = (deps.env ?? getEnv)();
  } catch {
    throw new UnauthorizedError();
  }
  const token = readSessionCookie(request);
  if (token !== undefined) {
    // Present at all — even empty or malformed — means "verify this", never "fall back".
    const session = token === '' ? null : await sessionFromCookie(token, env, deps);
    if (!session) throw new UnauthorizedError();
    return session;
  }
  if (env.ALLOW_DEV_ADMIN === '1' && env.NODE_ENV === 'development') return DEV_ADMIN_SESSION;
  throw new UnauthorizedError();
}

/**
 * Throws EmailUnverifiedError (403 `email_unverified`) unless the session's account has a verified e-mail.
 * Pure check on a Session, like `requireRole`; routes that need it use `requireVerifiedSession`.
 */
export function requireVerified(session: Session): void {
  if (!session.emailVerified) throw new EmailUnverifiedError();
}

/**
 * `requireSession` followed by `requireVerified`: no session → the same 401 as before; a session without
 * a verified e-mail → 403 `email_unverified`. Consumed by E03 booking routes.
 */
export async function requireVerifiedSession(request: Request, deps: RequireSessionDeps = {}): Promise<Session> {
  const session = await requireSession(request, deps);
  requireVerified(session);
  return session;
}

/** Throws ForbiddenError unless the session has the role. */
export function requireRole(session: Session, role: UserRole): void {
  if (session.role !== role) throw new ForbiddenError();
}
