import { apiHandler, getContainer, requireRole, requireSession } from '@mentorhub/core';

export const dynamic = 'force-dynamic';

// Admin Dashboard data: the same HealthService as /api/health, but behind the admin guard and in the
// standard envelope (a down database is a successful report, `db: 'down'`, not an HTTP error).
export const GET = apiHandler(async (request) => {
  requireRole(requireSession(request), 'admin');
  return getContainer().cradle.healthService.check();
});
