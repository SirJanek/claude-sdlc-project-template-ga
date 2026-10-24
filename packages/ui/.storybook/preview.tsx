import type { Decorator, Preview } from '@storybook/nextjs-vite';
import { setupWorker } from 'msw/browser';
import { mswLoader } from 'msw-storybook-addon/csf3';
import { useEffect } from 'react';
import './preview.css';

// API responses in stories are simulated with MSW (forms: success, pending, field error, server error, offline).
// Stories declare handlers in `parameters.msw`; requests without a handler pass through to the network.
const msw = mswLoader(async () => {
  const worker = setupWorker();
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true });
  return worker;
});

// Theme is set on the document element so dialogs, menus and popovers rendered in portals get it too (rule 9).
// Only "light" exists in the first release (referencje.md L2); the dark block in globals.css stays unused.
const withTheme: Decorator = (Story, context) => {
  const theme = (context.globals.theme as string | undefined) ?? 'light';
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  return <Story />;
};

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Colour theme',
      toolbar: { title: 'Theme', icon: 'paintbrush', items: [{ value: 'light', title: 'Light' }], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: 'light' },
  decorators: [withTheme],
  loaders: [msw],
  parameters: {
    // Accessibility violations fail the story test run (prompt, stage 1.1).
    a11y: { test: 'error' },
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    backgrounds: { disable: true },
    // Review widths 320 / 768 / 1440 (usage-and-accessibility.mdx; agent test 1). Screen stories use
    // `globals: { viewport: { value: 'mobile320' } }` for the phone variant.
    viewport: {
      options: {
        mobile320: { name: 'Phone 320', styles: { width: '320px', height: '640px' }, type: 'mobile' },
        tablet768: { name: 'Tablet 768', styles: { width: '768px', height: '1024px' }, type: 'tablet' },
        desktop1440: { name: 'Desktop 1440', styles: { width: '1440px', height: '900px' }, type: 'desktop' },
      },
    },
    options: {
      storySort: {
        order: [
          'Design system',
          [
            'Start here',
            'Components',
            'How to choose',
            'Usage and accessibility',
            'Content',
            'What to avoid',
            'What is missing',
            'Contributing',
            'Epics',
          ],
          'Foundations',
          ['Colour', 'Typography', 'Spacing and layout', 'Shape and depth', 'Motion', 'Icons', 'Themes'],
          'Primitives',
          'Product',
          'Patterns',
        ],
      },
    },
  },
};

export default preview;
