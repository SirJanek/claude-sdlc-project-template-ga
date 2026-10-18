import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

const apiCall = vi.hoisted(() => vi.fn());
vi.mock('@mentorhub/ui', async (original) => ({ ...(await original<typeof import('@mentorhub/ui')>()), apiCall }));

import AdminDashboardPage from './page';

afterEach(() => {
  cleanup();
  apiCall.mockReset();
});

async function renderPage() {
  await act(async () => {
    render(<AdminDashboardPage />);
  });
}

describe('/admin dashboard', () => {
  it('shows Connected when the database is up', async () => {
    apiCall.mockResolvedValue({ ok: true, data: { status: 'ok', db: 'up' }, status: 200 });
    await renderPage();
    expect(apiCall).toHaveBeenCalledWith('/api/admin/health');
    expect(screen.getByRole('heading', { name: 'Admin · Dashboard' })).toBeTruthy();
    expect(screen.getByText('Connected').dataset.variant).toBe('default');
    expect(screen.queryByText('Database unreachable')).toBeNull();
  });

  it('shows a clear unreachable state, not a crash, when the database is down', async () => {
    apiCall.mockResolvedValue({ ok: true, data: { status: 'degraded', db: 'down' }, status: 200 });
    await renderPage();
    expect(screen.getByText('Database unreachable').dataset.variant).toBe('destructive');
    expect(screen.queryByText('Connected')).toBeNull();
  });

  it('shows a loading state until the report arrives', async () => {
    apiCall.mockReturnValue(new Promise(() => {}));
    await renderPage();
    expect(screen.getByRole('status').textContent).toContain('Checking database');
  });

  it('shows the denial in an alert and retries on demand', async () => {
    apiCall.mockResolvedValueOnce({
      ok: false,
      error: { code: 'unauthorized', message: 'Sign-in required.' },
      status: 401,
    });
    await renderPage();
    expect(screen.getByRole('alert').textContent).toContain('Sign-in required.');
    apiCall.mockResolvedValueOnce({ ok: true, data: { status: 'ok', db: 'up' }, status: 200 });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    });
    expect(screen.getByText('Connected')).toBeTruthy();
    expect(apiCall).toHaveBeenCalledTimes(2);
  });
});
