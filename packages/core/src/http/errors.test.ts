import { describe, expect, it } from 'vitest';
import {
  AppError,
  ConflictError,
  ForbiddenError,
  GitHubEmailUnverifiedError,
  GoneError,
  MethodNotAllowedError,
  NotFoundError,
  RateLimitedError,
  ServiceUnavailableError,
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

describe('GitHub errors', () => {
  it('an unverified GitHub e-mail is a 403 with the spec copy and a stable code', () => {
    const error = new GitHubEmailUnverifiedError();
    expect(error).toBeInstanceOf(AppError);
    expect([error.status, error.code]).toEqual([403, 'github_email_unverified']);
    expect(error.message).toBe("Your GitHub e-mail isn't verified — verify it on GitHub or use an e-mail link.");
    expect(new GitHubEmailUnverifiedError('custom').message).toBe('custom');
  });
});

describe('auth errors', () => {
  it('map link, rate-limit and mail failures to 410, 429 and 503 with stable codes', () => {
    const gone = new GoneError();
    expect([gone.status, gone.code]).toEqual([410, 'link_invalid']);
    expect(gone.message).toBe('This link has expired or was already used — send a new one.');
    const limited = new RateLimitedError();
    expect([limited.status, limited.code]).toEqual([429, 'rate_limited']);
    expect(limited.message).not.toMatch(/e-?mail/i); // generic: reveals nothing about the address
    const unavailable = new ServiceUnavailableError("We couldn't send the e-mail — try again.", 'mail_not_sent');
    expect([unavailable.status, unavailable.code]).toEqual([503, 'mail_not_sent']);
    expect(new ServiceUnavailableError().code).toBe('service_unavailable');
    for (const error of [gone, limited, unavailable]) expect(error).toBeInstanceOf(AppError);
  });
});
