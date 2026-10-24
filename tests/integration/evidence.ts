import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Screenshots, logs and reports of one integration run (git-ignored, uploaded by CI). */
export const EVIDENCE_DIR = fileURLToPath(new URL('./.evidence', import.meta.url));

export function evidencePath(name: string): string {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  return join(EVIDENCE_DIR, name.replace(/[^a-zA-Z0-9._-]+/g, '-'));
}

/**
 * Removes screenshots and logs of a previous run so stale files never pass as evidence.
 * Reports (`junit.xml`, `results.json`) are left alone: Vitest opens them before global setup runs
 * and overwrites them at the end — deleting them here would unlink the open file.
 */
export function resetEvidence(): void {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  for (const file of readdirSync(EVIDENCE_DIR)) {
    if (/\.(png|log|jsonl)$/.test(file)) rmSync(join(EVIDENCE_DIR, file), { force: true });
  }
}
