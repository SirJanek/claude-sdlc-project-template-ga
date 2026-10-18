'use client';

import { useCallback, useEffect, useState } from 'react';
import type { HealthReport } from '@mentorhub/core';
import {
  apiCall,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ErrorMessage,
  LoadingMessage,
} from '@mentorhub/ui';

// Dashboard: data through apiCall like every page. A server component awaiting the health check
// works in production but `next dev` crashes serialising the connection error, and a down database
// must render a state, not a 500. WARNING: no real authentication yet — dev access only.

export default function AdminDashboardPage() {
  const [report, setReport] = useState<HealthReport | undefined>(undefined);
  const [error, setError] = useState<{ message: string } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setReport(undefined);
    const result = await apiCall<HealthReport>('/api/admin/health');
    if (result.ok) setReport(result.data);
    else setError({ message: result.error.message });
  }, []);

  useEffect(() => {
    // Initial load on mount; state updates happen after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const up = report?.db === 'up';
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Admin · Dashboard</h1>
      <Card>
        <CardHeader>
          <CardTitle>Database</CardTitle>
          <CardDescription>Whether the app can reach its PostgreSQL database.</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <ErrorMessage message={error.message} onRetry={load} />
          ) : report ? (
            <Badge variant={up ? 'default' : 'destructive'}>{up ? 'Connected' : 'Database unreachable'}</Badge>
          ) : (
            <LoadingMessage label="Checking database…" />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
