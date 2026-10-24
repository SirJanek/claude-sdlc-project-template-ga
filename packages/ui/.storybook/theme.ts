import { create } from 'storybook/theming';

// Only the product name is visible in the Storybook UI (prompt rule 10).
export const devMentorTheme = create({
  base: 'light',
  brandTitle: 'DevMentor',
  brandUrl: '/',
});
