'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { EmptyState } from '../feedback/EmptyState';
import { ErrorMessage } from '../feedback/ErrorMessage';
import { LoadingMessage } from '../feedback/LoadingMessage';
import { paginate } from './pagination';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[] | undefined;
  getRowId: (row: T) => string;
  isLoading?: boolean;
  error?: { message: string } | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  pageSize?: number;
  rowActions?: (row: T) => ReactNode;
}

const DEFAULT_PAGE_SIZE = 20;

/** Column-config list with built-in loading, error, empty states, pagination and row actions. */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  isLoading = false,
  error = null,
  onRetry,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  pageSize = DEFAULT_PAGE_SIZE,
  rowActions,
}: DataTableProps<T>) {
  const [page, setPage] = useState(1);

  if (error) return <ErrorMessage message={error.message} onRetry={onRetry} />;
  if (isLoading || rows === undefined) return <LoadingMessage />;
  if (rows.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} />;

  const current = paginate(rows, page, pageSize);
  return (
    <div data-slot="data-table">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.header}
              </TableHead>
            ))}
            {rowActions ? <TableHead className="text-right">Actions</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {current.rows.map((row) => (
            <TableRow key={getRowId(row)}>
              {columns.map((column) => (
                <TableCell key={column.key} className={column.className}>
                  {column.cell(row)}
                </TableCell>
              ))}
              {rowActions ? <TableCell className="text-right">{rowActions(row)}</TableCell> : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {current.pageCount > 1 ? (
        <div className="mt-4 flex items-center justify-end gap-2 text-sm">
          <span className="text-muted-foreground">
            Page {current.page} of {current.pageCount}
          </span>
          <Button variant="outline" size="sm" disabled={current.page === 1} onClick={() => setPage(current.page - 1)}>
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={current.page === current.pageCount}
            onClick={() => setPage(current.page + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
