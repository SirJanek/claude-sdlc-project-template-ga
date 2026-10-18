import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

// Package boundaries (engineering standards › Architecture): app → core → db; ui is used by app only;
// only db imports the ORM; only ui/src/backend/api/apiCall.ts calls fetch().
const NO_FRAMEWORK = {
  group: ['next', 'next/*', 'react', 'react/*', 'react-dom', 'react-dom/*'],
  message: 'core and db must not depend on Next.js or React.',
};
const NO_ORM = {
  group: ['@mikro-orm/*'],
  message: 'Only packages/db imports @mikro-orm/* — use @mentorhub/db exports.',
};
const direction = (forbidden) => ({
  group: forbidden.flatMap((name) => [name, `${name}/*`]),
  message: 'Dependency direction is app → core → db; ui is importable by app only.',
});

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/.next-integration/**',
      '**/dist/**',
      '**/next-env.d.ts',
      'packages/db/src/migrations/**',
      'docs/discovery/mockups/**',
      // Agent worktrees (Open Mercato skills, Cezar) are full repo copies — lint them in place, not twice.
      '.ai/tmp/**',
      '.ai/cezar/worktrees/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.node } } },
  // Next.js rules only for the app package.
  ...nextCoreWebVitals.map((config) => ({ ...config, files: ['packages/app/**/*.{ts,tsx}'] })),
  { files: ['packages/app/**/*.{ts,tsx}'], settings: { next: { rootDir: 'packages/app' } } },
  {
    files: ['packages/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [NO_FRAMEWORK, NO_ORM, direction(['@mentorhub/app', '@mentorhub/ui'])] },
      ],
    },
  },
  {
    files: ['packages/db/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [NO_FRAMEWORK, direction(['@mentorhub/app', '@mentorhub/core', '@mentorhub/ui'])] },
      ],
    },
  },
  {
    files: ['packages/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [NO_ORM, direction(['@mentorhub/app', '@mentorhub/core', '@mentorhub/db'])] },
      ],
    },
  },
  {
    files: ['packages/app/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', { patterns: [NO_ORM] }] },
  },
  {
    files: ['packages/app/**/*.{ts,tsx}', 'packages/ui/**/*.{ts,tsx}'],
    ignores: ['packages/ui/src/backend/api/apiCall.ts', '**/*.test.ts'],
    rules: {
      'no-restricted-globals': ['error', { name: 'fetch', message: 'Use apiCall/apiCallOrThrow from @mentorhub/ui.' }],
      'no-restricted-properties': [
        'error',
        { object: 'window', property: 'fetch', message: 'Use apiCall/apiCallOrThrow from @mentorhub/ui.' },
        { object: 'globalThis', property: 'fetch', message: 'Use apiCall/apiCallOrThrow from @mentorhub/ui.' },
      ],
    },
  },
  // Code quality: no `any`, no console (use the shared logger), no empty catch.
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': 'error',
      'no-empty': ['error', { allowEmptyCatch: false }],
    },
  },
  { files: ['packages/db/src/scripts/**'], rules: { 'no-console': 'off' } },
);
