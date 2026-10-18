import { apiHandler, emailLinkStartSchema, readClientIp, readJsonBody, withScope } from '@mentorhub/core';

export const dynamic = 'force-dynamic';

// Public by spec: anyone may ask for a sign-in link. Always `{ sent: true }` for a valid body — an
// unknown or existing e-mail answers the same (no account enumeration); 422 / 429 / 503 otherwise.
export const POST = apiHandler(async (request) => {
  const input = emailLinkStartSchema.parse(await readJsonBody(request));
  await withScope((cradle) => cradle.authService.requestEmailLink({ ...input, ip: readClientIp(request) }));
  return { sent: true };
});
