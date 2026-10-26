import { getEnv, isGitHubEnabled } from '@mentorhub/core';
import { EmailLinkForm } from '../../EmailLinkForm';
import { GitHubSignInButton } from '../../GitHubSignInButton';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** R07 (decision D11): mentors give no payout details before someone books them — said up front. */
export const NO_BANK_DETAILS = 'No bank details needed until someone books you.';

// Public (auth) page — the mentor sign-up: the same e-mail link as /sign-in, sent with intentRole 'mentor'.
// A new account is created as a mentor and lands on /mentor/profile; an e-mail already in use signs in
// to its account unchanged (spec › Flows 3). "Continue with GitHub" (role=mentor) when GITHUB_* is configured.
export default async function MentorSignUpPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Set up your mentor profile</h1>
      <p className="mt-4 text-secondary-foreground">
        Share what you have done and start taking intro sessions. <strong>{NO_BANK_DETAILS}</strong>
      </p>
      <EmailLinkForm intentRole="mentor" errorCode={first(params.error)} submitLabel="Send me a sign-up link" />
      {isGitHubEnabled(getEnv()) ? <GitHubSignInButton role="mentor" /> : null}
      <p className="mt-6 text-sm text-muted-foreground">
        Already have an account?{' '}
        <a href="/sign-in" className="font-medium text-accent-foreground underline">
          Sign in
        </a>
      </p>
    </main>
  );
}
