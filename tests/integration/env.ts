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

export interface HeldTransaction {
  /** Backend pid of the psql session, for `pg_blocking_pids`. */
  pid: number;
  /** Resolves once PostgreSQL reports a session blocked by this transaction (bounded by `timeoutMs`). */
  waitUntilBlocking(timeoutMs?: number): Promise<void>;
  /** Commits and waits for psql to exit cleanly (exit code 0, `COMMIT` acknowledged). */
  commit(): Promise<void>;
  /** Rolls back (or kills psql after the timeout) — safe to call after commit; for `finally` blocks. */
  dispose(timeoutMs?: number): Promise<void>;
}

const HOLD_TIMEOUT_MS = 30_000;

/**
 * Opens a psql session holding a transaction with `statement` executed but NOT committed, so a
 * concurrent writer of the same row blocks on it — a deterministic overlap for lost-update tests.
 * Rejects when psql cannot start, exits early or reports an error. Always `dispose()` in a `finally`:
 * a held row lock would otherwise block the suite's cleanup forever.
 */
export function holdTransaction(
  statement: string,
  tag: string,
  containerId = inject('containerId'),
): Promise<HeldTransaction> {
  const child = spawn('docker', [
    'exec',
    '-i',
    containerId,
    'psql',
    '-U',
    'mentorhub',
    '-d',
    'mentorhub',
    '-At',
    '-v',
    'ON_ERROR_STOP=1',
  ]);
  let output = '';
  let errors = '';
  let finished = false;
  const exited = new Promise<number | null>((resolve) => {
    child.on('close', (code) => {
      finished = true;
      resolve(code);
    });
  });
  child.stdout.on('data', (chunk: Buffer) => void (output += chunk.toString()));
  child.stderr.on('data', (chunk: Buffer) => void (errors += chunk.toString()));
  const failed = new Promise<never>((_, reject) => {
    child.on('error', (error) => reject(new Error(`psql could not start: ${error.message}`)));
    void exited.then((code) => reject(new Error(`psql exited early (code ${code}): ${errors || output}`)));
  });
  const ready = new Promise<void>((resolve) => {
    const check = () => {
      if (/^\d+$/m.test(output) && output.includes(tag)) resolve();
    };
    child.stdout.on('data', check);
  });
  const timeout = (ms: number, what: string) =>
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`${what} timed out after ${ms} ms`)), ms));

  child.stdin.write(`select pg_backend_pid();\nbegin;\n${statement};\n`);
  return Promise.race([ready, failed, timeout(HOLD_TIMEOUT_MS, 'holding the transaction')]).then(() => {
    const pid = Number(output.match(/^(\d+)$/m)![1]);
    const handle: HeldTransaction = {
      pid,
      async waitUntilBlocking(timeoutMs = 15_000) {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
          const blocked = psql(
            `select count(*) from pg_stat_activity where ${pid} = any(pg_blocking_pids(pid))`,
            containerId,
          );
          if (blocked !== '0') return;
          await new Promise((r) => setTimeout(r, 100));
        }
        throw new Error(`no session became blocked by pid ${pid} within ${timeoutMs} ms`);
      },
      async commit() {
        child.stdin.end('commit;\n');
        const code = await Promise.race([exited, timeout(HOLD_TIMEOUT_MS, 'commit')]);
        if (code !== 0 || !output.includes('COMMIT')) {
          throw new Error(`commit failed (exit ${code}): ${errors || output}`);
        }
      },
      async dispose(timeoutMs = 5_000) {
        if (finished) return;
        child.stdin.end('rollback;\n');
        await Promise.race([exited, new Promise((r) => setTimeout(r, timeoutMs))]);
        if (!finished) child.kill('SIGKILL');
        await exited;
      },
    };
    return handle;
  });
}

export function stopDatabase(containerId = inject('containerId')): void {
  execFileSync('docker', ['stop', containerId], { stdio: 'ignore' });
}
