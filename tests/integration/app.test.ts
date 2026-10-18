import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createBrowser } from './browser';
import { devUrl, prodUrl, psql, stopDatabase } from './env';

const browser = createBrowser('app');
const CSRF = { 'x-mentorhub-request': '1' };
const CURRENT_LINK = 'nav[aria-label=Admin] a[aria-current=page]';
const create = (base: string, body: unknown, headers: Record<string, string> = CSRF) =>
  fetch(`${base}/api/users`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

beforeAll(() => {
  psql(
    'insert into users (id, email, name, role, created_at, updated_at) values ' +
      "(gen_random_uuid(), 'anna@example.com', 'Anna Wiśniewska', 'mentor', now(), now()), " +
      "(gen_random_uuid(), 'ops@example.com', 'Ops Admin', 'admin', now() + interval '1 second', now())",
  );
});

// A screenshot of the page at the moment a test fails — the most useful evidence of all.
afterEach(({ task }) => {
  if (task.result?.state === 'fail') browser.screenshot(`FAILED-${task.name}`);
});

afterAll(() => {
  browser.close();
});

describe('MentorHub app (ephemeral PostgreSQL)', () => {
  it('renders the public landing page', () => {
    browser.open(`${devUrl()}/`);
    browser.screenshot('landing');
    expect(browser.text('h1')).toBe('Grow faster with a mentor who has done it before');
  });

  it('shows the Dashboard on /admin with the database connected and the nav marking the current page', () => {
    browser.open(`${devUrl()}/admin`);
    browser.waitForText('Connected');
    browser.screenshot('admin-dashboard');
    expect(browser.url()).toBe(`${devUrl()}/admin`);
    expect(browser.text('h1')).toBe('Admin · Dashboard');
    expect(browser.count(CURRENT_LINK)).toBe(1);
    expect(browser.text(CURRENT_LINK)).toBe('Dashboard');
  });

  it('navigates from the Dashboard to Users and lists the seeded users in the DataTable', () => {
    browser.open(`${devUrl()}/admin`);
    browser.waitForText('Connected');
    browser.click('nav[aria-label=Admin] a[href="/admin/users"]');
    browser.waitForText('Ops Admin');
    browser.screenshot('admin-users');
    expect(browser.url()).toBe(`${devUrl()}/admin/users`);
    expect(browser.count(CURRENT_LINK)).toBe(1);
    expect(browser.text(CURRENT_LINK)).toBe('Users');
    expect(browser.count('[data-slot=data-table] tbody tr')).toBe(2);
    expect(browser.text('[data-slot=data-table] tbody tr:first-child td:nth-child(2)')).toBe('ops@example.com');
  });

  it('serves /api/users as the JSON envelope with the dev flag', async () => {
    const res = await fetch(`${devUrl()}/api/users`);
    const body = (await res.json()) as { ok: boolean; data: { email: string }[] };
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.map((u) => u.email)).toEqual(['ops@example.com', 'anna@example.com']);
  });

  it('rejects writes without the CSRF header and unconfigured methods (PUT)', async () => {
    expect((await fetch(`${devUrl()}/api/users`, { method: 'POST' })).status).toBe(403);
    expect((await fetch(`${devUrl()}/api/users`, { method: 'PUT', headers: CSRF })).status).toBe(405);
  });

  it('creates a user as admin; it shows up in the list and on /admin/users', async () => {
    const res = await create(devUrl(), { email: ' Dana@Example.com ', name: 'Dana Kowalska', role: 'mentor', id: 'x' });
    const body = (await res.json()) as { ok: boolean; data: { id: string; email: string; role: string } };
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data).toMatchObject({ email: 'dana@example.com', name: 'Dana Kowalska', role: 'mentor' });
    expect(body.data.id).not.toBe('x');
    const list = (await (await fetch(`${devUrl()}/api/users`)).json()) as { data: { email: string }[] };
    expect(list.data.map((u) => u.email)).toContain('dana@example.com');
    browser.open(`${devUrl()}/admin/users`);
    browser.waitForText('Dana Kowalska');
    browser.screenshot('admin-users-created');
  });

  it('defaults the role to mentee', async () => {
    const res = await create(devUrl(), { email: 'eve@example.com', name: 'Eve' });
    expect(((await res.json()) as { data: { role: string } }).data.role).toBe('mentee');
  });

  it('answers 422 validation_failed with fieldErrors for an invalid body', async () => {
    const res = await create(devUrl(), { email: 'nope', name: '' });
    const body = (await res.json()) as { error: { code: string; fieldErrors: Record<string, string[]> } };
    expect(res.status).toBe(422);
    expect(body.error.code).toBe('validation_failed');
    expect(Object.keys(body.error.fieldErrors).sort()).toEqual(['email', 'name']);
  });

  it('answers 409 conflict for a duplicate email, whatever its case, and stores nothing twice', async () => {
    const res = await create(devUrl(), { email: 'DANA@example.com', name: 'Another Dana' });
    expect(res.status).toBe(409);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('conflict');
    expect(psql("select count(*) from users where email = 'dana@example.com'").trim()).toBe('1');
  });

  it('denies creating a user without the CSRF header (403) or without a session (401)', async () => {
    expect((await create(devUrl(), { email: 'x@example.com', name: 'X' }, {})).status).toBe(403);
    expect((await create(prodUrl(), { email: 'x@example.com', name: 'X' })).status).toBe(401);
    expect(psql("select count(*) from users where email = 'x@example.com'").trim()).toBe('0');
  });

  it('serves the admin health report in the envelope, and denies it in production', async () => {
    const res = await fetch(`${devUrl()}/api/admin/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: { status: 'ok', db: 'up' } });
    expect((await fetch(`${prodUrl()}/api/admin/health`)).status).toBe(401);
  });

  it('fails closed in production even with ALLOW_DEV_ADMIN=1', async () => {
    const res = await fetch(`${prodUrl()}/api/users`);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, error: { code: 'unauthorized', message: 'Sign-in required.' } });
  });

  it('reports a healthy database on both servers', async () => {
    for (const base of [devUrl(), prodUrl()]) {
      const res = await fetch(`${base}/api/health`);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ status: 'ok', db: 'up' });
    }
  });

  it('shows the empty state when there are no users', () => {
    psql('delete from users');
    browser.open(`${devUrl()}/admin/users`);
    browser.waitForText('No users yet.');
    browser.screenshot('admin-users-empty');
    expect(browser.count('[data-slot=data-table]')).toBe(0);
  });

  // Keep last: it stops the shared database.
  it('reports 503 and shows the error state when the database goes down', async () => {
    stopDatabase();
    const res = await fetch(`${devUrl()}/api/health`);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ status: 'degraded', db: 'down' });
    browser.open(`${devUrl()}/admin/users`);
    browser.waitForText('Something went wrong. Please try again.');
    browser.screenshot('admin-users-db-down');
    expect(browser.text('[role=alert]')).toContain('Try again');
    browser.open(`${devUrl()}/admin`);
    browser.waitForText('Database unreachable');
    browser.screenshot('admin-dashboard-db-down');
    expect((await fetch(`${devUrl()}/api/admin/health`)).status).toBe(200);
    expect(browser.text(CURRENT_LINK)).toBe('Dashboard');
  });
});
