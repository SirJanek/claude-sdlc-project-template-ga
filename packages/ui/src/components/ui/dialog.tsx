'use client';

import * as React from 'react';
import { cn } from 'cn';
import { XIcon } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';

// DevMentor dialog (shadcn, adapted in stage 2 batch 3). 6 px radius, NO shadow — separated by a
// --border-strong outline and the --overlay backdrop (PROPOSAL token). No entrance animation.
// Close button 40 px with aria-label; padding p-panel; max-w-md.

function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}
function DialogTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}
function DialogClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}
function DialogPortal(props: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return <DialogPrimitive.Overlay data-slot="dialog-overlay" className={cn('fixed inset-0 z-50 bg-overlay', className)} {...props} />;
}

const dialogSurface =
  'fixed top-1/2 left-1/2 z-50 grid w-full max-w-md -translate-x-1/2 -translate-y-1/2 gap-stack rounded-lg border border-border-strong bg-background p-panel text-foreground';

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { showCloseButton?: boolean }) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content data-slot="dialog-content" className={cn(dialogSurface, className)} {...props}>
        {children}
        {showCloseButton ? (
          <DialogPrimitive.Close
            aria-label="Close"
            className="absolute top-2 right-2 inline-flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring [&_svg]:size-4"
          >
            <XIcon aria-hidden="true" />
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="dialog-header" className={cn('grid gap-1 pr-10', className)} {...props} />;
}
function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="dialog-footer" className={cn('flex flex-wrap justify-end gap-inline', className)} {...props} />;
}
function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title data-slot="dialog-title" className={cn('text-lg font-semibold', className)} {...props} />;
}
function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description data-slot="dialog-description" className={cn('text-base text-muted-foreground', className)} {...props} />;
}

export {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogOverlay, DialogPortal, DialogTitle, DialogTrigger, dialogSurface,
};
