import { mkdtempSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { createLogger } from '../../../logger';
import {
  DEFAULT_FAKE_GITHUB_USER,
  FAKE_GITHUB_CODE,
  FakeGitHubClient,
  fakeGitHubScenarioSchema,
} from './fake-github-client';

const logger = createLogger({ level: 'silent' });
const env = { APP_URL: 'https://mh.test' };
const file = join(mkdtempSync(join(tmpdir(), 'mh-fake-github-')), 'scenario.json');
afterAll(() => {
  try {
    unlinkSync(file);
  } catch {
    // never written
  }
});

describe('FakeGitHubClient', () => {
  it('sends the browser straight to our callback with the state and the fixed code, and answers the default user', async () => {
    const client = new FakeGitHubClient({ env, logger });
    const url = client.createAuthorizationUrl('st-1', 'verifier');
    expect(url.toString()).toBe(`https://mh.test/api/auth/github/callback?state=st-1&code=${FAKE_GITHUB_CODE}`);
    expect(await client.exchangeCode(FAKE_GITHUB_CODE, 'verifier')).toEqual(DEFAULT_FAKE_GITHUB_USER);
    expect(DEFAULT_FAKE_GITHUB_USER.primaryEmail?.verified).toBe(true);
  });

  it('answers the in-memory scenario: an unverified person, a denied consent (error in the URL), a timeout', async () => {
    const unverified = new FakeGitHubClient({
      env,
      logger,
      scenario: { githubId: 'u-1', primaryEmail: { email: 'u@example.com', verified: false }, name: null },
    });
    expect(await unverified.exchangeCode(FAKE_GITHUB_CODE, 'v')).toMatchObject({ primaryEmail: { verified: false } });
    const denied = new FakeGitHubClient({ env, logger, scenario: { denied: true } });
    const url = denied.createAuthorizationUrl('st', 'v');
    expect(url.searchParams.get('error')).toBe('access_denied');
    expect(url.searchParams.get('code')).toBeNull();
    expect(url.searchParams.get('state')).toBe('st');
    await expect(denied.exchangeCode(FAKE_GITHUB_CODE, 'v')).rejects.toMatchObject({ reason: 'denied' });
    const timeout = new FakeGitHubClient({ env, logger, scenario: { timeout: true } });
    await expect(timeout.exchangeCode(FAKE_GITHUB_CODE, 'v')).rejects.toMatchObject({ reason: 'timeout' });
  });

  it('rejects any code it did not issue', async () => {
    await expect(new FakeGitHubClient({ env, logger }).exchangeCode('stolen', 'v')).rejects.toMatchObject({
      reason: 'provider',
    });
  });

  it('re-reads GITHUB_FAKE_FILE on every call, validates it, and the file wins over the in-memory scenario', async () => {
    const client = new FakeGitHubClient({
      env: { ...env, GITHUB_FAKE_FILE: file },
      logger,
      scenario: { denied: true },
    });
    writeFileSync(file, JSON.stringify({ githubId: 'f-1', primaryEmail: { email: 'F@Example.com', verified: true } }));
    expect(client.createAuthorizationUrl('st', 'v').searchParams.get('code')).toBe(FAKE_GITHUB_CODE);
    expect(await client.exchangeCode(FAKE_GITHUB_CODE, 'v')).toEqual({
      githubId: 'f-1',
      primaryEmail: { email: 'F@Example.com', verified: true },
      name: null, // defaulted by the schema
    });
    writeFileSync(file, JSON.stringify({ denied: true }));
    expect(client.createAuthorizationUrl('st', 'v').searchParams.get('error')).toBe('access_denied');
    writeFileSync(file, JSON.stringify({ githubId: '' }));
    await expect(client.exchangeCode(FAKE_GITHUB_CODE, 'v')).rejects.toThrow(); // a malformed scenario never signs anyone in
    expect(fakeGitHubScenarioSchema.safeParse({ githubId: 'x', primaryEmail: null }).success).toBe(true);
  });
});
