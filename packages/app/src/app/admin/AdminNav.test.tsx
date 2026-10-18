import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const usePathname = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ usePathname }));

import { AdminNav } from './AdminNav';

afterEach(() => {
  cleanup();
  usePathname.mockReset();
});

function current() {
  return screen.getAllByRole('link').filter((a) => a.getAttribute('aria-current') === 'page');
}

describe('AdminNav', () => {
  it('links to Dashboard and Users inside a labelled nav', () => {
    usePathname.mockReturnValue('/admin');
    render(<AdminNav />);
    expect(screen.getByRole('navigation', { name: 'Admin' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Dashboard' }).getAttribute('href')).toBe('/admin');
    expect(screen.getByRole('link', { name: 'Users' }).getAttribute('href')).toBe('/admin/users');
  });

  it('marks only Dashboard as the current page on /admin', () => {
    usePathname.mockReturnValue('/admin');
    render(<AdminNav />);
    expect(current().map((a) => a.textContent)).toEqual(['Dashboard']);
  });

  it('marks only Users as the current page on /admin/users', () => {
    usePathname.mockReturnValue('/admin/users');
    render(<AdminNav />);
    expect(current().map((a) => a.textContent)).toEqual(['Users']);
  });
});
