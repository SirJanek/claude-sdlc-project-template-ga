// @ts-check
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createExec } from './exec.mjs';
import { runSetup } from './main.mjs';
import { STEPS } from './steps.mjs';

/** Repository root: tools/setup/src → ../../.. (independent of the directory the user runs from). */
export const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url));

export const USAGE = `Usage: make setup | npm run setup [-- --skip-browser] | pnpm run setup [--skip-browser]

Prepares a fresh clone: checks Node/pnpm/Docker, installs dependencies, the agent-browser Chrome,
starts PostgreSQL (port 5433) and applies migrations. Steps already done are skipped.
Note: "pnpm setup" (without "run") is a built-in pnpm command and does not run this.

  --skip-browser  do not install the Chrome used by the integration tests
  -h, --help      show this help
`;

/**
 * @typedef {{
 *   write: (text: string) => void,
 *   exec: import('./exec.mjs').Exec,
 *   readFile: (repoRelativePath: string) => string | null,
 *   nodeVersion: string,
 * }} Deps
 */

/**
 * The real dependencies: process output, child processes in the repo root, files read from it.
 * @param {string} [root]
 * @returns {Deps}
 */
export function realDeps(root = REPO_ROOT) {
  /** @param {string} text */
  const write = (text) => {
    process.stdout.write(text);
  };
  return {
    write,
    exec: createExec({ cwd: root, write }),
    readFile: (path) => {
      try {
        return readFileSync(join(root, path), 'utf8');
      } catch {
        return null;
      }
    },
    nodeVersion: process.version,
  };
}

/**
 * CLI entry used by bin/setup.mjs.
 * @param {string[]} argv arguments after the script name
 * @param {Deps} [deps]
 * @returns {Promise<number>} exit code
 */
export async function run(argv, deps = realDeps()) {
  if (argv.includes('-h') || argv.includes('--help')) {
    deps.write(USAGE);
    return 0;
  }
  const unknown = argv.filter((arg) => arg !== '--skip-browser');
  if (unknown.length > 0) {
    deps.write(`Unknown option: ${unknown.join(' ')}\n\n${USAGE}`);
    return 1;
  }
  return runSetup({
    steps: STEPS,
    ctx: {
      exec: deps.exec,
      readFile: deps.readFile,
      nodeVersion: deps.nodeVersion,
      skipBrowser: argv.includes('--skip-browser'),
    },
    write: deps.write,
  });
}
