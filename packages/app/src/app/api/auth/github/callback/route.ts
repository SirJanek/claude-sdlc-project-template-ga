import { apiHandler, readGitHubStateCookie, redirectResponse, withScope } from '@mentorhub/core';

export const dynamic = 'force-dynamic';

// Public by spec: where GitHub sends the browser back. The echoed `state` must match the signed cookie
// (login CSRF), the code is exchanged behind the GitHubClient port, and only a verified primary e-mail
// signs in. Every outcome is a 303 — to the landing path with the session cookie, or to
// /sign-in?error=github_failed | github_email_unverified — and always clears the state cookie.
export const GET = apiHandler(async (request) =>
  redirectResponse(
    await withScope((cradle) =>
      cradle.githubSignIn.callback(new URL(request.url).searchParams, readGitHubStateCookie(request)),
    ),
  ),
);
