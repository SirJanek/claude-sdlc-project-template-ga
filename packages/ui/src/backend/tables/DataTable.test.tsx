import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DataTable, type DataTableColumn } from './DataTable';

afterEach(cleanup);

interface Row {
  id: string;
  name: string;
}
const columns: DataTableColumn<Row>[] = [{ key: 'name', header: 'Name', cell: (r) => r.name, className: 'w-1' }];
const rows = (n: number): Row[] => Array.from({ length: n }, (_, i) => ({ id: String(i + 1), name: `User ${i + 1}` }));
const bodyRows = () => document.querySelectorAll('tbody tr').length;

describe('DataTable', () => {
  it('shows loading while rows are undefined or isLoading is set', () => {
    render(<DataTable columns={columns} rows={undefined} getRowId={(r) => r.id} />);
    expect(screen.getByRole('status')).toBeTruthy();
    cleanup();
    render(<DataTable columns={columns} rows={rows(1)} getRowId={(r) => r.id} isLoading />);
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('shows the error with retry, taking precedence over rows', () => {
    const onRetry = vi.fn();
    render(
      <DataTable
        columns={columns}
        rows={rows(2)}
        getRowId={(r) => r.id}
        error={{ message: 'Boom' }}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByRole('alert').textContent).toContain('Boom');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('shows the default or a custom empty state', () => {
    render(<DataTable columns={columns} rows={[]} getRowId={(r) => r.id} />);
    expect(screen.getByText('Nothing here yet')).toBeTruthy();
    cleanup();
    render(
      <DataTable
        columns={columns}
        rows={[]}
        getRowId={(r) => r.id}
        emptyTitle="No users yet."
        emptyDescription="Invite someone."
      />,
    );
    expect(screen.getByText('Invite someone.')).toBeTruthy();
  });

  it('renders rows with row actions and no pager for a single page', () => {
    render(
      <DataTable
        columns={columns}
        rows={rows(2)}
        getRowId={(r) => r.id}
        rowActions={(r) => <button>Edit {r.name}</button>}
      />,
    );
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Edit User 2' })).toBeTruthy();
    expect(screen.queryByText(/Page 1 of/)).toBeNull();
  });

  it('paginates with Previous/Next and disables them at the edges', () => {
    render(<DataTable columns={columns} rows={rows(5)} getRowId={(r) => r.id} pageSize={2} />);
    const prev = screen.getByRole('button', { name: 'Previous' }) as HTMLButtonElement;
    const next = screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement;
    expect(screen.getByText('Page 1 of 3')).toBeTruthy();
    expect(prev.disabled).toBe(true);
    fireEvent.click(next);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Page 3 of 3')).toBeTruthy();
    expect(bodyRows()).toBe(1);
    expect((screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(screen.getByText('Page 2 of 3')).toBeTruthy();
  });
});
