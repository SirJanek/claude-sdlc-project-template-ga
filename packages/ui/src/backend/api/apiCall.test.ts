import { describe, expect, it } from 'vitest';
import { apiCall, apiCallOrThrow, readJsonSafe } from './apiCall';
import { REQUEST_HEADER } from './types';

const respond =
  (body: string, status = 200) =>
  async () =>
    new Response(body, { status });

describe('readJsonSafe', () => {
  it('returns undefined for empty or non-JSON bodies instead of throwing', async () => {
    await expect(readJsonSafe(new Response(''))).resolves.toBeUndefined();
    await expect(readJsonSafe(new Response('<html>oops</html>'))).resolves.toBeUndefined();
    await expect(readJsonSafe(new Response('{"a":1}'))).resolves.toEqual({ a: 1 });
  });
});

describe('apiCall', () => {
  it('returns data from a success envelope and sends the CSRF header', async () => {
    let sent: Headers | undefined;
    const result = await apiCall<number[]>('/api/x', { method: 'POST', body: '{}' }, async (_url, init) => {
      sent = new Headers(init?.headers);
      return new Response('{"ok":true,"data":[1,2]}', { status: 200 });
    });
    expect(result).toEqual({ ok: true, data: [1, 2], status: 200 });
    expect(sent?.get(REQUEST_HEADER)).toBe('1');
    expect(sent?.get('content-type')).toBe('application/json');
  });

  it('passes through the server error with field errors', async () => {
    const body =
      '{"ok":false,"error":{"code":"validation_failed","message":"Invalid","fieldErrors":{"email":["Required"]}}}';
    await expect(apiCall('/api/x', {}, respond(body, 422))).resolves.toEqual({
      ok: false,
      status: 422,
      error: { code: 'validation_failed', message: 'Invalid', fieldErrors: { email: ['Required'] } },
    });
  });

  it('turns network failures and malformed bodies into errors, never throws', async () => {
    const offline = await apiCall('/api/x', {}, async () => Promise.reject(new TypeError('Failed to fetch')));
    expect(offline).toMatchObject({ ok: false, status: 0, error: { code: 'network_error' } });
    const html = await apiCall('/api/x', {}, respond('<html>502</html>', 502));
    expect(html).toMatchObject({ ok: false, status: 502, error: { code: 'invalid_response' } });
  });

  it('apiCallOrThrow throws ApiCallError with code and status', async () => {
    const body = '{"ok":false,"error":{"code":"unauthorized","message":"Sign-in required."}}';
    await expect(apiCallOrThrow('/api/x', {}, respond(body, 401))).rejects.toMatchObject({
      code: 'unauthorized',
      status: 401,
    });
  });
});
