import * as React from 'react';
import { Button } from '../../components/ui/button';

// Row action with progress and inline error (agent test 1 gaps). Used in MentorCard/BookingRow `action` slot.
// - idle: ghost sm button, accessible name names the object ("Remove Anna Kowalska from favourites");
// - pending: disabled + aria-busy + "Removing…" (same rule as forms);
// - error: inline text under the button (role=alert) + "Try again"; never a toast (stage 0 decision 3).
export type RowActionState = 'idle' | 'pending' | 'error';

export interface RowActionProps {
  /** Visible label, verb + object, e.g. "Remove". */
  label: string;
  /** Visible label while running, e.g. "Removing…". */
  pendingLabel: string;
  /** Accessible name with the object, e.g. "Remove Anna Kowalska from favourites". */
  accessibleName: string;
  state?: RowActionState;
  /** What happened + what to do. */
  errorMessage?: string;
  onAction: () => void;
}

export function RowAction({ label, pendingLabel, accessibleName, state = 'idle', errorMessage = 'Did not work. Try again.', onAction }: RowActionProps) {
  const pending = state === 'pending';
  return (
    <div data-slot="row-action" className="grid justify-items-end gap-1">
      <Button variant="ghost" size="sm" onClick={onAction} disabled={pending} aria-busy={pending || undefined} aria-label={pending ? undefined : state === 'error' ? `Try again: ${accessibleName}` : accessibleName}>
        {pending ? pendingLabel : state === 'error' ? 'Try again' : label}
      </Button>
      {state === 'error' ? (
        <p role="alert" className="text-sm text-status-danger">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
