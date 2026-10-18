import type { RedirectOutcome } from '../services/auth/github-sign-in.service';

/**
 * A redirect `Response` for routes that end in a navigation, not a JSON envelope (the apiHandler
 * escape hatch). `Location` may be relative — browsers resolve it against the request — and every
 * cookie gets its own `Set-Cookie` header (one header with commas would be split wrong).
 */
export function redirectResponse({ status, location, cookies }: RedirectOutcome): Response {
  const headers = new Headers({ location });
  for (const cookie of cookies) headers.append('set-cookie', cookie);
  return new Response(null, { status, headers });
}
