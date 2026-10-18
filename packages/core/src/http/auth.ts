import type { UserRole } from '@mentorhub/db';
import { getEnv, type Env } from '../config/env';
import { withScope } from '../container/container';
import { ForbiddenError, UnauthorizedError } from './errors';
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
 * Session from the `mh_session` cookie: verify the JWT, load the user, compare the session version.
 * Anything doubtful — no cookie, bad signature, expired, unknown user, version mismatch, a database
 * error — is `null`; the caller decides what that means.
 */
async function sessionFromCookie(request: Request, env: Env, deps: RequireSessionDeps): Promise<Session | null> {
  const token = readSessionCookie(request);
  if (!token) return null;
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
 * A valid cookie session wins. Without one, the local dev admin is admitted ONLY when
 * ALLOW_DEV_ADMIN=1 and NODE_ENV is exactly "development" (an allowlist: test, staging, production
 * or anything unexpected is denied).
 */
export async function requireSession(request: Request, deps: RequireSessionDeps = {}): Promise<Session> {
  let env: Env;
  try {
    env = (deps.env ?? getEnv)();
  } catch {
    throw new UnauthorizedError();
  }
  const session = await sessionFromCookie(request, env, deps);
  if (session) return session;
  if (env.ALLOW_DEV_ADMIN === '1' && env.NODE_ENV === 'development') return DEV_ADMIN_SESSION;
  throw new UnauthorizedError();
}

/** Throws ForbiddenError unless the session has the role. */
export function requireRole(session: Session, role: UserRole): void {
  if (session.role !== role) throw new ForbiddenError();
}
