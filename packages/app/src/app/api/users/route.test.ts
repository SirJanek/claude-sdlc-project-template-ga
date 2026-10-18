// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

const captured = vi.hoisted(() => ({
  config: undefined as undefined | { service: (c: unknown) => unknown; list: (s: unknown) => unknown },
}));
vi.mock('@mentorhub/core', () => ({
  makeCrudRoute: vi.fn((config) => {
    captured.config = config;
    return { GET: 'get', POST: 'post', PUT: 'put', DELETE: 'delete' };
  }),
}));

describe('/api/users route', () => {
  it('is a makeCrudRoute over userService.list with the default (fail-closed) authorization', async () => {
    const route = await import('./route');
    expect(route.dynamic).toBe('force-dynamic');
    expect([route.GET, route.POST, route.PUT, route.DELETE]).toEqual(['get', 'post', 'put', 'delete']);
    const config = captured.config!;
    expect(config).not.toHaveProperty('authorize');
    const userService = { list: vi.fn(async () => ['u1']) };
    expect(config.service({ userService })).toBe(userService);
    await expect(config.list(userService)).resolves.toEqual(['u1']);
  });
});
