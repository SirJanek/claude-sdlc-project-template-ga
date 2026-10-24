import { Button } from '../../components/ui/button';

// Error state (stage 2 batch 4): reused as the design-system ErrorState — what happened + what to do, retry.
export function ErrorMessage({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="rounded-lg border border-border bg-status-danger-bg p-panel text-base">
      <p className="font-semibold text-status-danger">{title}</p>
      <p className="mt-1 text-foreground">{message}</p>
      {onRetry ? (
        <Button variant="outline" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}


export { ErrorMessage as ErrorState };
