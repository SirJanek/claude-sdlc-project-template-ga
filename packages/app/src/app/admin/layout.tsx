import { Badge } from '@mentorhub/ui';
import { AdminNav } from './AdminNav';

// Shared shell for every /admin/** page. WARNING: no real authentication yet — dev access only.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="font-semibold">MentorHub Admin</span>
            <AdminNav />
          </div>
          <Badge variant="destructive">Local only — dev access, no auth</Badge>
        </div>
      </header>
      {children}
    </>
  );
}
