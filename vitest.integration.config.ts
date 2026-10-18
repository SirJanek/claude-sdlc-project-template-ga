import { defineConfig } from 'vitest/config';
import { BaseSequencer, type TestSpecification } from 'vitest/node';

/**
 * Files that stop the shared PostgreSQL container run last; every other file runs in alphabetical
 * order. Vitest's default order (cached durations, file size) is not stable enough for a suite
 * whose files share one database.
 */
const STOPS_THE_DATABASE = ['app.test.ts'];

class SharedDatabaseSequencer extends BaseSequencer {
  override async sort(files: TestSpecification[]): Promise<TestSpecification[]> {
    const name = (file: TestSpecification) => file.moduleId.split('/').at(-1) ?? file.moduleId;
    const rank = (file: TestSpecification) => (STOPS_THE_DATABASE.includes(name(file)) ? 1 : 0);
    return [...files].sort((a, b) => rank(a) - rank(b) || name(a).localeCompare(name(b)));
  }
}

/**
 * Integration suite: ephemeral PostgreSQL (testcontainers) + the real app, driven by agent-browser.
 * Run with `make test-integration` (needs Docker). Files run one after another; each run gets its
 * own container, ports and browser session, so separate worktrees can run in parallel.
 */
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    globalSetup: ['tests/integration/global-setup.ts'],
    fileParallelism: false,
    sequence: { sequencer: SharedDatabaseSequencer },
    testTimeout: 120_000,
    hookTimeout: 300_000,
    // Machine-readable results next to the screenshots and logs (uploaded by CI as evidence).
    reporters: [
      'default',
      ['junit', { outputFile: 'tests/integration/.evidence/junit.xml' }],
      ['json', { outputFile: 'tests/integration/.evidence/results.json' }],
    ],
  },
});
