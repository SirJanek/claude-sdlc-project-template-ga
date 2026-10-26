import { emailLinkConsumeSchema, withScope } from '@mentorhub/core';
import { ConfirmSignIn } from './ConfirmSignIn';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const dynamic = 'force-dynamic';

const EXPIRED = 'This link has expired or was already used — send a new one.';

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// The link from the e-mail lands here. A GET only names the account (mail scanners prefetch links,
// and a link sent by someone else must not sign the reader in silently); the button's POST consumes.
export default async function ConfirmPage({ searchParams }: { searchParams: SearchParams }) {
  const parsed = emailLinkConsumeSchema.safeParse({ token: first((await searchParams).token) });
  const link = parsed.success ? await withScope((cradle) => cradle.authService.peekEmailLink(parsed.data.token)) : null;
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">{link ? `Sign in as ${link.email}?` : 'Link not valid'}</h1>
      {link && parsed.success ? (
        <ConfirmSignIn email={link.email} token={parsed.data.token} />
      ) : (
        <p role="alert" className="mt-4 text-secondary-foreground">
          {EXPIRED}{' '}
          <a href="/sign-in" className="font-medium text-accent-foreground underline">
            Go to sign-in
          </a>
        </p>
      )}
    </main>
  );
}
