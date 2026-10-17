import { getContainer } from '@mentorhub/core';

export const dynamic = 'force-dynamic';

export async function GET() {
  const report = await getContainer().cradle.healthService.check();
  return Response.json(report, { status: report.db === 'up' ? 200 : 503 });
}
