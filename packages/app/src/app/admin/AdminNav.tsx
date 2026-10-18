'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@mentorhub/ui';

const LINKS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/users', label: 'Users' },
] as const;

// Colocated with the admin layout (its only consumer); promote to ui/src/backend/ when a second panel needs it.
export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex gap-1">
      {LINKS.map(({ href, label }) => {
        // Exact match: /admin must not stay "current" on /admin/users.
        const current = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? 'page' : undefined}
            className={cn(
              'focus-visible:ring-ring rounded-md px-3 py-1.5 text-sm font-medium outline-none focus-visible:ring-2',
              current ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent',
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
