import type { Logger } from 'pino';
import type { Env } from '../../config/env';
import { ArcticGitHubClient } from './adapters/arctic-github-client';
import { FakeGitHubClient } from './adapters/fake-github-client';
import type { GitHubClient } from './github-client.port';

/**
 * Picks the adapter named by GITHUB_ADAPTER, or `null` when GitHub sign-in is off (env.ts already
 * refuses `real` without credentials and `fake` in production). A null client makes the routes
 * answer `invalid_request` and the pages hide the button.
 */
export function createGitHubClient({ env, logger }: { env: Env; logger: Logger }): GitHubClient | null {
  switch (env.GITHUB_ADAPTER) {
    case 'real':
      return new ArcticGitHubClient({
        // env.ts guarantees both when the adapter is `real`.
        clientId: env.GITHUB_CLIENT_ID!,
        clientSecret: env.GITHUB_CLIENT_SECRET!,
        appUrl: env.APP_URL,
      });
    case 'fake':
      return new FakeGitHubClient({ env, logger });
    case undefined:
      return null;
  }
}
