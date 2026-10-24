import type { UserRole } from '@mentorhub/db';
import { withScope } from '../container/container';
import type { CurrentUser } from '../services/auth/auth.service';
import { requireRole, requireSession, type RequireSessionDeps, type Session } from './auth';

/**
 * Outcome of a server-rendered page's access check. The page is configuration: it redirects on
 * `sign-in`, renders a refusal on `forbidden` and the content on `granted`.
 */
export type PageAccess =
  | { kind: 'granted'; session: Session; account: CurrentUser }
  | { kind: 'sign-in'; signInPath: string }
  | { kind: 'forbidden' };

export interface PageAccessDeps extends RequireSessionDeps {
  /** Injection point for tests; defaults to the request scope's `authService.currentUser`. */
  account?: (session: Session) => Promise<CurrentUser>;
}

const SIGN_IN_PATH = '/sign-in';
/** Any absolute base will do: `requireSession` reads only the cookie header of the request. */
const BASE = 'http://localhost';

const defaultAccount = (session: Session) => withScope((cradle) => cradle.authService.currentUser(session));

/**
 * Access check for a page that requires a role (e.g. `/mentor/profile`): signed out → send to `/sign-in`
 * with the page as the validated return path; signed in with another role → forbidden (also the local
 * dev admin, whose role is `admin`); otherwise the session and the account it belongs to. Fails closed
 * like `requireSession` (any doubt is "signed out").
 */
export async function pageAccess(
  headers: Headers,
  { role, path }: { role: UserRole; path: string },
  deps: PageAccessDeps = {},
): Promise<PageAccess> {
  let session: Session;
  try {
    session = await requireSession(new Request(new URL(path, BASE), { headers }), deps);
  } catch {
    return { kind: 'sign-in', signInPath: `${SIGN_IN_PATH}?${new URLSearchParams({ next: path })}` };
  }
  try {
    requireRole(session, role);
  } catch {
    return { kind: 'forbidden' };
  }
  return { kind: 'granted', session, account: await (deps.account ?? defaultAccount)(session) };
}
