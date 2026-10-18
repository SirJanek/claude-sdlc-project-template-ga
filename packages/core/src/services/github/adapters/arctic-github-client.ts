import { CodeChallengeMethod, OAuth2Client } from 'arctic';
import { z } from 'zod';
import { AUTH_LIMITS } from '../../../config/rules';
import { GitHubClientError, type GitHubClient, type GitHubUser } from '../github-client.port';

const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const TOKEN_URL = 'https://github.com/login/oauth/access_token';
const API_URL = 'https://api.github.com';
/** `user:email` reads the primary e-mail and its verification flag; `read:user` the id and name. Nothing else. */
const SCOPES = ['read:user', 'user:email'];
/** Our callback route — the OAuth app on GitHub must list exactly this URL. */
export const GITHUB_CALLBACK_PATH = '/api/auth/github/callback';

const userSchema = z.object({ id: z.number().int(), name: z.string().nullable().optional() });
const emailsSchema = z.array(z.object({ email: z.string(), primary: z.boolean(), verified: z.boolean() }));

/** The subset of arctic's OAuth2Client the adapter uses — injectable so tests need no network. */
export interface OAuth2Exchange {
  createAuthorizationURLWithPKCE(
    endpoint: string,
    state: string,
    method: CodeChallengeMethod,
    codeVerifier: string,
    scopes: string[],
  ): URL;
  validateAuthorizationCode(endpoint: string, code: string, codeVerifier: string): Promise<{ accessToken(): string }>;
}

export type FetchLike = (
  input: string,
  init: { headers: Record<string, string>; signal: AbortSignal },
) => Promise<Response>;

/**
 * Real adapter: GitHub OAuth through `arctic` with `state` + PKCE (S256), then the REST API for the
 * id, name and e-mails. Every outbound call is bounded by AUTH_LIMITS.githubTimeoutMs and any failure
 * — denied consent, a bad code, an unexpected body, a timeout — surfaces as GitHubClientError, so the
 * flow fails closed. The access token is used for the two API calls and never returned or logged.
 */
export class ArcticGitHubClient implements GitHubClient {
  private readonly oauth: OAuth2Exchange;
  private readonly fetch: FetchLike;
  private readonly timeoutMs: number;

  constructor({
    clientId,
    clientSecret,
    appUrl,
    oauth,
    fetch = (input, init) => globalThis.fetch(input, init),
    timeoutMs = AUTH_LIMITS.githubTimeoutMs,
  }: {
    clientId: string;
    clientSecret: string;
    appUrl: string;
    oauth?: OAuth2Exchange;
    fetch?: FetchLike;
    timeoutMs?: number;
  }) {
    this.oauth = oauth ?? new OAuth2Client(clientId, clientSecret, new URL(GITHUB_CALLBACK_PATH, appUrl).toString());
    this.fetch = fetch;
    this.timeoutMs = timeoutMs;
  }

  createAuthorizationUrl(state: string, codeVerifier: string): URL {
    return this.oauth.createAuthorizationURLWithPKCE(
      AUTHORIZE_URL,
      state,
      CodeChallengeMethod.S256,
      codeVerifier,
      SCOPES,
    );
  }

  async exchangeCode(code: string, codeVerifier: string): Promise<GitHubUser> {
    const tokens = await this.bounded(() => this.oauth.validateAuthorizationCode(TOKEN_URL, code, codeVerifier));
    const accessToken = tokens.accessToken();
    const [user, emails] = await Promise.all([
      this.api('/user', accessToken, userSchema),
      this.api('/user/emails', accessToken, emailsSchema),
    ]);
    const primary = emails.find((entry) => entry.primary) ?? null;
    return {
      githubId: String(user.id),
      primaryEmail: primary ? { email: primary.email, verified: primary.verified } : null,
      name: user.name ?? null,
    };
  }

  private async api<T>(path: string, accessToken: string, schema: z.ZodType<T>): Promise<T> {
    const response = await this.bounded((signal) =>
      this.fetch(`${API_URL}${path}`, {
        headers: { authorization: `Bearer ${accessToken}`, accept: 'application/vnd.github+json' },
        signal,
      }),
    );
    if (!response.ok) throw new GitHubClientError('provider', `GitHub API ${path} answered ${response.status}`);
    const parsed = schema.safeParse(await response.json());
    if (!parsed.success) throw new GitHubClientError('provider', `GitHub API ${path} answered an unexpected body`);
    return parsed.data;
  }

  /** Runs one outbound call under the timeout; a slow GitHub becomes a `timeout` error, any other rejection `provider`. */
  private async bounded<T>(run: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const expired = new Promise<never>((_, reject) =>
      controller.signal.addEventListener('abort', () => reject(new GitHubClientError('timeout'))),
    );
    try {
      return await Promise.race([run(controller.signal), expired]);
    } catch (error) {
      if (error instanceof GitHubClientError) throw error;
      throw new GitHubClientError('provider', error instanceof Error ? error.message : String(error));
    } finally {
      clearTimeout(timer);
    }
  }
}
