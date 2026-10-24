import { ACCOUNT_NOTICE_PARAM, RULES, accountNoticeSchema } from '@mentorhub/core';
import { ExistingAccountNotice, SessionMenu } from '@mentorhub/ui';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// Public (frontend) page — plain Tailwind, no admin components (SessionMenu is a concept component).
// A mentee's landing page after sign-in: shows the one-time `?notice=` from a consumed link (validated).
export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const notice = accountNoticeSchema.safeParse(first((await searchParams)[ACCOUNT_NOTICE_PARAM]));
  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <header className="mb-12 flex items-center justify-between gap-4">
        <span className="flex items-center gap-2 text-lg font-extrabold">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">M</span>
          MentorHub
        </span>
        <SessionMenu />
      </header>
      {notice.success ? (
        <div className="mb-8">
          <ExistingAccountNotice />
        </div>
      ) : null}
      <section className="rounded-lg border border-border bg-card px-8 py-14 text-foreground">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          Grow faster with a mentor who has done it before
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          1:1 video sessions with product, engineering, design and AI leaders. Start with a {RULES.introMinutes}-minute
          intro at half price.
        </p>
        <a
          href="#how"
          className="mt-8 inline-flex h-control items-center rounded-lg bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          Find a mentor
        </a>
      </section>
      <section id="how" className="mt-12 grid gap-4 sm:grid-cols-3">
        {[
          ['Find your mentor', 'Filter by topic, price, language and time.'],
          ['Book an intro', 'Check the fit before you commit to a plan.'],
          ['Keep growing', `Reschedule free up to ${RULES.freeCancelHours} h before a session.`],
        ].map(([title, text], i) => (
          <div key={title} className="rounded-lg border border-border bg-card p-6">
            <div className="mb-3 grid size-8 place-items-center rounded-full bg-muted font-bold text-foreground">
              {i + 1}
            </div>
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
