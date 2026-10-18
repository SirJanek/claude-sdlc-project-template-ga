import {
  apiHandler,
  clearSessionCookie,
  envelope,
  getEnv,
  readJsonBody,
  requireSession,
  signOutSchema,
  withScope,
} from '@mentorhub/core';

export const dynamic = 'force-dynamic';

// Clears this device's cookie; `everywhere: true` also ends every other session of the account
// (session version bump), which needs a valid session — a plain sign-out never fails.
export const POST = apiHandler(async (request) => {
  const { everywhere } = signOutSchema.parse(await readJsonBody(request));
  if (everywhere) {
    const session = await requireSession(request);
    if (!session.isDevSession) await withScope((cradle) => cradle.authService.signOutEverywhere(session.userId));
  }
  return envelope({ signedOut: true }, { headers: { 'set-cookie': clearSessionCookie(getEnv()) } });
});
