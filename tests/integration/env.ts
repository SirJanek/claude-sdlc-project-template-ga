import { execFileSync } from 'node:child_process';
import { inject } from 'vitest';

declare module 'vitest' {
  export interface ProvidedContext {
    devUrl: string;
    prodUrl: string;
    /** Mail outbox (JSON lines) of each server's MockMailSender. */
    devOutbox: string;
    prodOutbox: string;
    containerId: string;
  }
}

export const devUrl = () => inject('devUrl');
export const prodUrl = () => inject('prodUrl');
export const devOutbox = () => inject('devOutbox');
export const prodOutbox = () => inject('prodOutbox');

/** Runs SQL in the suite's PostgreSQL container (seed data, assertions). */
export function psql(sql: string, containerId = inject('containerId')): string {
  return execFileSync('docker', ['exec', containerId, 'psql', '-U', 'mentorhub', '-d', 'mentorhub', '-tAc', sql], {
    encoding: 'utf8',
  }).trim();
}

export function stopDatabase(containerId = inject('containerId')): void {
  execFileSync('docker', ['stop', containerId], { stdio: 'ignore' });
}
