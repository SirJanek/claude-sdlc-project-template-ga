'use client';

import * as React from 'react';
import { cn } from 'cn';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { Select as SelectPrimitive } from 'radix-ui';
import { fieldClasses } from './input';

// DevMentor select (shadcn, adapted in stage 2 batch 2; decisions in packages/ui/POSTEP.md).
// Trigger = a text field: 40 px (decision 1), --border-strong (WCAG 1.4.11), 2 px --ring focus (decision 3).
// List: --popover surface, --border-strong outline, NO shadow (R01.1), no entrance animation (motion: hover/focus only),
// 40 px options (K1 list density).

function Select({ ...props }: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectGroup({ ...props }: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectValue({ ...props }: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        fieldClasses,
        'flex h-control items-center justify-between gap-inline text-left whitespace-nowrap data-placeholder:text-muted-foreground *:data-[slot=select-value]:truncate [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="text-muted-foreground" aria-hidden="true" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  position = 'popper',
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          'relative z-50 max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) overflow-x-hidden overflow-y-auto rounded-lg border border-border-strong bg-popover text-popover-foreground data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1',
          className,
        )}
        position={position}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn('px-3 py-1 text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        'relative flex h-control w-full cursor-default items-center gap-inline rounded-md pr-8 pl-3 text-base outline-hidden select-none data-disabled:pointer-events-none data-disabled:text-muted-foreground data-highlighted:bg-accent data-highlighted:text-accent-foreground data-[state=checked]:font-medium [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
        className,
      )}
      {...props}
    >
      <span data-slot="select-item-indicator" className="absolute right-3 flex items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon aria-hidden="true" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn('pointer-events-none -mx-1 my-1 h-px bg-border', className)}
      {...props}
    />
  );
}

function SelectScrollUpButton({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn('flex cursor-default items-center justify-center py-1', className)}
      {...props}
    >
      <ChevronUpIcon className="size-4" aria-hidden="true" />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn('flex cursor-default items-center justify-center py-1', className)}
      {...props}
    >
      <ChevronDownIcon className="size-4" aria-hidden="true" />
    </SelectPrimitive.ScrollDownButton>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
