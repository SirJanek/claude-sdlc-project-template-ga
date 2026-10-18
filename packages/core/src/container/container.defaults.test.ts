import { afterEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  getOrm: vi.fn(async () => ({ em: { fork: () => ({}) } })),
  createOrmConfig: vi.fn((env: Record<string, string>) => ({ clientUrl: env.DATABASE_URL })),
}));
vi.mock('@mentorhub/db', () => db);

afterEach(() => {
  vi.resetModules();
  delete (globalThis as { __mentorhubContainer?: unknown }).__mentorhubContainer;
});

describe('container defaults', () => {
  it('builds the ORM from the validated environment when no override is given', async () => {
    process.env.DATABASE_URL = 'postgresql://u:p@db:5432/x';
    process.env.LOG_LEVEL = 'silent';
    const { buildContainer } = await import('./container');
    await buildContainer().cradle.getOrm();
    expect(db.createOrmConfig).toHaveBeenCalledWith(
      expect.objectContaining({ DATABASE_URL: 'postgresql://u:p@db:5432/x', DB_POOL_MAX: '10' }),
    );
    expect(db.getOrm).toHaveBeenCalledWith({ clientUrl: 'postgresql://u:p@db:5432/x' });
  });

  it('getContainer returns one process-wide container', async () => {
    const { getContainer } = await import('./container');
    expect(getContainer()).toBe(getContainer());
  });
});
