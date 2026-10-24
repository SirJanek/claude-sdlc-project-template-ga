// DEPRECATED (agent test 1): spinner + opacity break the design system (first load → Skeleton,
// action running → button aria-busy + "Saving…"). Kept for the admin panel only; do not use in new screens.
/** @deprecated Use `Skeleton` (first load) or a busy button (action in progress). */
export function LoadingMessage({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
      <span className="size-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
      {label}
    </div>
  );
}
