'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiCall } from '@mentorhub/ui';

/** Messages behind `?error=` (set by redirects, e.g. GitHub in Phase 2); anything unknown is generic. */
const ERROR_MESSAGES: Record<string, string> = {
  link_invalid: 'This link has expired or was already used — send a new one.',
  invalid_request: 'That sign-in request was not valid — please try again.',
};
const GENERIC_ERROR = "Sign-in didn't complete — please try again.";

export function errorMessage(code: string | undefined): string | null {
  if (!code) return null;
  return ERROR_MESSAGES[code] ?? GENERIC_ERROR;
}

// Colocated with the sign-in page (its only consumer).
export function SignInForm({ next, errorCode }: { next?: string; errorCode?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(errorMessage(errorCode));
  const [busy, setBusy] = useState(false);
  const alertRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (error) alertRef.current?.focus();
  }, [error]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await apiCall<{ sent: true }>('/api/auth/email/start', {
      method: 'POST',
      body: JSON.stringify({ email, ...(next ? { next } : {}) }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.fieldErrors?.email?.[0] ?? result.error.message);
      return;
    }
    const params = new URLSearchParams({ email, ...(next ? { next } : {}) });
    router.push(`/check-email?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
      {error ? (
        <p
          ref={alertRef}
          role="alert"
          tabIndex={-1}
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      ) : null}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-600 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
      >
        Send me a sign-in link
      </button>
      <p className="text-sm text-slate-600">No password. We&apos;ll e-mail you a link that signs you in.</p>
    </form>
  );
}
