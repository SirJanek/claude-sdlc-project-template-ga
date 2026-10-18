import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { AuthToken, User, type EntityManager } from '@mentorhub/db';
import { parseEnv } from '../../config/env';
import { AUTH_LIMITS } from '../../config/rules';
import { DEV_ADMIN_SESSION } from '../../http/auth';
import {
  ConflictError,
  GitHubEmailUnverifiedError,
  GoneError,
  RateLimitedError,
  ServiceUnavailableError,
  UnauthorizedError,
} from '../../http/errors';
import { verifySessionToken } from '../../http/session';
import { createLogger } from '../../logger';
import type { MailMessage } from '../mail/mail-sender.port';
import { AuthService, DEV_ADMIN_USER } from './auth.service';

// core never imports @mikro-orm/*: a stand-in violation, recognised by a stubbed isUniqueViolation.
class UniqueViolation extends Error {}
vi.mock('@mentorhub/db', async (original) => ({
  ...(await original<typeof import('@mentorhub/db')>()),
  isUniqueViolation: (error: unknown) => error instanceof UniqueViolation,
}));

type Row = Record<string, unknown> & { id?: string; createdAt?: Date };
type Where = Record<string, unknown>;
const LOCK_SQL = 'select pg_advisory_xact_lock(hashtext(?::text)), pg_advisory_xact_lock(hashtext(?::text))';
const REVOKE_SQL = 'update users set session_version = session_version + 1 where id = ? returning session_version';

/** Condition subset the service uses: equality (incl. null) and $gte / $gt / $lt on dates. */
function matches(row: Row, where: Where): boolean {
  return Object.entries(where).every(([key, cond]) => {
    const value = row[key];
    if (cond !== null && typeof cond === 'object' && !(cond instanceof Date)) {
      const ops = cond as { $gte?: Date; $gt?: Date; $lt?: Date };
      const time = (value as Date).getTime();
      if (ops.$gte && !(time >= ops.$gte.getTime())) return false;
      if (ops.$gt && !(time > ops.$gt.getTime())) return false;
      if (ops.$lt && !(time < ops.$lt.getTime())) return false;
      return true;
    }
    return value === cond;
  });
}

/**
 * In-memory PostgreSQL stand-in: tables for users and auth_tokens, transactions with rollback,
 * `pg_advisory_xact_lock` as mutexes keyed by the bound bucket names (held until the transaction
 * ends), the unique index on users.email, and the atomic `session_version + 1` UPDATE. Rows read
 * through findOne are detached copies written back on flush — so a read-then-write of a counter
 * loses updates exactly like a real database would. `clock` stamps createdAt for window tests.
 */
class FakeDb {
  users: Row[] = [];
  tokens: Row[] = [];
  /** Real time: the service defaults `now` to new Date(); tests that need a window pass `now` explicitly. */
  clock = new Date();
  failCommit = false;
  /** Simulates another request inserting this e-mail between the service's lookup and its flush. */
  raceEmail: string | undefined;
  /** Makes the next flush fail with this error (anything but a unique violation). */
  flushError: Error | undefined;
  private seq = 0;
  private readonly locks = new Map<string, Promise<void>>();

  private table(entity: unknown): Row[] {
    if (entity === User) return this.users;
    if (entity === AuthToken) return this.tokens;
    throw new Error('unknown entity');
  }

  private async acquire(key: string): Promise<() => void> {
    const previous = this.locks.get(key) ?? Promise.resolve();
    let release!: () => void;
    const mine = new Promise<void>((resolve) => (release = resolve));
    this.locks.set(
      key,
      previous.then(() => mine),
    );
    await previous;
    return release;
  }

  em(): EntityManager {
    const pending: { table: Row[]; row: Row }[] = [];
    const releases: (() => void)[] = [];
    /** Undo log: a rollback reverts this transaction's own writes only, like a real database. */
    const undo: (() => void)[] = [];
    /** Identity map: table row → the detached copy handed out by findOne, written back on flush. */
    const managed = new Map<Row, Row>();
    const detach = (row: Row | undefined): Row | null => {
      if (!row) return null;
      const copy = managed.get(row) ?? { ...row };
      managed.set(row, copy);
      return copy;
    };
    const flush = async () => {
      await Promise.resolve();
      if (this.flushError) throw this.flushError;
      for (const [row, copy] of managed) {
        const before = { ...row };
        Object.assign(row, copy);
        undo.push(() => Object.assign(row, before));
      }
      for (const { table, row } of pending) {
        if (table === this.users && this.users.some((u) => u.email === row.email && u !== row)) {
          throw new UniqueViolation('duplicate key value violates unique constraint "users_email_unique"');
        }
        if (row.id === undefined) {
          Object.assign(row, { id: `id-${++this.seq}`, createdAt: this.clock, updatedAt: this.clock });
          table.push(row);
          undo.push(() => table.splice(table.indexOf(row), 1));
        }
      }
      pending.length = 0;
    };
    const em = {
      execute: async (sql: string, params: unknown[]) => {
        if (sql === LOCK_SQL) {
          for (const key of params) releases.push(await this.acquire(String(key)));
          return [];
        }
        if (sql === REVOKE_SQL) {
          const row = this.users.find((u) => u.id === params[0]);
          if (!row) return [];
          row.sessionVersion = (row.sessionVersion as number) + 1; // atomic, on the table row
          return [{ session_version: row.sessionVersion }];
        }
        throw new Error(`unexpected SQL: ${sql}`);
      },
      count: async (entity: unknown, where: Where) => this.table(entity).filter((r) => matches(r, where)).length,
      findOne: async (entity: unknown, where: Where) => {
        const found = this.table(entity).find((r) => matches(r, where));
        if (entity === User && !found && this.raceEmail) {
          this.users.push({ id: 'raced', email: this.raceEmail, sessionVersion: 0 });
          this.raceEmail = undefined;
        }
        return detach(found);
      },
      findOneOrFail: async (entity: unknown, where: Where) => {
        const row = detach(this.table(entity).find((r) => matches(r, where)));
        if (!row) throw new Error('not found');
        return row;
      },
      nativeDelete: async (entity: unknown, where: Where) => {
        const table = this.table(entity);
        const removed = table.filter((r) => matches(r, where));
        for (const row of removed) table.splice(table.indexOf(row), 1);
        undo.push(() => table.push(...removed));
        return removed.length;
      },
      nativeUpdate: async (entity: unknown, where: Where, data: Row) => {
        const hits = this.table(entity).filter((r) => matches(r, where));
        const before = hits.map((row) => ({ row, copy: { ...row } }));
        for (const row of hits) Object.assign(row, data);
        undo.push(() => before.forEach(({ row, copy }) => Object.assign(row, copy)));
        return hits.length;
      },
      create: (entity: unknown, data: Row) => {
        const row = { ...data };
        pending.push({ table: this.table(entity), row });
        return row;
      },
      flush,
      transactional: async <T>(fn: (em: EntityManager) => Promise<T>): Promise<T> => {
        const tx = this.em() as unknown as { flush: () => Promise<void>; rollback: () => void; release: () => void };
        try {
          const result = await fn(tx as unknown as EntityManager);
          await tx.flush();
          if (this.failCommit) throw new Error('could not serialize access (commit failed)');
          return result;
        } catch (error) {
          tx.rollback();
          throw error;
        } finally {
          tx.release();
        }
      },
      rollback: () =>
        undo
          .splice(0)
          .reverse()
          .forEach((revert) => revert()),
      release: () => releases.splice(0).forEach((release) => release()),
    };
    return em as unknown as EntityManager;
  }
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const env = parseEnv({ NODE_ENV: 'test', APP_URL: 'https://mentorhub.test' });
const logger = createLogger({ level: 'silent' });

function harness(db = new FakeDb()) {
  const sent: MailMessage[] = [];
  const mailSender = { send: vi.fn(async (message: MailMessage) => void sent.push(message)) };
  const eventBus = { emit: vi.fn(async () => {}) };
  const service = () => new AuthService({ em: db.em(), env, logger, mailSender, eventBus: eventBus as never });
  /** The raw token of the last e-mail, as a person would copy it from the link. */
  const lastToken = () => new URL(sent.at(-1)!.text.match(/https?:\/\/\S+/)![0]).searchParams.get('token')!;
  const request = (
    email = 'ann@example.com',
    extra: Partial<Parameters<AuthService['requestEmailLink']>[0]> = {},
    now?: Date,
  ) => service().requestEmailLink({ email, ip: '203.0.113.9', ...extra }, now ?? db.clock);
  return { db, sent, mailSender, eventBus, service, lastToken, request };
}

describe('requestEmailLink', () => {
  it('stores a hashed token (never the raw one), sends the link after commit, and reveals nothing', async () => {
    const h = harness();
    await expect(h.request()).resolves.toBeUndefined();
    const raw = h.lastToken();
    expect(raw).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(h.db.tokens).toHaveLength(1);
    const row = h.db.tokens[0]!;
    expect(row.tokenHash).toBe(sha256(raw));
    expect(JSON.stringify(h.db.tokens)).not.toContain(raw);
    expect(row).toMatchObject({ email: 'ann@example.com', intentRole: null, nextPath: null, usedAt: null });
    expect(row.ipHash).toBe(sha256(`203.0.113.9${env.AUTH_SECRET}`));
    expect(JSON.stringify(h.db.tokens)).not.toContain('203.0.113.9');
    expect((row.expiresAt as Date).getTime() - h.db.clock.getTime()).toBe(AUTH_LIMITS.linkTtlMinutes * 60_000);
    expect(h.sent[0]).toMatchObject({ to: 'ann@example.com', subject: 'Your MentorHub sign-in link' });
    expect(h.sent[0]!.text).toContain(`https://mentorhub.test/auth/confirm?token=${raw}`);
    expect(h.db.users).toHaveLength(0); // requesting a link for an address creates nothing
  });

  it('keeps the intended role and the validated return path on the token', async () => {
    const h = harness();
    await h.request('m@example.com', { intentRole: 'mentor', next: '/mentor/profile' });
    expect(h.db.tokens[0]).toMatchObject({ intentRole: 'mentor', nextPath: '/mentor/profile' });
  });

  it('limits links per e-mail inside the window and frees up once the window passes', async () => {
    const h = harness();
    for (let i = 0; i < AUTH_LIMITS.linksPerEmail.max; i += 1) await h.request();
    await expect(h.request()).rejects.toThrow(RateLimitedError);
    await expect(h.request('other@example.com')).resolves.toBeUndefined(); // another address is unaffected
    expect(h.sent).toHaveLength(AUTH_LIMITS.linksPerEmail.max + 1);
    const later = new Date(h.db.clock.getTime() + AUTH_LIMITS.linksPerEmail.windowMinutes * 60_000 + 1);
    await expect(h.request('ann@example.com', {}, later)).resolves.toBeUndefined();
  });

  it('limits links per IP hash across addresses', async () => {
    const h = harness();
    for (let i = 0; i < AUTH_LIMITS.linksPerIp.max; i += 1) await h.request(`person${i}@example.com`);
    await expect(h.request('one-more@example.com')).rejects.toThrow(RateLimitedError);
    await expect(h.request('one-more@example.com', { ip: '198.51.100.7' })).resolves.toBeUndefined();
  });

  it('concurrent requests for DIFFERENT e-mails from one IP cannot exceed the IP limit (both buckets locked — review finding 2)', async () => {
    const h = harness();
    for (let i = 0; i < AUTH_LIMITS.linksPerIp.max - 1; i += 1) await h.request(`warm${i}@example.com`);
    const results = await Promise.allSettled(Array.from({ length: 4 }, (_, i) => h.request(`race${i}@example.com`)));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(3);
    expect(h.db.tokens).toHaveLength(AUTH_LIMITS.linksPerIp.max);
    expect(h.sent).toHaveLength(AUTH_LIMITS.linksPerIp.max);
  });

  it('concurrent requests for one e-mail cannot exceed the limit (advisory lock around count + insert)', async () => {
    const h = harness();
    const results = await Promise.allSettled(Array.from({ length: 6 }, () => h.request()));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(AUTH_LIMITS.linksPerEmail.max);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(6 - AUTH_LIMITS.linksPerEmail.max);
    expect(h.db.tokens).toHaveLength(AUTH_LIMITS.linksPerEmail.max);
    expect(h.sent).toHaveLength(AUTH_LIMITS.linksPerEmail.max);
  });

  it('deletes token rows older than the retention period on each creation', async () => {
    const h = harness();
    h.db.tokens.push({
      id: 'old',
      email: 'x@example.com',
      tokenHash: 'h',
      ipHash: 'i',
      createdAt: new Date(h.db.clock.getTime() - (AUTH_LIMITS.tokenRetentionDays + 1) * 86_400_000),
      usedAt: null,
    });
    h.db.tokens.push({ ...h.db.tokens[0]!, id: 'recent', createdAt: new Date(h.db.clock.getTime() - 86_400_000) });
    await h.request();
    expect(h.db.tokens.map((t) => t.id)).toEqual(['recent', 'id-1']);
  });

  it('marks the token dead and answers 503 when the mail adapter throws — no usable token without a sent e-mail', async () => {
    const h = harness();
    h.mailSender.send.mockRejectedValueOnce(new Error('SMTP down'));
    await expect(h.request()).rejects.toThrow(ServiceUnavailableError);
    expect(h.db.tokens).toHaveLength(1);
    expect(h.db.tokens[0]!.usedAt).toEqual(h.db.clock);
    const raw = 'A'.repeat(43);
    expect(JSON.stringify(h.db.tokens)).not.toContain(raw);
  });

  it('sends nothing when the commit fails', async () => {
    const h = harness();
    h.db.failCommit = true;
    await expect(h.request()).rejects.toThrow('commit failed');
    expect(h.mailSender.send).not.toHaveBeenCalled();
    expect(h.db.tokens).toHaveLength(0);
  });
});

describe('peekEmailLink', () => {
  it('names the e-mail of a valid link without consuming it; unknown, used or expired → null', async () => {
    const h = harness();
    await h.request();
    const raw = h.lastToken();
    await expect(h.service().peekEmailLink(raw)).resolves.toEqual({ email: 'ann@example.com' });
    expect(h.db.tokens[0]!.usedAt).toBeNull(); // a prefetching mail scanner burns nothing
    await expect(h.service().peekEmailLink('B'.repeat(43))).resolves.toBeNull();
    const expired = new Date(h.db.clock.getTime() + AUTH_LIMITS.linkTtlMinutes * 60_000);
    await expect(h.service().peekEmailLink(raw, expired)).resolves.toBeNull();
    await h.service().consumeEmailLink(raw);
    await expect(h.service().peekEmailLink(raw)).resolves.toBeNull();
  });

  it('treats a database error as an invalid link (fail closed) and logs it', async () => {
    const lines: string[] = [];
    const warnLogger = createLogger({ destination: { write: (line: string) => void lines.push(line) } });
    const em = {
      findOne: async () => {
        throw new Error('connection refused');
      },
    } as unknown as EntityManager;
    const service = new AuthService({
      em,
      env,
      logger: warnLogger,
      mailSender: { send: vi.fn() },
      eventBus: {} as never,
    });
    await expect(service.peekEmailLink('C'.repeat(43))).resolves.toBeNull();
    expect(lines.join('')).toContain('treating it as invalid');
  });
});

describe('consumeEmailLink', () => {
  it('creates a verified mentee for a new e-mail, emits auth.user.created once with method email, returns next', async () => {
    const h = harness();
    await h.request('new@example.com', { next: '/mentors/7?slot=1' });
    const result = await h.service().consumeEmailLink(h.lastToken(), h.db.clock);
    expect(h.db.users).toHaveLength(1);
    expect(h.db.users[0]).toMatchObject({
      email: 'new@example.com',
      name: null,
      role: 'mentee',
      emailVerifiedAt: h.db.clock,
      sessionVersion: 0,
    });
    expect(result).toEqual({ userId: 'id-2', sessionVersion: 0, next: '/mentors/7?slot=1', existingAccount: false });
    expect(h.eventBus.emit).toHaveBeenCalledTimes(1);
    expect(h.eventBus.emit).toHaveBeenCalledWith('auth.user.created', {
      userId: 'id-2',
      email: 'new@example.com',
      method: 'email',
    });
    expect(h.db.tokens[0]!.usedAt).toEqual(h.db.clock);
  });

  it('AC1 (#26): a mentor sign-up link creates a mentor account that lands on /mentor/profile', async () => {
    const h = harness();
    await h.request('m@example.com', { intentRole: 'mentor' });
    await expect(h.service().consumeEmailLink(h.lastToken(), h.db.clock)).resolves.toEqual({
      userId: 'id-2',
      sessionVersion: 0,
      next: '/mentor/profile',
      existingAccount: false,
    });
    expect(h.db.users[0]).toMatchObject({ email: 'm@example.com', role: 'mentor', emailVerifiedAt: h.db.clock });
    expect(h.eventBus.emit).toHaveBeenCalledWith('auth.user.created', expect.objectContaining({ userId: 'id-2' }));
  });

  it('AC3 (#26): a mentor sign-up link for an e-mail in use signs in to that account, changes no role, creates nothing, and flags the notice', async () => {
    // Mutation check (Phase 3 step 3): let consume apply `token.intentRole` to an existing user → this test is red.
    const h = harness();
    await h.request('taken@example.com');
    const mentee = await h.service().consumeEmailLink(h.lastToken());
    expect(h.db.users[0]).toMatchObject({ id: mentee.userId, role: 'mentee' });
    h.eventBus.emit.mockClear();
    await h.request('taken@example.com', { intentRole: 'mentor' });
    await expect(h.service().consumeEmailLink(h.lastToken())).resolves.toEqual({
      userId: mentee.userId, // the same account
      sessionVersion: 0,
      next: '/?notice=existing_account', // a mentee's landing page, with the one-time notice
      existingAccount: true,
    });
    expect(h.db.users).toHaveLength(1); // no second account
    expect(h.db.users[0]!.role).toBe('mentee'); // role unchanged
    expect(h.eventBus.emit).not.toHaveBeenCalled(); // nothing was created
  });

  it('an existing mentor using a mentor sign-up link lands on profile setup with the notice; a validated next still wins', async () => {
    const h = harness();
    await h.request('m@example.com', { intentRole: 'mentor' });
    await h.service().consumeEmailLink(h.lastToken());
    await h.request('m@example.com', { intentRole: 'mentor' });
    expect((await h.service().consumeEmailLink(h.lastToken())).next).toBe('/mentor/profile?notice=existing_account');
    await h.request('m@example.com', { intentRole: 'mentor', next: '/mentors/7?slot=1' });
    expect((await h.service().consumeEmailLink(h.lastToken())).next).toBe('/mentors/7?slot=1&notice=existing_account');
    const later = new Date(h.db.clock.getTime() + AUTH_LIMITS.linksPerEmail.windowMinutes * 60_000 + 1); // past the per-e-mail limit
    await h.request('m@example.com', { next: '/mentors/7?slot=1' }, later); // a plain sign-in link: no notice
    expect((await h.service().consumeEmailLink(h.lastToken(), later)).next).toBe('/mentors/7?slot=1');
    expect(h.db.users).toHaveLength(1);
    expect(h.db.users[0]!.role).toBe('mentor');
  });

  it('signs an existing (admin-created, unverified) user in, verifying the account, without an event', async () => {
    const h = harness();
    h.db.users.push({
      id: 'u-admin-made',
      email: 'ann@example.com',
      name: 'Ann',
      role: 'mentor',
      emailVerifiedAt: null,
      sessionVersion: 5,
    });
    await h.request();
    const result = await h.service().consumeEmailLink(h.lastToken(), h.db.clock);
    // A plain sign-in link: the mentor's default landing page, no notice (no intended role on the link).
    expect(result).toEqual({
      userId: 'u-admin-made',
      sessionVersion: 5,
      next: '/mentor/profile',
      existingAccount: false,
    });
    expect(h.db.users[0]!.emailVerifiedAt).toEqual(h.db.clock);
    expect(h.eventBus.emit).not.toHaveBeenCalled();
    const verifiedAt = new Date('2026-01-01T00:00:00Z');
    h.db.users[0]!.emailVerifiedAt = verifiedAt;
    await h.request();
    await h.service().consumeEmailLink(h.lastToken());
    expect(h.db.users[0]!.emailVerifiedAt).toBe(verifiedAt); // an earlier verification is kept
  });

  it('rejects a link clicked twice — single use', async () => {
    // Mutation check (spec › Phase 1 step 6): drop `usedAt: null` from the claim and the second click succeeds.
    const h = harness();
    await h.request();
    const raw = h.lastToken();
    await expect(h.service().consumeEmailLink(raw)).resolves.toMatchObject({ userId: 'id-2' });
    await expect(h.service().consumeEmailLink(raw)).rejects.toThrow(GoneError);
    expect(h.db.users).toHaveLength(1);
    expect(h.eventBus.emit).toHaveBeenCalledTimes(1);
  });

  it('rejects an expired link, an unknown token and a dead (unsent) token', async () => {
    const h = harness();
    await h.request();
    const raw = h.lastToken();
    const expired = new Date(h.db.clock.getTime() + AUTH_LIMITS.linkTtlMinutes * 60_000);
    await expect(h.service().consumeEmailLink(raw, expired)).rejects.toThrow(GoneError);
    await expect(h.service().consumeEmailLink('D'.repeat(43))).rejects.toThrow(GoneError);
    h.mailSender.send.mockRejectedValueOnce(new Error('SMTP down'));
    await expect(h.request('dead@example.com')).rejects.toThrow(ServiceUnavailableError);
    const dead = h.db.tokens.find((t) => t.email === 'dead@example.com')!;
    expect(dead.usedAt).not.toBeNull();
    expect(h.db.users).toHaveLength(0);
  });

  it('works from any device: the token is not bound to the requesting browser or IP', async () => {
    const h = harness();
    await h.request('ann@example.com', { ip: '203.0.113.9' });
    const raw = h.lastToken();
    await expect(
      new AuthService({
        em: h.db.em(),
        env,
        logger,
        mailSender: h.mailSender,
        eventBus: h.eventBus as never,
      }).consumeEmailLink(raw),
    ).resolves.toMatchObject({ userId: 'id-2' });
  });

  it('maps a lost race on users.email to 409 and leaves the token unused for a retry', async () => {
    const h = harness();
    await h.request();
    const raw = h.lastToken();
    h.db.raceEmail = 'ann@example.com'; // the user appears between findOne and flush
    await expect(h.service().consumeEmailLink(raw)).rejects.toThrow(ConflictError);
    expect(h.db.tokens[0]!.usedAt).toBeNull();
    expect(h.db.users.map((u) => u.id)).toEqual(['raced']);
    expect(h.eventBus.emit).not.toHaveBeenCalled();
  });

  it('rethrows any other flush error untouched and rolls the claim back', async () => {
    const h = harness();
    await h.request();
    const raw = h.lastToken();
    h.db.flushError = new Error('connection lost');
    await expect(h.service().consumeEmailLink(raw)).rejects.toThrow('connection lost');
    expect(h.db.tokens[0]!.usedAt).toBeNull();
  });
});

describe('sessions', () => {
  it('startSession issues the cookie with a JWT carrying the user id and session version', async () => {
    const h = harness();
    const cookie = await h.service().startSession({ userId: 'u1', sessionVersion: 3 });
    expect(cookie).toMatch(/^mh_session=.+; Path=\/; HttpOnly; SameSite=Lax; Max-Age=604800$/);
    const token = cookie.slice('mh_session='.length, cookie.indexOf(';'));
    await expect(verifySessionToken(token, env.AUTH_SECRET)).resolves.toEqual({ sub: 'u1', sv: 3 });
  });

  it('signOutEverywhere bumps the session version (old cookies stop verifying) and fails closed for an unknown user', async () => {
    const h = harness();
    h.db.users.push({ id: 'u1', email: 'a@x.io', sessionVersion: 3 });
    await h.service().signOutEverywhere('u1');
    expect(h.db.users[0]!.sessionVersion).toBe(4);
    await expect(h.service().signOutEverywhere('ghost')).rejects.toThrow(UnauthorizedError);
  });

  it('two revocations with a sign-in between: the increment is atomic, so the in-between session is ended too (review finding 3)', async () => {
    // Mutation check: a read-then-write (`user.sessionVersion += 1; flush()`) loses one increment here.
    const h = harness();
    h.db.users.push({ id: 'u1', email: 'a@x.io', sessionVersion: 0 });
    const first = h.service();
    const second = h.service();
    // Both revocations start (and would each read version 0) before either writes.
    const revocations = Promise.all([first.signOutEverywhere('u1'), second.signOutEverywhere('u1')]);
    const inBetween = await h.service().startSession({ userId: 'u1', sessionVersion: 1 });
    await revocations;
    expect(h.db.users[0]!.sessionVersion).toBe(2);
    const token = inBetween.slice('mh_session='.length, inBetween.indexOf(';'));
    const claims = await verifySessionToken(token, env.AUTH_SECRET);
    expect(claims?.sv).not.toBe(h.db.users[0]!.sessionVersion); // → 401 on the next request
  });

  it('currentUser returns the account behind a session, the fixed dev-admin record, or 401 for a vanished user', async () => {
    const h = harness();
    h.db.users.push({
      id: 'u1',
      email: 'a@x.io',
      name: null,
      role: 'mentor',
      emailVerifiedAt: h.db.clock,
      sessionVersion: 0,
    });
    const session = { userId: 'u1', role: 'mentor' as const, isDevSession: false, emailVerified: true };
    await expect(h.service().currentUser(session)).resolves.toEqual({
      id: 'u1',
      email: 'a@x.io',
      name: null,
      role: 'mentor',
      emailVerified: true,
    });
    h.db.users[0]!.emailVerifiedAt = null;
    expect((await h.service().currentUser(session)).emailVerified).toBe(false);
    await expect(h.service().currentUser(DEV_ADMIN_SESSION)).resolves.toBe(DEV_ADMIN_USER);
    await expect(h.service().currentUser({ ...session, userId: 'ghost' })).rejects.toThrow(UnauthorizedError);
  });
});

describe('signInWithGitHub (Phase 2)', () => {
  const now = new Date('2026-10-18T12:00:00Z');
  const verified = (email = 'Ann@Example.com', githubId = 'gh-42') => ({
    githubId,
    primaryEmail: { email, verified: true },
    name: 'Ann Example',
  });

  it('refuses an unverified primary e-mail and an account without one — nothing read, written or emitted', async () => {
    const h = harness();
    const unverified = { githubId: 'gh-1', primaryEmail: { email: 'u@example.com', verified: false }, name: null };
    await expect(h.service().signInWithGitHub(unverified, {}, now)).rejects.toThrow(GitHubEmailUnverifiedError);
    await expect(h.service().signInWithGitHub({ ...unverified, primaryEmail: null }, {}, now)).rejects.toThrow(
      GitHubEmailUnverifiedError,
    );
    expect(h.db.users).toHaveLength(0);
    expect(h.eventBus.emit).not.toHaveBeenCalled();
  });

  it('creates a verified mentee by default: lower-cased e-mail, GitHub id and name stored, event method github', async () => {
    const h = harness();
    const result = await h.service().signInWithGitHub(verified(' Ann@Example.com '), {}, now);
    expect(h.db.users).toHaveLength(1);
    expect(h.db.users[0]).toMatchObject({
      email: 'ann@example.com',
      name: 'Ann Example',
      role: 'mentee',
      githubId: 'gh-42',
      emailVerifiedAt: now,
      sessionVersion: 0,
    });
    expect(result).toEqual({ userId: 'id-1', sessionVersion: 0, next: '/', existingAccount: false });
    expect(h.eventBus.emit).toHaveBeenCalledWith('auth.user.created', {
      userId: 'id-1',
      email: 'ann@example.com',
      method: 'github',
    });
    // No display name on GitHub → name stays null until the person gives one (grill-me Q5/Q12).
    await h.service().signInWithGitHub({ ...verified('bob@example.com', 'gh-7'), name: null }, {}, now);
    expect(h.db.users[1]).toMatchObject({ email: 'bob@example.com', name: null, githubId: 'gh-7' });
  });

  it('creates a mentor when the attempt asked for it and lands on profile setup; a long name is cut to 120', async () => {
    const h = harness();
    const github = { ...verified(), name: 'x'.repeat(200) };
    const result = await h.service().signInWithGitHub(github, { role: 'mentor' }, now);
    expect(h.db.users[0]).toMatchObject({ role: 'mentor', name: 'x'.repeat(120) });
    expect(result).toMatchObject({ next: '/mentor/profile', existingAccount: false });
    expect(await h.service().signInWithGitHub({ ...verified(), name: null }, {}, now)).toMatchObject({
      userId: 'id-1',
    });
    expect(h.db.users[0]!.name).toBe('x'.repeat(120)); // an existing name is never overwritten
  });

  it('finds the account by GitHub id first — even when the GitHub e-mail changed; the account e-mail stays', async () => {
    const h = harness();
    h.db.users.push({
      id: 'u-9',
      email: 'old@example.com',
      name: 'Old',
      role: 'mentor',
      githubId: 'gh-42',
      emailVerifiedAt: now,
      sessionVersion: 3,
    });
    const result = await h.service().signInWithGitHub(verified('new@example.com'), {}, now);
    expect(result).toEqual({ userId: 'u-9', sessionVersion: 3, next: '/mentor/profile', existingAccount: false });
    expect(h.db.users).toHaveLength(1);
    expect(h.db.users[0]).toMatchObject({ email: 'old@example.com', githubId: 'gh-42' });
    expect(h.eventBus.emit).not.toHaveBeenCalled();
  });

  it('links the GitHub id to an account that exists by (verified) e-mail — one row, no duplicate, nothing else changed', async () => {
    const h = harness();
    await h.request('ann@example.com');
    await h.service().consumeEmailLink(h.lastToken(), now); // an account made by a link, no GitHub id yet
    expect(h.db.users[0]).toMatchObject({ githubId: null });
    h.eventBus.emit.mockClear();
    const result = await h.service().signInWithGitHub(verified('ANN@example.com'), {}, now);
    expect(h.db.users).toHaveLength(1);
    expect(h.db.users[0]).toMatchObject({ email: 'ann@example.com', githubId: 'gh-42', role: 'mentee', name: null });
    const id = h.db.users[0]!.id as string;
    expect(result).toEqual({ userId: id, sessionVersion: 0, next: '/', existingAccount: false });
    expect(h.eventBus.emit).not.toHaveBeenCalled();
    // From now on the id is the key: the same person signs in to the same account again.
    expect(await h.service().signInWithGitHub(verified('ANN@example.com'), {}, now)).toMatchObject({ userId: id });
    expect(h.db.users).toHaveLength(1);
  });

  it('verifies an admin-created (unverified) account when GitHub vouches for its e-mail', async () => {
    const h = harness();
    h.db.users.push({
      id: 'u-1',
      email: 'made@example.com',
      name: 'Made',
      role: 'mentee',
      githubId: null,
      emailVerifiedAt: null,
      sessionVersion: 0,
    });
    await h.service().signInWithGitHub(verified('made@example.com'), {}, now);
    expect(h.db.users[0]).toMatchObject({ emailVerifiedAt: now, githubId: 'gh-42', name: 'Made' });
  });

  it('AC3 (#26) by GitHub: a mentor sign-up for an existing mentee signs in to it, role unchanged, with the notice', async () => {
    const h = harness();
    h.db.users.push({
      id: 'u-1',
      email: 'taken@example.com',
      name: 'Taken',
      role: 'mentee',
      githubId: null,
      emailVerifiedAt: now,
      sessionVersion: 0,
    });
    const result = await h.service().signInWithGitHub(verified('taken@example.com'), { role: 'mentor' }, now);
    expect(result).toEqual({
      userId: 'u-1',
      sessionVersion: 0,
      next: '/?notice=existing_account',
      existingAccount: true,
    });
    expect(h.db.users).toHaveLength(1);
    expect(h.db.users[0]!.role).toBe('mentee');
    expect(h.eventBus.emit).not.toHaveBeenCalled();
    // An existing mentor gets the notice on profile setup; a plain sign-in (no intent) never shows it.
    h.db.users[0]!.role = 'mentor';
    expect(await h.service().signInWithGitHub(verified('taken@example.com'), { role: 'mentor' }, now)).toMatchObject({
      next: '/mentor/profile?notice=existing_account',
      existingAccount: true,
    });
    expect(await h.service().signInWithGitHub(verified('taken@example.com'), {}, now)).toMatchObject({
      next: '/mentor/profile',
      existingAccount: false,
    });
  });

  it('keeps the validated return path from the attempt, also with the notice', async () => {
    const h = harness();
    expect(await h.service().signInWithGitHub(verified(), { next: '/mentors/7?slot=1' }, now)).toMatchObject({
      next: '/mentors/7?slot=1',
    });
    expect(
      await h.service().signInWithGitHub(verified(), { role: 'mentor', next: '/mentors/7?slot=1' }, now),
    ).toMatchObject({
      next: '/mentors/7?slot=1&notice=existing_account',
    });
  });

  it('maps a unique violation on commit to 409 (two callbacks for one new person), rethrows anything else', async () => {
    const h = harness();
    h.db.flushError = new UniqueViolation('duplicate key value violates unique constraint "users_github_id_unique"');
    await expect(h.service().signInWithGitHub(verified(), {}, now)).rejects.toThrow(ConflictError);
    h.db.flushError = new Error('disk full');
    await expect(h.service().signInWithGitHub(verified(), {}, now)).rejects.toThrow('disk full');
    expect(h.db.users).toHaveLength(0);
  });

  it('stamps the current time by default', async () => {
    const h = harness();
    const before = Date.now();
    await h.service().signInWithGitHub(verified(), {});
    expect((h.db.users[0]!.emailVerifiedAt as Date).getTime()).toBeGreaterThanOrEqual(before);
  });
});
