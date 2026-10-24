import { describe, expect, it } from 'vitest';
import { AUTH_SECRET_MIN_LENGTH, TEST_AUTH_SECRET, parseEnv } from './env';

const SECRET = 'x'.repeat(AUTH_SECRET_MIN_LENGTH);

describe('environment', () => {
  it('fills documented defaults for local development', () => {
    const env = parseEnv({ AUTH_SECRET: SECRET });
    expect(env.NODE_ENV).toBe('development');
    expect(env.DATABASE_URL).toContain('localhost:5433');
    expect(env.DB_POOL_MAX).toBe(10);
    expect(env.ALLOW_DEV_ADMIN).toBe('0');
    expect(env.APP_URL).toBe('http://localhost:3000');
    expect(env.MAIL_ADAPTER).toBe('mock');
    expect(env.MAIL_OUTBOX_FILE).toBeUndefined();
    expect(env.ALLOW_TEST_ADAPTERS).toBe('0');
  });

  it('coerces numbers and rejects invalid values with a readable message', () => {
    expect(parseEnv({ DB_POOL_MAX: '3', AUTH_SECRET: SECRET }).DB_POOL_MAX).toBe(3);
    expect(() => parseEnv({ DB_POOL_MAX: 'many', DATABASE_URL: 'not a url', AUTH_SECRET: SECRET })).toThrow(
      /DB_POOL_MAX.*DATABASE_URL|DATABASE_URL.*DB_POOL_MAX/,
    );
    expect(() => parseEnv({ ALLOW_DEV_ADMIN: 'yes', AUTH_SECRET: SECRET })).toThrow(/ALLOW_DEV_ADMIN/);
    expect(() => parseEnv({ APP_URL: 'nope', AUTH_SECRET: SECRET })).toThrow(/APP_URL/);
    expect(() => parseEnv({ MAIL_ADAPTER: 'smtp', AUTH_SECRET: SECRET })).toThrow(/MAIL_ADAPTER/);
  });
});

describe('AUTH_SECRET', () => {
  it('is required in development (the default NODE_ENV) and in production — no development default', () => {
    expect(() => parseEnv({})).toThrow(/AUTH_SECRET: required/);
    expect(() => parseEnv({ NODE_ENV: 'development' })).toThrow(/AUTH_SECRET/);
    expect(() => parseEnv({ NODE_ENV: 'production', ALLOW_TEST_ADAPTERS: '1' })).toThrow(/AUTH_SECRET/);
  });

  it('rejects a short secret everywhere, including test', () => {
    const short = 'x'.repeat(AUTH_SECRET_MIN_LENGTH - 1);
    expect(() => parseEnv({ AUTH_SECRET: short })).toThrow(/AUTH_SECRET/);
    expect(() => parseEnv({ NODE_ENV: 'test', AUTH_SECRET: short })).toThrow(/AUTH_SECRET/);
  });

  it('falls back to the fixed test-only secret under NODE_ENV=test and keeps an explicit one', () => {
    expect(parseEnv({ NODE_ENV: 'test' }).AUTH_SECRET).toBe(TEST_AUTH_SECRET);
    expect(parseEnv({ NODE_ENV: 'test', AUTH_SECRET: SECRET }).AUTH_SECRET).toBe(SECRET);
    expect(TEST_AUTH_SECRET.length).toBeGreaterThanOrEqual(AUTH_SECRET_MIN_LENGTH);
  });
});

describe('MAIL_ADAPTER=mock in production', () => {
  it('is refused unless ALLOW_TEST_ADAPTERS=1 (integration suite only)', () => {
    expect(() => parseEnv({ NODE_ENV: 'production', AUTH_SECRET: SECRET })).toThrow(/MAIL_ADAPTER: the mock adapter/);
    expect(() => parseEnv({ NODE_ENV: 'production', AUTH_SECRET: SECRET, MAIL_ADAPTER: 'mock' })).toThrow(
      /MAIL_ADAPTER/,
    );
    const allowed = parseEnv({ NODE_ENV: 'production', AUTH_SECRET: SECRET, ALLOW_TEST_ADAPTERS: '1' });
    expect(allowed.MAIL_ADAPTER).toBe('mock');
    expect(parseEnv({ NODE_ENV: 'development', AUTH_SECRET: SECRET }).MAIL_ADAPTER).toBe('mock');
  });

  it('reports both problems at once when the secret is missing too', () => {
    expect(() => parseEnv({ NODE_ENV: 'production' })).toThrow(/AUTH_SECRET.*MAIL_ADAPTER/);
  });
});

describe('getEnv', () => {
  it('parses process.env once and returns the cached result', async () => {
    const { getEnv } = await import('./env');
    process.env.DB_POOL_MAX = '7';
    const first = getEnv();
    process.env.DB_POOL_MAX = '9';
    expect(first.DB_POOL_MAX).toBe(7);
    expect(getEnv()).toBe(first);
  });
});
