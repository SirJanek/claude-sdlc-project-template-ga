import * as React from 'react';
import { cn } from 'cn';

// Page header (agent test 1 gap). One h1 per screen, optional description and actions.
// Typography: h1 = text-xl semibold (PROPOSAL — przyjęte domyślnie, do weryfikacji); sections inside use h2 text-lg.
export interface PageHeaderProps {
  title: string;
  /** One sentence: what this screen is for. */
  description?: React.ReactNode;
  /** At most one `default` Button; others outline/ghost (R01.5). Screens may have none. */
  actions?: React.ReactNode;
  /** id for aria-labelledby on the page section. */
  id?: string;
  className?: string;
}

export function PageHeader({ title, description, actions, id, className }: PageHeaderProps) {
  return (
    <header data-slot="page-header" className={cn('flex flex-wrap items-start justify-between gap-inline', className)}>
      <div className="grid min-w-0 gap-1">
        <h1 id={id} className="text-xl font-semibold break-words">
          {title}
        </h1>
        {description ? <p className="max-w-(--measure) text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-inline">{actions}</div> : null}
    </header>
  );
}
