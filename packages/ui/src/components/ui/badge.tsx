import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';
import { Slot } from 'radix-ui';

// DevMentor status badge (shadcn, adapted in stage 2 batch 2). Colour carries state and nothing else (R01.3),
// and the text label is always present — never colour alone (R01.3, WCAG 1.4.1). The only pill shape in the
// system (--radius-full, R01.3). 13 px text (tokeny.md --text-sm). Every text/background pair ≥ 5.44 : 1.
const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-sm font-medium whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring [&>svg]:pointer-events-none [&>svg]:size-3.5',
  {
    variants: {
      variant: {
        // R01.3 states
        neutral: 'bg-secondary text-secondary-foreground', // draft, awaiting mentor, roles
        success: 'bg-status-success-bg text-status-success', // paid, held, paid out
        danger: 'bg-status-danger-bg text-status-danger', // declined, refunded, no-show
        warning: 'bg-status-warning-bg text-status-warning', // awaiting payment, cancellation window closing
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

type BadgeProps = React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & {
    /** Render the child element with badge styles. */
    asChild?: boolean;
  };

function Badge({ className, variant = 'neutral', asChild = false, ...props }: BadgeProps) {
  const Comp = asChild ? Slot.Root : 'span';

  return (
    <Comp data-slot="badge" data-variant={variant} className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants, type BadgeProps };
