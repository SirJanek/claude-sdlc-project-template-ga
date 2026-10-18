import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createBrowser } from './browser';
import { devUrl, prodUrl, psql, stopDatabase } from './env';

const browser = createBrowser('app');
const CSRF = { 'x-mentorhub-request': '1' };

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

  it('redirects /admin to /admin/users and lists the seeded users in the DataTable', () => {
    browser.open(`${devUrl()}/admin`);
    browser.waitForText('Ops Admin');
    browser.screenshot('admin-users');
    expect(browser.url()).toBe(`${devUrl()}/admin/users`);
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

  it('rejects writes without the CSRF header and unconfigured methods', async () => {
    expect((await fetch(`${devUrl()}/api/users`, { method: 'POST' })).status).toBe(403);
    expect((await fetch(`${devUrl()}/api/users`, { method: 'POST', headers: CSRF })).status).toBe(405);
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
  });
});
