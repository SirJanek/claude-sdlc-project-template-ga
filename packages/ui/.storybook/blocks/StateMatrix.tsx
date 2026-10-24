import type { ReactNode } from 'react';

// Documentation helper only (prompt rule 5): lays real components out in a state grid. Never exported from the package.
// Hover, focus and pressed cells use data-preview-state (see .storybook/preview.css), so the frozen preview runs
// the component's own :hover / :focus-visible / :active declarations.

export const PREVIEW_STATES = ['hover', 'focus', 'active'] as const;

export function StateMatrix({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: string[];
  rows: { label: string; cells: ReactNode[] }[];
}) {
  return (
    <div className="overflow-x-auto" role="region" aria-label={caption} tabIndex={0}>
      <table className="w-full border-collapse text-left text-base text-foreground">
        <caption className="pb-inline text-left text-sm text-muted-foreground">{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className="border-b border-border p-inline text-sm font-medium text-muted-foreground">
              Variant
            </th>
            {columns.map((c) => (
              <th
                key={c}
                scope="col"
                className="border-b border-border p-inline text-sm font-medium text-muted-foreground"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row" className="border-b border-border p-inline text-sm font-medium">
                {row.label}
              </th>
              {row.cells.map((cell, i) => (
                <td key={columns[i]} className="border-b border-border p-inline align-middle">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A 320 px frame for "narrow screen" stories. */
export function Narrow({ children }: { children: ReactNode }) {
  return <div className="w-full max-w-80 border border-dashed border-border p-panel">{children}</div>;
}
