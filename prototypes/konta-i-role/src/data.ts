// Fictitious data from the brief and fixtures (mapa-ekranow.md §3). No real people, no real services.

export type Role = 'mentee' | 'mentor' | 'admin';
export type Account = {
  id: string;
  email: string;
  role: Role;
  verified: boolean;
  name: null; // users.name is nullable (Q5/Q12): the e-mail is shown instead (L18 A)
};

// Demo accounts (T01). Ewa is the admin; "dev" exists only locally (ALLOW_DEV_ADMIN).
export const ACCOUNTS: Account[] = [
  { id: 'kuba', email: 'kuba.lis@example.test', role: 'mentee', verified: true, name: null },
  { id: 'ola', email: 'ola.mazur@example.test', role: 'mentee', verified: false, name: null },
  { id: 'piotr', email: 'piotr.zajac@example.test', role: 'mentee', verified: true, name: null },
  { id: 'marta', email: 'marta.kowalczyk@example.test', role: 'mentor', verified: true, name: null },
  { id: 'tomasz', email: 'tomasz.nowak@example.test', role: 'mentor', verified: true, name: null },
  { id: 'ewa', email: 'ewa.ops@example.test', role: 'admin', verified: true, name: null },
  { id: 'dev', email: 'dev-admin (local only)', role: 'admin', verified: true, name: null },
];

export const DEMO_NEW_MENTOR = 'nowy.mentor@example.test';

// Mentor page stub (E02 stub, L07): Marta Kowalczyk, prices from the brief fixtures.
export const MENTOR = {
  id: 'marta-k',
  name: 'Marta Kowalczyk',
  headline: 'Staff engineer, TypeScript compiler errors and monorepo builds',
  technologies: ['TypeScript', 'Monorepo builds'],
  priceLabel: '$45 / 25 min · $80 / 50 min',
};

// Slots for 27–28 Oct 2026 (fixtures; clock fixed at Mon 26 Oct 2026, 10:00 Europe/Warsaw).
export const SLOTS = [
  { id: 'tue-1800-25', start: '2026-10-27T18:00:00+01:00', minutes: 25 as const, price: '$45' },
  { id: 'tue-1830-50', start: '2026-10-27T18:30:00+01:00', minutes: 50 as const, price: '$80' },
  { id: 'wed-0730-25', start: '2026-10-28T07:30:00+01:00', minutes: 25 as const, price: '$45' },
];

export const SLOT_NEXT_BASE = '/m/marta-k?slot=';

// Error codes from the API contracts / ?error= parameter (copy is in English, the product language).
export const ERROR_TEXT: Record<string, string> = {
  rate_limited: 'Too many attempts. Wait a few minutes and try again.',
  mail_failed: "We couldn't send the e-mail. Try again in a moment.",
  github_failed: 'GitHub sign-in was not completed. Try again.',
  github_email_unverified: 'Your GitHub e-mail is not verified. Verify it on GitHub and try again.',
  invalid_request: 'This sign-in request is not valid.',
  link_invalid: 'This link is not valid. Request a new one.',
  link_gone: 'This link was already used. Request a new one.',
  unsafe_next: 'Redirect blocked: the link pointed outside DevMentor.',
  unknown: 'Something went wrong. Try again.',
};

export const SESSION_ENDED = 'Your session ended — sign in again.';
export const EXISTING_NOTICE_TEXT =
  'An account with this e-mail already exists — you are signed in to it; its role was not changed.';

export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

// `next` is only followed when it is a path inside the app (EC-next-open-redirect).
export const isSafeNext = (next: string) => next.startsWith('/') && !next.startsWith('//');

export const slotFromNext = (next: string): string | null => {
  const query = next.split('?')[1] ?? '';
  return new URLSearchParams(query).get('slot');
};

export type LinkState = 'valid' | 'expired' | 'used' | 'gone410' | 'otherDevice';
export type SendResult = 'sent' | '422' | '429' | '503';
export type GhOutcome = 'ok' | 'denied' | 'unverified' | 'timeout' | 'state';
export type Existing = 'no' | 'mentee' | 'mentor';
export type NextParam = 'none' | 'valid' | 'invalid' | 'unknown';
export type DbState = 'up' | 'down' | 'error';
export type UsersState = 'empty' | 'few' | 'many';
export type SlotState = 'free' | 'taken';
export type Session = 'valid' | 'expired' | 'invalidated';

export type Controls = {
  github: boolean; // T02
  mail: boolean; // L20 (decision A: hide the e-mail form when there is no mail provider)
  ghOutcome: GhOutcome; // T03
  sendResult: SendResult; // T04
  linkState: LinkState; // T05
  existing: Existing; // T06
  session: Session; // T07
  resend: 'counting' | 'ready'; // T08
  nextParam: NextParam; // T09
  dbState: DbState; // T10
  users: UsersState; // T11
  slotState: SlotState; // T12
  signOutResult: 'ok' | 'error'; // L12 (decision A: inline error + Try again)
};

export const DEFAULT_CONTROLS: Controls = {
  github: true,
  mail: true,
  ghOutcome: 'ok',
  sendResult: 'sent',
  linkState: 'valid',
  existing: 'no',
  session: 'valid',
  resend: 'counting',
  nextParam: 'none',
  dbState: 'up',
  users: 'few',
  slotState: 'free',
  signOutResult: 'ok',
};

// Per-screen notes for the review (Etap 3): story/AC/decision IDs, what is simulated, what is NOT resolved.
export const NOTES: Record<string, string> = {
  s01: 'Stories: F4 (landing), S01-AC3 (notice for an existing account), L13 (signed-in users skip sign-in pages), L18 (e-mail instead of a missing name). Simulated: session kept in the prototype only (no cookie); T01 and T07 set it. Not resolved: what a signed-in mentee or admin sees on Home beyond the buttons (E01 does not describe it).',
  s02: 'Stories: F1, F2, F4, S02-AC1, S02-AC2 (s13), EC-gh-*, EC-429, EC-mail-503, EC-role-admin, EC-next-open-redirect; decisions L02 A (one sign-in page for mentee sign-in and sign-up), L20 A, L13. Simulated: e-mail send (T04), GitHub (T03), provider switches (T02, L20). Not resolved: the wait time after 429 (not in the spec).',
  s03: 'Stories: S01-AC1, S01-AC2 (no bank details, R07), S01-AC3 (existing e-mail, T06), R15/D14 (invitation link), L01 A (mentor onboarding flow), L14 A (GitHub error comes back here), L19 A (copy per brief). Simulated: e-mail send and GitHub, as on s02. Not resolved: how the mentor gets the invitation link and through which channel (outside E01).',
  s04: 'Stories: F1 (link valid 15 min), S02-AC1 (wait for verification), L15 A (no address: only the way out), T08 (60 s countdown). Simulated: no real mail; resend result comes from T04. Not resolved: a limit on repeated resends beyond the 429 response.',
  s05: 'Stories: F1, L16 A (subject, three sentences, "ignore if not you", 15 min), L01. Simulated: the mailbox replaces real e-mail; sender no-reply@example.test is fictitious. Not resolved: the mail provider (separate spec, Q3) and the mentee vs mentor template beyond L16.',
  s06: 'Stories: F1 (confirmation by click, guard against login-CSRF), S01-AC1, S02-AC1 (return to the slot), L17 A (another account signed in: explicit switch), EC-link-expired, 410 after click. Simulated: the token is not checked; T05 chooses the link state. Not resolved: scanner prefetch (invisible to people) and what happens to the old session beyond the L17 message.',
  s07: 'Stories: F2 (GitHub), EC-gh-failed (denied, bad state), EC-gh-unverified, EC-gh-down (10 s timeout), F3 (same e-mail, one account). Simulated: the GitHub page is a mock; T03 sets the result; the signed-in account is a demo account. Not resolved: OAuth scopes and re-linking GitHub after an e-mail change.',
  s08: 'Stories: S01-AC1, S01-AC2, S01-AC3 (notice), F5, L11 A (expired session goes to sign-in with a message), Phase 3 (other role goes to s09). Simulated: profile placeholder instead of E02. Not resolved: profile content and publishing (E02-S01, #28).',
  s09: 'Stories: Phase 3 (refusal instead of 403), Q10 (role change only through the CLI), L06 A (text "To mentor, contact us", no link to sign-up). Simulated: nothing beyond the fixture account. Not resolved: the contact channel for mentees who want to mentor (to be agreed by Jan).',
  s10: 'Stories: Q7 (admin = normal sign-in + CLI), L03 A (operator = admin), L04 A (admin lands on /admin; guest to sign-in; other role gets Access denied). Simulated: database state and API error from T10; data is fixture; dev admin only locally. Not resolved: dashboard content beyond the database status (E01 does not define the dashboard).',
  s11: 'Stories: Phase 1 (mentee denied on /api/users), Q5 and L18 A (e-mail instead of name), L04 A. Simulated: the list is fixture data (T11), errors come from T10. Not resolved: sorting, search, and paging rules (DS table pages every 20 rows).',
  s12: 'Stories: S02-AC1, F4, L07 A (stub with demo data, labelled E02 stub), L08 A (after return: message, no hold). Simulated: mentor data and slots are brief fixtures (no ratings N02, no video N01); booking (E03) is disabled. Not resolved: holding a slot during verification (a PROPOSAL in Storybook, not in the spec) and the real mentor page (E02-S03, #30).',
  s13: 'Stories: S02-AC2 (403 email_unverified), L05 A (alert on the booking screen; button sends the link with next = this slot). Simulated: link sending per T04; verification by signing in with the link. Not resolved: the booking state after verification (E03).',
  s14: 'Stories: F5 (7-day session, sign out), L10 A (sign out everywhere with confirmation), L12 A (signing-out state, inline error, Try again). Simulated: sign-out only in the prototype memory; the error is set by L12. Not resolved: real sign-out from other devices; the prototype only shows the action.',
};
