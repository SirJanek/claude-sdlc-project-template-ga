import { nextPathSchema } from '@mentorhub/core';
import { SignInForm } from './SignInForm';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// Public (auth) page — plain Tailwind. Carries `next` (validated: same-origin path only) to the link.
export default async function SignInPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const next = nextPathSchema.safeParse(first(params.next));
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Sign in</h1>
      <SignInForm next={next.success ? next.data : undefined} errorCode={first(params.error)} />
    </main>
  );
}
