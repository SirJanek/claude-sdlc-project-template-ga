import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { TestProject } from 'vitest/node';

const DIST_DIR = '.next-integration';

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, () => {
      const address = server.address();
      server.close(() => resolve(typeof address === 'object' && address ? address.port : 0));
    });
  });
}

async function waitUntilUp(url: string, timeoutMs = 180_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).status < 500) return;
    } catch {
      // server not listening yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

/** Vitest sets NODE_ENV=test; servers must pick their own (next dev → development, next start → production). */
function serverEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const merged: NodeJS.ProcessEnv = { ...process.env, ...env };
  delete merged.NODE_ENV;
  return merged;
}

function startNext(args: string[], env: NodeJS.ProcessEnv): ChildProcess {
  const child = spawn('pnpm', ['--filter', '@mentorhub/app', 'exec', 'next', ...args], {
    env: serverEnv(env),
    stdio: 'ignore',
    detached: true,
  });
  return child;
}

function stop(child: ChildProcess): void {
  if (child.pid) {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      // already gone
    }
  }
}

export default async function setup(project: TestProject) {
  const container = await new PostgreSqlContainer('postgres:17-alpine')
    .withDatabase('mentorhub')
    .withUsername('mentorhub')
    .withPassword('mentorhub')
    .start();
  const env = {
    DATABASE_URL: container.getConnectionUri(),
    ALLOW_DEV_ADMIN: '1',
    NEXT_TELEMETRY_DISABLED: '1',
    NEXT_DIST_DIR: DIST_DIR,
    LOG_LEVEL: 'silent',
  };

  execFileSync('pnpm', ['--filter', '@mentorhub/db', 'migrate'], { env: { ...process.env, ...env }, stdio: 'ignore' });
  execFileSync('pnpm', ['--filter', '@mentorhub/app', 'exec', 'next', 'build'], {
    env: serverEnv(env),
    stdio: 'ignore',
  });

  const [devPort, prodPort] = [await freePort(), await freePort()];
  const servers = [
    startNext(['dev', '--port', String(devPort)], env),
    startNext(['start', '--port', String(prodPort)], env),
  ];
  const devUrl = `http://localhost:${devPort}`;
  const prodUrl = `http://localhost:${prodPort}`;
  await Promise.all([waitUntilUp(`${devUrl}/api/health`), waitUntilUp(`${prodUrl}/api/health`)]);
  // Warm up dev-mode compilation so browser waits measure the app, not the compiler.
  for (const path of ['/', '/admin/users', '/api/users']) await fetch(`${devUrl}${path}`);

  project.provide('devUrl', devUrl);
  project.provide('prodUrl', prodUrl);
  project.provide('containerId', container.getId());

  return async () => {
    servers.forEach(stop);
    await container.stop().catch(() => undefined);
  };
}
