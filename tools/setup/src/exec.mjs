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
 * Arguments are fixed constants from steps.mjs — never user input. Windows needs a shell to resolve
 * the `pnpm.cmd` shim; there the command is passed as one string, because `shell: true` with an args
 * array is deprecated (DEP0190) and prints a security warning on Node ≥ 24.
 *
 * @param {{ cwd: string, write: (text: string) => void, platform?: string, spawn?: typeof nodeSpawn }} options
 * @returns {Exec}
 */
export function createExec({ cwd, write, platform = process.platform, spawn = nodeSpawn }) {
  return (command, args) =>
    new Promise((resolve) => {
      let output = '';
      const options = { cwd, env: process.env };
      const child =
        platform === 'win32'
          ? spawn([command, ...args].join(' '), { ...options, shell: true })
          : spawn(command, args, { ...options, shell: false });
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
