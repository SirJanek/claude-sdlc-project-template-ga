import type { EntityManager, Orm } from '@mentorhub/db';
import type { Logger } from 'pino';
import type { Env } from '../config/env';
import type { UserService } from '../services/auth/user.service';
import type { HealthService } from '../services/health/health.service';

/** Everything the container can resolve. One key per dependency; add a line per new service. */
export interface Cradle {
  env: Env;
  logger: Logger;
  getOrm: () => Promise<Orm>;
  /** Request-scoped EntityManager fork — only present inside a scope. */
  em: EntityManager;
  healthService: HealthService;
  userService: UserService;
}
