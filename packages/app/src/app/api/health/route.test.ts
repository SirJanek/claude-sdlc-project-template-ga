// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

const check = vi.hoisted(() => vi.fn());
vi.mock('@mentorhub/core', () => ({
  apiHandler: (fn: () => Promise<Response>) => fn,
  getContainer: () => ({ cradle: { healthService: { check } } }),
}));

describe('/api/health route', () => {
  it('answers 200 with the report when the database is up', async () => {
    check.mockResolvedValue({ status: 'ok', db: 'up' });
    const { GET, dynamic } = await import('./route');
    expect(dynamic).toBe('force-dynamic');
    const res = await (GET as unknown as () => Promise<Response>)();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok', db: 'up' });
  });

  it('answers 503 when the database is down', async () => {
    check.mockResolvedValue({ status: 'degraded', db: 'down' });
    const { GET } = await import('./route');
    const res = await (GET as unknown as () => Promise<Response>)();
    expect(res.status).toBe(503);
  });
});
