import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@mentorhub/ui';
import { createRequestScope } from '@/server/container';
import type { UserListItem } from '@/server/services/users';

// Admin (backend) page — built from shadcn/ui components in @mentorhub/ui.
// WARNING: no authentication yet (see spec 2026-10-17-stack-bootstrap › Concerns). Local use only.
export const dynamic = 'force-dynamic';

async function loadUsers(): Promise<{ users: UserListItem[] } | { error: string }> {
  try {
    const scope = await createRequestScope();
    return { users: await scope.cradle.userService.list() };
  } catch {
    return { error: 'The database is not reachable. Start it with `make db-up` and try again.' };
  }
}

export default async function AdminPage() {
  const result = await loadUsers();
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin · Users</h1>
        <Badge variant="destructive">Local only — no auth</Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Newest first, up to 50.</CardDescription>
        </CardHeader>
        <CardContent>
          {'error' in result ? (
            <p role="alert" className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
              {result.error}
            </p>
          ) : result.users.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No users yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>{u.role}</Badge>
                    </TableCell>
                    <TableCell>{new Date(u.createdAt).toLocaleDateString('en-GB')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
