import { describe, expect, it } from 'vitest';
import { parseEnv } from '../config/env';
import { DEV_ADMIN_SESSION, requireRole, requireSession } from './auth';
import { ForbiddenError, UnauthorizedError } from './errors';

const req = new Request('http://local/api/users');
const env = (vars: Record<string, string>) => () => parseEnv(vars);

describe('requireSession (fail closed)', () => {
  it('admits the dev admin only with the flag outside production', () => {
    expect(requireSession(req, { env: env({ ALLOW_DEV_ADMIN: '1', NODE_ENV: 'development' }) })).toEqual(
      DEV_ADMIN_SESSION,
    );
  });

  it('denies without the flag, with the flag in production, and when the env cannot be read', () => {
    expect(() => requireSession(req, { env: env({}) })).toThrow(UnauthorizedError);
    expect(() => requireSession(req, { env: env({ ALLOW_DEV_ADMIN: '1', NODE_ENV: 'production' }) })).toThrow(
      UnauthorizedError,
    );
    expect(() =>
      requireSession(req, {
        env: () => {
          throw new Error('Invalid environment');
        },
      }),
    ).toThrow(UnauthorizedError);
  });
});

describe('requireRole', () => {
  it('throws ForbiddenError for another role', () => {
    expect(() => requireRole({ ...DEV_ADMIN_SESSION, role: 'mentee' }, 'admin')).toThrow(ForbiddenError);
    expect(() => requireRole(DEV_ADMIN_SESSION, 'admin')).not.toThrow();
  });
});

describe('requireSession — default environment', () => {
  it('reads the process environment and denies without the flag', () => {
    delete process.env.ALLOW_DEV_ADMIN;
    expect(() => requireSession(req)).toThrow(UnauthorizedError);
  });
});
