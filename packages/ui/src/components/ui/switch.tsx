'use client';

import * as React from 'react';
import { cn } from 'cn';
import { Switch as SwitchPrimitive } from 'radix-ui';

// DevMentor switch (shadcn, adapted in stage 2 batch 2). Track 32 × 18 px, thumb 14 px without shadow (R01.1).
// Off = --border-strong track (WCAG 1.4.11, 5.53 : 1 against the card), on = --primary; white thumb 5.53 / 5.91 : 1.
// ::before extends the hit area to 32 × 24 px (WCAG 2.5.8). Thumb slides in --motion-fast (PROPOSAL; off under
// reduced motion via globals.css). One size only: shadcn's `sm` (24 × 14) is below the 24 px target and was removed.
function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer group/switch relative inline-flex h-4.5 w-8 shrink-0 items-center rounded-full p-0.5 transition-colors duration-(--motion-fast) before:absolute before:-inset-y-0.75 before:inset-x-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring disabled:cursor-not-allowed data-[state=checked]:bg-primary data-[state=checked]:hover:bg-primary-hover data-[state=unchecked]:bg-border-strong data-[state=unchecked]:hover:bg-foreground data-disabled:data-[state=checked]:bg-border data-disabled:data-[state=unchecked]:bg-border',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-3.5 rounded-full bg-card transition-transform duration-(--motion-fast) data-[state=checked]:translate-x-3.5 data-[state=unchecked]:translate-x-0"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
