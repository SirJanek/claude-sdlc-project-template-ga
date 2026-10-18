'use client';

import { useEffect, useRef, useState } from 'react';
import { apiCall } from '@mentorhub/ui';

/**
 * Where to go after sign-in. The server validated `next` already; this is the last line of defence
 * before `window.location.assign`: only a path that stays on this origin is used, else the root.
 */
export function safeDestination(next: string, origin: string): string {
  const url = new URL(next, origin);
  return url.origin === origin && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

// Colocated with the confirm page (its only consumer). Only this button's POST consumes the token.
export function ConfirmSignIn({
  email,
  token,
  onSignedIn = (next) => window.location.assign(safeDestination(next, window.location.origin)),
}: {
  email: string;
  token: string;
  onSignedIn?: (next: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const alertRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (error) alertRef.current?.focus();
  }, [error]);

  async function confirm() {
    setBusy(true);
    const result = await apiCall<{ next: string }>('/api/auth/email/consume', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    if (!result.ok) {
      setBusy(false);
      setError(result.error.message);
      return;
    }
    onSignedIn(result.data.next);
  }

  return (
    <div className="mt-8 space-y-4">
      {error ? (
        <p
          ref={alertRef}
          role="alert"
          tabIndex={-1}
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}{' '}
          <a href="/sign-in" className="underline">
            Send a new one
          </a>
        </p>
      ) : null}
      <button
        type="button"
        onClick={confirm}
        disabled={busy}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
      >
        Sign in as {email}
      </button>
    </div>
  );
}
