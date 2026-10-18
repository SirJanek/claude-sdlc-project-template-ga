// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const core = vi.hoisted(() => ({
  config: undefined as
    | undefined
    | {
        service: (c: unknown) => unknown;
        list: (s: unknown) => unknown;
        authorize: (request: Request) => void;
        create: { schema: { parse: (v: unknown) => unknown }; run: (s: unknown, i: unknown) => unknown };
      },
  requireSession: vi.fn(),
  requireRole: vi.fn(),
}));
vi.mock('@mentorhub/core', () => {
  return {
    makeCrudRoute: vi.fn((config) => {
      core.config = config;
      return { GET: 'get', POST: 'post', PUT: 'put', DELETE: 'delete' };
    }),
    requireSession: core.requireSession,
    requireRole: core.requireRole,
    // Same contract as the real schema: strips unknown keys.
    userCreateSchema: {
      parse: ({ email, name, role }: { email: string; name: string; role: string }) => ({ email, name, role }),
    },
  };
});

beforeEach(() => {
  core.requireSession.mockReset();
  core.requireRole.mockReset();
});

async function loadConfig() {
  const route = await import('./route');
  expect(route.dynamic).toBe('force-dynamic');
  expect([route.GET, route.POST, route.PUT, route.DELETE]).toEqual(['get', 'post', 'put', 'delete']);
  return core.config!;
}

describe('/api/users route', () => {
  it('is a makeCrudRoute over userService.list and userService.create', async () => {
    const config = await loadConfig();
    const userService = { list: vi.fn(async () => ['u1']), create: vi.fn(async (i: unknown) => ({ created: i })) };
    expect(config.service({ userService })).toBe(userService);
    await expect(config.list(userService)).resolves.toEqual(['u1']);
    await expect(config.create.run(userService, { email: 'a@b.io' })).resolves.toEqual({
      created: { email: 'a@b.io' },
    });
  });

  it('hands only email, name and role from the body to the service (no mass assignment)', async () => {
    const config = await loadConfig();
    const parsed = config.create.schema.parse({
      id: 'x',
      createdAt: '2020',
      email: 'a@b.io',
      name: 'A',
      role: 'admin',
    });
    expect(parsed).toEqual({ email: 'a@b.io', name: 'A', role: 'admin' });
  });

  it('authorizes every method as an admin session', async () => {
    const config = await loadConfig();
    const request = new Request('http://x/api/users');
    const session = { role: 'admin' };
    core.requireSession.mockReturnValue(session);
    config.authorize(request);
    expect(core.requireSession).toHaveBeenCalledWith(request);
    expect(core.requireRole).toHaveBeenCalledWith(session, 'admin');
  });

  it('lets a denial from the session or the role guard propagate', async () => {
    const config = await loadConfig();
    const request = new Request('http://x/api/users');
    core.requireSession.mockImplementation(() => {
      throw new Error('401');
    });
    expect(() => config.authorize(request)).toThrow('401');
    core.requireSession.mockReturnValue({ role: 'mentee' });
    core.requireRole.mockImplementation(() => {
      throw new Error('403');
    });
    expect(() => config.authorize(request)).toThrow('403');
  });
});
