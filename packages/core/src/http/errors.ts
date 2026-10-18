export type FieldErrors = Record<string, string[]>;

/** Base of every error a service may throw. Services never build HTTP responses. */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors?: FieldErrors;

  constructor(message: string, options: { status: number; code: string; fieldErrors?: FieldErrors }) {
    super(message);
    this.name = new.target.name;
    this.status = options.status;
    this.code = options.code;
    this.fieldErrors = options.fieldErrors;
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Some fields are invalid.', fieldErrors: FieldErrors = {}) {
    super(message, { status: 422, code: 'validation_failed', fieldErrors });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Sign-in required.') {
    super(message, { status: 401, code: 'unauthorized' });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have access to this resource.') {
    super(message, { status: 403, code: 'forbidden' });
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found.') {
    super(message, { status: 404, code: 'not_found' });
  }
}

export class MethodNotAllowedError extends AppError {
  constructor(message = 'Method not allowed.') {
    super(message, { status: 405, code: 'method_not_allowed' });
  }
}

export class ConflictError extends AppError {
  constructor(message = 'The resource was changed by someone else.') {
    super(message, { status: 409, code: 'conflict' });
  }
}

export class GoneError extends AppError {
  constructor(message = 'This link has expired or was already used — send a new one.', code = 'link_invalid') {
    super(message, { status: 410, code });
  }
}

export class RateLimitedError extends AppError {
  constructor(message = 'Too many requests. Please wait a while and try again.') {
    super(message, { status: 429, code: 'rate_limited' });
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'The service is temporarily unavailable. Please try again.', code = 'service_unavailable') {
    super(message, { status: 503, code });
  }
}
