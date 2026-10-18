'use client';

import { useEffect, useState } from 'react';
import { apiCall } from '../../backend/api/apiCall';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

/** Client-side view of GET /api/auth/me (declared here: ui never imports core). */
export interface SessionUserView {
  id: string;
  email: string;
  name: string | null;
  role: string;
  emailVerified: boolean;
}

type State = { kind: 'loading' } | { kind: 'guest' } | { kind: 'user'; user: SessionUserView };

const DEV_ADMIN_ID = 'dev-admin';

/**
 * Signed-in header widget: the person's name (e-mail when the name is not set yet) and "Sign out",
 * or a "Sign in" link for a guest. Sign-out POSTs through apiCall (CSRF header) and then reloads
 * the site root so every server-rendered part forgets the session.
 */
export function SessionMenu({
  signInHref = '/sign-in',
  onSignedOut = () => window.location.assign('/'),
}: {
  signInHref?: string;
  onSignedOut?: () => void;
}) {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let active = true;
    void apiCall<SessionUserView>('/api/auth/me').then((result) => {
      if (active) setState(result.ok ? { kind: 'user', user: result.data } : { kind: 'guest' });
    });
    return () => {
      active = false;
    };
  }, []);

  if (state.kind === 'loading') return <span data-slot="session-menu" aria-busy="true" />;
  if (state.kind === 'guest') {
    return (
      <a data-slot="session-menu" href={signInHref} className="text-sm font-medium hover:underline">
        Sign in
      </a>
    );
  }
  const { user } = state;
  const signOut = async () => {
    await apiCall('/api/auth/sign-out', { method: 'POST', body: '{}' });
    onSignedOut();
  };
  return (
    <div data-slot="session-menu" className="flex items-center gap-3 text-sm">
      <span data-slot="session-user" className="font-medium">
        {user.name ?? user.email}
      </span>
      {user.id === DEV_ADMIN_ID ? <Badge variant="destructive">Dev admin — local only</Badge> : null}
      <Button variant="outline" size="sm" onClick={signOut}>
        Sign out
      </Button>
    </div>
  );
}
