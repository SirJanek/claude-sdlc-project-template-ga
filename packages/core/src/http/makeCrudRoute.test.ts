import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { Cradle } from '../container/cradle';
import { REQUEST_HEADER } from './apiHandler';
import { UnauthorizedError } from './errors';
import { makeCrudRoute } from './makeCrudRoute';

const withScopeMock = vi.hoisted(() => vi.fn());
vi.mock('../container/container', () => ({ withScope: withScopeMock }));

interface FakeService {
  items: string[];
  calls: unknown[][];
}

const ctx = (params: Record<string, string> = {}) => ({ params: Promise.resolve(params) });
const write = (method: string, url: string, body?: string) =>
  new Request(url, { method, headers: { [REQUEST_HEADER]: '1' }, body });

function make(authorize: (() => void) | 'public' | null = 'public', scoped = true) {
  const service: FakeService = { items: ['a', 'b'], calls: [] };
  const route = makeCrudRoute<FakeService, { name: string }, { name: string }>({
    service: () => service,
    list: async (s) => s.items,
    create: {
      schema: z.object({ name: z.string().min(1) }),
      run: async (s, input) => (s.calls.push(['create', input]), input),
    },
    update: {
      schema: z.object({ name: z.string().min(1) }),
      run: async (s, id, input) => (s.calls.push(['update', id, input]), { id, ...input }),
    },
    remove: async (s, id) => (s.calls.push(['remove', id]), { id }),
    authorize: authorize ?? undefined,
    ...(scoped ? { scope: (fn: (cradle: Cradle) => Promise<unknown>) => fn({} as Cradle) } : {}),
  } as Parameters<typeof makeCrudRoute<FakeService, { name: string }, { name: string }>>[0]);
  return { route, service };
}

beforeEach(() => {
  withScopeMock.mockReset();
  delete process.env.ALLOW_DEV_ADMIN;
});

describe('makeCrudRoute', () => {
  it('GET returns the list in the envelope', async () => {
    const res = await make().route.GET(new Request('http://local/api/x'), ctx());
    expect(await res.json()).toEqual({ ok: true, data: ['a', 'b'] });
  });

  it('POST parses the body with the schema — unknown fields never reach the service', async () => {
    const { route, service } = make();
    const res = await route.POST(write('POST', 'http://local/api/x', '{"name":"Ann","role":"admin","id":"x"}'), ctx());
    expect(res.status).toBe(200);
    expect(service.calls).toEqual([['create', { name: 'Ann' }]]);
  });

  it('rejects an empty, invalid or non-JSON body with 422', async () => {
    expect((await make().route.POST(write('POST', 'http://local/api/x'), ctx())).status).toBe(422);
    expect((await make().route.POST(write('POST', 'http://local/api/x', '{"name":""}'), ctx())).status).toBe(422);
    const bad = await make().route.POST(write('POST', 'http://local/api/x', '{not json'), ctx());
    expect(await bad.json()).toMatchObject({ error: { message: 'The request body is not valid JSON.' } });
  });

  it('PUT takes the id from the path, else from ?id=, and validates the body', async () => {
    const { route, service } = make();
    await route.PUT(write('PUT', 'http://local/api/x/7', '{"name":"Bo"}'), ctx({ id: '7' }));
    await route.PUT(write('PUT', 'http://local/api/x?id=8', '{"name":"Cy"}'), ctx());
    expect(service.calls).toEqual([
      ['update', '7', { name: 'Bo' }],
      ['update', '8', { name: 'Cy' }],
    ]);
  });

  it('DELETE removes by id and answers 404 when the id is missing', async () => {
    const { route, service } = make();
    expect((await route.DELETE(write('DELETE', 'http://local/api/x?id=3'), ctx())).status).toBe(200);
    expect(service.calls).toEqual([['remove', '3']]);
    const missing = await route.DELETE(write('DELETE', 'http://local/api/x'), ctx());
    expect(missing.status).toBe(404);
  });

  it('returns 405 for methods that are not configured', async () => {
    const route = makeCrudRoute<FakeService>({ service: () => ({ items: [], calls: [] }), authorize: 'public' });
    for (const method of ['GET', 'POST', 'PUT', 'DELETE'] as const) {
      const res = await route[method](write(method === 'GET' ? 'GET' : method, 'http://local/api/x'), ctx());
      expect(res.status).toBe(405);
    }
  });

  it('authorizes before calling the service, with a custom guard', async () => {
    const { route, service } = make(() => {
      throw new UnauthorizedError();
    });
    expect((await route.GET(new Request('http://local/api/x'), ctx())).status).toBe(401);
    expect((await route.POST(write('POST', 'http://local/api/x', '{"name":"Ann"}'), ctx())).status).toBe(401);
    expect(service.calls).toEqual([]);
  });

  it('defaults to requireSession, which fails closed without the dev flag', async () => {
    const res = await make(null).route.GET(new Request('http://local/api/x'), ctx());
    expect(res.status).toBe(401);
  });

  it('defaults to withScope for the request scope', async () => {
    withScopeMock.mockImplementation(async (fn: (cradle: Cradle) => Promise<unknown>) => fn({} as Cradle));
    const res = await make('public', false).route.GET(new Request('http://local/api/x'), ctx());
    expect(await res.json()).toEqual({ ok: true, data: ['a', 'b'] });
    expect(withScopeMock).toHaveBeenCalledTimes(1);
  });
});
