import { describe, expect, it, vi } from 'vitest';

const redirect = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ redirect }));

describe('/admin', () => {
  it('redirects to /admin/users', async () => {
    const { default: AdminPage } = await import('./page');
    AdminPage();
    expect(redirect).toHaveBeenCalledWith('/admin/users');
  });
});
