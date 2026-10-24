'use client';

import * as React from 'react';
import { cn } from 'cn';
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui';

// DevMentor menu (shadcn DropdownMenu, stage 2 batch 3). Same surface as the Select list: --popover,
// --border-strong outline, no shadow, no animation, 40 px items, --accent highlight. No submenus, checkbox
// or radio items (outside the plan). Destructive item = --destructive text.

const popoverSurface =
  'z-50 min-w-48 rounded-lg border border-border-strong bg-popover text-popover-foreground';

function DropdownMenu(props: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}
function DropdownMenuTrigger(props: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}
function DropdownMenuGroup(props: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />;
}

function DropdownMenuContent({ className, sideOffset = 4, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(popoverSurface, 'p-1', className)}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuItem({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & { variant?: 'default' | 'destructive' }) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-variant={variant}
      className={cn(
        'flex h-control cursor-default items-center gap-inline rounded-md px-3 text-base outline-hidden select-none data-disabled:pointer-events-none data-disabled:text-muted-foreground data-highlighted:bg-accent data-highlighted:text-accent-foreground data-[variant=destructive]:text-destructive [&_svg]:size-4 [&_svg]:shrink-0',
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuLabel({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Label>) {
  return <DropdownMenuPrimitive.Label className={cn('px-3 py-1 text-sm text-muted-foreground', className)} {...props} />;
}
function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return <DropdownMenuPrimitive.Separator className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />;
}

export {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger, popoverSurface,
};
