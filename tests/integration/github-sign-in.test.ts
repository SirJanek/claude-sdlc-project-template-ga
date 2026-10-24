import { readFileSync, writeFileSync } from 'node:fs';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { createBrowser } from './browser';
import { prodGithubFake, prodOutbox, prodUrl, psql } from './env';

/**
 * E01 Phase 2 — "Continue with GitHub" end to end against the production server (`next start`,
 * real cookie sessions) with GITHUB_ADAPTER=fake: the fake provider is the app's own callback, and
 * the person it answers with is whatever this file writes to the server's GITHUB_FAKE_FILE before
 * each flow (verified / unverified / denied). Runs after `auth.test.ts`, before `mentor-sign-up`
 * and `app.test.ts` (which stops the database); cleans up its own rows.
 */
const browser = createBrowser('github-sign-in');
const CSRF = { 'x-mentorhub-request': '1' };
const PROFILE = '/mentor/profile';
const FAILED = "GitHub sign-in didn't complete — try again.";
const UNVERIFIED = "Your GitHub e-mail isn't verified — verify it on GitHub or use an e-mail link.";
const NOTICE = 'An account with this e-mail already exists — you are signed in to it; its role was not changed.';

type Scenario =
  | { denied: true }
  | { githubId: string; primaryEmail: { email: string; verified: boolean } | null; name?: string | null };
/** What the fake GitHub answers from now on (the adapter re-reads the file on every call). */
const github = (scenario: Scenario) => writeFileSync(prodGithubFake(), JSON.stringify(scenario));
const verified = (email: string, githubId: string, name = 'GitHub Person'): Scenario => ({
  githubId,
  primaryEmail: { email, verified: true },
  name,
});

const userRow = (email: string) =>
  psql(`select id, role, github_id, email_verified_at is not null from users where email = '${email}'`);
const usersCount = () => Number(psql('select count(*) from users'));
const get = (path: string, headers: Record<string, string> = {}) =>
  fetch(`${prodUrl()}${path}`, { redirect: 'manual', headers });
const post = (path: string, body: unknown) =>
  fetch(`${prodUrl()}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...CSRF },
    body: JSON.stringify(body),
  });
/** `name=value` of the first Set-Cookie called `name`, as a browser would send it back. */
const cookieNamed = (res: Response, name: string) =>
  res.headers
    .getSetCookie()
    .map((c) => c.split(';')[0]!)
    .find((c) => c.startsWith(`${name}=`));

/** Clicks the button on `page` and lets the browser follow start → fake GitHub → callback → landing. */
function continueWithGitHub(page: string) {
  browser.open(`${prodUrl()}${page}`);
  browser.waitForText('Continue with GitHub');
  browser.click('[data-slot=github-sign-in]');
}

afterEach(({ task }) => {
  if (task.result?.state === 'fail') browser.screenshot(`FAILED-${task.name}`);
});

// Leaves the database as it found it: app.test.ts counts the rows it seeds.
afterAll(() => {
  browser.close();
  psql("delete from users where email like '%@example.com'");
  psql('delete from auth_tokens');
});

describe('sign in with GitHub (#45, production server, fake provider)', () => {
  it('a mentor sign-up through "Continue with GitHub" lands on profile setup as a verified mentor with a session', () => {
    const before = usersCount();
    github(verified('New.Mentor@Example.com', 'gh-mentor-1', 'New Mentor'));
    continueWithGitHub('/sign-up/mentor');
    browser.screenshot('sign-up-mentor-github');
    browser.waitForText('Set up your mentor profile');
    browser.screenshot('mentor-profile-after-github');
    expect(browser.url()).toBe(`${prodUrl()}${PROFILE}`);
    expect(browser.text('[data-slot=account-name]')).toBe('New Mentor');
    expect(browser.text('[data-slot=session-user]')).toBe('New Mentor'); // a real session, not the dev admin
    expect(userRow('new.mentor@example.com')).toMatch(/\|mentor\|gh-mentor-1\|t$/); // lower-cased, linked, verified
    expect(usersCount()).toBe(before + 1);
    expect(browser.count('[data-slot=account-notice]')).toBe(0);
  });

  it('an unverified GitHub e-mail is refused on the sign-in page with the spec message; no account, no session', async () => {
    const before = usersCount();
    github({ githubId: 'gh-unverified', primaryEmail: { email: 'unverified@example.com', verified: false } });
    continueWithGitHub('/sign-in');
    browser.waitForText(UNVERIFIED);
    browser.screenshot('github-email-unverified');
    expect(browser.url()).toBe(`${prodUrl()}/sign-in?error=github_email_unverified`);
    expect(browser.text('[role=alert]')).toBe(UNVERIFIED);
    expect(psql("select count(*) from users where email = 'unverified@example.com'")).toBe('0');
    expect(usersCount()).toBe(before);
    // A browser without a session: the mentor page sends it to sign-in.
    expect((await get(PROFILE)).status).toBe(307);
  });

  it('denied consent (the provider comes back with error=access_denied) → the generic failure message', () => {
    github({ denied: true });
    continueWithGitHub('/sign-up/mentor');
    browser.waitForText(FAILED);
    browser.screenshot('github-denied');
    expect(browser.url()).toBe(`${prodUrl()}/sign-in?error=github_failed`);
    expect(browser.text('[role=alert]')).toBe(FAILED);
  });

  it('state tampering: a callback whose state does not match the signed cookie fails, exchanges nothing and clears the cookie', async () => {
    github(verified('tampered@example.com', 'gh-tampered'));
    const start = await get('/api/auth/github/start?role=mentor');
    expect(start.status).toBe(302);
    const location = new URL(start.headers.get('location')!);
    expect(location.pathname).toBe('/api/auth/github/callback'); // the fake provider is our own callback
    const stateCookie = cookieNamed(start, 'mh_github')!;
    expect(stateCookie).toMatch(/^mh_github=[A-Za-z0-9_.-]+$/);
    expect(start.headers.getSetCookie()[0]).toMatch(
      /Path=\/api\/auth\/github; HttpOnly; SameSite=Lax; Max-Age=600; Secure/,
    );
    const state = location.searchParams.get('state')!;
    const code = location.searchParams.get('code')!;
    // Wrong state with the right cookie, a missing cookie, and a stale cookie with another attempt's state.
    const tampered = await get(`/api/auth/github/callback?code=${code}&state=${state}x`, { cookie: stateCookie });
    expect(tampered.status).toBe(303);
    expect(tampered.headers.get('location')).toBe('/sign-in?error=github_failed');
    expect(cookieNamed(tampered, 'mh_github')).toBe('mh_github=');
    expect(cookieNamed(tampered, 'mh_session')).toBeUndefined();
    const noCookie = await get(`/api/auth/github/callback?code=${code}&state=${state}`);
    expect(noCookie.headers.get('location')).toBe('/sign-in?error=github_failed');
    const other = await get('/api/auth/github/start');
    const otherState = new URL(other.headers.get('location')!).searchParams.get('state')!;
    const crossed = await get(`/api/auth/github/callback?code=${code}&state=${otherState}`, { cookie: stateCookie });
    expect(crossed.headers.get('location')).toBe('/sign-in?error=github_failed');
    expect(psql("select count(*) from users where email = 'tampered@example.com'")).toBe('0');
    // The genuine pair still works: the attempt was not consumed by the tampered calls.
    const genuine = await get(`/api/auth/github/callback?code=${code}&state=${state}`, { cookie: stateCookie });
    expect(genuine.status).toBe(303);
    expect(genuine.headers.get('location')).toBe(PROFILE);
    expect(cookieNamed(genuine, 'mh_session')).toMatch(/^mh_session=[A-Za-z0-9_.-]+$/);
    expect(cookieNamed(genuine, 'mh_github')).toBe('mh_github=');
    expect(userRow('tampered@example.com')).toMatch(/\|mentor\|gh-tampered\|t$/);
  });

  it('an e-mail registered by link signs in to that account through GitHub and links the id — one row, role unchanged', async () => {
    // The account exists from an e-mail link (no GitHub id yet).
    expect((await post('/api/auth/email/start', { email: 'linked@example.com' })).status).toBe(200);
    const outbox = readFileSync(prodOutbox(), 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as { to: string; text: string });
    const link = outbox
      .filter((m) => m.to === 'linked@example.com')
      .at(-1)!
      .text.match(/https?:\/\/\S+/)![0];
    const consumed = await post('/api/auth/email/consume', { token: new URL(link).searchParams.get('token') });
    expect(consumed.status).toBe(200);
    const [id, before] = [userRow('linked@example.com').split('|')[0], usersCount()];
    expect(userRow('linked@example.com')).toBe(`${id}|mentee||t`);
    // Now GitHub, as a mentor sign-up for the same (verified) e-mail.
    github(verified('Linked@example.com', 'gh-linked', 'Linked Person'));
    continueWithGitHub('/sign-up/mentor');
    browser.waitForText(NOTICE);
    browser.screenshot('github-linked-existing-account');
    expect(browser.url()).toBe(`${prodUrl()}/?notice=existing_account`); // a mentee's landing, with the notice
    expect(browser.text('[data-slot=account-notice]')).toBe(NOTICE);
    expect(browser.text('[data-slot=session-user]')).toBe('linked@example.com'); // the existing account (no name)
    expect(userRow('linked@example.com')).toBe(`${id}|mentee|gh-linked|t`); // same row, role unchanged, id linked
    expect(usersCount()).toBe(before);
    // From now on the GitHub id is the key: a plain sign-in reaches the same account, no notice.
    continueWithGitHub('/sign-in');
    browser.waitForText('Sign out');
    expect(browser.url()).toBe(`${prodUrl()}/`);
    expect(browser.count('[data-slot=account-notice]')).toBe(0);
    expect(usersCount()).toBe(before);
  });

  it('denied paths: role=admin or an off-site next never starts an attempt; a callback with GitHub off-cycle never 500s', async () => {
    for (const query of [
      '?role=admin',
      '?role=mentee',
      '?next=https%3A%2F%2Fevil.example%2F',
      '?next=%2F%2Fevil.example',
    ]) {
      const res = await get(`/api/auth/github/start${query}`);
      expect(res.status, query).toBe(302);
      expect(res.headers.get('location'), query).toBe('/sign-in?error=invalid_request');
      expect(res.headers.getSetCookie(), query).toEqual([]);
    }
    const stray = await get('/api/auth/github/callback');
    expect(stray.status).toBe(303);
    expect(stray.headers.get('location')).toBe('/sign-in?error=github_failed');
    expect(psql("select count(*) from users where role = 'admin'")).toBe('0');
    browser.open(`${prodUrl()}/sign-in?error=invalid_request`);
    browser.waitForText('That sign-in request was not valid');
    browser.screenshot('github-invalid-request');
  });
});
