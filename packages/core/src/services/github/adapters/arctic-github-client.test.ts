import { describe, expect, it, vi } from 'vitest';
import { CodeChallengeMethod, OAuth2Client } from 'arctic';
import { GitHubClientError } from '../github-client.port';
import { ArcticGitHubClient, GITHUB_CALLBACK_PATH, type FetchLike, type OAuth2Exchange } from './arctic-github-client';

const VERIFIER = 'v'.repeat(43);
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** GitHub as the adapter sees it: a token endpoint and two REST resources. */
function fakeGitHub(options: { user?: unknown; emails?: unknown; userStatus?: number } = {}) {
  const oauth: OAuth2Exchange = {
    createAuthorizationURLWithPKCE: vi.fn(() => new URL('https://github.com/login/oauth/authorize?x')),
    validateAuthorizationCode: vi.fn(async () => ({ accessToken: () => 'gho_secret' })),
  };
  const calls: { input: string; headers: Record<string, string> }[] = [];
  const fetch: FetchLike = async (input, init) => {
    calls.push({ input, headers: init.headers });
    if (input.endsWith('/user')) return json(options.user ?? { id: 42, name: 'Ann Example' }, options.userStatus);
    return json(
      options.emails ?? [
        { email: 'other@example.com', primary: false, verified: true },
        { email: 'Ann@Example.com', primary: true, verified: true },
      ],
    );
  };
  const client = new ArcticGitHubClient({ clientId: 'id', clientSecret: 's', appUrl: 'https://mh.test', oauth, fetch });
  return { oauth, fetch, calls, client };
}

describe('ArcticGitHubClient › authorization URL', () => {
  it('asks arctic for a PKCE (S256) URL with the state, the verifier and the two read scopes', () => {
    const { client, oauth } = fakeGitHub();
    client.createAuthorizationUrl('st', VERIFIER);
    expect(oauth.createAuthorizationURLWithPKCE).toHaveBeenCalledWith(
      'https://github.com/login/oauth/authorize',
      'st',
      CodeChallengeMethod.S256,
      VERIFIER,
      ['read:user', 'user:email'],
    );
  });

  it('with the real arctic client: GitHub endpoint, client id, our callback, state and a code challenge', () => {
    const client = new ArcticGitHubClient({ clientId: 'id', clientSecret: 's', appUrl: 'https://mh.test' });
    const url = client.createAuthorizationUrl('st', VERIFIER);
    expect(url.origin + url.pathname).toBe('https://github.com/login/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe('id');
    expect(url.searchParams.get('state')).toBe('st');
    expect(url.searchParams.get('redirect_uri')).toBe(`https://mh.test${GITHUB_CALLBACK_PATH}`);
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(url.searchParams.get('scope')).toBe('read:user user:email');
    expect(url.toString()).not.toContain(VERIFIER); // only the challenge travels
    expect(url.toString()).not.toContain('s=');
  });
});

describe('ArcticGitHubClient › exchangeCode', () => {
  it('exchanges the code with the verifier, reads id, name and the primary e-mail with its verified flag', async () => {
    const { client, oauth, calls } = fakeGitHub();
    const user = await client.exchangeCode('code-1', VERIFIER);
    expect(oauth.validateAuthorizationCode).toHaveBeenCalledWith(
      'https://github.com/login/oauth/access_token',
      'code-1',
      VERIFIER,
    );
    expect(user).toEqual({
      githubId: '42',
      primaryEmail: { email: 'Ann@Example.com', verified: true },
      name: 'Ann Example',
    });
    expect(calls.map((c) => c.input).sort()).toEqual([
      'https://api.github.com/user',
      'https://api.github.com/user/emails',
    ]);
    for (const call of calls) {
      expect(call.headers.authorization).toBe('Bearer gho_secret');
      expect(call.headers.accept).toBe('application/vnd.github+json');
    }
    expect(JSON.stringify(user)).not.toContain('gho_secret'); // the token never leaves the adapter
  });

  it('reports an unverified primary e-mail as such, no primary e-mail as null, and a missing name as null', async () => {
    const unverified = fakeGitHub({
      user: { id: 7 },
      emails: [{ email: 'p@example.com', primary: true, verified: false }],
    });
    expect(await unverified.client.exchangeCode('c', VERIFIER)).toEqual({
      githubId: '7',
      primaryEmail: { email: 'p@example.com', verified: false },
      name: null,
    });
    const none = fakeGitHub({ user: { id: 8, name: null }, emails: [] });
    expect(await none.client.exchangeCode('c', VERIFIER)).toEqual({ githubId: '8', primaryEmail: null, name: null });
  });

  it('fails closed (provider) when the token exchange is refused, the API answers an error or an unexpected body', async () => {
    const refused = fakeGitHub();
    (refused.oauth.validateAuthorizationCode as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('bad_verification_code'),
    );
    await expect(refused.client.exchangeCode('bad', VERIFIER)).rejects.toMatchObject({
      reason: 'provider',
      message: 'bad_verification_code',
    });
    (refused.oauth.validateAuthorizationCode as ReturnType<typeof vi.fn>).mockRejectedValueOnce('not an error');
    await expect(refused.client.exchangeCode('bad', VERIFIER)).rejects.toMatchObject({
      reason: 'provider',
      message: 'not an error',
    });
    await expect(fakeGitHub({ userStatus: 401 }).client.exchangeCode('c', VERIFIER)).rejects.toMatchObject({
      reason: 'provider',
      message: 'GitHub API /user answered 401',
    });
    await expect(fakeGitHub({ emails: { nope: true } }).client.exchangeCode('c', VERIFIER)).rejects.toMatchObject({
      reason: 'provider',
      message: 'GitHub API /user/emails answered an unexpected body',
    });
  });

  it('gives up after the timeout on the token call and on an API call (timeout), aborting the request', async () => {
    vi.useFakeTimers();
    try {
      const slowToken = fakeGitHub();
      (slowToken.oauth.validateAuthorizationCode as ReturnType<typeof vi.fn>).mockReturnValueOnce(
        new Promise(() => {}),
      );
      const client = new ArcticGitHubClient({
        clientId: 'id',
        clientSecret: 's',
        appUrl: 'https://mh.test',
        oauth: slowToken.oauth,
        fetch: slowToken.fetch,
        timeoutMs: 50,
      });
      const pending = client.exchangeCode('c', VERIFIER);
      const outcome = expect(pending).rejects.toBeInstanceOf(GitHubClientError);
      await vi.advanceTimersByTimeAsync(51);
      await outcome;
      await expect(pending).rejects.toMatchObject({ reason: 'timeout' });

      let aborted = false;
      const slowApi: FetchLike = (_input, init) =>
        new Promise((_, reject) =>
          init.signal.addEventListener('abort', () => {
            aborted = true;
            reject(new Error('aborted'));
          }),
        );
      const apiClient = new ArcticGitHubClient({
        clientId: 'id',
        clientSecret: 's',
        appUrl: 'https://mh.test',
        oauth: fakeGitHub().oauth,
        fetch: slowApi,
        timeoutMs: 50,
      });
      const pendingApi = apiClient.exchangeCode('c', VERIFIER);
      const apiOutcome = expect(pendingApi).rejects.toMatchObject({ reason: 'timeout' });
      await vi.advanceTimersByTimeAsync(51);
      await apiOutcome;
      expect(aborted).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('uses the global fetch and a real arctic client by default', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input) =>
        String(input).endsWith('/user')
          ? json({ id: 1, name: 'G' })
          : json([{ email: 'g@example.com', primary: true, verified: true }]),
      );
    try {
      const oauth: OAuth2Exchange = {
        createAuthorizationURLWithPKCE: () => new URL('https://github.com'),
        validateAuthorizationCode: async () => ({ accessToken: () => 't' }),
      };
      const client = new ArcticGitHubClient({ clientId: 'id', clientSecret: 's', appUrl: 'https://mh.test', oauth });
      expect(await client.exchangeCode('c', VERIFIER)).toMatchObject({ githubId: '1', name: 'G' });
      expect(spy).toHaveBeenCalledTimes(2);
      expect(new OAuth2Client('id', 's', null)).toBeDefined();
    } finally {
      spy.mockRestore();
    }
  });
});
