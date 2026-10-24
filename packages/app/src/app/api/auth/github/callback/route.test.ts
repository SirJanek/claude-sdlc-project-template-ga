// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const core = vi.hoisted(() => ({ callback: vi.fn() }));
vi.mock('@mentorhub/core', async (original) => {
  const real = await original<typeof import('@mentorhub/core')>();
  return {
    ...real,
    withScope: (fn: (cradle: unknown) => Promise<unknown>) => fn({ githubSignIn: { callback: core.callback } }),
  };
});

import { GET, dynamic } from './route';

const context = { params: Promise.resolve({}) };
const CLEARED = 'mh_github=; Path=/api/auth/github; HttpOnly; SameSite=Lax; Max-Age=0';
const get = (query: string, cookie?: string) =>
  GET(
    new Request(`http://x/api/auth/github/callback${query}`, { headers: cookie === undefined ? {} : { cookie } }),
    context,
  );

beforeEach(() => {
  core.callback.mockReset().mockResolvedValue({
    status: 303,
    location: '/mentor/profile',
    cookies: [CLEARED, 'mh_session=jwt; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800'],
  });
});

describe('GET /api/auth/github/callback', () => {
  it('renders per request', () => {
    expect(dynamic).toBe('force-dynamic');
  });

  it('hands the query and the state cookie (only that cookie) to the flow and sets both cookies it returns', async () => {
    const res = await get('?code=c&state=s', 'mh_session=old; mh_github=tok');
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/mentor/profile');
    expect(res.headers.getSetCookie()).toEqual([
      CLEARED,
      'mh_session=jwt; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800',
    ]);
    const [query, stateCookie] = core.callback.mock.calls[0] as [URLSearchParams, string | undefined];
    expect(Object.fromEntries(query)).toEqual({ code: 'c', state: 's' });
    expect(stateCookie).toBe('tok');
  });

  it('passes an absent cookie as undefined and an empty one as "" — the flow decides, never the route', async () => {
    core.callback.mockResolvedValue({ status: 303, location: '/sign-in?error=github_failed', cookies: [CLEARED] });
    const absent = await get('?code=c&state=s');
    expect(absent.status).toBe(303);
    expect(absent.headers.get('location')).toBe('/sign-in?error=github_failed');
    expect(absent.headers.getSetCookie()).toEqual([CLEARED]);
    await get('?code=c&state=s', 'mh_github=');
    expect(core.callback.mock.calls.map((call) => call[1])).toEqual([undefined, '']);
  });
});
