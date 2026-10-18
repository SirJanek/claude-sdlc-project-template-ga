// @ts-check
import { StepError } from './steps.mjs';

/**
 * @typedef {import('./steps.mjs').Step} Step
 * @typedef {import('./steps.mjs').Context} Context
 */

/** The last few non-empty lines of a quiet command's output, indented. */
function lastLines(/** @type {string} */ output, count = 5) {
  return output
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .slice(-count)
    .map((line) => `    ${line}`)
    .join('\n');
}

const MARK = { ok: '✔', done: '✔', skipped: '↷' };
const LABEL = { ok: 'ok', done: 'done', skipped: 'skipped' };

/**
 * Runs the steps in order and reports one line per step. Stops at the first failure: later steps
 * depend on earlier ones. Unexpected errors are reported like step failures — never a stack trace.
 *
 * @param {{ steps: Step[], ctx: Context, write: (text: string) => void }} options
 * @returns {Promise<number>} exit code: 0 when every step is ok/done/skipped, 1 otherwise
 */
export async function runSetup({ steps, ctx, write }) {
  write('MentorHub setup\n\n');
  for (const [index, step] of steps.entries()) {
    const prefix = `[${index + 1}/${steps.length}] ${step.title}`;
    try {
      const result = await step.run(ctx);
      write(
        `${MARK[result.status]} ${prefix} — ${LABEL[result.status]}${result.detail ? ` (${result.detail})` : ''}\n`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const hint = error instanceof StepError ? error.hint : 'Check the output above, then re-run the setup.';
      write(`✖ ${prefix} — failed: ${message}\n  → ${hint}\n`);
      const tail = error instanceof StepError ? lastLines(error.output) : '';
      if (tail) write(`  Last output:\n${tail}\n`);
      return 1;
    }
  }
  write('\nReady. Next: "make dev" → http://localhost:3000 (re-running the setup is always safe).\n');
  return 0;
}
