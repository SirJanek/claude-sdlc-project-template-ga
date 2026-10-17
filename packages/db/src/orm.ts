import { MikroORM, type Options } from '@mikro-orm/postgresql';
import { createOrmConfig } from './config';

export type Orm = MikroORM;

/** Creates and connects a new ORM instance (one connection pool). */
export async function createOrm(options?: Options): Promise<Orm> {
  return MikroORM.init(options ?? createOrmConfig());
}

const globalForOrm = globalThis as unknown as { __mentorhubOrm?: Promise<Orm> };

/**
 * Process-wide ORM singleton. Kept on globalThis so Next.js hot reload in development reuses
 * one pool instead of opening a new one on every change. Only the app's composition root
 * should call this.
 */
export function getOrm(options?: Options): Promise<Orm> {
  globalForOrm.__mentorhubOrm ??= createOrm(options).catch((error: unknown) => {
    globalForOrm.__mentorhubOrm = undefined;
    throw error;
  });
  return globalForOrm.__mentorhubOrm;
}
