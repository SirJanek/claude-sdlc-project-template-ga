/**
 * Composition root (Awilix). The only place that touches the ORM singleton. Every binding is an
 * explicit line — no loadModules globbing — so each dependency is greppable.
 */
import { asClass, asValue, createContainer, InjectionMode, type AwilixContainer } from 'awilix';
import { createOrmConfig, getOrm, type EntityManager } from '@mentorhub/db';
import { getEnv } from '../config/env';
import { getLogger } from '../logger';
import { UserService } from '../services/auth/user.service';
import { HealthService } from '../services/health/health.service';
import type { Cradle } from './cradle';

export type AppContainer = AwilixContainer<Cradle>;

export function buildContainer(overrides: Partial<Pick<Cradle, 'getOrm' | 'env' | 'logger'>> = {}): AppContainer {
  const env = overrides.env ?? getEnv();
  const container = createContainer<Cradle>({ injectionMode: InjectionMode.PROXY, strict: true });
  container.register({
    env: asValue(env),
    logger: asValue(overrides.logger ?? getLogger()),
    getOrm: asValue(
      overrides.getOrm ??
        (() =>
          getOrm(
            createOrmConfig({
              DATABASE_URL: env.DATABASE_URL,
              DB_POOL_MAX: String(env.DB_POOL_MAX),
              NODE_ENV: env.NODE_ENV,
            }),
          )),
    ),
    healthService: asClass(HealthService).singleton(),
    userService: asClass(UserService).scoped(),
  });
  return container;
}

const globalForContainer = globalThis as unknown as { __mentorhubContainer?: AppContainer };

/** Process-wide container (kept on globalThis so dev hot reload reuses it). */
export function getContainer(): AppContainer {
  return (globalForContainer.__mentorhubContainer ??= buildContainer());
}

/** New scope with its own EntityManager fork (identity map per request). */
export async function createRequestScope(container: AppContainer = getContainer()): Promise<AppContainer> {
  const orm = await container.cradle.getOrm();
  const scope = container.createScope();
  scope.register({ em: asValue(orm.em.fork() as EntityManager) });
  return scope;
}

/** Runs `fn` inside a fresh request scope and disposes the scope afterwards. */
export async function withScope<T>(
  fn: (cradle: Cradle) => Promise<T>,
  container: AppContainer = getContainer(),
): Promise<T> {
  const scope = await createRequestScope(container);
  try {
    return await fn(scope.cradle);
  } finally {
    await scope.dispose();
  }
}
