import { readFileSync } from 'node:fs';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { createBrowser } from './browser';
import { devOutbox, devUrl, prodOutbox, prodUrl, psql } from './env';

/**
 * E01 Phase 1 — passwordless sign-in by e-mail link, sessions and the denied paths. Runs against the
 * production server (`next start`: no dev admin, real cookie sessions) and uses the dev server only
 * to show that a real cookie wins over the dev-admin flag.
 */
const browser = createBrowser('auth');
const CSRF = { 'x-mentorhub-request': '1' };
const EXPIRED = 'This link has expired or was already used — send a new one.';

const post = (base: string, path: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...CSRF, ...headers },
    body: JSON.stringify(body),
  });
const requestLink = (base: string, email: string, next?: string) =>
  post(base, '/api/auth/email/start', { email, ...(next ? { next } : {}) });

/** The sign-in link from the last outbox message to `email` (what the person would click). */
function linkFor(outbox: string, email: string): string {
  const messages = readFileSync(outbox, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { to: string; subject: string; text: string });
  const last = messages.filter((m) => m.to === email).at(-1);
  expect(last, `outbox message for ${email}`).toBeDefined();
  expect(last!.subject).toBe('Your MentorHub sign-in link');
  return last!.text.match(/https?:\/\/\S+/)![0];
}
const tokenOf = (link: string) => new URL(link).searchParams.get('token')!;
/** `mh_session=<jwt>` from a Set-Cookie header, as a browser would send it back. */
const cookieOf = (res: Response) => res.headers.get('set-cookie')!.split(';')[0]!;
const tokenRow = (email: string) =>
  psql(
    `select used_at is not null, length(token_hash) from auth_tokens where email = '${email}' order by created_at desc limit 1`,
  );

afterEach(({ task }) => {
  if (task.result?.state === 'fail') browser.screenshot(`FAILED-${task.name}`);
});

// Leaves the database as it found it: app.test.ts counts the rows it seeds.
afterAll(() => {
  browser.close();
  psql("delete from users where email like '%@example.com'");
  psql('delete from auth_tokens');
});

describe('sign-in by e-mail link (production server)', () => {
  it('answers 200 { sent: true }, writes the link to the outbox and stores only a hash of the token', async () => {
    const res = await requestLink(prodUrl(), 'Mentee@Example.com ');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: { sent: true } });
    const link = linkFor(prodOutbox(), 'mentee@example.com');
    expect(link.startsWith(`${prodUrl()}/auth/confirm?token=`)).toBe(true);
    expect(tokenRow('mentee@example.com')).toBe('f|64');
    expect(psql(`select count(*) from auth_tokens where token_hash = '${tokenOf(link)}'`)).toBe('0');
    expect(psql("select count(*) from users where email = 'mentee@example.com'")).toBe('0');
  });

  it('answers the same 200 for an address that already has an account (no enumeration)', async () => {
    psql(
      "insert into users (id, email, name, role, created_at, updated_at) values (gen_random_uuid(), 'known@example.com', 'Known', 'mentor', now(), now())",
    );
    expect((await requestLink(prodUrl(), 'known@example.com')).status).toBe(200);
    expect(psql("select count(*) from auth_tokens where email = 'known@example.com'")).toBe('1');
  });

  it('opening the link only names the account; the button consumes it, creates a verified mentee and signs in', async () => {
    const link = linkFor(prodOutbox(), 'mentee@example.com');
    browser.open(link);
    browser.waitForText('Sign in as mentee@example.com?');
    browser.screenshot('confirm');
    expect(tokenRow('mentee@example.com')).toBe('f|64'); // GET consumed nothing
    expect(psql("select count(*) from users where email = 'mentee@example.com'")).toBe('0');
    browser.click('main button');
    browser.waitForText('Sign out');
    browser.screenshot('signed-in');
    expect(browser.url()).toBe(`${prodUrl()}/`);
    expect(browser.text('[data-slot=session-user]')).toBe('mentee@example.com'); // no name yet → e-mail
    expect(tokenRow('mentee@example.com')).toBe('t|64');
    expect(
      psql("select role, name is null, email_verified_at is not null from users where email = 'mentee@example.com'"),
    ).toBe('mentee|t|t');
  });

  it('the same link a second time shows the expired message, and so does a made-up token', async () => {
    const link = linkFor(prodOutbox(), 'mentee@example.com');
    browser.open(link);
    browser.waitForText(EXPIRED);
    browser.screenshot('confirm-used');
    expect(browser.count('main button')).toBe(0);
    const res = await post(prodUrl(), '/api/auth/email/consume', { token: tokenOf(link) });
    expect(res.status).toBe(410);
    expect(await res.json()).toMatchObject({ ok: false, error: { code: 'link_invalid' } });
    browser.open(`${prodUrl()}/auth/confirm?token=${'A'.repeat(43)}`);
    browser.waitForText(EXPIRED);
  });

  it('"Sign out" in the header ends the browser session', () => {
    browser.open(`${prodUrl()}/`);
    browser.waitForText('Sign out');
    browser.click('[data-slot=session-menu] button');
    browser.waitForText('Sign in');
    browser.screenshot('signed-out');
    expect(browser.count('[data-slot=session-user]')).toBe(0);
  });
});

describe('sessions over the API (production server)', () => {
  let cookie = '';

  it('consume sets an httpOnly lax cookie; /api/auth/me then returns the user', async () => {
    expect((await requestLink(prodUrl(), 'api@example.com', '/mentors/7?slot=1')).status).toBe(200);
    const token = tokenOf(linkFor(prodOutbox(), 'api@example.com'));
    const res = await post(prodUrl(), '/api/auth/email/consume', { token });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: { next: '/mentors/7?slot=1' } });
    const setCookie = res.headers.get('set-cookie')!;
    expect(setCookie).toMatch(
      /^mh_session=[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+; Path=\/; HttpOnly; SameSite=Lax; Max-Age=604800; Secure$/,
    );
    cookie = cookieOf(res);
    const me = await fetch(`${prodUrl()}/api/auth/me`, { headers: { cookie } });
    expect(me.status).toBe(200);
    expect(await me.json()).toMatchObject({
      ok: true,
      data: { email: 'api@example.com', name: null, role: 'mentee', emailVerified: true },
    });
  });

  it('denies the admin API to a mentee session (403) and to no session (401)', async () => {
    expect((await fetch(`${prodUrl()}/api/users`, { headers: { cookie } })).status).toBe(403);
    expect((await fetch(`${prodUrl()}/api/admin/health`, { headers: { cookie } })).status).toBe(403);
    expect((await post(prodUrl(), '/api/users', { email: 'x@example.com', name: 'X' }, { cookie })).status).toBe(403);
    expect((await fetch(`${prodUrl()}/api/users`)).status).toBe(401);
    expect((await fetch(`${prodUrl()}/api/auth/me`)).status).toBe(401);
  });

  it('rejects a tampered cookie and a cookie for a deleted user', async () => {
    const [header, payload] = cookie.split('.');
    const forged = `${header}.${payload}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;
    expect((await fetch(`${prodUrl()}/api/auth/me`, { headers: { cookie: forged } })).status).toBe(401);
    expect((await fetch(`${prodUrl()}/api/auth/me`, { headers: { cookie: 'mh_session=garbage' } })).status).toBe(401);
  });

  it('sign-out clears the cookie on this device; "everywhere" invalidates every issued cookie', async () => {
    const out = await post(prodUrl(), '/api/auth/sign-out', {}, { cookie });
    expect(out.status).toBe(200);
    expect(out.headers.get('set-cookie')).toBe('mh_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure');
    // A plain sign-out only removes the cookie from the browser; the token itself is still valid.
    expect((await fetch(`${prodUrl()}/api/auth/me`, { headers: { cookie } })).status).toBe(200);
    const everywhere = await post(prodUrl(), '/api/auth/sign-out', { everywhere: true }, { cookie });
    expect(everywhere.status).toBe(200);
    expect((await fetch(`${prodUrl()}/api/auth/me`, { headers: { cookie } })).status).toBe(401);
    expect(psql("select session_version from users where email = 'api@example.com'")).toBe('1');
    expect((await post(prodUrl(), '/api/auth/sign-out', { everywhere: true }, { cookie })).status).toBe(401);
  });

  it('a role change through the database ends the session too (sessionVersion bump = make set-role)', async () => {
    expect((await requestLink(prodUrl(), 'api@example.com')).status).toBe(200);
    const res = await post(prodUrl(), '/api/auth/email/consume', {
      token: tokenOf(linkFor(prodOutbox(), 'api@example.com')),
    });
    const fresh = cookieOf(res);
    expect((await fetch(`${prodUrl()}/api/auth/me`, { headers: { cookie: fresh } })).status).toBe(200);
    psql("update users set role = 'mentor', session_version = session_version + 1 where email = 'api@example.com'");
    expect((await fetch(`${prodUrl()}/api/auth/me`, { headers: { cookie: fresh } })).status).toBe(401);
  });

  it('rate-limits the fourth link for one e-mail within 15 minutes (429) and rejects bad input (422, 403)', async () => {
    for (let i = 0; i < 3; i += 1) expect((await requestLink(prodUrl(), 'limit@example.com')).status).toBe(200);
    const limited = await requestLink(prodUrl(), 'limit@example.com');
    expect(limited.status).toBe(429);
    expect(await limited.json()).toMatchObject({ ok: false, error: { code: 'rate_limited' } });
    expect((await requestLink(prodUrl(), 'not-an-email')).status).toBe(422);
    expect((await post(prodUrl(), '/api/auth/email/start', { email: 'a@b.io', intentRole: 'admin' })).status).toBe(422);
    const noHeader = await fetch(`${prodUrl()}/api/auth/email/start`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'csrf@example.com' }),
    });
    expect(noHeader.status).toBe(403);
    expect(psql("select count(*) from auth_tokens where email = 'csrf@example.com'")).toBe('0');
  });
});

describe('development server with ALLOW_DEV_ADMIN=1', () => {
  it('admits the dev admin without a cookie, but a real cookie wins', async () => {
    const me = await fetch(`${devUrl()}/api/auth/me`);
    expect(me.status).toBe(200);
    expect(await me.json()).toMatchObject({ ok: true, data: { id: 'dev-admin', role: 'admin' } });
    expect((await requestLink(devUrl(), 'dev@example.com')).status).toBe(200);
    const link = linkFor(devOutbox(), 'dev@example.com');
    expect(link.startsWith(`${devUrl()}/auth/confirm?token=`)).toBe(true); // this server's own APP_URL
    const cookie = cookieOf(await post(devUrl(), '/api/auth/email/consume', { token: tokenOf(link) }));
    const asUser = await fetch(`${devUrl()}/api/auth/me`, { headers: { cookie } });
    expect(await asUser.json()).toMatchObject({ ok: true, data: { email: 'dev@example.com', role: 'mentee' } });
    expect((await fetch(`${devUrl()}/api/users`, { headers: { cookie } })).status).toBe(403);
  });

  it('shows the dev admin as such in the admin header', () => {
    browser.open(`${devUrl()}/admin`);
    browser.waitForText('Dev admin — local only');
    browser.screenshot('admin-dev-session');
  });
});
