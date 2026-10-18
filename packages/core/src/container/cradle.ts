import type { EntityManager, Orm } from '@mentorhub/db';
import type { Logger } from 'pino';
import type { EventBus } from '../events/event-bus';
import type { Env } from '../config/env';
import type { SessionUserLookup } from '../http/auth';
import type { AuthService } from '../services/auth/auth.service';
import type { UserService } from '../services/auth/user.service';
import type { HealthService } from '../services/health/health.service';
import type { MailSender } from '../services/mail/mail-sender.port';

/** Everything the container can resolve. One key per dependency; add a line per new service. */
export interface Cradle {
  env: Env;
  logger: Logger;
  getOrm: () => Promise<Orm>;
  /** Request-scoped EntityManager fork — only present inside a scope. */
  em: EntityManager;
  /** Singleton, in-process domain event bus. */
  eventBus: EventBus;
  healthService: HealthService;
  userService: UserService;
  /** Narrow read port for requireSession (an alias of userService). */
  sessionUserLookup: SessionUserLookup;
  /** Outgoing e-mail port; adapter chosen by MAIL_ADAPTER. */
  mailSender: MailSender;
  authService: AuthService;
}
