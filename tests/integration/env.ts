import { execFileSync, spawn } from 'node:child_process';
import { inject } from 'vitest';

declare module 'vitest' {
  export interface ProvidedContext {
    devUrl: string;
    prodUrl: string;
    /** Mail outbox (JSON lines) of each server's MockMailSender. */
    devOutbox: string;
    prodOutbox: string;
    containerId: string;
    /** Connection string of the suite's PostgreSQL (for CLIs such as set-role). */
    databaseUrl: string;
  }
}

export const devUrl = () => inject('devUrl');
export const prodUrl = () => inject('prodUrl');
export const devOutbox = () => inject('devOutbox');
export const prodOutbox = () => inject('prodOutbox');
export const databaseUrl = () => inject('databaseUrl');

/** Runs SQL in the suite's PostgreSQL container (seed data, assertions). */
export function psql(sql: string, containerId = inject('containerId')): string {
  return execFileSync('docker', ['exec', containerId, 'psql', '-U', 'mentorhub', '-d', 'mentorhub', '-tAc', sql], {
    encoding: 'utf8',
  }).trim();
}

/**
 * Opens a psql session holding a transaction with `statement` executed but NOT committed, so a
 * concurrent writer of the same row blocks on it — a deterministic overlap for lost-update tests.
 * Resolves once PostgreSQL has acknowledged the statement (its tag, e.g. `UPDATE 1`, was printed).
 */
export function holdTransaction(
  statement: string,
  tag: string,
  containerId = inject('containerId'),
): Promise<{ commit: () => Promise<void> }> {
  const child = spawn('docker', [
    'exec',
    '-i',
    containerId,
    'psql',
    '-U',
    'mentorhub',
    '-d',
    'mentorhub',
    '-v',
    'ON_ERROR_STOP=1',
  ]);
  let output = '';
  const exited = new Promise<number | null>((resolve) => child.on('close', resolve));
  const ready = new Promise<void>((resolve, reject) => {
    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString();
      if (output.includes(tag)) resolve();
    });
    child.stderr.on('data', (chunk: Buffer) => reject(new Error(chunk.toString())));
  });
  child.stdin.write(`begin;\n${statement};\n`);
  return ready.then(() => ({
    commit: async () => {
      child.stdin.end('commit;\n');
      await exited;
    },
  }));
}

export function stopDatabase(containerId = inject('containerId')): void {
  execFileSync('docker', ['stop', containerId], { stdio: 'ignore' });
}
