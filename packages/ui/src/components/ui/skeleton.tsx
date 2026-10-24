import * as React from 'react';
import { cn } from 'cn';

// DevMentor skeleton (shadcn, stage 2 batch 4). --muted block, no pulse animation (motion: hover/focus only).
// Decorative: aria-hidden; the loading region announces itself with aria-busy on the container.
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="skeleton" aria-hidden="true" className={cn('rounded-lg bg-muted', className)} {...props} />;
}

export { Skeleton };
