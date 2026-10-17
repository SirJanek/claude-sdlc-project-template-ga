import { z } from 'zod';

/** Every environment variable the server reads, validated once. Defaults suit local docker compose. */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url().default('postgresql://mentorhub:mentorhub@localhost:5433/mentorhub'),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  /** Temporary local-only admin access until the auth spec lands; ignored in production. */
  ALLOW_DEV_ADMIN: z.enum(['0', '1']).default('0'),
});

export type Env = z.infer<typeof envSchema>;

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
