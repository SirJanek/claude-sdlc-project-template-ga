import type { UserRole } from '@mentorhub/db';
import { ACCOUNT_NOTICE_PARAM, type AccountNotice } from '../../validators/auth/account-notice.schema';
import { isSameOriginPath } from '../../validators/auth/next-path.schema';

/** Where a mentor lands after sign-in (spec › Flows 4): the profile setup page. */
export const MENTOR_PROFILE_PATH = '/mentor/profile';
const ROOT_PATH = '/';

/** The role's default return path when a link carried no validated `next`: mentors → profile setup, else `/`. */
export function defaultLandingPath(role: UserRole): string {
  return role === 'mentor' ? MENTOR_PROFILE_PATH : ROOT_PATH;
}

/**
 * Appends the one-time notice to an already validated same-origin path, keeping its query and hash.
 * Pure string work on the validated input: a `URL` round-trip would normalise dot segments and could
 * turn `/a/..//evil.example` into the protocol-relative `//evil.example` (review of PR #47, finding 1).
 * The result is re-checked with the same rule as `nextPathSchema`; anything that would fail it falls
 * back to the role-neutral root with the notice, so the consume contract (same-origin `next`) holds.
 */
export function withAccountNotice(path: string, notice: AccountNotice): string {
  const hashAt = path.indexOf('#');
  const [base, hash] = hashAt === -1 ? [path, ''] : [path.slice(0, hashAt), path.slice(hashAt)];
  const joined = `${base}${base.includes('?') ? '&' : '?'}${ACCOUNT_NOTICE_PARAM}=${notice}${hash}`;
  return isSameOriginPath(joined) ? joined : `${ROOT_PATH}?${ACCOUNT_NOTICE_PARAM}=${notice}`;
}
