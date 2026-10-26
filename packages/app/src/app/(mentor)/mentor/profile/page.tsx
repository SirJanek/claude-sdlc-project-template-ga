import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ACCOUNT_NOTICE_PARAM, MENTOR_PROFILE_PATH, accountNoticeSchema, pageAccess } from '@mentorhub/core';
import { ExistingAccountNotice, SessionMenu } from '@mentorhub/ui';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const dynamic = 'force-dynamic';

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * The page's own path with the query the visitor used (E01-S02): a signed-out visit to `?slot=…` returns
 * to exactly that URL after sign-in, so the query travels in the `next` the guard hands to `/sign-in`.
 */
function pathWithQuery(pathname: string, params: Record<string, string | string[] | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const item of Array.isArray(value) ? value : [value]) if (item !== undefined) query.append(key, item);
  }
  const search = query.toString();
  return search ? `${pathname}?${search}` : pathname;
}

/**
 * Mentor profile setup — a placeholder until E02-S01 (#28) fills it. Mentor role required: signed out →
 * `/sign-in?next=/mentor/profile`, another role → a refusal (no content). R07 / decision D11: nothing
 * on this page asks for payout, bank or card details; that only comes after the first booking.
 */
export default async function MentorProfilePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const access = await pageAccess(await headers(), {
    role: 'mentor',
    path: pathWithQuery(MENTOR_PROFILE_PATH, params),
  });
  if (access.kind === 'sign-in') redirect(access.signInPath);
  if (access.kind === 'forbidden') {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-3xl font-bold tracking-tight">Mentor account required</h1>
        <p role="alert" className="mt-4 text-secondary-foreground">
          You are signed in with an account that is not a mentor, so this page is not available to it. Mentor accounts
          are created at{' '}
          <a href="/sign-up/mentor" className="font-medium text-accent-foreground underline">
            /sign-up/mentor
          </a>
          .
        </p>
      </main>
    );
  }
  const notice = accountNoticeSchema.safeParse(first(params[ACCOUNT_NOTICE_PARAM]));
  const { account } = access;
  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <span className="font-semibold">MentorHub</span>
          <SessionMenu />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-16">
        {notice.success ? (
          <div className="mb-8">
            <ExistingAccountNotice />
          </div>
        ) : null}
        <h1 className="text-3xl font-bold tracking-tight">Set up your mentor profile</h1>
        <p className="mt-4 text-secondary-foreground">
          Welcome, <strong data-slot="account-name">{account.name ?? account.email}</strong>. You are signed in as a
          mentor.
        </p>
        <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-semibold">Coming next</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Profile setup — your experience, topics, languages and intro availability — arrives with the next release
            (E02-S01). Nothing else is needed to get started.
          </p>
        </section>
      </main>
    </>
  );
}
