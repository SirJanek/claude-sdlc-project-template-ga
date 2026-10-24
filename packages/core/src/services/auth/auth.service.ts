import { createHash, randomBytes } from 'node:crypto';
import { AuthToken, User, isUniqueViolation, revokeSessions, type EntityManager, type UserRole } from '@mentorhub/db';
import type { Logger } from 'pino';
import type { Env } from '../../config/env';
import { AUTH_LIMITS } from '../../config/rules';
import type { EventBus } from '../../events/event-bus';
import type { Session } from '../../http/auth';
import {
  ConflictError,
  GoneError,
  RateLimitedError,
  ServiceUnavailableError,
  UnauthorizedError,
} from '../../http/errors';
import { buildSessionCookie, signSessionToken } from '../../http/session';
import type { EmailLinkStartInput } from '../../validators/auth/email-link-start.schema';
import type { MailSender } from '../mail/mail-sender.port';

export interface EmailLinkRequest extends EmailLinkStartInput {
  /** Client address for the per-IP limit; hashed with AUTH_SECRET, never stored raw. */
  ip: string;
}

export interface ConsumedLink {
  userId: string;
  sessionVersion: number;
  /** Validated same-origin path to return to; `/` when the link carried none. */
  next: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  emailVerified: boolean;
}

/** `/api/auth/me` for the local dev-admin session, which has no users row. */
export const DEV_ADMIN_USER: CurrentUser = {
  id: 'dev-admin',
  email: 'dev-admin@localhost',
  name: 'Dev admin',
  role: 'admin',
  emailVerified: true,
};

const MINUTE = 60_000;
const DAY = 86_400_000;
const ROOT_PATH = '/';
const MAIL_SUBJECT = 'Your MentorHub sign-in link';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const minutesBefore = (now: Date, minutes: number) => new Date(now.getTime() - minutes * MINUTE);

/**
 * Accounts and roles (spec, Phase 1): one-time e-mail links, sessions, sign-out. Request-scoped.
 * Throws AppErrors only; never builds HTTP responses.
 */
export class AuthService {
  private readonly em: EntityManager;
  private readonly env: Env;
  private readonly logger: Logger;
  private readonly mailSender: MailSender;
  private readonly eventBus: EventBus;

  constructor({
    em,
    env,
    logger,
    mailSender,
    eventBus,
  }: {
    em: EntityManager;
    env: Env;
    logger: Logger;
    mailSender: MailSender;
    eventBus: EventBus;
  }) {
    this.em = em;
    this.env = env;
    this.logger = logger;
    this.mailSender = mailSender;
    this.eventBus = eventBus;
  }

  /**
   * Stores a hashed single-use token and only then sends the link. The rate-limit counts and the
   * insert share one transaction under two advisory locks — the e-mail bucket, then the IP bucket,
   * always in that order (no deadlock), both namespaced and bound as parameters — so concurrent
   * requests cannot both pass either limit (review finding 2). Resolves for unknown and existing
   * e-mails alike (no account enumeration). On a send failure the token is marked dead → 503.
   */
  async requestEmailLink(input: EmailLinkRequest, now = new Date()): Promise<void> {
    const { email } = input;
    const ipHash = sha256(input.ip + this.env.AUTH_SECRET);
    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = sha256(rawToken);

    await this.em.transactional(async (em) => {
      await em.execute('select pg_advisory_xact_lock(hashtext(?::text)), pg_advisory_xact_lock(hashtext(?::text))', [
        `email:${email}`,
        `ip:${ipHash}`,
      ]);
      const { linksPerEmail, linksPerIp, tokenRetentionDays, linkTtlMinutes } = AUTH_LIMITS;
      const byEmail = await em.count(AuthToken, {
        email,
        createdAt: { $gte: minutesBefore(now, linksPerEmail.windowMinutes) },
      });
      if (byEmail >= linksPerEmail.max) throw new RateLimitedError();
      const byIp = await em.count(AuthToken, {
        ipHash,
        createdAt: { $gte: minutesBefore(now, linksPerIp.windowMinutes) },
      });
      if (byIp >= linksPerIp.max) throw new RateLimitedError();
      // Opportunistic retention: no worker in this project, so every token creation sweeps old rows.
      await em.nativeDelete(AuthToken, { createdAt: { $lt: new Date(now.getTime() - tokenRetentionDays * DAY) } });
      em.create(AuthToken, {
        email,
        tokenHash,
        intentRole: input.intentRole ?? null,
        nextPath: input.next ?? null,
        ipHash,
        expiresAt: new Date(now.getTime() + linkTtlMinutes * MINUTE),
        usedAt: null,
      });
    });

    try {
      await this.mailSender.send({ to: email, subject: MAIL_SUBJECT, text: this.linkMailText(rawToken) });
    } catch (error) {
      this.logger.warn({ err: error }, 'sign-in link could not be sent; token marked dead');
      await this.em.nativeUpdate(AuthToken, { tokenHash }, { usedAt: now });
      throw new ServiceUnavailableError("We couldn't send the e-mail — try again.", 'mail_not_sent');
    }
  }

  /** The e-mail behind a still-valid link, or null — reads only, never consumes (mail scanners prefetch). */
  async peekEmailLink(rawToken: string, now = new Date()): Promise<{ email: string } | null> {
    let token: AuthToken | null;
    try {
      token = await this.em.findOne(AuthToken, { tokenHash: sha256(rawToken) });
    } catch (error) {
      this.logger.warn({ err: error }, 'could not look up a sign-in link; treating it as invalid');
      return null; // fail closed: the page shows "expired", nothing is consumed
    }
    if (!token || token.usedAt !== null || token.expiresAt <= now) return null;
    return { email: token.email };
  }

  /**
   * Single use, atomically: the row is claimed by an UPDATE that matches only an unused, unexpired
   * token. Finds or creates the user by e-mail, marks it verified, emits `auth.user.created` only for
   * a new account (after commit). Invalid, expired or used → GoneError (410 link_invalid).
   */
  async consumeEmailLink(rawToken: string, now = new Date()): Promise<ConsumedLink> {
    const tokenHash = sha256(rawToken);
    const outcome = await this.em.transactional(async (em) => {
      const claimed = await em.nativeUpdate(
        AuthToken,
        { tokenHash, usedAt: null, expiresAt: { $gt: now } },
        { usedAt: now },
      );
      if (claimed !== 1) throw new GoneError();
      const token = await em.findOneOrFail(AuthToken, { tokenHash });
      let user = await em.findOne(User, { email: token.email });
      let created = false;
      if (!user) {
        user = em.create(User, {
          email: token.email,
          name: null,
          role: token.intentRole ?? 'mentee',
          emailVerifiedAt: now,
          githubId: null,
          sessionVersion: 0,
        });
        created = true;
      } else if (user.emailVerifiedAt === null) {
        user.emailVerifiedAt = now;
      }
      try {
        await em.flush();
      } catch (error) {
        // Two links for one new e-mail consumed at once: the second loses on users.email.
        if (isUniqueViolation(error)) throw new ConflictError('Please try the link again.');
        throw error;
      }
      return { user, created, next: token.nextPath ?? ROOT_PATH };
    });
    if (outcome.created) {
      await this.eventBus.emit('auth.user.created', {
        userId: outcome.user.id,
        email: outcome.user.email,
        method: 'email',
      });
    }
    return { userId: outcome.user.id, sessionVersion: outcome.user.sessionVersion, next: outcome.next };
  }

  /** The `Set-Cookie` value that starts a session for the user on this device. */
  async startSession(user: { userId: string; sessionVersion: number }, now = new Date()): Promise<string> {
    const token = await signSessionToken({ sub: user.userId, sv: user.sessionVersion }, this.env.AUTH_SECRET, now);
    return buildSessionCookie(token, this.env);
  }

  /**
   * Bumps the session version in one atomic UPDATE (`session_version = session_version + 1`): two
   * revocations never overwrite each other and a session started in between is ended as well
   * (review finding 3). Every cookie issued so far stops working on its next request.
   */
  async signOutEverywhere(userId: string): Promise<void> {
    const revoked = await revokeSessions(this.em, userId);
    if (!revoked) throw new UnauthorizedError();
  }

  /** The signed-in account for `/api/auth/me`. */
  async currentUser(session: Session): Promise<CurrentUser> {
    if (session.isDevSession) return DEV_ADMIN_USER;
    const user = await this.em.findOne(User, { id: session.userId });
    if (!user) throw new UnauthorizedError();
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerifiedAt !== null,
    };
  }

  private linkMailText(rawToken: string): string {
    const url = new URL('/auth/confirm', this.env.APP_URL);
    url.searchParams.set('token', rawToken);
    return [
      'Hi,',
      '',
      `Open this link within ${AUTH_LIMITS.linkTtlMinutes} minutes to sign in to MentorHub:`,
      url.toString(),
      '',
      "If you didn't ask for it, you can ignore this e-mail — nothing happens unless the link is used.",
    ].join('\n');
  }
}
