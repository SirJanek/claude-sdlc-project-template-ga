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
export const containerId = () => inject('containerId');

/** Runs SQL in the suite's PostgreSQL container (seed data, assertions). `timeoutMs` bounds a blocked statement. */
export function psql(sql: string, containerId = inject('containerId'), timeoutMs?: number): string {
  return execFileSync('docker', ['exec', containerId, 'psql', '-U', 'mentorhub', '-d', 'mentorhub', '-tAc', sql], {
    encoding: 'utf8',
    ...(timeoutMs === undefined ? {} : { timeout: timeoutMs }),
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
const DISPOSE_TIMEOUT_MS = 5_000;

/** A promise that rejects after `ms`; `clear()` disarms it once the race it guards has settled. */
function deadline(ms: number, what: string): { promise: Promise<never>; clear: () => void } {
  let timer: NodeJS.Timeout | undefined;
  const promise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${what} timed out after ${ms} ms`)), ms);
  });
  return { promise, clear: () => clearTimeout(timer) };
}

/**
 * Opens a psql session holding a transaction with `statement` executed but NOT committed, so a
 * concurrent writer of the same row blocks on it — a deterministic overlap for lost-update tests.
 * Rejects when psql cannot start, exits early, reports an error or is not ready within
 * `options.timeoutMs` — and in every such case the child is rolled back / terminated first, so no
 * lock outlives the rejection. Always `dispose()` in a `finally` (idempotent).
 */
export async function holdTransaction(
  statement: string,
  tag: string,
  containerId = inject('containerId'),
  options: { timeoutMs?: number } = {},
): Promise<HeldTransaction> {
  const holdTimeoutMs = options.timeoutMs ?? HOLD_TIMEOUT_MS;
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

  const backendPid = () => Number(output.match(/^(\d+)$/m)?.[1]);
  /** Best-effort server-side call during cleanup; a failure here must never mask the real error. */
  const tryPsql = (sql: string) => {
    try {
      psql(sql, containerId, DISPOSE_TIMEOUT_MS);
    } catch {
      // the backend is already gone or the container is down — nothing left to release
    }
  };

  /**
   * Rolls back and waits briefly; a backend still stuck on a lock is cancelled server-side (psql then
   * exits, ON_ERROR_STOP), and whatever survives the grace period is terminated and killed.
   * Killing only the `docker exec` client would leave the server backend waiting on the lock.
   * No-op once exited.
   */
  async function terminate(timeoutMs = DISPOSE_TIMEOUT_MS): Promise<void> {
    if (finished) return;
    if (!child.stdin.destroyed) child.stdin.end('rollback;\n');
    const pid = backendPid();
    if (pid) tryPsql(`select pg_cancel_backend(${pid})`);
    const grace = deadline(timeoutMs, 'rollback');
    try {
      await Promise.race([exited, grace.promise]);
    } catch {
      if (pid) tryPsql(`select pg_terminate_backend(${pid})`);
      child.kill('SIGKILL');
    } finally {
      grace.clear();
    }
    await exited;
  }

  child.stdin.write(`select pg_backend_pid();\nbegin;\n${statement};\n`);
  const startup = deadline(holdTimeoutMs, 'holding the transaction');
  try {
    await Promise.race([ready, failed, startup.promise]);
  } catch (error) {
    await terminate(); // never leave a half-started session holding locks behind a rejection
    throw error;
  } finally {
    startup.clear();
  }

  const pid = backendPid();
  return {
    pid,
    async waitUntilBlocking(timeoutMs = 15_000) {
      const end = Date.now() + timeoutMs;
      while (Date.now() < end) {
        // The poll itself is bounded by what is left of the deadline (never below one second).
        const left = Math.max(1_000, end - Date.now());
        const blocked = psql(
          `select count(*) from pg_stat_activity where ${pid} = any(pg_blocking_pids(pid))`,
          containerId,
          left,
        );
        if (blocked !== '0') return;
        await new Promise((r) => setTimeout(r, 100));
      }
      throw new Error(`no session became blocked by pid ${pid} within ${timeoutMs} ms`);
    },
    async commit() {
      child.stdin.end('commit;\n');
      const bound = deadline(holdTimeoutMs, 'commit');
      let code: number | null;
      try {
        code = await Promise.race([exited, bound.promise]);
      } catch (error) {
        await terminate();
        throw error;
      } finally {
        bound.clear();
      }
      if (code !== 0 || !output.includes('COMMIT')) {
        throw new Error(`commit failed (exit ${code}): ${errors || output}`);
      }
    },
    dispose: terminate,
  };
}

/**
 * Settles a competitor (a fetch or a CLI) within `timeoutMs` once the lock it may be waiting on has been
 * released; cancels it (abort / kill) when it still does not finish. Never throws: for `finally` blocks.
 */
export async function settleCompetitor(
  pending: Promise<unknown> | undefined,
  cancel: () => void,
  timeoutMs = 10_000,
): Promise<'settled' | 'cancelled' | 'none'> {
  if (!pending) return 'none';
  const bound = deadline(timeoutMs, 'settling the competitor');
  try {
    await Promise.race([pending.catch(() => undefined), bound.promise]);
    return 'settled';
  } catch {
    cancel();
    await pending.catch(() => undefined);
    return 'cancelled';
  } finally {
    bound.clear();
  }
}

export function stopDatabase(containerId = inject('containerId')): void {
  execFileSync('docker', ['stop', containerId], { stdio: 'ignore' });
}
