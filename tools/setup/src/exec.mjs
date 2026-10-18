// @ts-check
import { spawn as nodeSpawn } from 'node:child_process';

/**
 * @typedef {{ code: number, output: string }} ExecResult
 * @typedef {(command: string, args: string[]) => Promise<ExecResult>} Exec
 */

/**
 * Builds the command runner the steps use. Output is streamed to `write` (the user sees progress
 * of long installs) and captured (steps classify it). A command that cannot start — not installed —
 * resolves with code 127 instead of throwing, so a missing tool becomes a step failure with a hint.
 * Arguments are always an array: nothing is interpolated into a shell, except that Windows needs
 * `shell: true` to resolve the `pnpm.cmd` / `docker.exe` shims on PATH (the arguments are fixed).
 *
 * @param {{ cwd: string, write: (text: string) => void, platform?: string, spawn?: typeof nodeSpawn }} options
 * @returns {Exec}
 */
export function createExec({ cwd, write, platform = process.platform, spawn = nodeSpawn }) {
  return (command, args) =>
    new Promise((resolve) => {
      let output = '';
      const child = spawn(command, args, { cwd, shell: platform === 'win32', env: process.env });
      const collect = (/** @type {Buffer} */ chunk) => {
        const text = chunk.toString();
        output += text;
        write(text);
      };
      child.stdout?.on('data', collect);
      child.stderr?.on('data', collect);
      child.on('error', (error) => resolve({ code: 127, output: output + error.message }));
      child.on('close', (code) => resolve({ code: code ?? 1, output }));
    });
}
