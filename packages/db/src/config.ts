import { defineConfig, type Options } from '@mikro-orm/postgresql';
import { entities } from './entities';

export { entities };

export const DEFAULT_DATABASE_URL = 'postgresql://mentorhub:mentorhub@localhost:5433/mentorhub';

export interface DbEnv {
  DATABASE_URL?: string;
  DB_POOL_MAX?: string;
  NODE_ENV?: string;
}

/**
 * ORM configuration shared by the app and the migration scripts.
 * Migrations are added only by the scripts, so the web runtime never loads the migrator.
 */
export function createOrmConfig(env: DbEnv = process.env, overrides: Partial<Options> = {}): Options {
  return defineConfig({
    entities,
    clientUrl: env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
    pool: { min: 0, max: Number(env.DB_POOL_MAX ?? 10) },
    debug: env.NODE_ENV === 'development' ? ['query'] : false,
    ...overrides,
  });
}
