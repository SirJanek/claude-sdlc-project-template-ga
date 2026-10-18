import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

const apiCall = vi.hoisted(() => vi.fn());
vi.mock('@mentorhub/ui', async (original) => ({ ...(await original<typeof import('@mentorhub/ui')>()), apiCall }));

import AdminUsersPage from './page';

afterEach(() => {
  cleanup();
  apiCall.mockReset();
});

const users = [
  { id: '1', name: 'Anna', email: 'anna@x.io', role: 'mentor', createdAt: '2026-10-17T10:00:00.000Z' },
  { id: '2', name: 'Ops', email: 'ops@x.io', role: 'admin', createdAt: '2026-10-18T10:00:00.000Z' },
];

async function renderPage() {
  await act(async () => {
    render(<AdminUsersPage />);
  });
}

describe('/admin/users', () => {
  it('loads users through apiCall and renders them in the DataTable', async () => {
    apiCall.mockResolvedValue({ ok: true, data: users, status: 200 });
    await renderPage();
    expect(apiCall).toHaveBeenCalledWith('/api/users');
    expect(screen.getByRole('heading', { name: 'Admin · Users' })).toBeTruthy();
    expect(screen.getByText('anna@x.io')).toBeTruthy();
    expect(screen.getByText('admin').dataset.slot).toBe('badge');
    expect(screen.getByText('17/10/2026')).toBeTruthy();
  });

  it('shows the empty state', async () => {
    apiCall.mockResolvedValue({ ok: true, data: [], status: 200 });
    await renderPage();
    expect(screen.getByText('No users yet.')).toBeTruthy();
  });

  it('shows the API error and reloads on retry', async () => {
    apiCall
      .mockResolvedValueOnce({ ok: false, status: 401, error: { code: 'unauthorized', message: 'Sign-in required.' } })
      .mockResolvedValueOnce({ ok: true, data: users, status: 200 });
    await renderPage();
    expect(screen.getByRole('alert').textContent).toContain('Sign-in required.');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Try again' })));
    expect(screen.getByText('ops@x.io')).toBeTruthy();
    expect(apiCall).toHaveBeenCalledTimes(2);
  });
});
