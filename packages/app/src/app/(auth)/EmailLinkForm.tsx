'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiCall } from '@mentorhub/ui';

/** Messages behind `?error=` (set by redirects — the GitHub routes); anything unknown is generic. */
const ERROR_MESSAGES: Record<string, string> = {
  link_invalid: 'This link has expired or was already used — send a new one.',
  invalid_request: 'That sign-in request was not valid — please try again.',
  github_failed: "GitHub sign-in didn't complete — try again.",
  github_email_unverified: "Your GitHub e-mail isn't verified — verify it on GitHub or use an e-mail link.",
};
const GENERIC_ERROR = "Sign-in didn't complete — please try again.";

export function errorMessage(code: string | undefined): string | null {
  if (!code) return null;
  return ERROR_MESSAGES[code] ?? GENERIC_ERROR;
}

/**
 * The e-mail-link form shared by `/sign-in` and `/sign-up/mentor` (the `(auth)` group's client part; it
 * needs `next/navigation`, so it lives in `app`, not `ui`). `intentRole` is sent with the request and
 * carried to `/check-email` so a resend keeps it. The response is the same for known and unknown
 * e-mails, so the form never learns whether an account exists.
 */
export function EmailLinkForm({
  next,
  errorCode,
  intentRole,
  submitLabel = 'Send me a sign-in link',
}: {
  next?: string;
  errorCode?: string;
  intentRole?: 'mentor';
  submitLabel?: string;
}) {
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
      body: JSON.stringify({ email, ...(intentRole ? { intentRole } : {}), ...(next ? { next } : {}) }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.fieldErrors?.email?.[0] ?? result.error.message);
      return;
    }
    const params = new URLSearchParams({
      email,
      ...(intentRole ? { role: intentRole } : {}),
      ...(next ? { next } : {}),
    });
    router.push(`/check-email?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
      {error ? (
        <p
          ref={alertRef}
          role="alert"
          tabIndex={-1}
          className="rounded-md border border-status-danger bg-status-danger-bg p-3 text-sm text-status-danger"
        >
          {error}
        </p>
      ) : null}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-secondary-foreground">
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
          className="mt-1 w-full rounded-lg border border-border-strong px-3 py-2 focus:border-ring focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
      >
        {submitLabel}
      </button>
      <p className="text-sm text-muted-foreground">No password. We&apos;ll e-mail you a link that signs you in.</p>
    </form>
  );
}
