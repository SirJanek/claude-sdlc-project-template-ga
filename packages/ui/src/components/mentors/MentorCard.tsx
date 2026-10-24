import * as React from 'react';
import { cn } from 'cn';
import { Avatar } from '../ui/avatar';
import { Badge } from '../ui/badge';

// Mentor card / row (E02). NO ratings, stars, review counts or "top rated" (N02, R08, A03).
// Trust comes from a link to public work (R08); price and earliest start always visible (R03, D05).
// Rendered as a list row separated by a line, not a floating tile grid (R01.1, A03 "tiles in a grid").
export interface Mentor {
  id: string;
  name: string;
  headline: string;
  technologies: string[];
  publicWorkUrl?: string;
  publicWorkLabel?: string;
  photoUrl?: string | null;
  /** Formatted, e.g. "$45 / 25 min · $80 / 50 min" */
  priceLabel?: string;
  /** Formatted, e.g. "Tomorrow, 18:00" — undefined = no published slots */
  earliestStart?: string;
}

export interface MentorCardProps {
  mentor: Mentor;
  /** Link to the profile; the name becomes the link (one tab stop per row). */
  href?: string;
  /** Optional trailing action, e.g. a ghost button. */
  action?: React.ReactNode;
  /** `full` (default) shows price and earliest start; `compact` hides that line (e.g. saved mentors, agent test 1). */
  variant?: 'full' | 'compact';
  /** Hide the "No slots yet" badge when earliestStart is missing (full variant). */
  hideNoSlotsBadge?: boolean;
  /** Saved item that is no longer in the catalogue: no profile link, "No longer available" badge. */
  unavailable?: boolean;
  /** Row action state: `aria-busy` on the row while an action runs. */
  busy?: boolean;
  className?: string;
}

export function MentorCard({
  mentor,
  href,
  action,
  variant = 'full',
  hideNoSlotsBadge = false,
  unavailable = false,
  busy = false,
  className,
}: MentorCardProps) {
  const link = unavailable ? undefined : href;
  const Name = link ? 'a' : 'span';
  return (
    <article
      data-slot="mentor-card"
      aria-label={mentor.name}
      aria-busy={busy || undefined}
      className={cn('flex items-start gap-inline border-b border-border py-list-row-y', className)}
    >
      <Avatar src={mentor.photoUrl} alt="" size="lg" />
      <div className="grid min-w-0 flex-1 gap-1">
        <Name
          href={link}
          className={cn(
            'font-semibold break-words',
            unavailable && 'text-muted-foreground',
            link &&
              'underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          )}
        >
          {mentor.name}
        </Name>
        <p className="text-muted-foreground break-words">{mentor.headline}</p>
        {mentor.technologies.length ? (
          <ul aria-label="Technologies" className="flex flex-wrap gap-1 font-mono text-sm">
            {mentor.technologies.map((t) => (
              <li key={t} className="text-foreground">
                {t}
              </li>
            ))}
          </ul>
        ) : null}
        {unavailable ? (
          <p className="text-sm">
            <Badge variant="neutral">No longer available</Badge>
          </p>
        ) : null}
        {variant === 'full' && !unavailable ? (
          <p className="flex flex-wrap gap-x-stack text-sm">
            {mentor.priceLabel ? <span className="tabular-nums">{mentor.priceLabel}</span> : null}
            {mentor.earliestStart ? (
              <span>Earliest start: {mentor.earliestStart}</span>
            ) : hideNoSlotsBadge ? null : (
              <Badge variant="neutral">No slots yet</Badge>
            )}
          </p>
        ) : null}
        {mentor.publicWorkUrl && !unavailable ? (
          <a
            href={mentor.publicWorkUrl}
            className="w-fit text-sm underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {mentor.publicWorkLabel ?? 'Public work'}
          </a>
        ) : null}
      </div>
      {/* Row action: right of the content from 768 px; on phones it stays on the right, size sm (rule, PROPOSAL). */}
      {action ? <div className="shrink-0">{action}</div> : null}
    </article>
  );
}
