'use client';

import * as React from 'react';
import { cn } from 'cn';
import { Toast as ToastPrimitive } from 'radix-ui';

// DevMentor toast (Radix Toast — no sonner, stage 2 batch 4). ONLY for confirming a save ("Saved",
// "Availability saved") — never errors (stage 0 decision; errors go to Alert / ErrorState next to the cause).
// Neutral surface, --border-strong, no shadow, no animation, role status (polite), 4 s.

type ToastMessage = { id: number; text: string };
const ToastContext = React.createContext<((text: string) => void) | null>(null);

function ToastProvider({ children, duration = 4000 }: { children: React.ReactNode; duration?: number }) {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);
  const showSaved = React.useCallback((text: string) => {
    setToasts((t) => [...t, { id: Date.now() + Math.random(), text }]);
  }, []);
  return (
    <ToastContext.Provider value={showSaved}>
      <ToastPrimitive.Provider duration={duration}>
        {children}
        {toasts.map((t) => (
          <Toast key={t.id} onOpenChange={(open) => !open && setToasts((all) => all.filter((x) => x.id !== t.id))}>
            {t.text}
          </Toast>
        ))}
        <ToastViewport />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

/** Returns `showSaved(text)`. Use only for successful saves. */
function useSavedToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useSavedToast must be used inside <ToastProvider>');
  return ctx;
}

function Toast({ className, children, ...props }: React.ComponentProps<typeof ToastPrimitive.Root>) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      type="background"
      defaultOpen
      className={cn(
        'rounded-lg border border-border-strong bg-popover p-panel text-base text-popover-foreground',
        className,
      )}
      {...props}
    >
      <ToastPrimitive.Title>{children}</ToastPrimitive.Title>
    </ToastPrimitive.Root>
  );
}

function ToastViewport({ className, ...props }: React.ComponentProps<typeof ToastPrimitive.Viewport>) {
  return (
    <ToastPrimitive.Viewport
      className={cn(
        'fixed right-0 bottom-0 z-50 m-0 flex w-full max-w-sm list-none flex-col gap-inline p-panel outline-hidden',
        className,
      )}
      {...props}
    />
  );
}

export { Toast, ToastProvider, ToastViewport, useSavedToast };
