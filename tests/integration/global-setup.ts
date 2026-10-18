import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { openSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { TestProject } from 'vitest/node';
import { evidencePath, resetEvidence } from './evidence';

const DIST_DIR = '.next-integration';
/** Test-only secret (≥ 32 chars): both servers sign the same cookies; never a real value. */
const TEST_AUTH_SECRET = 'integration-suite-auth-secret-not-for-real-use-0123456789';

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

/** stdout + stderr of a step go to `<name>.log` in the evidence folder. */
const logTo = (name: string): ['ignore', number, number] => {
  const fd = openSync(evidencePath(`${name}.log`), 'a');
  return ['ignore', fd, fd];
};

function startNext(args: string[], env: NodeJS.ProcessEnv, log: string): ChildProcess {
  const child = spawn('pnpm', ['--filter', '@mentorhub/app', 'exec', 'next', ...args], {
    env: serverEnv(env),
    stdio: logTo(log),
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
  resetEvidence();
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
    AUTH_SECRET: TEST_AUTH_SECRET,
    MAIL_ADAPTER: 'mock',
    // The mock adapter is refused under NODE_ENV=production (next start) unless the suite says so.
    ALLOW_TEST_ADAPTERS: '1',
  };

  execFileSync('pnpm', ['--filter', '@mentorhub/db', 'migrate'], {
    env: { ...process.env, ...env },
    stdio: logTo('migrate'),
  });
  execFileSync('pnpm', ['--filter', '@mentorhub/app', 'exec', 'next', 'build'], {
    env: serverEnv(env),
    stdio: logTo('build'),
  });

  const [devPort, prodPort] = [await freePort(), await freePort()];
  const devUrl = `http://localhost:${devPort}`;
  const prodUrl = `http://localhost:${prodPort}`;
  // Each server gets its own public origin (sign-in links point back at it) and its own mail outbox.
  const devOutbox = evidencePath('outbox-dev.jsonl');
  const prodOutbox = evidencePath('outbox-prod.jsonl');
  for (const file of [devOutbox, prodOutbox]) writeFileSync(file, '');
  const servers = [
    startNext(
      ['dev', '--port', String(devPort)],
      { ...env, APP_URL: devUrl, MAIL_OUTBOX_FILE: devOutbox },
      'server-dev',
    ),
    startNext(
      ['start', '--port', String(prodPort)],
      { ...env, APP_URL: prodUrl, MAIL_OUTBOX_FILE: prodOutbox },
      'server-prod',
    ),
  ];
  await Promise.all([waitUntilUp(`${devUrl}/api/health`), waitUntilUp(`${prodUrl}/api/health`)]);
  // Warm up dev-mode compilation so browser waits measure the app, not the compiler.
  for (const path of [
    '/',
    '/admin',
    '/admin/users',
    '/api/users',
    '/api/admin/health',
    '/sign-in',
    '/sign-up/mentor',
    '/check-email',
    '/auth/confirm',
    '/mentor/profile',
    '/api/auth/me',
  ])
    await fetch(`${devUrl}${path}`);

  project.provide('devUrl', devUrl);
  project.provide('prodUrl', prodUrl);
  project.provide('devOutbox', devOutbox);
  project.provide('prodOutbox', prodOutbox);
  project.provide('containerId', container.getId());
  project.provide('databaseUrl', container.getConnectionUri());

  return async () => {
    servers.forEach(stop);
    await container.stop().catch(() => undefined);
  };
}
