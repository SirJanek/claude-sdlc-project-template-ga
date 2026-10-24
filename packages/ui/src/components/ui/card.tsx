import * as React from 'react';
import { cn } from 'cn';

// DevMentor card / panel (shadcn, adapted in stage 2 batch 2). Lines, not shadows (R01.1, --shadow-card: none);
// 6 px radius (A01, shadcn had rounded-xl); padding --space-panel 16 px (shadcn 24 px); groups --space-stack.
// Never put a card inside a card (A01) — inside a card, separate groups with a --border line.
function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn(
        'flex flex-col gap-stack rounded-lg border border-border bg-card p-panel text-card-foreground shadow-card',
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'grid auto-rows-min items-start gap-x-inline gap-y-1 has-data-[slot=card-action]:grid-cols-(--card-header-columns)',
        className,
      )}
      {...props}
    />
  );
}

/** Panel title, 20 px (tokeny.md: --text-xl "panel title"). Rendered as a heading; pick the level with `as`. */
function CardTitle({
  className,
  as: Heading = 'h2',
  ...props
}: React.ComponentProps<'h2'> & { as?: 'h2' | 'h3' | 'h4' }) {
  return <Heading data-slot="card-title" className={cn('text-xl font-semibold', className)} {...props} />;
}

function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p data-slot="card-description" className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn(className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-footer" className={cn('flex items-center gap-inline', className)} {...props} />;
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
