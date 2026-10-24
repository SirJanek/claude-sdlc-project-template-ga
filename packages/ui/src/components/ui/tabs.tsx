'use client';

import * as React from 'react';
import { cn } from 'cn';
import { Tabs as TabsPrimitive } from 'radix-ui';

// DevMentor tabs (shadcn, stage 2 batch 4). Underline tabs, 40 px triggers, active = --foreground text +
// 2 px --primary underline (weight as second carrier), no shadow, no pill background.

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn('grid gap-stack', className)} {...props} />;
}
function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List data-slot="tabs-list" className={cn('flex gap-inline border-b border-border', className)} {...props} />;
}
function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        '-mb-px inline-flex h-control items-center border-b-2 border-transparent px-3 text-base text-muted-foreground hover:text-foreground data-disabled:pointer-events-none data-[state=active]:border-primary data-[state=active]:font-medium data-[state=active]:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring',
        className,
      )}
      {...props}
    />
  );
}
function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn('focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring', className)} {...props} />;
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
