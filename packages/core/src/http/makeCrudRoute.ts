import type { ZodType } from 'zod';
import type { Cradle } from '../container/cradle';
import { withScope } from '../container/container';
import { apiHandler, type RouteContext, type RouteHandler } from './apiHandler';
import { requireSession } from './auth';
import { MethodNotAllowedError, NotFoundError, ValidationError } from './errors';

type ScopeRunner = <R>(fn: (cradle: Cradle) => Promise<R>) => Promise<R>;

export interface CrudRouteConfig<S, C, U> {
  /** Picks the concept service from the request-scoped cradle. */
  service: (cradle: Cradle) => S;
  list?: (service: S) => Promise<unknown>;
  create?: { schema: ZodType<C>; run: (service: S, input: C) => Promise<unknown> };
  update?: { schema: ZodType<U>; run: (service: S, id: string, input: U) => Promise<unknown> };
  remove?: (service: S, id: string) => Promise<unknown>;
  /** Defaults to requireSession. Pass `'public'` only for routes that are public by spec. */
  authorize?: ((request: Request) => unknown) | 'public';
  /** Injection point for tests; defaults to withScope. */
  scope?: ScopeRunner;
}

async function readJsonBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ValidationError('The request body is not valid JSON.');
  }
}

async function readId(request: Request, context: RouteContext): Promise<string> {
  const params = (await context.params) as Record<string, unknown>;
  const fromPath = typeof params.id === 'string' ? params.id : undefined;
  const id = fromPath ?? new URL(request.url).searchParams.get('id') ?? undefined;
  if (!id) throw new NotFoundError('Missing resource id.');
  return id;
}

/**
 * Config-driven CRUD route (engineering standards). The route file becomes configuration:
 * `export const { GET, POST, PUT, DELETE } = makeCrudRoute({ ... })`. Write bodies always go through
 * the Zod schema, so unknown fields never reach the service (no mass assignment).
 */
export function makeCrudRoute<S, C = never, U = never>(
  config: CrudRouteConfig<S, C, U>,
): Record<'GET' | 'POST' | 'PUT' | 'DELETE', RouteHandler> {
  const scope: ScopeRunner = config.scope ?? ((fn) => withScope(fn));
  const authorize = (request: Request) => {
    if (config.authorize === 'public') return;
    (config.authorize ?? requireSession)(request);
  };
  const notAllowed = apiHandler(async () => {
    throw new MethodNotAllowedError();
  });

  const { list, create, update, remove } = config;
  return {
    GET: list
      ? apiHandler(async (request) => {
          authorize(request);
          return scope((cradle) => list(config.service(cradle)));
        })
      : notAllowed,
    POST: create
      ? apiHandler(async (request) => {
          authorize(request);
          const input = create.schema.parse(await readJsonBody(request));
          return scope((cradle) => create.run(config.service(cradle), input));
        })
      : notAllowed,
    PUT: update
      ? apiHandler(async (request, context) => {
          authorize(request);
          const id = await readId(request, context);
          const input = update.schema.parse(await readJsonBody(request));
          return scope((cradle) => update.run(config.service(cradle), id, input));
        })
      : notAllowed,
    DELETE: remove
      ? apiHandler(async (request, context) => {
          authorize(request);
          const id = await readId(request, context);
          return scope((cradle) => remove(config.service(cradle), id));
        })
      : notAllowed,
  };
}
