// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const core = vi.hoisted(() => ({
  check: vi.fn(),
  requireSession: vi.fn(),
  requireRole: vi.fn(),
}));
vi.mock('@mentorhub/core', async (original) => {
  const real = await original<typeof import('@mentorhub/core')>();
  return {
    apiHandler: real.apiHandler,
    getContainer: () => ({ cradle: { healthService: { check: core.check } } }),
    requireSession: core.requireSession,
    requireRole: core.requireRole,
  };
});

import { GET, dynamic } from './route';

const request = new Request('http://x/api/admin/health');
const context = { params: Promise.resolve({}) };

beforeEach(() => {
  core.check.mockReset();
  core.requireSession.mockReset().mockReturnValue({ role: 'admin' });
  core.requireRole.mockReset();
});

describe('/api/admin/health', () => {
  it('renders per request', () => {
    expect(dynamic).toBe('force-dynamic');
  });

  it('answers the report in the envelope after the admin guard', async () => {
    core.check.mockResolvedValue({ status: 'ok', db: 'up' });
    const res = await GET(request, context);
    expect(core.requireRole).toHaveBeenCalledWith({ role: 'admin' }, 'admin');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: { status: 'ok', db: 'up' } });
  });

  it('reports a down database as a successful 200 report', async () => {
    core.check.mockResolvedValue({ status: 'degraded', db: 'down' });
    const res = await GET(request, context);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: { status: 'degraded', db: 'down' } });
  });

  it('answers 401 without a session and never touches the database', async () => {
    const { UnauthorizedError } = await vi.importActual<typeof import('@mentorhub/core')>('@mentorhub/core');
    core.requireSession.mockImplementation(() => {
      throw new UnauthorizedError();
    });
    const res = await GET(request, context);
    expect(res.status).toBe(401);
    expect(core.check).not.toHaveBeenCalled();
  });

  it('answers 403 for a non-admin session', async () => {
    const { ForbiddenError } = await vi.importActual<typeof import('@mentorhub/core')>('@mentorhub/core');
    core.requireRole.mockImplementation(() => {
      throw new ForbiddenError();
    });
    const res = await GET(request, context);
    expect(res.status).toBe(403);
    expect(core.check).not.toHaveBeenCalled();
  });
});
