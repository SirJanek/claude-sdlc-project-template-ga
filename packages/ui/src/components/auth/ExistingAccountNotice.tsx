/** Shown once on the landing page after a mentor sign-up link was used for an e-mail that already had an account. */
export const EXISTING_ACCOUNT_NOTICE =
  'An account with this e-mail already exists — you are signed in to it; its role was not changed.';

/**
 * One-time notice for spec › Flows 3 (E01-S01 AC3). Presentational: the page decides whether to render
 * it (from the validated `?notice=` parameter), so the text never depends on URL input.
 */
export function ExistingAccountNotice() {
  return (
    <p
      data-slot="account-notice"
      role="status"
      className="rounded-md border border-status-warning bg-status-warning-bg p-3 text-sm text-status-warning"
    >
      {EXISTING_ACCOUNT_NOTICE}
    </p>
  );
}
