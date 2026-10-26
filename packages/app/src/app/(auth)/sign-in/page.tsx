import { getEnv, isGitHubEnabled, nextPathSchema } from '@mentorhub/core';
import { EmailLinkForm } from '../EmailLinkForm';
import { GitHubSignInButton } from '../GitHubSignInButton';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// Public (auth) page — plain Tailwind. Carries `next` (validated: same-origin path only) to the link and
// to GitHub; "Continue with GitHub" only when GITHUB_* is configured (spec, Phase 2).
export default async function SignInPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const next = nextPathSchema.safeParse(first(params.next));
  const nextPath = next.success ? next.data : undefined;
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Sign in</h1>
      <EmailLinkForm next={nextPath} errorCode={first(params.error)} />
      {isGitHubEnabled(getEnv()) ? <GitHubSignInButton next={nextPath} /> : null}
      <p className="mt-6 text-sm text-muted-foreground">
        Want to mentor?{' '}
        <a href="/sign-up/mentor" className="font-medium text-accent-foreground underline">
          Sign up as a mentor
        </a>
      </p>
    </main>
  );
}
