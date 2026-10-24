import { apiHandler, redirectResponse, withScope } from '@mentorhub/core';

export const dynamic = 'force-dynamic';

// Public by spec: begins "Continue with GitHub". `role` (mentor only) and `next` (same-origin path) are
// validated in core — anything else, or GitHub not configured, is a 302 to /sign-in?error=invalid_request.
// Otherwise: the signed state + PKCE cookie and a 302 to GitHub. A GET that only sets a scoped cookie.
export const GET = apiHandler(async (request) =>
  redirectResponse(await withScope((cradle) => cradle.githubSignIn.start(new URL(request.url).searchParams))),
);
