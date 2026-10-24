import type { ReactNode } from 'react';

// Empty state (stage 2 batch 4): reused as the design-system primitive. Says why it is empty + one next step.
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="py-10 text-center">
      <p className="font-medium">{title}</p>
      {description ? <p className="mt-1 text-base text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
