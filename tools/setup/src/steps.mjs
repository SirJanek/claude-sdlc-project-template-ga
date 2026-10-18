// @ts-check

/**
 * @typedef {import('./exec.mjs').Exec} Exec
 * @typedef {{
 *   exec: Exec,
 *   readFile: (repoRelativePath: string) => string | null,
 *   appendFile: (repoRelativePath: string, content: string) => void,
 *   randomSecret: () => string,
 *   nodeVersion: string,
 *   skipBrowser: boolean,
 * }} Context
 * @typedef {{ status: 'ok' | 'done' | 'skipped', detail?: string }} StepResult
 * @typedef {{ id: string, title: string, run: (ctx: Context) => Promise<StepResult> }} Step
 */

/**
 * A step failure the user can fix: `message` says what is wrong, `hint` what to do, `output` the
 * captured output of a quiet check that failed (shown as its last lines — it was not streamed).
 */
export class StepError extends Error {
  /** @param {string} message @param {string} hint @param {string} [output] */
  constructor(message, hint, output = '') {
    super(message);
    this.name = 'StepError';
    this.hint = hint;
    this.output = output;
  }
}

const QUIET = { quiet: true };

export const MIN_NODE_MAJOR = 22;
export const PNPM_MAJOR = 10;
/** Printed by `agent-browser install` (0.39.1) when Chrome is present: `✓ Chrome <v> is already installed`. */
export const BROWSER_ALREADY_INSTALLED = /is already installed/;
/** Printed by the migrator (packages/db/src/migrator/run-command.ts) when nothing is pending. */
export const NO_PENDING_MIGRATIONS = 'No pending migrations.';
export const DB_PORT = '5433';

export const LOCKFILE = 'pnpm-lock.yaml';
/** pnpm's own copy of the lockfile node_modules was installed from (pnpm-internal, stable since pnpm 6). */
export const INSTALLED_LOCKFILE = 'node_modules/.pnpm/lock.yaml';

/** @param {string | null} text */
const normaliseEol = (text) => (text === null ? null : text.replace(/\r\n/g, '\n'));

/** @param {string} version e.g. "v26.5.0" or "10.34.5" */
const major = (version) => Number.parseInt(version.replace(/^v/, ''), 10);

/** @type {Step} */
export const prerequisites = {
  id: 'prerequisites',
  title: 'Prerequisites (Node, pnpm, Docker)',
  async run({ exec, nodeVersion }) {
    if (!(major(nodeVersion) >= MIN_NODE_MAJOR)) {
      throw new StepError(
        `Node ≥ ${MIN_NODE_MAJOR} is required (found ${nodeVersion}).`,
        'Use the version in .nvmrc (26), e.g. "nvm use" or "fnm use".',
      );
    }
    const pnpm = await exec('pnpm', ['--version'], QUIET);
    if (pnpm.code !== 0) {
      throw new StepError(
        'pnpm was not found.',
        'Install it with "npm i -g pnpm@10.34.5" (or "corepack enable" where corepack exists — Node ≥ 25 no longer ships it).',
        pnpm.output,
      );
    }
    const pnpmVersion = pnpm.output.trim();
    if (major(pnpmVersion) !== PNPM_MAJOR) {
      throw new StepError(
        `pnpm ${PNPM_MAJOR} is required (found ${pnpmVersion}).`,
        'Install it with "npm i -g pnpm@10.34.5".',
      );
    }
    const docker = await exec('docker', ['info'], QUIET);
    if (docker.code !== 0) {
      throw new StepError(
        'Docker is not installed or not running.',
        'Start Docker Desktop, then re-run the setup.',
        docker.output,
      );
    }
    const compose = await exec('docker', ['compose', 'version'], QUIET);
    if (compose.code !== 0) {
      throw new StepError(
        'Docker Compose v2 is not available.',
        'Update Docker Desktop (it ships "docker compose").',
        compose.output,
      );
    }
    return { status: 'ok', detail: `Node ${nodeVersion} · pnpm ${pnpmVersion} · Docker` };
  },
};

/** @type {Step} */
export const dependencies = {
  id: 'dependencies',
  title: 'Dependencies (pnpm install)',
  async run({ exec, readFile }) {
    // pnpm keeps a copy of the lockfile it installed from; equal → node_modules matches the lockfile.
    // Line endings are normalised: a CRLF checkout (Windows autocrlf) still compares equal.
    const lockfile = normaliseEol(readFile(LOCKFILE));
    if (lockfile !== null && lockfile === normaliseEol(readFile(INSTALLED_LOCKFILE))) {
      return { status: 'skipped', detail: 'node_modules matches pnpm-lock.yaml' };
    }
    if ((await exec('pnpm', ['install', '--frozen-lockfile'])).code !== 0) {
      throw new StepError(
        'pnpm install failed.',
        'If package.json and pnpm-lock.yaml are out of sync, run "pnpm install" deliberately, then re-run the setup.',
      );
    }
    return { status: 'done' };
  },
};

/** @type {Step} */
export const browser = {
  id: 'browser',
  title: 'Browser for integration tests (agent-browser Chrome)',
  async run({ exec, skipBrowser }) {
    if (skipBrowser) return { status: 'skipped', detail: '--skip-browser' };
    // The command is idempotent itself; its output tells whether it had anything to do.
    const result = await exec('pnpm', ['browser:install']);
    if (result.code !== 0) {
      throw new StepError(
        'Installing the agent-browser Chrome failed.',
        'Check the output above, or re-run with --skip-browser.',
      );
    }
    return BROWSER_ALREADY_INSTALLED.test(result.output)
      ? { status: 'skipped', detail: 'Chrome already installed' }
      : { status: 'done' };
  },
};

/**
 * `docker compose ps --format json`: one JSON object per line (Compose ≥ 2.21) or a single JSON
 * array (older Compose v2). Non-JSON lines (warnings) are ignored.
 * @param {string} output
 * @returns {{ Service?: string, State?: string, Health?: string }[]}
 */
function parseComposePs(output) {
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('{') || line.startsWith('['))
    .flatMap((line) => JSON.parse(line));
}

/** @type {Step} */
export const database = {
  id: 'database',
  title: `Database (PostgreSQL in Docker, port ${DB_PORT})`,
  async run({ exec }) {
    const ours = await exec('docker', ['compose', 'ps', '--format', 'json', 'db'], QUIET);
    if (
      parseComposePs(ours.output).some((c) => c.Service === 'db' && c.State === 'running' && c.Health === 'healthy')
    ) {
      return { status: 'skipped', detail: 'db container running and healthy' };
    }
    // Only *this* checkout's compose project counts. A database another checkout serves on the same
    // port is deliberately not reused: migrations from this branch would land in that database.
    if ((await exec('docker', ['compose', 'up', '-d', '--wait', 'db'])).code !== 0) {
      throw new StepError(
        'Could not start PostgreSQL.',
        `Is port ${DB_PORT} free? Another service — e.g. the database of another checkout of this repo — may hold it: ` +
          'stop it ("make db-down" there), or run with COMPOSE_PROJECT_NAME set to that checkout\'s project to share it knowingly.',
      );
    }
    return { status: 'done' };
  },
};

/** @type {Step} */
export const migrations = {
  id: 'migrations',
  title: 'Database migrations',
  async run({ exec }) {
    const result = await exec('pnpm', ['db:migrate']);
    if (result.code !== 0) {
      throw new StepError('Migrations failed.', 'Check the output above; the database must be running (make db-up).');
    }
    return result.output.includes(NO_PENDING_MIGRATIONS)
      ? { status: 'skipped', detail: 'no pending migrations' }
      : { status: 'done' };
  },
};

/** Next.js reads this file from the app package; it is git-ignored (`.env.*`). */
export const APP_ENV_LOCAL = 'packages/app/.env.local';
export const AUTH_SECRET_LINE = /^AUTH_SECRET=\S+/m;

/** @type {Step} */
export const authSecret = {
  id: 'auth-secret',
  title: `Local auth secret (AUTH_SECRET in ${APP_ENV_LOCAL})`,
  async run({ readFile, appendFile, randomSecret }) {
    // Only the app signs sessions, so only its env file needs the secret. Never overwrite one:
    // existing cookies would stop working and a hand-set value is the developer's choice.
    if (AUTH_SECRET_LINE.test(readFile(APP_ENV_LOCAL) ?? '')) {
      return { status: 'skipped', detail: 'AUTH_SECRET already set' };
    }
    const existing = readFile(APP_ENV_LOCAL) ?? '';
    const separator = existing === '' || existing.endsWith('\n') ? '' : '\n';
    appendFile(APP_ENV_LOCAL, `${separator}# Generated by "make setup" — signs session cookies locally.\nAUTH_SECRET=${randomSecret()}\n`);
    return { status: 'done', detail: 'generated' };
  },
};

/** In order: each step relies on the previous ones. */
export const STEPS = [prerequisites, dependencies, browser, database, migrations, authSecret];
