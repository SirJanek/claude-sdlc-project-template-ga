import { cn } from 'cn';

// Price summary before payment (E03-S01). Price set by the mentor (R11), paid upfront via Stripe (R04),
// cancellation rule stated before paying (R10). Commission is NOT shown to the mentee (PROPOSAL: R11 is a payout rule).
export interface PriceSummaryProps {
  mentorName: string;
  /** Formatted, e.g. "Tue 27 Oct, 18:00" */
  when: string;
  minutes: 25 | 50;
  /** Formatted total, e.g. "$45" */
  total: string;
  /** Formatted deadline for free cancellation, e.g. "Tue 27 Oct, 06:00" (12 h before, R10) */
  freeCancellationUntil: string;
  className?: string;
}

export function PriceSummary({ mentorName, when, minutes, total, freeCancellationUntil, className }: PriceSummaryProps) {
  return (
    <section data-slot="price-summary" aria-label="Price summary" className={cn('grid gap-stack rounded-lg border border-border p-panel', className)}>
      <dl className="grid grid-cols-2 gap-inline">
        <dt className="text-muted-foreground">Mentor</dt>
        <dd className="text-right">{mentorName}</dd>
        <dt className="text-muted-foreground">Session</dt>
        <dd className="text-right tabular-nums">
          {when} · {minutes} min, text
        </dd>
        <dt className="font-semibold">Total</dt>
        <dd className="text-right text-lg font-semibold tabular-nums">{total}</dd>
      </dl>
      <p className="text-sm text-muted-foreground">
        Free cancellation or rescheduling until {freeCancellationUntil}. After that the payment goes to the mentor.
      </p>
    </section>
  );
}
