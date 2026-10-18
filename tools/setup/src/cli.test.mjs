// @ts-check
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { REPO_ROOT, USAGE, realDeps, run } from './cli.mjs';
import { createExec } from './exec.mjs';
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
    readFile: (path) => (['pnpm-lock.yaml', 'node_modules/.pnpm/lock.yaml'].includes(path) ? 'same lockfile' : null),
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

describe('what the user sees (QA finding: check output buried the results)', () => {
  it('second run prints only the header, five step lines and the next-step hint — no command noise', async () => {
    // Real createExec (streaming logic under test) over a fake spawn that answers like the real tools.
    const DOCKER_INFO = Array.from({ length: 100 }, (_, i) => `docker info line ${i}`).join('\n');
    /** @type {Record<string, string>} */
    const outputs = {
      'pnpm --version': '10.34.5\n',
      'docker info': DOCKER_INFO,
      'docker compose version': 'Docker Compose version v5.3.0\n',
      'docker compose ps --format json db': JSON.stringify({ Service: 'db', State: 'running', Health: 'healthy' }),
      'pnpm browser:install': 'Installing Chrome...\n✓ Chrome 155.0.8059.84 is already installed\n',
      'pnpm db:migrate': `${NO_PENDING_MIGRATIONS}\n`,
    };
    const spawn = (/** @type {string} */ command, /** @type {string[]} */ args) => {
      const child = Object.assign(new EventEmitter(), { stdout: new EventEmitter(), stderr: new EventEmitter() });
      queueMicrotask(() => {
        child.stdout.emit('data', Buffer.from(outputs[[command, ...args].join(' ')] ?? ''));
        child.emit('close', 0);
      });
      return child;
    };
    let screen = '';
    const write = (/** @type {string} */ t) => (screen += t);
    const exec = createExec({ cwd: '/repo', write, platform: 'darwin', spawn: /** @type {any} */ (spawn) });
    const deps = { write, exec, nodeVersion: 'v26.5.0', readFile: () => 'same lockfile' };

    expect(await run(['--skip-browser'], deps)).toBe(0);

    expect(screen).not.toContain('docker info line');
    expect(screen).not.toContain('"Service"');
    expect(screen).not.toMatch(/^10\.34\.5$/m);
    const lines = screen.split('\n').filter(Boolean);
    expect(lines[0]).toBe('MentorHub setup');
    expect(lines.filter((l) => /^(✔|↷) \[\d\/5\]/.test(l))).toHaveLength(5);
    // The only command output left is the migrator's own line (a streamed, mutating step).
    expect(lines.filter((l) => !/^(MentorHub setup|✔|↷|Ready\.)/.test(l))).toEqual([NO_PENDING_MIGRATIONS]);
  });
});
