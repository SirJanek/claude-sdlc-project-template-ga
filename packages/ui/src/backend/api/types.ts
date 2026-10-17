export type FieldErrors = Record<string, string[]>;

export interface ApiErrorBody {
  code: string;
  message: string;
  fieldErrors?: FieldErrors;
}

/**
 * Client-side view of the server's JSON envelope ({ ok, data } / { ok, error }).
 * Declared here on purpose: ui must not import core (see engineering standards).
 */
export type ApiResult<T> = { ok: true; data: T; status: number } | { ok: false; error: ApiErrorBody; status: number };

/** Header every apiCall request carries; the server rejects state-changing requests without it (CSRF). */
export const REQUEST_HEADER = 'x-mentorhub-request';
