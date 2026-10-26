import { readFileSync } from 'node:fs';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { createBrowser } from './browser';
import { prodOutbox, prodUrl, psql } from './env';

/**
 * E01 Phase 4 — #27 (E01-S02, AC1): a visitor without a session opens a page with a `?slot=` query,
 * goes through sign-in, takes the link from the mail outbox and lands on the EXACT same URL (path and
 * query) with a verified session. Runs against the production server (`next start`: real cookie
 * sessions). `/mentor/profile` is the only page with a session guard today; it stands in for the
 * mentor booking page that E03 adds. Cleans up its own rows.
 */
const browser = createBrowser('mentee-return');
const EMAIL = 'returning-mentee@example.com';
// Percent-encoded colon and slash in the query, so the test also proves the bytes survive unchanged.
const SLOT_PATH = '/mentor/profile?slot=2026-11-03T10%3A00&tz=Europe%2FWarsaw';

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

/** Polls the browser's URL until it differs from `from` (a click that assigns `window.location`), bounded. */
async function untilUrlChanges(from: string, attempts = 60): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    if (browser.url() !== from) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

afterEach(({ task }) => {
  if (task.result?.state === 'fail') browser.screenshot(`FAILED-${task.name}`);
});

afterAll(() => {
  browser.close();
  psql(`delete from users where email = '${EMAIL}'`);
  psql(`delete from auth_tokens where email = '${EMAIL}'`);
});

describe('returning to the slot after sign-in (#27, production server)', () => {
  it('AC1: a signed-out visitor of ?slot= signs in by the outbox link and lands on the exact same URL, verified', async () => {
    // 1. Without a session the page sends the visitor to sign-in, carrying the full path and query.
    browser.open(`${prodUrl()}${SLOT_PATH}`);
    browser.waitForText('Send me a sign-in link');
    const signIn = new URL(browser.url());
    expect(signIn.pathname).toBe('/sign-in');
    expect(signIn.searchParams.get('next')).toBe(SLOT_PATH);
    browser.screenshot('sign-in-with-next');

    // 2. The e-mail link is sent; the person opens it from the outbox and presses the confirm button.
    browser.fill('#email', EMAIL);
    browser.click('main button[type=submit]');
    browser.waitForText('Check your inbox');
    browser.open(linkFor(EMAIL));
    browser.waitForText(`Sign in as ${EMAIL}?`);
    const confirmUrl = browser.url();
    browser.click('main button');

    // 3. The visitor lands on the same URL, byte for byte (path and query). Wait for the page to leave the
    // confirm page first, so a wrong landing fails on the URL and not on a content timeout.
    await untilUrlChanges(confirmUrl);
    expect(browser.url()).toBe(`${prodUrl()}${SLOT_PATH}`);
    browser.waitForText('Mentor account required'); // the mentee has no mentor role here: content is refused, URL is what matters
    browser.screenshot('landed-on-slot');

    // 4. The session is verified: the account is the one that signed in, and the e-mail is proven.
    browser.open(`${prodUrl()}/api/auth/me`);
    expect(JSON.parse(browser.text('body'))).toMatchObject({
      ok: true,
      data: { email: EMAIL, role: 'mentee', emailVerified: true },
    });
    expect(psql(`select email_verified_at is not null from users where email = '${EMAIL}'`)).toBe('t');
  });
});
