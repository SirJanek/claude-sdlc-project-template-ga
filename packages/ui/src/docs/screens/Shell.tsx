import * as React from 'react';

// Docs-only screen frame (rule 5 exception: documentation helper, not exported from the package).
// Flat navigation (R02.6): mentor sees Sessions, Profile, Payouts; mentee sees only their sessions.
export function Shell({ role, current, children }: { role?: 'mentor' | 'mentee' | 'admin' | 'guest'; current?: string; children: React.ReactNode }) {
  const nav = role === 'mentor' ? ['Sessions', 'Profile', 'Payouts'] : role === 'mentee' ? ['My sessions'] : role === 'admin' ? ['Measures'] : [];
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-control max-w-content items-center gap-section px-panel">
          <span className="font-semibold">DevMentor</span>
          <nav aria-label="Main" className="flex gap-stack">
            {nav.map((n) => (
              <a key={n} href="#" aria-current={n === current ? 'page' : undefined} className="underline-offset-4 hover:underline aria-[current=page]:font-semibold aria-[current=page]:underline">
                {n}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto grid max-w-content gap-section px-panel py-section">{children}</main>
    </div>
  );
}
