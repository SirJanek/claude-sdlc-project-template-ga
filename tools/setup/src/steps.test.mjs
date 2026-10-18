// @ts-check
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BROWSER_ALREADY_INSTALLED,
  NO_PENDING_MIGRATIONS,
  STEPS,
  StepError,
  browser,
  database,
  dependencies,
  migrations,
  prerequisites,
} from './steps.mjs';

/**
 * Fake exec: answers by "command arg arg" key (default code 0, empty output) and records calls.
 * @param {Record<string, { code?: number, output?: string }>} answers
 */
function fakeExec(answers = {}) {
  /** @type {string[]} */
  const calls = [];
  const exec = async (/** @type {string} */ command, /** @type {string[]} */ args) => {
    const key = [command, ...args].join(' ');
    calls.push(key);
    const answer = answers[key] ?? {};
    return { code: answer.code ?? 0, output: answer.output ?? '' };
  };
  return { exec, calls };
}

/** @param {Partial<import('./steps.mjs').Context>} overrides */
function ctx(overrides = {}) {
  return { exec: fakeExec().exec, readFile: () => null, nodeVersion: 'v26.5.0', skipBrowser: false, ...overrides };
}

/** @param {Promise<unknown>} promise @param {RegExp} message @param {RegExp} hint */
async function expectStepError(promise, message, hint) {
  const error = await promise.then(
    () => null,
    (e) => e,
  );
  expect(error).toBeInstanceOf(StepError);
  expect(error.message).toMatch(message);
  expect(error.hint).toMatch(hint);
}

const PNPM_OK = { 'pnpm --version': { output: '10.34.5\n' } };

describe('prerequisites', () => {
  it('passes with Node ≥ 22, pnpm 10 and a running Docker with Compose', async () => {
    const { exec, calls } = fakeExec(PNPM_OK);
    expect(await prerequisites.run(ctx({ exec }))).toEqual({
      status: 'ok',
      detail: 'Node v26.5.0 · pnpm 10.34.5 · Docker',
    });
    expect(calls).toEqual(['pnpm --version', 'docker info', 'docker compose version']);
  });

  it('accepts exactly the minimum Node major', async () => {
    expect((await prerequisites.run(ctx({ exec: fakeExec(PNPM_OK).exec, nodeVersion: 'v22.0.0' }))).status).toBe('ok');
  });

  it('rejects an old or unreadable Node version and points at .nvmrc', async () => {
    await expectStepError(
      prerequisites.run(ctx({ nodeVersion: 'v20.11.1' })),
      /Node ≥ 22 .*v20\.11\.1/,
      /\.nvmrc \(26\)/,
    );
    await expectStepError(prerequisites.run(ctx({ nodeVersion: 'garbage' })), /Node ≥ 22/, /nvm use/);
  });

  it('rejects a missing pnpm with an install hint that does not rely on corepack', async () => {
    const { exec } = fakeExec({ 'pnpm --version': { code: 127 } });
    await expectStepError(prerequisites.run(ctx({ exec })), /pnpm was not found/, /npm i -g pnpm@10\.34\.5/);
  });

  it('rejects another pnpm major', async () => {
    const { exec } = fakeExec({ 'pnpm --version': { output: '9.15.0' } });
    await expectStepError(prerequisites.run(ctx({ exec })), /pnpm 10 is required \(found 9\.15\.0\)/, /pnpm@10/);
  });

  it('rejects a stopped Docker daemon', async () => {
    const { exec } = fakeExec({ ...PNPM_OK, 'docker info': { code: 1 } });
    await expectStepError(
      prerequisites.run(ctx({ exec })),
      /Docker is not installed or not running/,
      /Start Docker Desktop/,
    );
  });

  it('rejects a Docker without Compose v2', async () => {
    const { exec } = fakeExec({ ...PNPM_OK, 'docker compose version': { code: 1 } });
    await expectStepError(prerequisites.run(ctx({ exec })), /Compose v2/, /Update Docker Desktop/);
  });
});

describe('dependencies', () => {
  it('skips when node_modules was installed from the current lockfile', async () => {
    const { exec, calls } = fakeExec();
    const read = /** @type {string[]} */ ([]);
    const files = { 'pnpm-lock.yaml': 'lock v1', 'node_modules/.pnpm/lock.yaml': 'lock v1' };
    const readFile = (/** @type {string} */ path) => (
      read.push(path),
      files[/** @type {keyof files} */ (path)] ?? null
    );
    expect(await dependencies.run(ctx({ exec, readFile }))).toEqual({
      status: 'skipped',
      detail: 'node_modules matches pnpm-lock.yaml',
    });
    expect(calls).toEqual([]);
    // Exact paths: reading any other copy of the lockfile would break idempotency in real use.
    expect(read).toEqual(['pnpm-lock.yaml', 'node_modules/.pnpm/lock.yaml']);
  });

  it("treats a CRLF checkout of the lockfile as equal to pnpm's LF copy (Windows autocrlf)", async () => {
    const { exec, calls } = fakeExec();
    const files = { 'pnpm-lock.yaml': 'a: 1\r\nb: 2\r\n', 'node_modules/.pnpm/lock.yaml': 'a: 1\nb: 2\n' };
    const readFile = (/** @type {string} */ path) => files[/** @type {keyof files} */ (path)] ?? null;
    expect((await dependencies.run(ctx({ exec, readFile }))).status).toBe('skipped');
    expect(calls).toEqual([]);
  });

  it('installs on a fresh clone (no node_modules) and when the lockfile changed', async () => {
    for (const installed of [null, 'lock v0']) {
      const { exec, calls } = fakeExec();
      const readFile = (/** @type {string} */ path) => (path === 'pnpm-lock.yaml' ? 'lock v1' : installed);
      expect(await dependencies.run(ctx({ exec, readFile }))).toEqual({ status: 'done' });
      expect(calls).toEqual(['pnpm install --frozen-lockfile']);
    }
  });

  it('never treats two missing files as "installed"', async () => {
    const { exec, calls } = fakeExec();
    expect((await dependencies.run(ctx({ exec, readFile: () => null }))).status).toBe('done');
    expect(calls).toHaveLength(1);
  });

  it('fails with the out-of-sync lockfile hint', async () => {
    const { exec } = fakeExec({ 'pnpm install --frozen-lockfile': { code: 1 } });
    await expectStepError(dependencies.run(ctx({ exec })), /pnpm install failed/, /out of sync/);
  });
});

describe('browser', () => {
  it('is skipped entirely with --skip-browser', async () => {
    const { exec, calls } = fakeExec();
    expect(await browser.run(ctx({ exec, skipBrowser: true }))).toEqual({
      status: 'skipped',
      detail: '--skip-browser',
    });
    expect(calls).toEqual([]);
  });

  it('reports skipped when agent-browser says Chrome is already installed', async () => {
    const { exec } = fakeExec({
      'pnpm browser:install': { output: 'Installing Chrome...\n✓ Chrome 155.0.8059.84 is already installed\n' },
    });
    expect(await browser.run(ctx({ exec }))).toEqual({ status: 'skipped', detail: 'Chrome already installed' });
  });

  it('reports done after a real download', async () => {
    const { exec } = fakeExec({ 'pnpm browser:install': { output: 'Downloading Chrome 155...\n✓ Installed\n' } });
    expect(await browser.run(ctx({ exec }))).toEqual({ status: 'done' });
  });

  it('fails with a hint to skip the step', async () => {
    const { exec } = fakeExec({ 'pnpm browser:install': { code: 1 } });
    await expectStepError(browser.run(ctx({ exec })), /agent-browser Chrome failed/, /--skip-browser/);
  });
});

describe('database', () => {
  const OURS = 'docker compose ps --format json db';
  const UP = 'docker compose up -d --wait db';
  const healthy = JSON.stringify({ Service: 'db', State: 'running', Health: 'healthy' });

  it('skips when our db container is running and healthy', async () => {
    const { exec, calls } = fakeExec({ [OURS]: { output: `warning: something\n${healthy}\n` } });
    expect(await database.run(ctx({ exec }))).toEqual({
      status: 'skipped',
      detail: 'db container running and healthy',
    });
    expect(calls).toEqual([OURS]);
  });

  it('understands the JSON-array output of Compose < 2.21', async () => {
    const { exec } = fakeExec({ [OURS]: { output: `[${healthy}]` } });
    expect((await database.run(ctx({ exec }))).status).toBe('skipped');
  });

  it('never reuses a database it does not own: a not-yet-healthy or foreign container means compose up', async () => {
    // Another checkout's DB on 5433 is invisible to this project's `compose ps` → up → port clash → hint.
    const { exec, calls } = fakeExec({
      [OURS]: { output: JSON.stringify({ Service: 'db', State: 'running', Health: 'starting' }) },
    });
    expect(await database.run(ctx({ exec }))).toEqual({ status: 'done' });
    expect(calls).toEqual([OURS, UP]);
  });

  it('starts (or restarts a stopped) container and waits for health', async () => {
    const { exec, calls } = fakeExec({ [OURS]: { output: JSON.stringify({ Service: 'db', State: 'exited' }) } });
    expect(await database.run(ctx({ exec }))).toEqual({ status: 'done' });
    expect(calls).toEqual([OURS, UP]);
  });

  it('fails with a port hint when compose cannot start it', async () => {
    const { exec } = fakeExec({ [UP]: { code: 1 } });
    await expectStepError(
      database.run(ctx({ exec })),
      /Could not start PostgreSQL/,
      /port 5433 free\? .*another checkout.*COMPOSE_PROJECT_NAME/,
    );
  });
});

describe('migrations', () => {
  it('reports skipped when the migrator has nothing pending', async () => {
    const { exec } = fakeExec({
      'pnpm db:migrate': { output: `> tsx src/scripts/migrate.ts up\n${NO_PENDING_MIGRATIONS}\n` },
    });
    expect(await migrations.run(ctx({ exec }))).toEqual({ status: 'skipped', detail: 'no pending migrations' });
  });

  it('reports done when migrations were applied', async () => {
    const { exec } = fakeExec({ 'pnpm db:migrate': { output: 'Applied: Migration20261017192741_init_user' } });
    expect(await migrations.run(ctx({ exec }))).toEqual({ status: 'done' });
  });

  it('fails with a hint to start the database', async () => {
    const { exec } = fakeExec({ 'pnpm db:migrate': { code: 1 } });
    await expectStepError(migrations.run(ctx({ exec })), /Migrations failed/, /make db-up/);
  });
});

describe('pinned output strings', () => {
  it('match the migrator message in packages/db (rewording it must fail here, not mis-report silently)', () => {
    const source = readFileSync(new URL('../../../packages/db/src/migrator/run-command.ts', import.meta.url), 'utf8');
    expect(source).toContain(`'${NO_PENDING_MIGRATIONS}'`);
  });

  it('match the agent-browser 0.39.1 "already installed" line', () => {
    expect(BROWSER_ALREADY_INSTALLED.test('✓ Chrome 155.0.8059.84 is already installed')).toBe(true);
    expect(BROWSER_ALREADY_INSTALLED.test('Downloading Chrome 155.0.8059.84')).toBe(false);
  });
});

describe('STEPS', () => {
  it('runs prerequisites first and migrations after the database', () => {
    expect(STEPS.map((s) => s.id)).toEqual(['prerequisites', 'dependencies', 'browser', 'database', 'migrations']);
  });
});
