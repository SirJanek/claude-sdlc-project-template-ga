import { describe, expect, it } from 'vitest';
import type { Orm } from '@mentorhub/db';
import { buildContainer, createRequestScope } from './container';

function fakeOrm(ok: boolean): Orm {
  let forks = 0;
  const execute = async (sql: string) => {
    if (!ok) throw new Error('connection refused');
    if (sql !== 'select 1') throw new Error(`unexpected query: ${sql}`);
    return [{ '?column?': 1 }];
  };
  return {
    // A real ORM reports "not established" here until the first query — the service must not rely on it.
    checkConnection: async () => ({ ok: false, reason: 'Connection not established' }),
    em: { fork: () => ({ forkNo: ++forks, getConnection: () => ({ execute }) }) },
  } as unknown as Orm;
}

describe('composition root', () => {
  it('reports db up when the ORM answers', async () => {
    const c = buildContainer({ getOrm: async () => fakeOrm(true) });
    await expect(c.cradle.healthService.check()).resolves.toEqual({ status: 'ok', db: 'up' });
  });

  it('reports db down when the check fails or the ORM cannot start', async () => {
    const down = buildContainer({ getOrm: async () => fakeOrm(false) });
    await expect(down.cradle.healthService.check()).resolves.toEqual({ status: 'degraded', db: 'down' });
    const broken = buildContainer({ getOrm: () => Promise.reject(new Error('ECONNREFUSED')) });
    await expect(broken.cradle.healthService.check()).resolves.toEqual({ status: 'degraded', db: 'down' });
  });

  it('gives every request its own EntityManager fork', async () => {
    const c = buildContainer({ getOrm: async () => fakeOrm(true) });
    const a = await createRequestScope(c);
    const b = await createRequestScope(c);
    expect(a.cradle.em).not.toBe(b.cradle.em);
    expect(a.cradle.em).toBe(a.cradle.em);
  });
});
