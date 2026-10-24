import { AUTH_LIMITS, nextPathSchema } from '@mentorhub/core';
import { ResendButton } from './ResendButton';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// Shown after a link was requested: names the address the person typed; resend after a cool-down.
export default async function CheckEmailPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const email = first(params.email) ?? '';
  const next = nextPathSchema.safeParse(first(params.next));
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Check your inbox</h1>
      <p className="mt-4 text-slate-700">
        {email ? (
          <>
            We sent a sign-in link to <strong>{email}</strong>. Open it within {AUTH_LIMITS.linkTtlMinutes} minutes.
          </>
        ) : (
          <>We sent you a sign-in link. Open it within {AUTH_LIMITS.linkTtlMinutes} minutes.</>
        )}
      </p>
      <p className="mt-2 text-sm text-slate-600">Nothing there? Check the spam folder, or send a new link below.</p>
      {email ? (
        <ResendButton
          email={email}
          next={next.success ? next.data : undefined}
          waitSeconds={AUTH_LIMITS.resendAfterSeconds}
        />
      ) : null}
    </main>
  );
}
