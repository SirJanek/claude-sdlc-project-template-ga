/** What a GitHub sign-in needs to know about the person, and nothing more (no access token leaves the adapter). */
export interface GitHubUser {
  /** GitHub's numeric user id, as text — stable across renames and e-mail changes. */
  githubId: string;
  /** The primary e-mail with GitHub's own verification flag; `null` when the account exposes none. */
  primaryEmail: { email: string; verified: boolean } | null;
  /** Display name, when GitHub has one. */
  name: string | null;
}

/**
 * Thrown by an adapter for anything that is not a successful exchange: the person denied consent,
 * GitHub answered with an error or did not answer within the timeout. The reason is for logs only;
 * the person always sees the same message (spec › Edge Cases).
 */
export class GitHubClientError extends Error {
  readonly reason: 'denied' | 'timeout' | 'provider';

  constructor(reason: 'denied' | 'timeout' | 'provider', message = `GitHub sign-in failed (${reason})`) {
    super(message);
    this.name = 'GitHubClientError';
    this.reason = reason;
  }
}

/**
 * Port for GitHub OAuth (engineering standards › Dependency Inversion). The flow owns `state` and the
 * PKCE verifier; the adapter only turns them into the authorization URL and, later, the code into a
 * user. Chosen by GITHUB_ADAPTER in the container: `real` (arctic) or `fake` (tests, local).
 */
export interface GitHubClient {
  /** Where to send the browser; the adapter adds `state` and the PKCE challenge derived from `codeVerifier`. */
  createAuthorizationUrl(state: string, codeVerifier: string): URL;
  /** Exchanges the callback's `code` (with the PKCE verifier) for the user; rejects with GitHubClientError. */
  exchangeCode(code: string, codeVerifier: string): Promise<GitHubUser>;
}
