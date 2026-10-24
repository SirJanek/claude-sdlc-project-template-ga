import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { defineConfig } from 'vitest/config';
import { unitTestConfig } from '../../vitest.shared';

const dirname = fileURLToPath(new URL('.', import.meta.url));

// Two projects: "unit" keeps the 100% coverage gate (AGENTS.md); "storybook" runs every story as a browser
// test with the a11y addon (violations fail; preview annotations are applied by the addon automatically since 10.3). Stories and docs blocks are documentation, not product code,
// so they are excluded from the coverage denominator.
export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          ...unitTestConfig({
            environment: 'jsdom',
            coverageExclude: ['src/**/*.stories.tsx', 'src/docs/**', 'src/**/*.mdx'],
          }),
        },
      },
      {
        extends: true,
        plugins: [storybookTest({ configDir: `${dirname}.storybook` })],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            // Uses the installed Google Chrome; --use-mock-keychain keeps a fresh profile out of the macOS keychain.
            provider: playwright({
              launchOptions: { channel: 'chrome', args: ['--use-mock-keychain', '--mute-audio'] },
            }),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
