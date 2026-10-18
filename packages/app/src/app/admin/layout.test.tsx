import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';

const apiCall = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ usePathname: () => '/admin' }));
// SessionMenu (in ui) imports apiCall by relative path, so the mock targets that module, not the package entry.
vi.mock('../../../../ui/src/backend/api/apiCall', () => ({ apiCall }));

import AdminLayout from './layout';

afterEach(cleanup);

describe('admin layout', () => {
  it('wraps the page in a header with the navigation and the session menu (dev admin marked as local only)', async () => {
    apiCall.mockResolvedValue({
      ok: true,
      status: 200,
      data: { id: 'dev-admin', email: 'dev-admin@localhost', name: 'Dev admin', role: 'admin', emailVerified: true },
    });
    await act(async () => {
      render(
        <AdminLayout>
          <p>page body</p>
        </AdminLayout>,
      );
    });
    expect(screen.getByRole('banner')).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Admin' })).toBeTruthy();
    expect(screen.getByText('Dev admin — local only')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy();
    expect(screen.getByText('page body')).toBeTruthy();
  });
});
