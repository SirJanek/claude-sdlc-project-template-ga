import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/next-env.d.ts',
      'packages/db/src/migrations/**',
      'docs/discovery/mockups/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.node } } },
  // Next.js rules only for the app package.
  ...nextCoreWebVitals.map((config) => ({ ...config, files: ['packages/app/**/*.{ts,tsx}'] })),
  { files: ['packages/app/**/*.{ts,tsx}'], settings: { next: { rootDir: 'packages/app' } } },
);
