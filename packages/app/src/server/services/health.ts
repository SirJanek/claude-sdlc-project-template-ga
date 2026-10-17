import type { Orm } from '@mentorhub/db';

export interface HealthReport {
  status: 'ok' | 'degraded';
  db: 'up' | 'down';
}

export interface HealthService {
  check(): Promise<HealthReport>;
}

/** Reports whether the database answers. Never throws: a failed check is a "down" report. */
export function makeHealthService({ getOrm }: { getOrm: () => Promise<Orm> }): HealthService {
  return {
    async check() {
      try {
        const orm = await getOrm();
        // MikroORM 7 connects lazily: checkConnection() says "not established" until a query
        // runs, so the only honest check is a real round-trip.
        await orm.em.fork().getConnection().execute('select 1');
        return { status: 'ok', db: 'up' };
      } catch {
        return { status: 'degraded', db: 'down' };
      }
    },
  };
}
