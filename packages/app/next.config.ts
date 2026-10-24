import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Integration tests build into their own folder so they never clash with a running `make dev`.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  // Workspace packages ship TypeScript source; Next compiles them.
  transpilePackages: ['@mentorhub/core', '@mentorhub/db', '@mentorhub/ui'],
  // The ORM and its driver run as plain Node modules on the server, never bundled.
  serverExternalPackages: ['@mikro-orm/core', '@mikro-orm/postgresql', '@mikro-orm/sql', 'pg', 'kysely', 'pino'],
  // The dev server prints every incoming request with its query string, bypassing pino's redaction:
  // the sign-in link (`/auth/confirm?token=…`) must never land in stdout (review finding 5).
  logging: { incomingRequests: { ignore: [/^\/auth\/confirm(\?|$)/] } },
};

export default nextConfig;
