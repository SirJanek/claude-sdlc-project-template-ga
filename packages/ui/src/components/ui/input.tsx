import * as React from 'react';
import { cn } from 'cn';

// DevMentor text field (shadcn, adapted in stage 2). 40 px = one list row (decision 1); 14 px text (L1);
// --border-strong at rest (WCAG 1.4.11, 5.53 : 1); no shadow (R01.1); 2 px --ring focus outline (decision 3).
// Hover darkens the border to --foreground: PROPOSAL.
const fieldClasses =
  'w-full min-w-0 rounded-lg border border-border-strong bg-card px-3 text-base text-foreground transition-colors duration-(--motion-fast) placeholder:text-muted-foreground hover:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-muted-foreground aria-invalid:border-destructive';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return <input type={type} data-slot="input" className={cn(fieldClasses, 'h-control', className)} {...props} />;
}

export { Input, fieldClasses };
