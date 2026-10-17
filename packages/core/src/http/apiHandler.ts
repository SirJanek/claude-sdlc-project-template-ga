import { ZodError } from 'zod';
import type { Logger } from 'pino';
import { getLogger } from '../logger';
import { AppError, ForbiddenError, type FieldErrors } from './errors';

/** Header apiCall always sends; a plain cross-site form post cannot set it (CSRF defence). */
export const REQUEST_HEADER = 'x-mentorhub-request';

export type ApiEnvelope<T> =
  { ok: true; data: T } | { ok: false; error: { code: string; message: string; fieldErrors?: FieldErrors } };

/** Next.js passes route params as a promise; the shape depends on the route, so handlers narrow it. */
export interface RouteContext {
  params: Promise<object>;
}

export type RouteHandler = (request: Request, context: RouteContext) => Promise<Response>;

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const GENERIC_MESSAGE = 'Something went wrong. Please try again.';

function errorResponse(status: number, code: string, message: string, fieldErrors?: FieldErrors): Response {
  const body: ApiEnvelope<never> = { ok: false, error: { code, message, ...(fieldErrors ? { fieldErrors } : {}) } };
  return Response.json(body, { status });
}

function zodFieldErrors(error: ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_form';
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}

/**
 * Wraps every route handler: CSRF check for state-changing methods, JSON envelope on success,
 * AppError/ZodError → status + envelope, anything else → logged 500 without internals.
 * Returning a `Response` is an explicit escape hatch for non-envelope contracts (e.g. /api/health).
 */
export function apiHandler<T>(
  fn: (request: Request, context: RouteContext) => Promise<T | Response>,
  options: { logger?: Logger } = {},
): RouteHandler {
  return async (request, context) => {
    try {
      if (!SAFE_METHODS.has(request.method) && request.headers.get(REQUEST_HEADER) !== '1') {
        throw new ForbiddenError('Missing request header.');
      }
      const result = await fn(request, context);
      if (result instanceof Response) return result;
      const body: ApiEnvelope<T> = { ok: true, data: result };
      return Response.json(body, { status: 200 });
    } catch (error) {
      if (error instanceof AppError) return errorResponse(error.status, error.code, error.message, error.fieldErrors);
      if (error instanceof ZodError) {
        return errorResponse(422, 'validation_failed', 'Some fields are invalid.', zodFieldErrors(error));
      }
      (options.logger ?? getLogger()).error(
        { err: error, method: request.method, url: request.url },
        'unhandled route error',
      );
      return errorResponse(500, 'internal_error', GENERIC_MESSAGE);
    }
  };
}
