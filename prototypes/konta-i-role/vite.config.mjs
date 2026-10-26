// Build: cd packages/ui && npx vite build --config ../../prototypes/konta-i-role/vite.config.mjs
// Output goes to packages/ui/public/prototypes/konta-i-role/ (gitignored) and is served by Storybook (staticDirs).
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const ui = resolve(here, '../../packages/ui');
// Dependencies live in packages/ui/node_modules, so resolve them from there.
const uiRequire = createRequire(resolve(ui, 'package.json'));
const { default: react } = await import(uiRequire.resolve('@vitejs/plugin-react'));
const { defineConfig } = await import(uiRequire.resolve('vite'));

export default defineConfig({
  root: here,
  base: './',
  plugins: [react()],
  css: { postcss: ui },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: [
      // One copy of React for the prototype and the DS (both resolved from packages/ui).
      { find: /^react$/, replacement: uiRequire.resolve('react') },
      { find: /^react\/jsx-runtime$/, replacement: uiRequire.resolve('react/jsx-runtime') },
      { find: /^react\/jsx-dev-runtime$/, replacement: uiRequire.resolve('react/jsx-dev-runtime') },
      { find: /^react-dom$/, replacement: uiRequire.resolve('react-dom') },
      { find: /^react-dom\/client$/, replacement: uiRequire.resolve('react-dom/client') },
      { find: /^@ui\//, replacement: resolve(ui, 'src') + '/' },
      { find: /^cn$/, replacement: uiRequire.resolve('cn') },
      // @import "tailwindcss" in styles.css is resolved from packages/ui (pnpm store), not from this folder.
      { find: /^tailwindcss$/, replacement: uiRequire.resolve('tailwindcss/index.css') },
    ],
  },
  build: {
    outDir: resolve(ui, 'public/prototypes/konta-i-role'),
    emptyOutDir: true,
  },
});
