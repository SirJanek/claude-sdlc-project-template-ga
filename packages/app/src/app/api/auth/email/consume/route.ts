import { apiHandler, emailLinkConsumeSchema, envelope, readJsonBody, withScope } from '@mentorhub/core';

export const dynamic = 'force-dynamic';

// Public by spec: the token is the credential. Only this POST (CSRF header) consumes it; the
// confirm page's GET never does. 410 link_invalid for an unknown, used or expired token.
export const POST = apiHandler(async (request) => {
  const { token } = emailLinkConsumeSchema.parse(await readJsonBody(request));
  const { next, cookie } = await withScope(async ({ authService }) => {
    const consumed = await authService.consumeEmailLink(token);
    return { next: consumed.next, cookie: await authService.startSession(consumed) };
  });
  return envelope({ next }, { headers: { 'set-cookie': cookie } });
});
