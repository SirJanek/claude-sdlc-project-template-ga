// @ts-check
import { describe, expect, it } from 'vitest';
import { runSetup } from './main.mjs';
import { StepError } from './steps.mjs';

/** @typedef {import('./steps.mjs').Step} Step */

/** @param {string} id @param {Step['run']} run @returns {Step} */
const step = (id, run) => ({ id, title: `Step ${id}`, run });
const ctx = {
  exec: async () => ({ code: 0, output: '' }),
  readFile: () => null,
  appendFile: () => {},
  randomSecret: () => 'secret',
  nodeVersion: 'v26.5.0',
  skipBrowser: false,
};

/** @param {Step[]} steps */
async function capture(steps) {
  let out = '';
  const code = await runSetup({ steps, ctx, write: (t) => (out += t) });
  return { code, out };
}

describe('runSetup', () => {
  it('reports every step and exits 0 when all are ok, done or skipped', async () => {
    const { code, out } = await capture([
      step('a', async () => ({ status: 'ok', detail: 'Node v26' })),
      step('b', async () => ({ status: 'done' })),
      step('c', async () => ({ status: 'skipped', detail: 'already there' })),
    ]);
    expect(code).toBe(0);
    expect(out).toContain('✔ [1/3] Step a — ok (Node v26)\n');
    expect(out).toContain('✔ [2/3] Step b — done\n');
    expect(out).toContain('↷ [3/3] Step c — skipped (already there)\n');
    expect(out).toContain('Next: "make dev"');
  });

  it('stops at the first failure with its hint and exits 1 (later steps never run)', async () => {
    let laterRan = false;
    const { code, out } = await capture([
      step('a', async () => {
        throw new StepError('Docker is not running.', 'Start Docker Desktop.');
      }),
      step('b', async () => {
        laterRan = true;
        return { status: 'done' };
      }),
    ]);
    expect(code).toBe(1);
    expect(laterRan).toBe(false);
    expect(out).toContain('✖ [1/2] Step a — failed: Docker is not running.\n  → Start Docker Desktop.\n');
    expect(out).not.toContain('Ready.');
  });

  it('reports unexpected errors without a stack trace', async () => {
    for (const thrown of [new Error('boom'), 'plain string']) {
      const { code, out } = await capture([
        step('a', async () => {
          throw thrown;
        }),
      ]);
      expect(code).toBe(1);
      expect(out).toContain(`failed: ${thrown instanceof Error ? thrown.message : thrown}`);
      expect(out).toContain('→ Check the output above');
      expect(out).not.toContain('    at ');
    }
  });

  it('shows the last 5 lines of a failed quiet check, and nothing extra when there is none', async () => {
    const output = ['l1', 'l2', '', 'l3', 'l4', 'l5', 'Cannot connect to the Docker daemon   '].join('\n');
    const { out } = await capture([
      step('a', async () => {
        throw new StepError('Docker is not running.', 'Start Docker Desktop.', output);
      }),
    ]);
    expect(out).toContain('  Last output:\n    l2\n    l3\n    l4\n    l5\n    Cannot connect to the Docker daemon\n');
    expect(out).not.toContain('l1');
    const plain = await capture([
      step('a', async () => {
        throw new StepError('x', 'y');
      }),
    ]);
    expect(plain.out).not.toContain('Last output');
  });
});
