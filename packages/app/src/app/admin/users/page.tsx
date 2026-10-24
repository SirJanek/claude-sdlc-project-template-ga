'use client';

import { useCallback, useEffect, useState } from 'react';
import type { UserListItem } from '@mentorhub/core';
import {
  apiCall,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  type DataTableColumn,
} from '@mentorhub/ui';

// Reference page for every list screen: apiCall for data, DataTable for rendering and states.
// WARNING: no real authentication yet — /api/users answers only with ALLOW_DEV_ADMIN=1 outside production.

const columns: DataTableColumn<UserListItem>[] = [
  { key: 'name', header: 'Name', cell: (user) => <span className="font-medium">{user.name}</span> },
  { key: 'email', header: 'Email', cell: (user) => user.email },
  {
    key: 'role',
    header: 'Role',
    cell: (user) => <Badge variant="neutral">{user.role}</Badge>,
  },
  { key: 'created', header: 'Created', cell: (user) => new Date(user.createdAt).toLocaleDateString('en-GB') },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserListItem[] | undefined>(undefined);
  const [error, setError] = useState<{ message: string } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setUsers(undefined);
    const result = await apiCall<UserListItem[]>('/api/users');
    if (result.ok) setUsers(result.data);
    else setError({ message: result.error.message });
  }, []);

  useEffect(() => {
    // Initial load on mount; state updates happen after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Admin · Users</h1>
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Newest first, up to 50.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            rows={users}
            getRowId={(user) => user.id}
            error={error}
            onRetry={load}
            emptyTitle="No users yet."
          />
        </CardContent>
      </Card>
    </main>
  );
}
