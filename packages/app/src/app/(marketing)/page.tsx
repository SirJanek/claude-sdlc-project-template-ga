import { RULES } from '@mentorhub/core';
import { SessionMenu } from '@mentorhub/ui';

// Public (frontend) page — plain Tailwind, no admin components (SessionMenu is a concept component).
export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <header className="mb-12 flex items-center justify-between gap-4">
        <span className="flex items-center gap-2 text-lg font-extrabold">
          <span className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-white">M</span>
          MentorHub
        </span>
        <SessionMenu />
      </header>
      <section className="rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-700 to-violet-500 px-8 py-14 text-white">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          Grow faster with a mentor who has done it before
        </h1>
        <p className="mt-4 max-w-xl text-lg text-indigo-100">
          1:1 video sessions with product, engineering, design and AI leaders. Start with a {RULES.introMinutes}-minute
          intro at half price.
        </p>
        <a
          href="#how"
          className="mt-8 inline-block rounded-xl bg-amber-400 px-6 py-3 font-semibold text-amber-950 hover:bg-amber-300"
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
          <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-3 grid size-8 place-items-center rounded-full bg-amber-100 font-bold text-amber-800">
              {i + 1}
            </div>
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-slate-600">{text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
