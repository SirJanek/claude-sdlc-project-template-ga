import { defineConfig } from 'vitest/config';

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
