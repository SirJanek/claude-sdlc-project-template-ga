import { apiHandler, requireSession, withScope } from '@mentorhub/core';

export const dynamic = 'force-dynamic';

// The signed-in account: `{ id, email, name, role, emailVerified }`, or 401 without a session.
export const GET = apiHandler(async (request) => {
  const session = await requireSession(request);
  return withScope((cradle) => cradle.authService.currentUser(session));
});
