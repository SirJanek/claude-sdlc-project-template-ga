import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { Cradle } from '../container/cradle';
import { REQUEST_HEADER } from './apiHandler';
import { UnauthorizedError } from './errors';
import { makeCrudRoute } from './makeCrudRoute';

interface FakeService {
  items: string[];
  received: unknown[];
}

const ctx = { params: Promise.resolve({}) };
const make = (authorize: (() => void) | 'public' = 'public') => {
  const service: FakeService = { items: ['a', 'b'], received: [] };
  const route = makeCrudRoute<FakeService, { name: string }>({
    service: () => service,
    list: async (s) => s.items,
    create: {
      schema: z.object({ name: z.string().min(1) }),
      run: async (s, input) => {
        s.received.push(input);
        return input;
      },
    },
    authorize,
    scope: (fn) => fn({} as Cradle),
  });
  return { route, service };
};
const post = (body: string) =>
  new Request('http://local/api/x', { method: 'POST', headers: { [REQUEST_HEADER]: '1' }, body });

describe('makeCrudRoute', () => {
  it('GET returns the list in the envelope', async () => {
    const res = await make().route.GET(new Request('http://local/api/x'), ctx);
    expect(await res.json()).toEqual({ ok: true, data: ['a', 'b'] });
  });

  it('returns 405 for methods that are not configured', async () => {
    const res = await make().route.DELETE(
      new Request('http://local/api/x?id=1', { method: 'DELETE', headers: { [REQUEST_HEADER]: '1' } }),
      ctx,
    );
    expect(res.status).toBe(405);
  });

  it('parses write bodies with the schema — unknown fields never reach the service', async () => {
    const { route, service } = make();
    const res = await route.POST(post('{"name":"Ann","role":"admin","id":"x"}'), ctx);
    expect(res.status).toBe(200);
    expect(service.received).toEqual([{ name: 'Ann' }]);
  });

  it('rejects invalid bodies with 422 and invalid JSON with 422', async () => {
    expect((await make().route.POST(post('{"name":""}'), ctx)).status).toBe(422);
    expect((await make().route.POST(post('{not json'), ctx)).status).toBe(422);
  });

  it('authorizes before calling the service', async () => {
    const { route, service } = make(() => {
      throw new UnauthorizedError();
    });
    expect((await route.GET(new Request('http://local/api/x'), ctx)).status).toBe(401);
    expect((await route.POST(post('{"name":"Ann"}'), ctx)).status).toBe(401);
    expect(service.received).toEqual([]);
  });
});
