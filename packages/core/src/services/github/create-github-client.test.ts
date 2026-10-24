import { describe, expect, it } from 'vitest';
import { parseEnv } from '../../config/env';
import { createLogger } from '../../logger';
import { ArcticGitHubClient } from './adapters/arctic-github-client';
import { FakeGitHubClient } from './adapters/fake-github-client';
import { createGitHubClient } from './create-github-client';

const logger = createLogger({ level: 'silent' });

describe('createGitHubClient', () => {
  it('is null when GitHub sign-in is off (the default)', () => {
    expect(createGitHubClient({ env: parseEnv({ NODE_ENV: 'test' }), logger })).toBeNull();
  });

  it('builds the arctic adapter for real credentials and the fake for GITHUB_ADAPTER=fake', () => {
    const real = createGitHubClient({
      env: parseEnv({
        NODE_ENV: 'test',
        GITHUB_CLIENT_ID: 'id',
        GITHUB_CLIENT_SECRET: 's',
        APP_URL: 'https://mh.test',
      }),
      logger,
    });
    expect(real).toBeInstanceOf(ArcticGitHubClient);
    const url = real!.createAuthorizationUrl('st', 'v'.repeat(43));
    expect(url.origin + url.pathname).toBe('https://github.com/login/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe('id');
    expect(url.searchParams.get('redirect_uri')).toBe('https://mh.test/api/auth/github/callback');
    expect(createGitHubClient({ env: parseEnv({ NODE_ENV: 'test', GITHUB_ADAPTER: 'fake' }), logger })).toBeInstanceOf(
      FakeGitHubClient,
    );
  });
});
