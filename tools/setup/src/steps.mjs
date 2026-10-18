// @ts-check

/**
 * @typedef {import('./exec.mjs').Exec} Exec
 * @typedef {{
 *   exec: Exec,
 *   readFile: (repoRelativePath: string) => string | null,
 *   nodeVersion: string,
 *   skipBrowser: boolean,
 * }} Context
 * @typedef {{ status: 'ok' | 'done' | 'skipped', detail?: string }} StepResult
 * @typedef {{ id: string, title: string, run: (ctx: Context) => Promise<StepResult> }} Step
 */

/** A step failure the user can fix: `message` says what is wrong, `hint` what to do. */
export class StepError extends Error {
  /** @param {string} message @param {string} hint */
  constructor(message, hint) {
    super(message);
    this.name = 'StepError';
    this.hint = hint;
  }
}

export const MIN_NODE_MAJOR = 22;
export const PNPM_MAJOR = 10;
/** Printed by `agent-browser install` (0.39.1) when Chrome is present: `✓ Chrome <v> is already installed`. */
export const BROWSER_ALREADY_INSTALLED = /is already installed/;
/** Printed by the migrator (packages/db/src/migrator/run-command.ts) when nothing is pending. */
export const NO_PENDING_MIGRATIONS = 'No pending migrations.';
export const DB_PORT = '5433';

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
    const pnpm = await exec('pnpm', ['--version']);
    if (pnpm.code !== 0) {
      throw new StepError(
        'pnpm was not found.',
        'Install it with "npm i -g pnpm@10.34.5" (or "corepack enable" where corepack exists — Node ≥ 25 no longer ships it).',
      );
    }
    const pnpmVersion = pnpm.output.trim();
    if (major(pnpmVersion) !== PNPM_MAJOR) {
      throw new StepError(
        `pnpm ${PNPM_MAJOR} is required (found ${pnpmVersion}).`,
        'Install it with "npm i -g pnpm@10.34.5".',
      );
    }
    if ((await exec('docker', ['info'])).code !== 0) {
      throw new StepError('Docker is not installed or not running.', 'Start Docker Desktop, then re-run the setup.');
    }
    if ((await exec('docker', ['compose', 'version'])).code !== 0) {
      throw new StepError('Docker Compose v2 is not available.', 'Update Docker Desktop (it ships "docker compose").');
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
    const lockfile = readFile('pnpm-lock.yaml');
    if (lockfile !== null && lockfile === readFile('node_modules/.pnpm/lock.yaml')) {
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
 * @param {string} output `docker compose ps --format json` (one JSON object per line) or `docker ps` lines
 * @returns {{ Service?: string, State?: string, Health?: string, Names?: string }[]}
 */
function parseJsonLines(output) {
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('{'))
    .map((line) => JSON.parse(line));
}

/** @type {Step} */
export const database = {
  id: 'database',
  title: `Database (PostgreSQL in Docker, port ${DB_PORT})`,
  async run({ exec }) {
    const ours = await exec('docker', ['compose', 'ps', '--format', 'json', 'db']);
    if (
      parseJsonLines(ours.output).some((c) => c.Service === 'db' && c.State === 'running' && c.Health === 'healthy')
    ) {
      return { status: 'skipped', detail: 'db container running and healthy' };
    }
    // Compose names the project after the folder, so another checkout (e.g. an agent worktree) may
    // already serve a healthy PostgreSQL on the same port — the app connects to it just the same.
    const other = await exec('docker', [
      'ps',
      '--filter',
      `publish=${DB_PORT}`,
      '--filter',
      'health=healthy',
      '--format',
      'json',
    ]);
    const shared = parseJsonLines(other.output)[0];
    if (shared) return { status: 'skipped', detail: `healthy PostgreSQL already on ${DB_PORT} (${shared.Names})` };
    if ((await exec('docker', ['compose', 'up', '-d', '--wait', 'db'])).code !== 0) {
      throw new StepError(
        'Could not start PostgreSQL.',
        `Is port ${DB_PORT} free? Stop the other service using it (or "make db-down"), then re-run the setup.`,
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

/** In order: each step relies on the previous ones. */
export const STEPS = [prerequisites, dependencies, browser, database, migrations];
