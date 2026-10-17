import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';

describe('environment', () => {
  it('fills documented defaults for local development', () => {
    const env = parseEnv({});
    expect(env.NODE_ENV).toBe('development');
    expect(env.DATABASE_URL).toContain('localhost:5433');
    expect(env.DB_POOL_MAX).toBe(10);
    expect(env.ALLOW_DEV_ADMIN).toBe('0');
  });

  it('coerces numbers and rejects invalid values with a readable message', () => {
    expect(parseEnv({ DB_POOL_MAX: '3' }).DB_POOL_MAX).toBe(3);
    expect(() => parseEnv({ DB_POOL_MAX: 'many', DATABASE_URL: 'not a url' })).toThrow(
      /DB_POOL_MAX.*DATABASE_URL|DATABASE_URL.*DB_POOL_MAX/,
    );
    expect(() => parseEnv({ ALLOW_DEV_ADMIN: 'yes' })).toThrow(/ALLOW_DEV_ADMIN/);
  });
});
