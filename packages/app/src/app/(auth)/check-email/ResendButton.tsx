'use client';

import { useEffect, useState } from 'react';
import { apiCall } from '@mentorhub/ui';

// Colocated with the check-email page (its only consumer).
export function ResendButton({ email, next, waitSeconds }: { email: string; next?: string; waitSeconds: number }) {
  const [secondsLeft, setSecondsLeft] = useState(waitSeconds);
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  async function resend() {
    const result = await apiCall<{ sent: true }>('/api/auth/email/start', {
      method: 'POST',
      body: JSON.stringify({ email, ...(next ? { next } : {}) }),
    });
    if (result.ok) {
      setStatus('sent');
      setMessage('A new link is on its way.');
      setSecondsLeft(waitSeconds);
    } else {
      setStatus('error');
      setMessage(result.error.message);
    }
  }

  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={resend}
        disabled={secondsLeft > 0}
        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
      >
        {secondsLeft > 0 ? `Send a new link (${secondsLeft}s)` : 'Send a new link'}
      </button>
      {message ? (
        <p role={status === 'error' ? 'alert' : 'status'} className="mt-3 text-sm text-slate-600">
          {message}
        </p>
      ) : null}
    </div>
  );
}
