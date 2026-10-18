import type { UserRole } from '@mentorhub/db';
import { ACCOUNT_NOTICE_PARAM, type AccountNotice } from '../../validators/auth/account-notice.schema';

/** Where a mentor lands after sign-in (spec › Flows 4): the profile setup page. */
export const MENTOR_PROFILE_PATH = '/mentor/profile';
const ROOT_PATH = '/';

/** The role's default return path when a link carried no validated `next`: mentors → profile setup, else `/`. */
export function defaultLandingPath(role: UserRole): string {
  return role === 'mentor' ? MENTOR_PROFILE_PATH : ROOT_PATH;
}

/**
 * Appends the one-time notice to an already validated same-origin path, keeping its query and hash.
 * The path stays relative (`new URL` with a throw-away base only parses it), so it cannot become an
 * open redirect here.
 */
export function withAccountNotice(path: string, notice: AccountNotice): string {
  const url = new URL(path, 'http://localhost');
  url.searchParams.set(ACCOUNT_NOTICE_PARAM, notice);
  return `${url.pathname}${url.search}${url.hash}`;
}
