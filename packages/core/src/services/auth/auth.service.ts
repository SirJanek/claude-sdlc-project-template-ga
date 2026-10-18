import { createHash, randomBytes } from 'node:crypto';
import { AuthToken, User, isUniqueViolation, type EntityManager, type UserRole } from '@mentorhub/db';
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
import { defaultLandingPath, withAccountNotice } from './landing-path';

export interface EmailLinkRequest extends EmailLinkStartInput {
  /** Client address for the per-IP limit; hashed with AUTH_SECRET, never stored raw. */
  ip: string;
}

export interface ConsumedLink {
  userId: string;
  sessionVersion: number;
  /**
   * Validated same-origin path to return to: the link's `next` when it carried one, else the role's
   * default (`/mentor/profile` for a mentor, `/` otherwise); carries `?notice=existing_account` when
   * `existingAccount` is true, so the landing page shows the notice once.
   */
  next: string;
  /** True when a sign-up link (with an intended role) was used for an e-mail that already had an account. */
  existingAccount: boolean;
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
   * Stores a hashed single-use token and only then sends the link. The rate-limit count and the
   * insert share one transaction under an advisory lock keyed by the e-mail (bound parameter), so
   * concurrent requests cannot both pass the limit. Resolves for unknown and existing e-mails alike
   * (no account enumeration). On a send failure the token is marked dead and the caller gets 503.
   */
  async requestEmailLink(input: EmailLinkRequest, now = new Date()): Promise<void> {
    const { email } = input;
    const ipHash = sha256(input.ip + this.env.AUTH_SECRET);
    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = sha256(rawToken);

    await this.em.transactional(async (em) => {
      await em.execute('select pg_advisory_xact_lock(hashtext(?::text))', [email]);
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
   * A new account gets the link's intended role; an existing account is only verified — its role is
   * never changed here (spec › Flows 3; `make set-role` is the only way), and a sign-up link used for
   * it yields `existingAccount` plus the notice on the landing path.
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
      } else {
        // Existing account: verify it if needed and leave everything else — the role included — as it is.
        if (user.emailVerifiedAt === null) user.emailVerifiedAt = now;
      }
      try {
        await em.flush();
      } catch (error) {
        // Two links for one new e-mail consumed at once: the second loses on users.email.
        if (isUniqueViolation(error)) throw new ConflictError('Please try the link again.');
        throw error;
      }
      const existingAccount = !created && token.intentRole !== null;
      const landing = token.nextPath ?? defaultLandingPath(user.role);
      return {
        user,
        created,
        existingAccount,
        next: existingAccount ? withAccountNotice(landing, 'existing_account') : landing,
      };
    });
    if (outcome.created) {
      await this.eventBus.emit('auth.user.created', {
        userId: outcome.user.id,
        email: outcome.user.email,
        method: 'email',
      });
    }
    return {
      userId: outcome.user.id,
      sessionVersion: outcome.user.sessionVersion,
      next: outcome.next,
      existingAccount: outcome.existingAccount,
    };
  }

  /** The `Set-Cookie` value that starts a session for the user on this device. */
  async startSession(user: { userId: string; sessionVersion: number }, now = new Date()): Promise<string> {
    const token = await signSessionToken({ sub: user.userId, sv: user.sessionVersion }, this.env.AUTH_SECRET, now);
    return buildSessionCookie(token, this.env);
  }

  /** Bumps the session version: every cookie issued so far stops working on its next request. */
  async signOutEverywhere(userId: string): Promise<void> {
    const user = await this.em.findOne(User, { id: userId });
    if (!user) throw new UnauthorizedError();
    user.sessionVersion += 1;
    await this.em.flush();
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
