import { SessionMenu } from '@mentorhub/ui';
import { AdminNav } from './AdminNav';

// Shared shell for every /admin/** page. The API behind it is admin-only (requireSession + requireRole);
// the header names the signed-in account (or the local dev admin) with a sign-out.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="font-semibold">MentorHub Admin</span>
            <AdminNav />
          </div>
          <SessionMenu />
        </div>
      </header>
      {children}
    </>
  );
}
