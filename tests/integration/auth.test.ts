import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { promisify } from 'node:util';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { createBrowser } from './browser';
import { databaseUrl, devOutbox, devUrl, holdTransaction, prodOutbox, prodUrl, psql } from './env';

const run = promisify(execFile);
/** Signed-in cookie for `email` through the real link flow (one link per call). */
async function signIn(base: string, outbox: string, email: string): Promise<string> {
  expect((await requestLink(base, email)).status).toBe(200);
  return cookieOf(await post(base, '/api/auth/email/consume', { token: tokenOf(linkFor(outbox, email)) }));
}
const sessionVersion = (email: string) => psql(`select session_version from users where email = '${email}'`);
/** Lets a blocked statement reach the database before the held transaction commits. */
const settle = () => new Promise((r) => setTimeout(r, 750));
import { evidencePath } from './evidence';

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

  it('a sign-in between two revocations is ended as well: increments are atomic (review finding 3)', async () => {
    expect((await requestLink(prodUrl(), 'revoke@example.com')).status).toBe(200);
    const first = cookieOf(
      await post(prodUrl(), '/api/auth/email/consume', { token: tokenOf(linkFor(prodOutbox(), 'revoke@example.com')) }),
    );
    expect((await post(prodUrl(), '/api/auth/sign-out', { everywhere: true }, { cookie: first })).status).toBe(200);
    expect((await requestLink(prodUrl(), 'revoke@example.com')).status).toBe(200);
    const between = cookieOf(
      await post(prodUrl(), '/api/auth/email/consume', { token: tokenOf(linkFor(prodOutbox(), 'revoke@example.com')) }),
    );
    expect((await fetch(`${prodUrl()}/api/auth/me`, { headers: { cookie: between } })).status).toBe(200);
    expect((await post(prodUrl(), '/api/auth/sign-out', { everywhere: true }, { cookie: between })).status).toBe(200);
    expect(psql("select session_version from users where email = 'revoke@example.com'")).toBe('2');
    expect((await fetch(`${prodUrl()}/api/auth/me`, { headers: { cookie: between } })).status).toBe(401);
    expect((await fetch(`${prodUrl()}/api/auth/me`, { headers: { cookie: first } })).status).toBe(401);
  });

  it('an overlapping revocation on real PostgreSQL loses nothing: a held UPDATE + the API bump → +2 (review round 2, finding 2)', async () => {
    const cookie = await signIn(prodUrl(), prodOutbox(), 'overlap@example.com');
    expect(sessionVersion('overlap@example.com')).toBe('0');
    // Another revocation, mid-flight and uncommitted: the API's UPDATE blocks on the row lock until it commits.
    const held = await holdTransaction(
      "update users set session_version = session_version + 1 where email = 'overlap@example.com'",
      'UPDATE 1',
    );
    const revocation = post(prodUrl(), '/api/auth/sign-out', { everywhere: true }, { cookie });
    await settle();
    expect(sessionVersion('overlap@example.com')).toBe('0'); // still blocked: nothing committed yet
    await held.commit();
    expect((await revocation).status).toBe(200);
    // A read-then-write would have written the stale "0 + 1" over the held transaction's increment.
    expect(sessionVersion('overlap@example.com')).toBe('2');
    expect((await fetch(`${prodUrl()}/api/auth/me`, { headers: { cookie } })).status).toBe(401);
  });

  it('make set-role overlapping a revocation keeps both increments and the new role (review round 2, finding 2)', async () => {
    const cookie = await signIn(prodUrl(), prodOutbox(), 'promote@example.com');
    const held = await holdTransaction(
      "update users set session_version = session_version + 1 where email = 'promote@example.com'",
      'UPDATE 1',
    );
    const cli = run('pnpm', ['--silent', '--filter', '@mentorhub/db', 'set-role', 'promote@example.com', 'mentor'], {
      env: { ...process.env, DATABASE_URL: databaseUrl() },
    });
    await settle();
    expect(psql("select role from users where email = 'promote@example.com'")).toBe('mentee'); // CLI still blocked
    await held.commit();
    const { stdout } = await cli;
    expect(stdout).toContain('promote@example.com: mentee → mentor (session version 2;');
    expect(psql("select role, session_version from users where email = 'promote@example.com'")).toBe('mentor|2');
    expect((await fetch(`${prodUrl()}/api/auth/me`, { headers: { cookie } })).status).toBe(401);
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

  it('rejects a return path with control characters or an off-site target (422, review finding 1)', async () => {
    for (const next of [
      '/\t/evil.example',
      '/\n/evil.example',
      '/\r\n/evil.example',
      '//evil.example',
      '/\\evil.example',
      'https://evil.example/',
      '/ok\n', // a trailing line terminator slipped past an anchored `$` (review round 2, finding 3)
      '/ok\r',
    ]) {
      const res = await post(prodUrl(), '/api/auth/email/start', { email: 'redirect@example.com', next });
      expect(res.status, JSON.stringify(next)).toBe(422);
      expect(
        ((await res.json()) as { error: { fieldErrors: Record<string, string[]> } }).error.fieldErrors,
      ).toHaveProperty('next');
    }
    expect(psql("select count(*) from auth_tokens where email = 'redirect@example.com'")).toBe('0');
  });

  it('the per-IP limit holds under concurrent requests for different e-mails (real PostgreSQL, review finding 2)', async () => {
    const ip = { 'x-forwarded-for': '198.51.100.77' }; // its own bucket, untouched by the other tests
    const burst = 26;
    const results = await Promise.all(
      Array.from({ length: burst }, (_, i) =>
        post(prodUrl(), '/api/auth/email/start', { email: `burst${i}@example.com` }, ip),
      ),
    );
    const statuses = results.map((r) => r.status);
    expect(statuses.filter((s) => s === 200)).toHaveLength(20);
    expect(statuses.filter((s) => s === 429)).toHaveLength(burst - 20);
    expect(psql("select count(*) from auth_tokens where email like 'burst%@example.com'")).toBe('20');
    const sent = readFileSync(prodOutbox(), 'utf8')
      .split('\n')
      .filter((line) => line.includes('"to":"burst'));
    expect(sent).toHaveLength(20);
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
    // A present cookie that cannot be trusted is 401, never the dev admin (review finding 4) — an EMPTY one too (round 2, finding 1).
    expect((await fetch(`${devUrl()}/api/auth/me`, { headers: { cookie: 'mh_session=garbage' } })).status).toBe(401);
    expect((await fetch(`${devUrl()}/api/auth/me`, { headers: { cookie: 'mh_session=' } })).status).toBe(401);
    expect((await fetch(`${devUrl()}/api/users`, { headers: { cookie: 'mh_session=' } })).status).toBe(401);
    expect((await fetch(`${devUrl()}/api/users`, { headers: { cookie: 'other=1; mh_session=; x=2' } })).status).toBe(
      401,
    );
    psql("update users set session_version = session_version + 1 where email = 'dev@example.com'");
    expect((await fetch(`${devUrl()}/api/auth/me`, { headers: { cookie } })).status).toBe(401);
    expect((await fetch(`${devUrl()}/api/users`, { headers: { cookie } })).status).toBe(401);
  });

  it('never prints a sign-in token in the dev server output (review finding 5)', async () => {
    expect((await requestLink(devUrl(), 'logged@example.com')).status).toBe(200);
    const link = linkFor(devOutbox(), 'logged@example.com');
    browser.open(link);
    browser.waitForText('Sign in as logged@example.com?');
    await fetch(link); // a plain GET too, like a mail scanner
    await new Promise((r) => setTimeout(r, 1000)); // let the request logger flush
    const log = readFileSync(evidencePath('server-dev.log'), 'utf8');
    expect(log).toMatch(/GET \/sign-in /); // request logging is on: the filter, not silence, keeps the token out
    expect(log).not.toContain(tokenOf(link));
    expect(log).not.toContain('token=');
    expect(log).not.toMatch(/GET \/auth\/confirm\?/);
  });

  it('shows the dev admin as such in the admin header', () => {
    browser.open(`${devUrl()}/admin`);
    browser.waitForText('Dev admin — local only');
    browser.screenshot('admin-dev-session');
  });
});
