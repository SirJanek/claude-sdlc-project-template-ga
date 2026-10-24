'use client';

import * as React from 'react';
import { cn } from 'cn';
import { Label as LabelPrimitive } from 'radix-ui';

// DevMentor label (shadcn, adapted in stage 2): 14 px medium, always visible above or next to its control.
// Disabled control → muted label text instead of shadcn's 50 % opacity (colour from a token).
function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        'flex items-center gap-inline text-base font-medium text-foreground select-none peer-disabled:cursor-not-allowed peer-disabled:text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

export { Label };
