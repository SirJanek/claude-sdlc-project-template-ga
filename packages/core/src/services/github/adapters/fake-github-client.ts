import { readFileSync } from 'node:fs';
import type { Logger } from 'pino';
import { z } from 'zod';
import { GitHubClientError, type GitHubClient, type GitHubUser } from '../github-client.port';
import { GITHUB_CALLBACK_PATH } from './arctic-github-client';

/** The one code the fake provider ever issues; anything else is "GitHub rejected the code". */
export const FAKE_GITHUB_CODE = 'fake-github-code';

/**
 * What the fake answers with, written as JSON to GITHUB_FAKE_FILE by a test (or given in memory):
 * a user (verified, unverified or without an e-mail), `denied` (the person refused consent — the
 * provider sends the browser back with `error=access_denied`) or `timeout` (GitHub never answers).
 */
export const fakeGitHubScenarioSchema = z.union([
  z.object({ denied: z.literal(true) }),
  z.object({ timeout: z.literal(true) }),
  z.object({
    githubId: z.string().min(1),
    primaryEmail: z.object({ email: z.string().min(1), verified: z.boolean() }).nullable(),
    name: z.string().nullable().default(null),
  }),
]);
export type FakeGitHubScenario = z.infer<typeof fakeGitHubScenarioSchema>;

/** Used when no file and no scenario is given — a verified person, so `make dev` with the fake can sign in. */
export const DEFAULT_FAKE_GITHUB_USER: GitHubUser = {
  githubId: 'fake-github-1',
  primaryEmail: { email: 'fake.github@example.com', verified: true },
  name: 'Fake GitHub',
};

/**
 * Test/local adapter: "GitHub" is the app's own callback. The authorization URL points straight at
 * `/api/auth/github/callback` with the flow's `state` and a fixed code (or `error=access_denied`), and
 * the exchange answers with the configured scenario — re-read from GITHUB_FAKE_FILE on every call, so
 * an integration test changes the person between flows without restarting the server. Refused in
 * production by env.ts unless ALLOW_TEST_ADAPTERS=1.
 */
export class FakeGitHubClient implements GitHubClient {
  private readonly appUrl: string;
  private readonly file: string | undefined;
  private readonly scenario: FakeGitHubScenario;
  private readonly logger: Logger;

  constructor({
    env,
    logger,
    scenario = DEFAULT_FAKE_GITHUB_USER,
  }: {
    env: { APP_URL: string; GITHUB_FAKE_FILE?: string };
    logger: Logger;
    scenario?: FakeGitHubScenario;
  }) {
    this.appUrl = env.APP_URL;
    this.file = env.GITHUB_FAKE_FILE;
    this.scenario = scenario;
    this.logger = logger;
  }

  createAuthorizationUrl(state: string): URL {
    const url = new URL(GITHUB_CALLBACK_PATH, this.appUrl);
    url.searchParams.set('state', state);
    if ('denied' in this.current()) url.searchParams.set('error', 'access_denied');
    else url.searchParams.set('code', FAKE_GITHUB_CODE);
    return url;
  }

  async exchangeCode(code: string): Promise<GitHubUser> {
    if (code !== FAKE_GITHUB_CODE) throw new GitHubClientError('provider', 'fake GitHub: unknown code');
    const scenario = this.current();
    if ('denied' in scenario) throw new GitHubClientError('denied');
    if ('timeout' in scenario) throw new GitHubClientError('timeout');
    this.logger.info({ event: 'github.fake.exchange', githubId: scenario.githubId }, 'fake GitHub exchange');
    return scenario;
  }

  private current(): FakeGitHubScenario {
    if (!this.file) return this.scenario;
    // A malformed file is a test-authoring error: fail loudly rather than sign someone in.
    return fakeGitHubScenarioSchema.parse(JSON.parse(readFileSync(this.file, 'utf8')));
  }
}
