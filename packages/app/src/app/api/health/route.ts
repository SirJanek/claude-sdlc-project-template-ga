import { apiHandler, getContainer } from '@mentorhub/core';

export const dynamic = 'force-dynamic';

// Operational endpoint: keeps its monitor-friendly contract (200/503, { status, db }) through
// apiHandler's Response escape hatch instead of the feature envelope.
export const GET = apiHandler(async () => {
  const report = await getContainer().cradle.healthService.check();
  return Response.json(report, { status: report.db === 'up' ? 200 : 503 });
});
