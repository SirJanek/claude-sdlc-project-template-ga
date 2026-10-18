import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({ usePathname: () => '/admin' }));

import AdminLayout from './layout';

afterEach(cleanup);

describe('admin layout', () => {
  it('wraps the page in a header with the navigation and the dev-access warning', () => {
    render(
      <AdminLayout>
        <p>page body</p>
      </AdminLayout>,
    );
    expect(screen.getByRole('banner')).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Admin' })).toBeTruthy();
    expect(screen.getByText('Local only — dev access, no auth')).toBeTruthy();
    expect(screen.getByText('page body')).toBeTruthy();
  });
});
