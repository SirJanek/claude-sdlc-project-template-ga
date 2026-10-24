import * as React from 'react';
import { cn } from 'cn';
import { Badge, type BadgeProps } from '../ui/badge';

// Booking row with a status badge (E03). Colour only for state, always with text (R01.3, WCAG 1.4.1).
// Statuses from the brief: paid/confirmed (R04), declined + refund (R12), cancelled (R10), held, no-show (R06, R10).
export type BookingStatus = 'confirmed' | 'held' | 'declined' | 'refunded' | 'cancelled' | 'no-show-mentor' | 'no-show-mentee' | 'awaiting-payment';

export const bookingStatusMeta: Record<BookingStatus, { label: string; variant: NonNullable<BadgeProps['variant']> }> = {
  'awaiting-payment': { label: 'Awaiting payment', variant: 'warning' },
  confirmed: { label: 'Paid', variant: 'success' },
  held: { label: 'Held', variant: 'success' },
  declined: { label: 'Declined · refunded', variant: 'danger' },
  refunded: { label: 'Refunded', variant: 'danger' },
  cancelled: { label: 'Cancelled', variant: 'neutral' },
  'no-show-mentor': { label: 'Mentor no-show · refunded', variant: 'danger' },
  'no-show-mentee': { label: 'Missed', variant: 'neutral' },
};

export interface BookingRowProps {
  /** Who the other person is, from the viewer's side. */
  counterpart: string;
  /** First line of the question (R05). */
  question: string;
  /** Formatted, e.g. "Tue 27 Oct, 18:00 · 25 min" */
  when: string;
  /** Formatted, e.g. "$45" */
  price: string;
  status: BookingStatus;
  href?: string;
  action?: React.ReactNode;
  className?: string;
}

export function BookingRow({ counterpart, question, when, price, status, href, action, className }: BookingRowProps) {
  const meta = bookingStatusMeta[status];
  const Title = href ? 'a' : 'span';
  return (
    <li data-slot="booking-row" className={cn('flex flex-wrap items-center gap-inline border-b border-border px-list-row-x py-list-row-y', className)}>
      <div className="grid min-w-0 flex-1 gap-1">
        <Title href={href} className={cn('truncate font-semibold', href && 'hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring')}>
          {question}
        </Title>
        <p className="text-sm text-muted-foreground">
          {counterpart} · <span className="tabular-nums">{when}</span> · <span className="tabular-nums">{price}</span>
        </p>
      </div>
      <Badge variant={meta.variant}>{meta.label}</Badge>
      {action}
    </li>
  );
}
