// @ts-check
import { EventEmitter } from 'node:events';
import { describe, expect, it } from 'vitest';
import { createExec } from './exec.mjs';

/** A fake child process: emits the given chunks, then `close` with `code` (or `error`). */
function fakeSpawn({
  stdout = [''],
  stderr = [''],
  code = /** @type {number | null} */ (0),
  error = '',
  streams = true,
} = {}) {
  /** @type {{ command: string, args: string[], options: Record<string, unknown> }[]} */
  const calls = [];
  const spawn = (
    /** @type {string} */ command,
    /** @type {string[]} */ args,
    /** @type {Record<string, unknown>} */ options,
  ) => {
    calls.push({ command, args, options });
    // Without streams the fake mimics a child that never got pipes (the `?.` branch in exec.mjs).
    const child = /** @type {EventEmitter & { stdout: EventEmitter, stderr: EventEmitter }} */ (
      Object.assign(new EventEmitter(), streams ? { stdout: new EventEmitter(), stderr: new EventEmitter() } : {})
    );
    queueMicrotask(() => {
      if (streams) {
        for (const chunk of stdout) child.stdout.emit('data', Buffer.from(chunk));
        for (const chunk of stderr) child.stderr.emit('data', Buffer.from(chunk));
      }
      if (error) child.emit('error', new Error(error));
      else child.emit('close', code);
    });
    return child;
  };
  return { spawn: /** @type {any} */ (spawn), calls };
}

describe('createExec', () => {
  it('captures stdout and stderr, streams them to write, and returns the exit code', async () => {
    const written = /** @type {string[]} */ ([]);
    const { spawn, calls } = fakeSpawn({ stdout: ['hello '], stderr: ['world'], code: 3 });
    const exec = createExec({ cwd: '/repo', write: (t) => written.push(t), platform: 'darwin', spawn });

    expect(await exec('pnpm', ['--version'])).toEqual({ code: 3, output: 'hello world' });
    expect(written.join('')).toBe('hello world');
    expect(calls[0]).toMatchObject({ command: 'pnpm', args: ['--version'], options: { cwd: '/repo', shell: false } });
  });

  it('uses a shell only on Windows (to resolve .cmd shims)', async () => {
    const { spawn, calls } = fakeSpawn();
    await createExec({ cwd: '/repo', write: () => {}, platform: 'win32', spawn })('pnpm', []);
    expect(calls[0]?.options.shell).toBe(true);
  });

  it('turns a command that cannot start into code 127 instead of throwing', async () => {
    const { spawn } = fakeSpawn({ error: 'spawn docker ENOENT', streams: false });
    const result = await createExec({ cwd: '/repo', write: () => {}, platform: 'linux', spawn })('docker', ['info']);
    expect(result).toEqual({ code: 127, output: 'spawn docker ENOENT' });
  });

  it('treats a missing exit code (killed by a signal) as failure', async () => {
    const { spawn } = fakeSpawn({ code: null });
    expect((await createExec({ cwd: '/repo', write: () => {}, platform: 'linux', spawn })('x', [])).code).toBe(1);
  });

  it('defaults to the real platform and spawn', async () => {
    const result = await createExec({ cwd: process.cwd(), write: () => {} })(process.execPath, [
      '-e',
      'process.exit(0)',
    ]);
    expect(result.code).toBe(0);
  });
});
