'use client';

import { Children, cloneElement, useId, type ReactElement, type ReactNode } from 'react';
import { CircleAlertIcon } from 'lucide-react';
import { cn } from 'cn';
import { Label } from '../../components/ui/label';

type ControlProps = {
  id?: string;
  required?: boolean;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
};

export interface FormFieldProps {
  /** Visible name of the field. Always shown; a placeholder is never the label. */
  label: string;
  /** One control: Input, Textarea or another element that takes id and aria-* props. */
  children: ReactElement<ControlProps>;
  /** Format or constraint the user needs before typing, e.g. "Between 20 and 300 USD". */
  hint?: ReactNode;
  /** What went wrong and what to do. Turns the field invalid and is announced with the field. */
  error?: ReactNode;
  /** Shows "Required" or "Optional" next to the label; "required" also marks the control as required. */
  necessity?: 'required' | 'optional';
  className?: string;
}

/**
 * Label, control, hint and error wired together (WCAG 1.3.1, 3.3.1, 3.3.2): the label names the control,
 * hint and error are linked with aria-describedby (error first), aria-invalid is set while there is an error.
 */
export function FormField({ label, children, hint, error, necessity, className }: FormFieldProps) {
  const generatedId = useId();
  const control = Children.only(children);
  const id = control.props.id ?? `field-${generatedId}`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null, control.props['aria-describedby'] ?? null]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <div data-slot="form-field" className={cn('grid gap-inline', className)}>
      <Label htmlFor={id}>
        {label}
        {necessity ? (
          <span className="text-sm font-normal text-muted-foreground">
            {necessity === 'required' ? 'Required' : 'Optional'}
          </span>
        ) : null}
      </Label>
      {cloneElement(control, {
        id,
        required: necessity === 'required' ? true : control.props.required,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : control.props['aria-invalid'],
      })}
      {hint ? (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="flex items-start gap-inline text-sm text-destructive">
          <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
