import { describe, expect, it } from 'vitest';
import type { Orm } from '@mentorhub/db';
import { parseEnv } from '../config/env';
import { createLogger } from '../logger';
import { EventBus } from '../events/event-bus';
import { AuthService } from '../services/auth/auth.service';
import { GitHubSignInService } from '../services/auth/github-sign-in.service';
import { FakeGitHubClient } from '../services/github/adapters/fake-github-client';
import { MockMailSender } from '../services/mail/adapters/mock-mail-sender';
import { buildContainer, createRequestScope, withScope } from './container';

const silent = createLogger({ level: 'silent' });

function fakeOrm(ok: boolean): Orm {
  let forks = 0;
  const execute = async (sql: string) => {
    if (!ok) throw new Error('connection refused');
    if (sql !== 'select 1') throw new Error(`unexpected query: ${sql}`);
    return [{ '?column?': 1 }];
  };
  return {
    // A real ORM reports "not established" here until the first query — the service must not rely on it.
    checkConnection: async () => ({ ok: false, reason: 'Connection not established' }),
    em: { fork: () => ({ forkNo: ++forks, getConnection: () => ({ execute }) }) },
  } as unknown as Orm;
}

const env = parseEnv({ NODE_ENV: 'test' });
const build = (getOrm: () => Promise<Orm>) => buildContainer({ getOrm, env, logger: silent });

describe('composition root', () => {
  it('reports db up when the ORM answers a real query', async () => {
    await expect(build(async () => fakeOrm(true)).cradle.healthService.check()).resolves.toEqual({
      status: 'ok',
      db: 'up',
    });
  });

  it('reports db down when the query fails or the ORM cannot start', async () => {
    await expect(build(async () => fakeOrm(false)).cradle.healthService.check()).resolves.toEqual({
      status: 'degraded',
      db: 'down',
    });
    const broken = build(() => Promise.reject(new Error('ECONNREFUSED')));
    await expect(broken.cradle.healthService.check()).resolves.toEqual({ status: 'degraded', db: 'down' });
  });

  it('gives every request scope its own EntityManager fork', async () => {
    const c = build(async () => fakeOrm(true));
    const a = await createRequestScope(c);
    const b = await createRequestScope(c);
    expect(a.cradle.em).not.toBe(b.cradle.em);
    expect(a.cradle.em).toBe(a.cradle.em);
  });

  it('withScope resolves scoped services and returns their result', async () => {
    const c = build(async () => fakeOrm(true));
    const first = await withScope(async (cradle) => cradle.em, c);
    const second = await withScope(async (cradle) => cradle.em, c);
    expect(first).not.toBe(second);
  });

  it('registers the mail sender by MAIL_ADAPTER as a singleton, the auth service per scope, and the session lookup as the user service', async () => {
    const c = build(async () => fakeOrm(true));
    expect(c.cradle.mailSender).toBeInstanceOf(MockMailSender);
    const scope = await createRequestScope(c);
    expect(scope.cradle.mailSender).toBe(c.cradle.mailSender);
    expect(scope.cradle.authService).toBeInstanceOf(AuthService);
    expect(scope.cradle.authService).not.toBe((await createRequestScope(c)).cradle.authService);
    expect(scope.cradle.sessionUserLookup).toBe(scope.cradle.userService);
  });

  it('registers the GitHub client by GITHUB_ADAPTER as a singleton (null when off) and the flow per scope', async () => {
    const off = build(async () => fakeOrm(true));
    expect(off.cradle.githubClient).toBeNull();
    const offScope = await createRequestScope(off);
    expect(offScope.cradle.githubSignIn).toBeInstanceOf(GitHubSignInService);
    const on = buildContainer({
      getOrm: async () => fakeOrm(true),
      env: parseEnv({ NODE_ENV: 'test', GITHUB_ADAPTER: 'fake' }),
      logger: silent,
    });
    expect(on.cradle.githubClient).toBeInstanceOf(FakeGitHubClient);
    const scope = await createRequestScope(on);
    expect(scope.cradle.githubClient).toBe(on.cradle.githubClient);
    expect(scope.cradle.githubSignIn).not.toBe((await createRequestScope(on)).cradle.githubSignIn);
  });

  it('registers the event bus as a singleton and wires the subscribers once per container', async () => {
    const lines: string[] = [];
    const logger = createLogger({ destination: { write: (line: string) => void lines.push(line) } });
    const c = buildContainer({ getOrm: async () => fakeOrm(true), env, logger });
    expect(c.cradle.eventBus).toBeInstanceOf(EventBus);
    const scope = await createRequestScope(c);
    expect(scope.cradle.eventBus).toBe(c.cradle.eventBus);
    expect(scope.cradle.userService).not.toBe((await createRequestScope(c)).cradle.userService);
    await c.cradle.eventBus.emit('auth.user.created', { userId: 'u1', email: 'a@b.io', method: 'admin' });
    expect(lines.filter((l) => l.includes('domain event'))).toHaveLength(1);
    const other = buildContainer({ getOrm: async () => fakeOrm(true), env, logger });
    expect(other.cradle.eventBus).not.toBe(c.cradle.eventBus);
  });
});
