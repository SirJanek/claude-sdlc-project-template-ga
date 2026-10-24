import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, waitFor, within } from 'storybook/test';
import { Avatar } from '../../components/ui/avatar';
import { Narrow, StateMatrix } from '../../../.storybook/blocks/StateMatrix';

// Photos are documentation placeholders in public/storybook-photos (illustrations, not real people).
const MARTA = '/storybook-photos/marta.svg';
const TOMASZ = '/storybook-photos/tomasz.svg';

const meta = {
  title: 'Primitives/Avatar',
  component: Avatar,
  args: { src: MARTA, alt: 'Marta Kowalczyk', size: 'default' },
  argTypes: { size: { control: 'inline-radio', options: ['sm', 'default', 'lg'] } },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

function Person({ name, src, size }: { name: string; src?: string | null; size?: 'sm' | 'default' | 'lg' }) {
  return (
    <span className="flex items-center gap-inline text-base">
      <Avatar src={src} alt="" size={size} />
      <span className="font-semibold">{name}</span>
    </span>
  );
}

export const Sizes: Story = {
  name: 'Sizes: 24, 32, 40 px',
  render: () => (
    <div className="grid gap-stack">
      <Person name="Marta Kowalczyk" src={MARTA} size="sm" />
      <Person name="Marta Kowalczyk" src={MARTA} />
      <Person name="Marta Kowalczyk" src={MARTA} size="lg" />
    </div>
  ),
};

export const StateMatrixStory: Story = {
  name: 'State matrix',
  render: () => (
    <StateMatrix
      caption="An avatar is not interactive. Without a photo, or when it fails to load, nothing is drawn and the name stands alone (A01: no initials)."
      columns={['Photo', 'No photo', 'Photo failed']}
      rows={(['sm', 'default', 'lg'] as const).map((size) => ({
        label: size,
        cells: [
          <Person key="p" name="Marta Kowalczyk" src={MARTA} size={size} />,
          <Person key="n" name="Anna Zielińska" src={null} size={size} />,
          <Person key="f" name="Tomasz Nowak" src="/storybook-photos/missing.svg" size={size} />,
        ],
      }))}
    />
  ),
};

export const LongTextNarrowScreen: Story = {
  name: 'Long text and narrow screen (320 px)',
  render: () => (
    <Narrow>
      <div className="flex items-start gap-inline text-base">
        <Avatar src={TOMASZ} alt="" />
        <p className="min-w-0 wrap-break-word">
          <span className="font-semibold">Tomasz Nowak-Wiśniewski</span>{' '}
          <span className="text-sm text-muted-foreground">18:32</span>
        </p>
      </div>
    </Narrow>
  ),
};

export const PhotoOnly: Story = {
  name: 'Check: photo shown, missing photo draws nothing',
  render: () => (
    <div className="grid gap-stack">
      <Avatar src={MARTA} alt="Marta Kowalczyk" size="lg" />
      <Person name="Anna Zielińska" src={null} />
      <Person name="Tomasz Nowak" src="/storybook-photos/missing.svg" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const img = await canvas.findByRole('img', { name: 'Marta Kowalczyk' });
    await expect(img.getBoundingClientRect().width).toBe(40);
    await waitFor(() =>
      expect(canvasElement.querySelector('[data-status="error"]')).not.toBeNull(),
    );
    const failed = canvasElement.querySelector('[data-status="error"]') as HTMLElement;
    await expect(getComputedStyle(failed).display).toBe('none');
    await expect(canvasElement.querySelectorAll('[data-slot="avatar"]').length).toBe(2);
    await expect(canvas.getByText('Anna Zielińska')).toBeVisible();
  },
};
