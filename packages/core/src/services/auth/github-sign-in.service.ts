import { randomBytes } from 'node:crypto';
import type { Logger } from 'pino';
import { z } from 'zod';
import type { Env } from '../../config/env';
import { GitHubEmailUnverifiedError } from '../../http/errors';
import {
  buildGitHubStateCookie,
  clearGitHubStateCookie,
  signGitHubStateToken,
  verifyGitHubStateToken,
} from '../../http/github-state';
import { intentRoleSchema } from '../../validators/auth/email-link-start.schema';
import { nextPathSchema } from '../../validators/auth/next-path.schema';
import type { GitHubClient } from '../github/github-client.port';
import type { AuthService } from './auth.service';

/** `?error=` values the sign-in page renders (spec › API Contracts, Edge Cases). */
export const GITHUB_ERROR = {
  /** Bad `role` or `next`, or GitHub sign-in is not configured. */
  invalidRequest: 'invalid_request',
  /** Denied consent, state mismatch, missing or stale state cookie, a bad code, GitHub down or slow. */
  failed: 'github_failed',
  /** GitHub has not verified the account's primary e-mail. */
  emailUnverified: 'github_email_unverified',
} as const;

/** What a route turns into a redirect `Response`: status, `Location` and the cookies to set. */
export interface RedirectOutcome {
  status: 302 | 303;
  location: string;
  cookies: string[];
}

/** Query of `GET /api/auth/github/start` — the same role and path rules as a sign-up link. */
export const githubStartSchema = z.object({
  role: intentRoleSchema.optional(),
  next: nextPathSchema.optional(),
});

const SIGN_IN_PATH = '/sign-in';
const signInWithError = (code: string) => `${SIGN_IN_PATH}?${new URLSearchParams({ error: code })}`;
const random = () => randomBytes(32).toString('base64url');

/**
 * The GitHub OAuth flow (spec › Flows 2), request-scoped: `start` validates the intent and sends the
 * browser to GitHub with `state` + PKCE remembered in a signed, short-lived cookie; `callback` checks
 * the echoed `state` against that cookie, exchanges the code through the GitHubClient port and signs
 * the person in through AuthService. Every failure is a redirect to `/sign-in?error=…` with the state
 * cookie cleared — the person always gets the same generic message, the reason goes to the log.
 */
export class GitHubSignInService {
  private readonly env: Env;
  private readonly logger: Logger;
  private readonly githubClient: GitHubClient | null;
  private readonly authService: AuthService;

  constructor({
    env,
    logger,
    githubClient,
    authService,
  }: {
    env: Env;
    logger: Logger;
    githubClient: GitHubClient | null;
    authService: AuthService;
  }) {
    this.env = env;
    this.logger = logger;
    this.githubClient = githubClient;
    this.authService = authService;
  }

  async start(query: URLSearchParams, now = new Date()): Promise<RedirectOutcome> {
    const intent = githubStartSchema.safeParse(Object.fromEntries(query));
    if (!this.githubClient || !intent.success) {
      return { status: 302, location: signInWithError(GITHUB_ERROR.invalidRequest), cookies: [] };
    }
    const state = random();
    const codeVerifier = random();
    const token = await signGitHubStateToken({ state, codeVerifier, ...intent.data }, this.env.AUTH_SECRET, now);
    return {
      status: 302,
      location: this.githubClient.createAuthorizationUrl(state, codeVerifier).toString(),
      cookies: [buildGitHubStateCookie(token, this.env)],
    };
  }

  async callback(query: URLSearchParams, stateCookie: string | undefined, now = new Date()): Promise<RedirectOutcome> {
    const fail = (code: string, reason: string): RedirectOutcome => {
      this.logger.warn({ event: 'github.sign_in.failed', reason }, 'GitHub sign-in did not complete');
      return { status: 303, location: signInWithError(code), cookies: [clearGitHubStateCookie(this.env)] };
    };
    if (!this.githubClient) return fail(GITHUB_ERROR.invalidRequest, 'github sign-in is not configured');
    if (stateCookie === undefined) return fail(GITHUB_ERROR.failed, 'no state cookie');
    const claims = await verifyGitHubStateToken(stateCookie, this.env.AUTH_SECRET, now);
    if (!claims) return fail(GITHUB_ERROR.failed, 'state cookie invalid or expired');
    const denied = query.get('error');
    if (denied !== null) return fail(GITHUB_ERROR.failed, `provider error: ${denied}`);
    if (query.get('state') !== claims.state) return fail(GITHUB_ERROR.failed, 'state mismatch');
    const code = query.get('code');
    if (!code) return fail(GITHUB_ERROR.failed, 'no code');
    let signedIn;
    try {
      const user = await this.githubClient.exchangeCode(code, claims.codeVerifier);
      signedIn = await this.authService.signInWithGitHub(user, { role: claims.role, next: claims.next }, now);
    } catch (error) {
      if (error instanceof GitHubEmailUnverifiedError)
        return fail(GITHUB_ERROR.emailUnverified, 'primary e-mail unverified');
      // Any other failure (exchange, timeout, database) is a generic failure: closed, never a 500 page.
      this.logger.warn({ err: error }, 'GitHub sign-in failed');
      return fail(GITHUB_ERROR.failed, error instanceof Error ? error.message : 'unknown');
    }
    return {
      status: 303,
      location: signedIn.next,
      cookies: [clearGitHubStateCookie(this.env), await this.authService.startSession(signedIn, now)],
    };
  }
}
