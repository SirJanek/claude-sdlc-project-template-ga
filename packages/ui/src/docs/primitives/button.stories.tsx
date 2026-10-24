import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CopyIcon, Trash2Icon } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Button } from '../../components/ui/button';
import { Narrow, StateMatrix } from '../../../.storybook/blocks/StateMatrix';

const meta = {
  title: 'Primitives/Button',
  component: Button,
  args: { children: 'Book session', onClick: fn() },
  argTypes: {
    variant: { control: 'select', options: ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'] },
    size: { control: 'select', options: ['default', 'sm', 'icon', 'icon-sm'] },
    disabled: { control: 'boolean' },
    asChild: { control: false },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-inline">
      <Button>Book 50-minute session</Button>
      <Button variant="secondary">Copy share link</Button>
      <Button variant="outline">Change slot</Button>
      <Button variant="ghost">Back to sessions</Button>
      <Button variant="destructive">Decline question</Button>
      <Button variant="link">View public work</Button>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-inline">
      <Button>Publish slots</Button>
      <Button size="sm" variant="outline">
        Next page
      </Button>
      <Button size="icon" variant="outline" aria-label="Copy share link">
        <CopyIcon />
      </Button>
      <Button size="icon-sm" variant="ghost" aria-label="Remove slot Tue 14:00">
        <Trash2Icon />
      </Button>
    </div>
  ),
};

const VARIANTS = [
  ['Primary (default)', 'default', 'Pay 45 USD'],
  ['Secondary', 'secondary', 'Copy share link'],
  ['Outline', 'outline', 'Change slot'],
  ['Ghost', 'ghost', 'Back to sessions'],
  ['Destructive', 'destructive', 'Decline question'],
  ['Link', 'link', 'View public work'],
] as const;

export const StateMatrixStory: Story = {
  name: 'State matrix',
  render: () => (
    <StateMatrix
      caption="Hover, focus and pressed are frozen previews of the component's own :hover, :focus-visible and :active styles."
      columns={['Default', 'Hover', 'Focus', 'Pressed', 'Disabled', 'Loading']}
      rows={VARIANTS.map(([label, variant, text]) => ({
        label,
        cells: [
          <Button key="d" variant={variant}>
            {text}
          </Button>,
          <Button key="h" variant={variant} data-preview-state="hover">
            {text}
          </Button>,
          <Button key="f" variant={variant} data-preview-state="focus">
            {text}
          </Button>,
          <Button key="a" variant={variant} data-preview-state="active">
            {text}
          </Button>,
          <Button key="x" variant={variant} disabled>
            {text}
          </Button>,
          <Button key="l" variant={variant} disabled aria-busy="true">
            {variant === 'default' ? 'Paying…' : 'Saving…'}
          </Button>,
        ],
      }))}
    />
  ),
};

export const DisabledWithReason: Story = {
  name: 'Disabled with a reason',
  render: () => (
    <div className="grid max-w-(--measure) gap-inline">
      <div>
        <Button disabled aria-describedby="pay-reason">
          Pay 45 USD
        </Button>
      </div>
      <p id="pay-reason" className="text-sm text-muted-foreground">
        Choose a slot first. Slots are listed above, grouped by day.
      </p>
    </div>
  ),
};

export const LongTextNarrowScreen: Story = {
  name: 'Long text and narrow screen (320 px)',
  render: () => (
    <Narrow>
      <div className="grid gap-inline">
        <Button className="w-full">Book 50-minute session · 90 USD</Button>
        <Button className="w-full" variant="outline">
          Change slot
        </Button>
      </div>
    </Narrow>
  ),
};

export const ClickAndKeyboard: Story = {
  name: 'Interaction: click and keyboard',
  args: { children: 'Book session' },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Book session' });
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledTimes(1);
    await userEvent.tab();
    await userEvent.tab({ shift: true });
    await expect(button).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    await expect(args.onClick).toHaveBeenCalledTimes(3);
  },
};

export const DisabledIsSkipped: Story = {
  name: 'Interaction: disabled is not clickable',
  args: { children: 'Pay 45 USD', disabled: true },
  play: async ({ args, canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Pay 45 USD' });
    await expect(button).toBeDisabled();
    await userEvent.click(button, { pointerEventsCheck: 0 });
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};
