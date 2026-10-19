// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const core = vi.hoisted(() => ({ start: vi.fn() }));
vi.mock('@mentorhub/core', async (original) => {
  const real = await original<typeof import('@mentorhub/core')>();
  return {
    ...real,
    withScope: (fn: (cradle: unknown) => Promise<unknown>) => fn({ githubSignIn: { start: core.start } }),
  };
});

import { GET, dynamic } from './route';

const context = { params: Promise.resolve({}) };
const get = (query: string) => GET(new Request(`http://x/api/auth/github/start${query}`), context);

beforeEach(() => {
  core.start.mockReset().mockResolvedValue({
    status: 302,
    location: 'https://github.com/login/oauth/authorize?state=s',
    cookies: ['mh_github=tok; Path=/api/auth/github; HttpOnly; SameSite=Lax; Max-Age=600'],
  });
});

describe('GET /api/auth/github/start', () => {
  it('renders per request', () => {
    expect(dynamic).toBe('force-dynamic');
  });

  it('hands the query to the flow and answers its redirect with the state cookie', async () => {
    const res = await get('?role=mentor&next=%2Fmentors%2F7');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('https://github.com/login/oauth/authorize?state=s');
    expect(res.headers.getSetCookie()).toEqual([
      'mh_github=tok; Path=/api/auth/github; HttpOnly; SameSite=Lax; Max-Age=600',
    ]);
    expect(await res.text()).toBe('');
    const query = core.start.mock.calls[0]![0] as URLSearchParams;
    expect(Object.fromEntries(query)).toEqual({ role: 'mentor', next: '/mentors/7' });
  });

  it("answers the flow's refusal (invalid_request) as a redirect without a cookie", async () => {
    core.start.mockResolvedValueOnce({ status: 302, location: '/sign-in?error=invalid_request', cookies: [] });
    const res = await get('?role=admin');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/sign-in?error=invalid_request');
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it('is a GET: a POST is rejected before the flow runs', async () => {
    const res = await GET(new Request('http://x/api/auth/github/start', { method: 'POST' }), context);
    expect(res.status).toBe(403);
    expect(core.start).not.toHaveBeenCalled();
  });
});
