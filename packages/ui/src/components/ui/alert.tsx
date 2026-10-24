import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';

// DevMentor alert (shadcn, adapted in stage 2 batch 3; differences accepted by default, see POSTEP.md).
// No shadow, no icon as the only carrier; status variants on --status-* tokens. role="alert" only for
// errors after an action (danger), otherwise role="status". Errors needing action are never a toast.
const alertVariants = cva('grid w-full gap-1 rounded-lg border border-border p-panel text-base', {
  variants: {
    variant: {
      neutral: 'bg-secondary text-secondary-foreground',
      success: 'bg-status-success-bg text-status-success',
      warning: 'bg-status-warning-bg text-status-warning',
      danger: 'bg-status-danger-bg text-status-danger',
    },
  },
  defaultVariants: { variant: 'neutral' },
});

type AlertProps = React.ComponentProps<'div'> & VariantProps<typeof alertVariants>;

function Alert({ className, variant = 'neutral', role, ...props }: AlertProps) {
  return (
    <div
      data-slot="alert"
      data-variant={variant}
      role={role ?? (variant === 'danger' ? 'alert' : 'status')}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<'p'>) {
  return <p data-slot="alert-title" className={cn('text-base font-semibold', className)} {...props} />;
}

function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-description" className={cn('text-base text-foreground', className)} {...props} />;
}

export { Alert, AlertTitle, AlertDescription, alertVariants, type AlertProps };
