/**
 * Runs once when the server starts (Next.js instrumentation hook). Validating the environment here
 * makes a missing AUTH_SECRET or a mock adapter in production refuse the whole server (fail closed)
 * instead of failing request by request. The edge runtime has no server env to validate.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { getEnv } = await import('@mentorhub/core');
  getEnv();
}
