'use client';

import * as React from 'react';
import { cn } from 'cn';
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';

// DevMentor radio group (shadcn, adapted in stage 2 batch 2). Same rules as the checkbox (decision 5):
// 16 px circle, --border-strong at rest (WCAG 1.4.11), selected = --primary dot, 2 px --ring focus outline,
// ::before extends the hit area to 24 × 24 px (WCAG 2.5.8). The circle is the radio's conventional shape
// (PROPOSAL: exception to "radius-full only for badges", R01.3).
function RadioGroup({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return <RadioGroupPrimitive.Root data-slot="radio-group" className={cn('grid gap-inline', className)} {...props} />;
}

function RadioGroupItem({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        'peer relative flex size-4 shrink-0 items-center justify-center rounded-full border border-border-strong bg-card transition-colors duration-(--motion-fast) before:absolute before:-inset-1.25 hover:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring disabled:cursor-not-allowed disabled:border-border disabled:bg-muted aria-invalid:border-destructive data-[state=checked]:border-primary data-[state=checked]:hover:border-primary-hover data-[state=checked]:disabled:border-border',
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="block size-2 rounded-full bg-primary in-disabled:bg-muted-foreground"
      />
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem };
