import { describe, expect, it, vi } from 'vitest';
import { parseEnv } from '../../config/env';
import { ConflictError, GitHubEmailUnverifiedError } from '../../http/errors';
import { signGitHubStateToken, verifyGitHubStateToken } from '../../http/github-state';
import { createLogger } from '../../logger';
import { GitHubClientError, type GitHubClient, type GitHubUser } from '../github/github-client.port';
import type { AuthService } from './auth.service';
import { GITHUB_ERROR, GitHubSignInService, githubStartSchema } from './github-sign-in.service';

const env = parseEnv({ NODE_ENV: 'test', APP_URL: 'https://mh.test' });
const now = new Date('2026-10-18T12:00:00Z');
const minutes = (n: number) => new Date(now.getTime() + n * 60_000);
const user: GitHubUser = { githubId: 'gh-1', primaryEmail: { email: 'ann@example.com', verified: true }, name: 'Ann' };
const CLEARED = 'mh_github=; Path=/api/auth/github; HttpOnly; SameSite=Lax; Max-Age=0';

function harness(options: { client?: GitHubClient | null } = {}) {
  const lines: string[] = [];
  const logger = createLogger({ destination: { write: (line: string) => void lines.push(line) } });
  const client: GitHubClient = {
    createAuthorizationUrl: vi.fn(
      (state: string) => new URL(`https://github.com/login/oauth/authorize?state=${state}`),
    ),
    exchangeCode: vi.fn(async () => user),
  };
  const authService = {
    signInWithGitHub: vi.fn(async () => ({
      userId: 'u1',
      sessionVersion: 2,
      next: '/mentor/profile',
      existingAccount: false,
    })),
    startSession: vi.fn(async () => 'mh_session=jwt; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800'),
  };
  const service = new GitHubSignInService({
    env,
    logger,
    githubClient: options.client === undefined ? client : options.client,
    authService: authService as unknown as AuthService,
  });
  const cookieValue = (cookie: string) => cookie.split(';')[0]!.split('=')[1]!;
  /** A started attempt: the query GitHub would send back and the cookie the browser would send along. */
  const started = async (query: Record<string, string> = {}) => {
    const start = await service.start(new URLSearchParams(query), now);
    const token = cookieValue(start.cookies[0]!);
    const state = new URL(start.location).searchParams.get('state')!;
    return { token, state, claims: (await verifyGitHubStateToken(token, env.AUTH_SECRET, now))! };
  };
  return { service, client, authService, lines, started, cookieValue };
}

describe('GitHubSignInService › start', () => {
  it('sends the browser to GitHub with a fresh state and remembers state, verifier, role and next in a signed cookie', async () => {
    const h = harness();
    const result = await h.service.start(new URLSearchParams({ role: 'mentor', next: '/mentors/7?slot=1' }), now);
    expect(result.status).toBe(302);
    const [createState, verifier] = (h.client.createAuthorizationUrl as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      string,
    ];
    expect(createState).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(verifier).not.toBe(createState);
    expect(result.location).toBe(`https://github.com/login/oauth/authorize?state=${createState}`);
    expect(result.cookies).toHaveLength(1);
    expect(result.cookies[0]).toMatch(
      /^mh_github=[^;]+; Path=\/api\/auth\/github; HttpOnly; SameSite=Lax; Max-Age=600$/,
    );
    const claims = await verifyGitHubStateToken(h.cookieValue(result.cookies[0]!), env.AUTH_SECRET, now);
    expect(claims).toEqual({ state: createState, codeVerifier: verifier, role: 'mentor', next: '/mentors/7?slot=1' });
    // Two attempts never share a state.
    const again = await h.service.start(new URLSearchParams(), now);
    expect(new URL(again.location).searchParams.get('state')).not.toBe(createState);
    expect(JSON.stringify(h.lines)).not.toContain(createState);
  });

  it('without role and next the cookie carries neither (a mentee signing in, landing by role)', async () => {
    const h = harness();
    const { claims } = await h.started();
    expect(claims).toEqual({ state: claims.state, codeVerifier: claims.codeVerifier });
  });

  it('rejects role=admin, any other role, an off-site or malformed next, and runs nowhere when GitHub is off', async () => {
    const h = harness();
    const refused = { status: 302, location: '/sign-in?error=invalid_request', cookies: [] };
    expect(await h.service.start(new URLSearchParams({ role: 'admin' }), now)).toEqual(refused);
    expect(await h.service.start(new URLSearchParams({ role: 'mentee' }), now)).toEqual(refused);
    expect(await h.service.start(new URLSearchParams({ role: '' }), now)).toEqual(refused);
    expect(await h.service.start(new URLSearchParams({ next: 'https://evil.example/' }), now)).toEqual(refused);
    expect(await h.service.start(new URLSearchParams({ next: '//evil.example' }), now)).toEqual(refused);
    expect(await h.service.start(new URLSearchParams({ next: '/\t/evil.example' }), now)).toEqual(refused);
    expect(h.client.createAuthorizationUrl).not.toHaveBeenCalled();
    const off = harness({ client: null });
    expect(await off.service.start(new URLSearchParams({ role: 'mentor' }), now)).toEqual(refused);
    expect(githubStartSchema.safeParse({ role: 'mentor', next: '/x', extra: 1 }).data).toEqual({
      role: 'mentor',
      next: '/x',
    });
  });

  it('uses the current time by default', async () => {
    const h = harness();
    const result = await h.service.start(new URLSearchParams());
    expect(await verifyGitHubStateToken(h.cookieValue(result.cookies[0]!), env.AUTH_SECRET)).not.toBeNull();
  });
});

describe('GitHubSignInService › callback', () => {
  it('with a matching state: exchanges the code with the remembered verifier, signs in with the remembered intent, clears the state and starts the session', async () => {
    const h = harness();
    const { token, state, claims } = await h.started({ role: 'mentor', next: '/mentors/7' });
    const result = await h.service.callback(new URLSearchParams({ code: 'c-1', state }), token, now);
    expect(result).toEqual({
      status: 303,
      location: '/mentor/profile',
      cookies: [CLEARED, 'mh_session=jwt; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800'],
    });
    expect(h.client.exchangeCode).toHaveBeenCalledWith('c-1', claims.codeVerifier);
    expect(h.authService.signInWithGitHub).toHaveBeenCalledWith(user, { role: 'mentor', next: '/mentors/7' }, now);
    expect(h.authService.startSession).toHaveBeenCalledWith(
      { userId: 'u1', sessionVersion: 2, next: '/mentor/profile', existingAccount: false },
      now,
    );
    expect(JSON.stringify(h.lines)).not.toContain('c-1');
    expect(JSON.stringify(h.lines)).not.toContain(token);
  });

  it('a plain sign-in passes no role and no next', async () => {
    const h = harness();
    const { token, state } = await h.started();
    await h.service.callback(new URLSearchParams({ code: 'c', state }), token, now);
    expect(h.authService.signInWithGitHub).toHaveBeenCalledWith(user, { role: undefined, next: undefined }, now);
  });

  const failed = { status: 303, location: '/sign-in?error=github_failed', cookies: [CLEARED] };

  it('state mismatch → github_failed, the code is never exchanged (login CSRF)', async () => {
    const h = harness();
    const { token } = await h.started();
    const { state: foreign } = await h.started(); // a state from another attempt (or an attacker's)
    expect(await h.service.callback(new URLSearchParams({ code: 'c', state: foreign }), token, now)).toEqual(failed);
    expect(await h.service.callback(new URLSearchParams({ code: 'c' }), token, now)).toEqual(failed);
    expect(await h.service.callback(new URLSearchParams({ code: 'c', state: '' }), token, now)).toEqual(failed);
    expect(h.client.exchangeCode).not.toHaveBeenCalled();
    expect(h.authService.signInWithGitHub).not.toHaveBeenCalled();
    expect(h.lines.join('')).toContain('state mismatch');
  });

  it('missing, empty, tampered, foreign-secret or expired state cookie → github_failed', async () => {
    const h = harness();
    const { token, state } = await h.started();
    const query = new URLSearchParams({ code: 'c', state });
    expect(await h.service.callback(query, undefined, now)).toEqual(failed);
    expect(await h.service.callback(query, '', now)).toEqual(failed);
    expect(await h.service.callback(query, `${token}x`, now)).toEqual(failed);
    const foreign = await signGitHubStateToken({ state, codeVerifier: 'v' }, 'z'.repeat(32), now);
    expect(await h.service.callback(query, foreign, now)).toEqual(failed);
    expect(await h.service.callback(query, token, minutes(11))).toEqual(failed);
    expect(h.client.exchangeCode).not.toHaveBeenCalled();
  });

  it('denied consent (error from GitHub) and a callback without a code → github_failed', async () => {
    const h = harness();
    const { token, state } = await h.started();
    expect(await h.service.callback(new URLSearchParams({ error: 'access_denied', state }), token, now)).toEqual(
      failed,
    );
    expect(await h.service.callback(new URLSearchParams({ state }), token, now)).toEqual(failed);
    expect(await h.service.callback(new URLSearchParams({ state, code: '' }), token, now)).toEqual(failed);
    expect(h.client.exchangeCode).not.toHaveBeenCalled();
    expect(h.lines.join('')).toContain('access_denied');
  });

  it('a timeout or any other provider failure during the exchange → github_failed, no session', async () => {
    const h = harness();
    const { token, state } = await h.started();
    (h.client.exchangeCode as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new GitHubClientError('timeout'));
    expect(await h.service.callback(new URLSearchParams({ code: 'c', state }), token, now)).toEqual(failed);
    (h.client.exchangeCode as ReturnType<typeof vi.fn>).mockRejectedValueOnce('boom');
    expect(await h.service.callback(new URLSearchParams({ code: 'c', state }), token, now)).toEqual(failed);
    expect(h.authService.signInWithGitHub).not.toHaveBeenCalled();
    expect(h.authService.startSession).not.toHaveBeenCalled();
    expect(h.lines.join('')).toContain('timeout');
  });

  it('an unverified GitHub e-mail → github_email_unverified; a database/conflict failure → github_failed (never a 500)', async () => {
    const h = harness();
    const { token, state } = await h.started();
    h.authService.signInWithGitHub.mockRejectedValueOnce(new GitHubEmailUnverifiedError());
    expect(await h.service.callback(new URLSearchParams({ code: 'c', state }), token, now)).toEqual({
      status: 303,
      location: `/sign-in?error=${GITHUB_ERROR.emailUnverified}`,
      cookies: [CLEARED],
    });
    h.authService.signInWithGitHub.mockRejectedValueOnce(new ConflictError());
    expect(await h.service.callback(new URLSearchParams({ code: 'c', state }), token, now)).toEqual(failed);
    h.authService.signInWithGitHub.mockRejectedValueOnce(new Error('connection refused'));
    expect(await h.service.callback(new URLSearchParams({ code: 'c', state }), token, now)).toEqual(failed);
    expect(h.authService.startSession).not.toHaveBeenCalled();
  });

  it('answers invalid_request when GitHub sign-in is off, and uses the current time by default', async () => {
    const off = harness({ client: null });
    expect(await off.service.callback(new URLSearchParams({ code: 'c', state: 's' }), 'tok', now)).toEqual({
      status: 303,
      location: '/sign-in?error=invalid_request',
      cookies: [CLEARED],
    });
    const h = harness();
    const start = await h.service.start(new URLSearchParams());
    const state = new URL(start.location).searchParams.get('state')!;
    const result = await h.service.callback(
      new URLSearchParams({ code: 'c', state }),
      h.cookieValue(start.cookies[0]!),
    );
    expect(result.status).toBe(303);
    expect(result.location).toBe('/mentor/profile');
  });
});
