import { z } from 'zod';

/** JWT secrets shorter than this are rejected (engineering standards › JWT: ≥ 32 random bytes). */
export const AUTH_SECRET_MIN_LENGTH = 32;

/**
 * Fixed secret for `NODE_ENV=test` only, so CI needs no new secret. It never applies elsewhere:
 * `NODE_ENV` defaults to `development`, and a development default would sign production JWTs
 * with a known value wherever `NODE_ENV` was forgotten (spec: accounts and roles › Env).
 */
export const TEST_AUTH_SECRET = 'mentorhub-test-only-secret-never-used-outside-vitest';

/** Every environment variable the server reads, validated once. Defaults suit local docker compose. */
const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z.string().url().default('postgresql://mentorhub:mentorhub@localhost:5433/mentorhub'),
    DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    /** Local-only admin access for development; honoured only with NODE_ENV=development (allowlist). */
    ALLOW_DEV_ADMIN: z.enum(['0', '1']).default('0'),
    /** Signs session JWTs (HS256). Required everywhere but `test` — see TEST_AUTH_SECRET. */
    AUTH_SECRET: z.string().min(AUTH_SECRET_MIN_LENGTH).optional(),
    /** Public origin of the app; sign-in links are built on it. */
    APP_URL: z.string().url().default('http://localhost:3000'),
    /** Mail port adapter. `mock` writes to a file; a real provider is chosen in its own spec. */
    MAIL_ADAPTER: z.enum(['mock']).default('mock'),
    /** Where the mock adapter appends sent messages (JSON lines); unset → log only. */
    MAIL_OUTBOX_FILE: z.string().min(1).optional(),
    /** Lets test adapters (mock mail, fake GitHub) run under NODE_ENV=production — only the integration suite sets it. */
    ALLOW_TEST_ADAPTERS: z.enum(['0', '1']).default('0'),
    /**
     * GitHub sign-in adapter (spec, Phase 2). Unset → the feature is off and the button hidden; `real`
     * needs both OAuth app credentials; `fake` (tests, local) obeys the same production rule as the mail mock.
     * Both credentials without an adapter name mean `real` (the two ids are all a deployment has to set).
     */
    GITHUB_ADAPTER: z.enum(['real', 'fake']).optional(),
    /** OAuth app credentials from github.com › Settings › Developer settings; callback `${APP_URL}/api/auth/github/callback`. */
    GITHUB_CLIENT_ID: z.string().min(1).optional(),
    GITHUB_CLIENT_SECRET: z.string().min(1).optional(),
    /** Where the fake GitHub adapter reads the scenario it answers with (JSON); unset → a fixed verified user. */
    GITHUB_FAKE_FILE: z.string().min(1).optional(),
  })
  .transform((env, ctx) => {
    if (env.AUTH_SECRET === undefined && env.NODE_ENV !== 'test') {
      ctx.addIssue({
        code: 'custom',
        path: ['AUTH_SECRET'],
        message: `required (at least ${AUTH_SECRET_MIN_LENGTH} characters); "make setup" generates one for local development`,
      });
    }
    if (env.MAIL_ADAPTER === 'mock' && env.NODE_ENV === 'production' && env.ALLOW_TEST_ADAPTERS !== '1') {
      ctx.addIssue({
        code: 'custom',
        path: ['MAIL_ADAPTER'],
        message: 'the mock adapter is refused in production (ALLOW_TEST_ADAPTERS=1 is for test suites only)',
      });
    }
    const hasGitHubCredentials = env.GITHUB_CLIENT_ID !== undefined && env.GITHUB_CLIENT_SECRET !== undefined;
    const githubAdapter = env.GITHUB_ADAPTER ?? (hasGitHubCredentials ? 'real' : undefined);
    if (githubAdapter === 'real' && !hasGitHubCredentials) {
      ctx.addIssue({
        code: 'custom',
        path: ['GITHUB_ADAPTER'],
        message: 'real needs GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET (unset all three to hide GitHub sign-in)',
      });
    }
    if (githubAdapter === 'fake' && env.NODE_ENV === 'production' && env.ALLOW_TEST_ADAPTERS !== '1') {
      ctx.addIssue({
        code: 'custom',
        path: ['GITHUB_ADAPTER'],
        message: 'the fake adapter is refused in production (ALLOW_TEST_ADAPTERS=1 is for test suites only)',
      });
    }
    return { ...env, AUTH_SECRET: env.AUTH_SECRET ?? TEST_AUTH_SECRET, GITHUB_ADAPTER: githubAdapter };
  });

export type Env = z.infer<typeof envSchema>;

/** True when "Continue with GitHub" can work: an adapter is configured (`real` with credentials, or `fake`). */
export function isGitHubEnabled(env: Pick<Env, 'GITHUB_ADAPTER'>): boolean {
  return env.GITHUB_ADAPTER !== undefined;
}

/** Parses an environment object; throws a readable error listing every invalid variable. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (result.success) return result.data;
  const problems = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
  throw new Error(`Invalid environment: ${problems}`);
}

let cached: Env | undefined;

/** Validated process environment, parsed on first use. */
export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
