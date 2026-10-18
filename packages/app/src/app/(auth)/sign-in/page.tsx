import { nextPathSchema } from '@mentorhub/core';
import { EmailLinkForm } from '../EmailLinkForm';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// Public (auth) page — plain Tailwind. Carries `next` (validated: same-origin path only) to the link.
export default async function SignInPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const next = nextPathSchema.safeParse(first(params.next));
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Sign in</h1>
      <EmailLinkForm next={next.success ? next.data : undefined} errorCode={first(params.error)} />
      <p className="mt-6 text-sm text-slate-600">
        Want to mentor?{' '}
        <a href="/sign-up/mentor" className="font-medium text-indigo-700 underline">
          Sign up as a mentor
        </a>
      </p>
    </main>
  );
}
