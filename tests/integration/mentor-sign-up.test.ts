import { readFileSync } from 'node:fs';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { createBrowser } from './browser';
import { prodOutbox, prodUrl, psql } from './env';

/**
 * E01 Phase 3 — #26 (E01-S01): a mentor signs up by e-mail link and reaches profile setup without
 * giving payout details; an e-mail already in use signs in to its account unchanged. Runs against the
 * production server (`next start`: real cookie sessions, no dev admin). Runs after `auth.test.ts`
 * (alphabetical) and before `app.test.ts` (which stops the database); cleans up its own rows.
 */
const browser = createBrowser('mentor-sign-up');
const CSRF = { 'x-mentorhub-request': '1' };
const NOTICE = 'An account with this e-mail already exists — you are signed in to it; its role was not changed.';
const NO_BANK_DETAILS = 'No bank details needed until someone books you.';
const PROFILE = '/mentor/profile';

const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(`${prodUrl()}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...CSRF, ...headers },
    body: JSON.stringify(body),
  });
const requestLink = (email: string, intentRole?: 'mentor') =>
  post('/api/auth/email/start', { email, ...(intentRole ? { intentRole } : {}) });

/** The sign-in link from the last outbox message to `email` (what the person would click). */
function linkFor(email: string): string {
  const messages = readFileSync(prodOutbox(), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { to: string; text: string });
  const last = messages.filter((m) => m.to === email).at(-1);
  expect(last, `outbox message for ${email}`).toBeDefined();
  return last!.text.match(/https?:\/\/\S+/)![0];
}
const tokenOf = (link: string) => new URL(link).searchParams.get('token')!;
const cookieOf = (res: Response) => res.headers.get('set-cookie')!.split(';')[0]!;
const userRow = (email: string) =>
  psql(`select id, role, email_verified_at is not null from users where email = '${email}'`);
const usersCount = () => Number(psql('select count(*) from users'));

/** Drives the browser through the sign-up page and the link from the outbox up to the confirm button. */
function signUpAsMentor(email: string) {
  browser.open(`${prodUrl()}/sign-up/mentor`);
  browser.waitForText(NO_BANK_DETAILS);
  browser.fill('#email', email);
  browser.click('main button[type=submit]');
  browser.waitForText('Check your inbox');
  expect(new URL(browser.url()).searchParams.get('role')).toBe('mentor'); // a resend keeps the intent
  browser.open(linkFor(email));
  browser.waitForText(`Sign in as ${email}?`);
  browser.click('main button');
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

describe('mentor sign-up (#26, production server)', () => {
  it('AC1: a visitor who completes the mentor sign-up lands on profile setup with the mentor role', () => {
    const before = usersCount();
    browser.screenshot('sign-up-mentor');
    signUpAsMentor('newmentor@example.com');
    browser.waitForText('Set up your mentor profile');
    browser.screenshot('mentor-profile');
    expect(browser.url()).toBe(`${prodUrl()}${PROFILE}`);
    expect(browser.text('[data-slot=account-name]')).toBe('newmentor@example.com'); // no name yet → e-mail
    expect(userRow('newmentor@example.com')).toMatch(/\|mentor\|t$/);
    expect(usersCount()).toBe(before + 1);
    expect(browser.count('[data-slot=account-notice]')).toBe(0); // a new account: no notice
  });

  it('AC2 (R07): the onboarding shown to the new mentor has no step or field for bank or payout details', () => {
    browser.open(`${prodUrl()}${PROFILE}`);
    browser.waitForText('Set up your mentor profile');
    expect(browser.count('main input, main select, main textarea, main form')).toBe(0);
    expect(browser.text('main')).not.toMatch(/payout|bank|iban|stripe|card|billing/i);
    expect(browser.text('main')).toContain('E02-S01'); // a placeholder, and it says so
  });

  it('AC3: signing up as a mentor with an e-mail in use signs in to that account, unchanged, with the notice', () => {
    // An existing mentee (created like any sign-in), then a mentor sign-up with the same e-mail.
    psql(
      "insert into users (id, email, name, role, created_at, updated_at) values (gen_random_uuid(), 'taken@example.com', 'Taken', 'mentee', now(), now())",
    );
    const [id, before] = [userRow('taken@example.com').split('|')[0], usersCount()];
    signUpAsMentor('taken@example.com');
    browser.waitForText(NOTICE);
    browser.screenshot('existing-account-notice');
    expect(browser.url()).toBe(`${prodUrl()}/?notice=existing_account`); // a mentee's landing page
    expect(browser.text('[data-slot=account-notice]')).toBe(NOTICE);
    expect(browser.text('[data-slot=session-user]')).toBe('Taken'); // signed in to the existing account
    expect(userRow('taken@example.com')).toBe(`${id}|mentee|t`); // same account, role unchanged, now verified
    expect(usersCount()).toBe(before); // no second account
  });

  it('AC3 for an existing mentor: the notice lands on profile setup and is shown once (gone on reload)', async () => {
    const before = usersCount();
    signUpAsMentor('newmentor@example.com');
    browser.waitForText(NOTICE);
    browser.screenshot('existing-mentor-notice');
    expect(browser.url()).toBe(`${prodUrl()}${PROFILE}?notice=existing_account`);
    expect(browser.text('main h1')).toBe('Set up your mentor profile');
    expect(userRow('newmentor@example.com')).toMatch(/\|mentor\|t$/);
    expect(usersCount()).toBe(before);
    browser.open(`${prodUrl()}${PROFILE}`);
    browser.waitForText('Set up your mentor profile');
    expect(browser.count('[data-slot=account-notice]')).toBe(0); // only the parameter carries the notice
    // The consume response itself names the landing path, so any client lands the same way.
    // A validated next with dot segments stays exactly as issued: never normalised to `//evil.example` (PR #47 review).
    const dotted = '/a/..//evil.example';
    const start = await post('/api/auth/email/start', {
      email: 'newmentor@example.com',
      intentRole: 'mentor',
      next: dotted,
    });
    expect(start.status).toBe(200);
    const res = await post('/api/auth/email/consume', { token: tokenOf(linkFor('newmentor@example.com')) });
    expect(await res.json()).toEqual({ ok: true, data: { next: `${dotted}?notice=existing_account` } });
    expect(userRow('newmentor@example.com')).toMatch(/\|mentor\|t$/);
    // A next that already carries a notice key: the API answers one authoritative notice, and the page shows it.
    // (A seeded mentor: newmentor@ has used its 3 links per 15 minutes.)
    psql(
      "insert into users (id, email, name, role, created_at, updated_at) values (gen_random_uuid(), 'seeded@example.com', 'Seeded', 'mentor', now(), now())",
    );
    const stale = await post('/api/auth/email/start', {
      email: 'seeded@example.com',
      intentRole: 'mentor',
      next: `${PROFILE}?notice=bad`,
    });
    expect(stale.status).toBe(200);
    const res2 = await post('/api/auth/email/consume', { token: tokenOf(linkFor('seeded@example.com')) });
    expect(await res2.json()).toEqual({ ok: true, data: { next: `${PROFILE}?notice=existing_account` } });
    browser.open(`${prodUrl()}${PROFILE}?notice=existing_account`); // the mentor's browser session from above
    browser.waitForText(NOTICE);
    expect(browser.text('[data-slot=account-notice]')).toBe(NOTICE);
  });

  it('no enumeration: the start response and the check-email page are the same for a known and an unknown e-mail', async () => {
    const known = await requestLink('taken@example.com', 'mentor');
    const unknown = await requestLink('nobody@example.com', 'mentor');
    expect([known.status, unknown.status]).toEqual([200, 200]);
    expect(await known.json()).toEqual(await unknown.json());
    expect(psql("select count(*) from users where email = 'nobody@example.com'")).toBe('0');
    for (const email of ['taken@example.com', 'nobody@example.com']) {
      browser.open(`${prodUrl()}/check-email?email=${encodeURIComponent(email)}&role=mentor`);
      browser.waitForText('Check your inbox');
      expect(browser.text('main h1')).toBe('Check your inbox');
      expect(browser.count('main button')).toBe(1);
    }
  });

  it('denied paths: a mentee session is refused on /mentor/profile, no session is sent to sign-in', async () => {
    // The browser: sign in as the mentee with the (unused) link from the previous test, then open the page.
    browser.open(linkFor('taken@example.com'));
    browser.waitForText('Sign in as taken@example.com?');
    browser.click('main button');
    browser.waitForText('Sign out');
    browser.open(`${prodUrl()}${PROFILE}`);
    browser.waitForText('Mentor account required');
    browser.screenshot('mentor-profile-refused');
    expect(browser.count('[data-slot=account-name]')).toBe(0);
    // Over HTTP: the same with a cookie from the API, and the redirect without one.
    expect((await requestLink('taken@example.com')).status).toBe(200);
    const cookie = cookieOf(await post('/api/auth/email/consume', { token: tokenOf(linkFor('taken@example.com')) }));
    const asMentee = await fetch(`${prodUrl()}${PROFILE}`, { headers: { cookie } });
    const html = await asMentee.text();
    expect(html).toContain('Mentor account required');
    expect(html).not.toContain('Set up your mentor profile');
    const anonymous = await fetch(`${prodUrl()}${PROFILE}`, { redirect: 'manual' });
    expect(anonymous.status).toBe(307);
    const location = new URL(anonymous.headers.get('location')!, prodUrl());
    expect(location.pathname).toBe('/sign-in');
    expect(location.searchParams.get('next')).toBe(PROFILE);
  });
});
