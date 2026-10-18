import type { UserRole } from '@mentorhub/db';
import { getEnv, type Env } from '../config/env';
import { ForbiddenError, UnauthorizedError } from './errors';

export interface Session {
  userId: string;
  role: UserRole;
  /** True for the temporary local dev-admin session (no real authentication yet). */
  isDevSession: boolean;
}

export const DEV_ADMIN_SESSION: Session = { userId: 'dev-admin', role: 'admin', isDevSession: true };

/**
 * Returns the caller's session or throws UnauthorizedError — fails closed on any doubt.
 * Until the auth spec lands, the only session is a local dev admin, admitted ONLY when
 * ALLOW_DEV_ADMIN=1 and NODE_ENV is exactly "development" (an allowlist: test, staging, production
 * or anything unexpected is denied). The request is unused until then.
 */
export function requireSession(request: Request, deps: { env?: () => Env } = {}): Session {
  void request;
  let env: Env;
  try {
    env = (deps.env ?? getEnv)();
  } catch {
    throw new UnauthorizedError();
  }
  if (env.ALLOW_DEV_ADMIN === '1' && env.NODE_ENV === 'development') return DEV_ADMIN_SESSION;
  throw new UnauthorizedError();
}

/** Throws ForbiddenError unless the session has the role. */
export function requireRole(session: Session, role: UserRole): void {
  if (session.role !== role) throw new ForbiddenError();
}
