import type { StorybookConfig } from '@storybook/nextjs-vite';
import remarkGfm from 'remark-gfm';

// Technical note: primitives are shadcn/ui on Radix (see components.json); the product is DevMentor.
// The Storybook UI shows only the product name (manager.ts). Telemetry and "what's new" are off.
const config: StorybookConfig = {
  framework: { name: '@storybook/nextjs-vite', options: {} },
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  staticDirs: ['../public'],
  addons: [
    {
      name: '@storybook/addon-docs',
      options: { mdxPluginOptions: { mdxCompileOptions: { remarkPlugins: [remarkGfm] } } },
    },
    '@storybook/addon-a11y',
    '@storybook/addon-vitest',
  ],
  core: { disableTelemetry: true, disableWhatsNewNotifications: true, disableProjectJson: true },
  typescript: { reactDocgen: 'react-docgen-typescript' },
};

export default config;
