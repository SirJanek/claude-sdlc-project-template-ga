import { REQUEST_HEADER, type ApiErrorBody, type ApiResult } from './types';

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const NETWORK_ERROR: ApiErrorBody = {
  code: 'network_error',
  message: 'Network error — check your connection and try again.',
};
const INVALID_RESPONSE: ApiErrorBody = { code: 'invalid_response', message: 'Unexpected response from the server.' };

/** Reads a response body as JSON without throwing: empty or non-JSON bodies become `undefined`. */
export async function readJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null) return false;
  const body = value as Record<string, unknown>;
  return typeof body.code === 'string' && typeof body.message === 'string';
}

function parseEnvelope<T>(body: unknown, status: number): ApiResult<T> {
  if (typeof body !== 'object' || body === null || !('ok' in body))
    return { ok: false, error: INVALID_RESPONSE, status };
  const envelope = body as { ok: unknown; data?: unknown; error?: unknown };
  if (envelope.ok === true) return { ok: true, data: envelope.data as T, status };
  if (envelope.ok === false && isErrorBody(envelope.error)) return { ok: false, error: envelope.error, status };
  return { ok: false, error: INVALID_RESPONSE, status };
}

/**
 * The only sanctioned fetch() to /api/* (engineering standards › Reusable API & UI layer).
 * Never throws: network failures and malformed responses come back as `{ ok: false }`.
 */
export async function apiCall<T>(
  url: string,
  init: RequestInit = {},
  fetchImpl: FetchLike = fetch,
): Promise<ApiResult<T>> {
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  headers.set(REQUEST_HEADER, '1');
  if (init.body !== undefined && !headers.has('content-type')) headers.set('content-type', 'application/json');

  let response: Response;
  try {
    response = await fetchImpl(url, { ...init, headers, credentials: 'same-origin' });
  } catch {
    return { ok: false, error: NETWORK_ERROR, status: 0 };
  }
  return parseEnvelope<T>(await readJsonSafe(response), response.status);
}

export class ApiCallError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fieldErrors?: ApiErrorBody['fieldErrors'];

  constructor(error: ApiErrorBody, status: number) {
    super(error.message);
    this.code = error.code;
    this.status = status;
    this.fieldErrors = error.fieldErrors;
  }
}

/** Same as apiCall, but throws ApiCallError instead of returning `{ ok: false }`. */
export async function apiCallOrThrow<T>(url: string, init?: RequestInit, fetchImpl?: FetchLike): Promise<T> {
  const result = await apiCall<T>(url, init, fetchImpl);
  if (!result.ok) throw new ApiCallError(result.error, result.status);
  return result.data;
}
