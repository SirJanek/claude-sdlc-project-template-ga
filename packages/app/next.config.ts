import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source; Next compiles them.
  transpilePackages: ['@mentorhub/core', '@mentorhub/db', '@mentorhub/ui'],
  // The ORM and its driver run as plain Node modules on the server, never bundled.
  serverExternalPackages: ['@mikro-orm/core', '@mikro-orm/postgresql', '@mikro-orm/sql', 'pg', 'kysely', 'pino'],
};

export default nextConfig;
