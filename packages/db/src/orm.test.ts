import { afterEach, describe, expect, it, vi } from 'vitest';

const init = vi.hoisted(() => vi.fn());
vi.mock('@mikro-orm/postgresql', async (original) => ({
  ...(await original<typeof import('@mikro-orm/postgresql')>()),
  MikroORM: { init },
}));

afterEach(() => {
  init.mockReset();
  vi.resetModules();
  delete (globalThis as { __mentorhubOrm?: unknown }).__mentorhubOrm;
});

describe('createOrm', () => {
  it('initialises MikroORM with the given options, or the default config', async () => {
    init.mockResolvedValue('orm');
    const { createOrm } = await import('./orm');
    await expect(createOrm({ clientUrl: 'postgresql://x' })).resolves.toBe('orm');
    expect(init).toHaveBeenLastCalledWith({ clientUrl: 'postgresql://x' });
    await createOrm();
    expect(init.mock.lastCall?.[0]).toMatchObject({ clientUrl: expect.stringContaining('postgresql://') });
  });
});

describe('getOrm', () => {
  it('returns one process-wide instance', async () => {
    init.mockResolvedValue({ id: 1 });
    const { getOrm } = await import('./orm');
    const first = await getOrm();
    expect(await getOrm()).toBe(first);
    expect(init).toHaveBeenCalledTimes(1);
  });

  it('forgets a failed initialisation so the next call retries', async () => {
    init.mockRejectedValueOnce(new Error('ECONNREFUSED')).mockResolvedValueOnce({ id: 2 });
    const { getOrm } = await import('./orm');
    await expect(getOrm()).rejects.toThrow('ECONNREFUSED');
    await expect(getOrm()).resolves.toEqual({ id: 2 });
  });
});
