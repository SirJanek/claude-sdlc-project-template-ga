'use client';

import * as React from 'react';
import { cn } from 'cn';
import { CheckIcon } from 'lucide-react';
import { Checkbox as CheckboxPrimitive } from 'radix-ui';

// DevMentor checkbox (shadcn, adapted in stage 2, decision 5): 16 px box, 4 px radius (rounded-md),
// --border-strong at rest (WCAG 1.4.11), checked = --primary. The ::before layer extends the hit area
// to 24 × 24 px (WCAG 2.5.8): 14 px inner box + 5 px on every side.
function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer relative size-4 shrink-0 rounded-md border border-border-strong bg-card text-primary-foreground transition-colors duration-(--motion-fast) before:absolute before:-inset-1.25 hover:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring disabled:cursor-not-allowed disabled:border-border disabled:bg-muted aria-invalid:border-destructive data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:hover:border-primary-hover data-[state=checked]:hover:bg-primary-hover data-[state=checked]:disabled:border-border data-[state=checked]:disabled:bg-muted data-[state=checked]:disabled:text-muted-foreground',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className="grid place-content-center text-current">
        <CheckIcon className="size-3.5" aria-hidden="true" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
