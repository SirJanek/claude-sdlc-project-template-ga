import * as React from 'react';
import { cn } from 'cn';
import { Button } from '../../components/ui/button';

// Filter bar with removable chips (agent test 1 gap; second use after Patterns › List with filters → component, Contributing).
// Rules (docs/design-system.md › Lists):
// - loading: controls stay enabled, count is empty (filtering is client state, not blocked by the load) — PROPOSAL;
// - error: the bar is hidden, ErrorState explains and retries (nothing to filter);
// - empty (nothing saved / nothing in catalogue): the bar is hidden;
// - result count is a role=status line: "{shown} of {total} {noun}" or "{total} {noun}".
export interface ActiveFilter {
  id: string;
  label: string;
}

export interface FilterBarProps {
  /** Filter controls (Select with a visible label, width `w-field-sm`). */
  children?: React.ReactNode;
  /** Active filters shown as removable chips "Python ×". */
  active?: ActiveFilter[];
  onRemove?: (id: string) => void;
  /** Result count text; empty string while loading. */
  count?: string;
  className?: string;
}

export function FilterBar({ children, active = [], onRemove, count, className }: FilterBarProps) {
  return (
    <div data-slot="filter-bar" className={cn('flex flex-wrap items-end gap-inline', className)}>
      {children}
      {active.length ? (
        <ul aria-label="Active filters" className="flex flex-wrap gap-inline">
          {active.map((f) => (
            <li key={f.id}>
              <FilterChip label={f.label} onRemove={() => onRemove?.(f.id)} />
            </li>
          ))}
        </ul>
      ) : null}
      <p role="status" className="ml-auto text-sm text-muted-foreground">
        {count ?? ''}
      </p>
    </div>
  );
}

/** Removable chip: ghost sm button, accessible name "Remove filter {label}". */
export function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Button variant="ghost" size="sm" onClick={onRemove} aria-label={`Remove filter ${label}`}>
      {label} ×
    </Button>
  );
}

/** Result-count copy: "3 mentors", "2 of 3 saved mentors". Empty while loading. */
export function resultCount(shown: number, total: number, noun: string, loading = false): string {
  if (loading) return '';
  return shown === total ? `${total} ${noun}` : `${shown} of ${total} ${noun}`;
}
