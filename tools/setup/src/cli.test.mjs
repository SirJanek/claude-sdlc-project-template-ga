// @ts-check
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { REPO_ROOT, USAGE, realDeps, run } from './cli.mjs';
import { NO_PENDING_MIGRATIONS } from './steps.mjs';

afterEach(() => vi.restoreAllMocks());

/**
 * An environment where everything is already set up: the second run of the setup.
 * @param {string[]} calls
 */
function setUpEnvironment(calls) {
  let out = '';
  /** @type {import('./cli.mjs').Deps} */
  const deps = {
    write: (t) => (out += t),
    nodeVersion: 'v26.5.0',
    readFile: (path) => (path.endsWith('lock.yaml') ? 'same lockfile' : null),
    exec: async (command, args) => {
      const key = [command, ...args].join(' ');
      calls.push(key);
      if (key === 'pnpm --version') return { code: 0, output: '10.34.5' };
      if (key === 'pnpm browser:install') return { code: 0, output: '✓ Chrome 155.0.8059.84 is already installed' };
      if (key === 'docker compose ps --format json db')
        return { code: 0, output: JSON.stringify({ Service: 'db', State: 'running', Health: 'healthy' }) };
      if (key === 'pnpm db:migrate') return { code: 0, output: NO_PENDING_MIGRATIONS };
      return { code: 0, output: '' };
    },
  };
  return { deps, output: () => out };
}

describe('run', () => {
  it('re-running on a set-up machine changes nothing: every step after the checks is skipped', async () => {
    const calls = /** @type {string[]} */ ([]);
    const { deps, output } = setUpEnvironment(calls);
    expect(await run([], deps)).toBe(0);
    const out = output();
    expect(out).toContain('— ok (Node v26.5.0 · pnpm 10.34.5 · Docker)');
    expect(out.match(/↷ /g)).toHaveLength(4);
    expect(out).not.toMatch(/— done/);
    // No mutating command ran: no install, no compose up, nothing beyond the read-only checks.
    expect(calls).not.toContain('pnpm install --frozen-lockfile');
    expect(calls).not.toContain('docker compose up -d --wait db');
  });

  it('passes --skip-browser to the browser step', async () => {
    const calls = /** @type {string[]} */ ([]);
    const { deps, output } = setUpEnvironment(calls);
    expect(await run(['--skip-browser'], deps)).toBe(0);
    expect(output()).toContain('skipped (--skip-browser)');
    expect(calls).not.toContain('pnpm browser:install');
  });

  it('prints usage for --help / -h and exits 0 without running anything', async () => {
    for (const flag of ['--help', '-h']) {
      const calls = /** @type {string[]} */ ([]);
      const { deps, output } = setUpEnvironment(calls);
      expect(await run([flag], deps)).toBe(0);
      expect(output()).toBe(USAGE);
      expect(calls).toEqual([]);
    }
  });

  it('rejects unknown options with usage and exit 1', async () => {
    const calls = /** @type {string[]} */ ([]);
    const { deps, output } = setUpEnvironment(calls);
    expect(await run(['--fast', '--skip-browser'], deps)).toBe(1);
    expect(output()).toContain('Unknown option: --fast');
    expect(output()).toContain('pnpm setup" (without "run") is a built-in pnpm command');
    expect(calls).toEqual([]);
  });

  it('uses the real dependencies by default (help path, no side effects)', async () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    expect(await run(['--help'])).toBe(0);
    expect(write).toHaveBeenCalledWith(USAGE);
  });
});

describe('realDeps', () => {
  it('reads files relative to the repository root and returns null for missing ones', () => {
    expect(existsSync(join(REPO_ROOT, 'pnpm-workspace.yaml'))).toBe(true);
    const deps = realDeps();
    expect(deps.readFile('pnpm-workspace.yaml')).toContain('tools/*');
    expect(deps.readFile('does/not/exist')).toBeNull();
    expect(deps.nodeVersion).toBe(process.version);
  });

  it('writes to stdout and runs commands in the given root', async () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const deps = realDeps(REPO_ROOT);
    deps.write('hi');
    expect(write).toHaveBeenCalledWith('hi');
    expect((await deps.exec(process.execPath, ['-e', 'process.exit(0)'])).code).toBe(0);
  });
});
