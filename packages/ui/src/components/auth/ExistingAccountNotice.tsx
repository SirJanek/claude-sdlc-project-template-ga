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
      className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
    >
      {EXISTING_ACCOUNT_NOTICE}
    </p>
  );
}
