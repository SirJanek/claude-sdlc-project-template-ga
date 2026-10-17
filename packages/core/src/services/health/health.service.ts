import type { Orm } from '@mentorhub/db';
import type { Logger } from 'pino';

export interface HealthReport {
  status: 'ok' | 'degraded';
  db: 'up' | 'down';
}

/** Reports whether the database answers. A failed check is a "down" report, never an exception. */
export class HealthService {
  private readonly getOrm: () => Promise<Orm>;
  private readonly logger: Logger;

  constructor({ getOrm, logger }: { getOrm: () => Promise<Orm>; logger: Logger }) {
    this.getOrm = getOrm;
    this.logger = logger;
  }

  async check(): Promise<HealthReport> {
    try {
      const orm = await this.getOrm();
      // MikroORM 7 connects lazily: checkConnection() says "not established" until a query runs.
      await orm.em.fork().getConnection().execute('select 1');
      return { status: 'ok', db: 'up' };
    } catch (error) {
      this.logger.warn({ err: error }, 'health check: database unreachable');
      return { status: 'degraded', db: 'down' };
    }
  }
}
