/**
 * Composition root (Awilix). The ONLY place in the app that touches the ORM singleton.
 * Services get their dependencies injected; request-scoped services get a fresh EntityManager.
 */
import { asFunction, asValue, createContainer, InjectionMode, type AwilixContainer } from 'awilix';
import { getOrm, type EntityManager, type Orm } from '@mentorhub/db';
import { makeHealthService, type HealthService } from './services/health';
import { makeUserService, type UserService } from './services/users';

export interface Cradle {
  getOrm: () => Promise<Orm>;
  em: EntityManager;
  healthService: HealthService;
  userService: UserService;
}

export type AppContainer = AwilixContainer<Cradle>;

export function buildContainer(overrides: Partial<Pick<Cradle, 'getOrm'>> = {}): AppContainer {
  const container = createContainer<Cradle>({ injectionMode: InjectionMode.PROXY, strict: true });
  container.register({
    getOrm: asValue(overrides.getOrm ?? getOrm),
    healthService: asFunction(makeHealthService).singleton(),
    userService: asFunction(makeUserService).scoped(),
  });
  return container;
}

const globalForContainer = globalThis as unknown as { __mentorhubContainer?: AppContainer };

export function getContainer(): AppContainer {
  return (globalForContainer.__mentorhubContainer ??= buildContainer());
}

/** One scope per request, with its own EntityManager fork (identity map per request). */
export async function createRequestScope(container: AppContainer = getContainer()): Promise<AppContainer> {
  const orm = await container.cradle.getOrm();
  const scope = container.createScope();
  scope.register({ em: asValue(orm.em.fork() as EntityManager) });
  return scope;
}
