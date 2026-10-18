import { describe, expect, it } from 'vitest';
import {
  AppError,
  ConflictError,
  ForbiddenError,
  MethodNotAllowedError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from './errors';

describe('AppError hierarchy', () => {
  it.each([
    [new ValidationError(), 422, 'validation_failed', 'Some fields are invalid.'],
    [new UnauthorizedError(), 401, 'unauthorized', 'Sign-in required.'],
    [new ForbiddenError(), 403, 'forbidden', 'You do not have access to this resource.'],
    [new NotFoundError(), 404, 'not_found', 'Not found.'],
    [new MethodNotAllowedError(), 405, 'method_not_allowed', 'Method not allowed.'],
    [new ConflictError(), 409, 'conflict', 'The resource was changed by someone else.'],
  ])('%s maps to its status, code and default message', (error, status, code, message) => {
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ status, code, message, name: error.constructor.name });
  });

  it('keeps custom messages and field errors', () => {
    const error = new ValidationError('Check the form.', { email: ['Required'] });
    expect(error.message).toBe('Check the form.');
    expect(error.fieldErrors).toEqual({ email: ['Required'] });
    expect(new NotFoundError('No such mentor.').message).toBe('No such mentor.');
  });
});
