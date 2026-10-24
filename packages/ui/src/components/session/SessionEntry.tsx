import * as React from 'react';
import { cn } from 'cn';

// Session message entry (E04): full width, no bubbles (R02.2, A05); author bold, time small grey (R02.1);
// "conversation" density (K1). No reactions, no read receipts, no online dot (R02.5, A05).
export interface SessionEntryProps {
  author: string;
  /** Formatted, e.g. "18:04" */
  time: string;
  /** ISO for <time dateTime> */
  dateTime?: string;
  /** Mentor or Mentee — text, never colour only */
  role?: 'Mentor' | 'Mentee';
  children: React.ReactNode;
  className?: string;
}

export function SessionEntry({ author, time, dateTime, role, children, className }: SessionEntryProps) {
  return (
    <article data-slot="session-entry" className={cn('grid gap-thread-author-gap', className)}>
      <header className="flex items-baseline gap-inline">
        <span className="font-semibold">{author}</span>
        {role ? <span className="text-sm text-muted-foreground">{role}</span> : null}
        <time dateTime={dateTime} className="text-sm text-muted-foreground tabular-nums">
          {time}
        </time>
      </header>
      <div className="text-lg break-words whitespace-pre-wrap [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-border [&_pre]:bg-muted [&_pre]:p-panel [&_pre]:text-base">{children}</div>
    </article>
  );
}
