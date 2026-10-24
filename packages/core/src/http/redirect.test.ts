import { describe, expect, it } from 'vitest';
import { redirectResponse } from './redirect';

describe('redirectResponse', () => {
  it('builds a bodiless redirect with a relative Location and one Set-Cookie header per cookie', async () => {
    const res = redirectResponse({
      status: 303,
      location: '/mentor/profile',
      cookies: ['a=1; Path=/', 'b=; Max-Age=0'],
    });
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/mentor/profile');
    expect(res.headers.getSetCookie()).toEqual(['a=1; Path=/', 'b=; Max-Age=0']);
    expect(await res.text()).toBe('');
  });

  it('sets no cookie when there is none to set', () => {
    const res = redirectResponse({
      status: 302,
      location: 'https://github.com/login/oauth/authorize?x=1',
      cookies: [],
    });
    expect(res.status).toBe(302);
    expect(res.headers.getSetCookie()).toEqual([]);
  });
});
