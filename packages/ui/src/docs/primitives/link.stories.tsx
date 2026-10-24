import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Button, buttonVariants } from '../../components/ui/button';
import { Narrow, StateMatrix } from '../../../.storybook/blocks/StateMatrix';

// "Link and text action" is not a separate component: it is Button variant="link" (an action on this page)
// and Button variant="link" asChild with <a href> (navigation). See the docs page for when to use which.
const meta = {
  title: 'Primitives/Link and text action',
  component: Button,
  args: { variant: 'link', children: 'Change slot', onClick: fn() },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TextAction: Story = { name: 'Text action (button)' };

export const NavigationLink: Story = {
  name: 'Navigation link (anchor)',
  render: () => (
    <Button variant="link" asChild>
      <a href="#mentor-anna-kowalska">Anna Kowalska’s profile</a>
    </Button>
  ),
};

export const InRunningText: Story = {
  name: 'Link in running text',
  render: () => (
    <p className="max-w-(--measure) text-base text-foreground">
      Free cancellation runs until 12 hours before the session. After that the mentor is paid in full; see{' '}
      <a href="#cancellation-rules" className={buttonVariants({ variant: 'link' })}>
        cancellation rules
      </a>
      .
    </p>
  ),
};

export const StateMatrixStory: Story = {
  name: 'State matrix',
  render: () => (
    <StateMatrix
      caption="Hover, focus and pressed are frozen previews of the component's own styles."
      columns={['Default', 'Hover', 'Focus', 'Pressed', 'Disabled']}
      rows={[
        {
          label: 'Text action',
          cells: [
            <Button key="d" variant="link">
              Change slot
            </Button>,
            <Button key="h" variant="link" data-preview-state="hover">
              Change slot
            </Button>,
            <Button key="f" variant="link" data-preview-state="focus">
              Change slot
            </Button>,
            <Button key="a" variant="link" data-preview-state="active">
              Change slot
            </Button>,
            <Button key="x" variant="link" disabled>
              Change slot
            </Button>,
          ],
        },
      ]}
    />
  ),
};

export const LongTextNarrowScreen: Story = {
  name: 'Long text and narrow screen (320 px)',
  render: () => (
    <Narrow>
      <p className="text-base text-foreground">
        Your session with Tomasz Wiśniewski starts Tue 14:00.{' '}
        <Button variant="link" asChild>
          <a href="#session">Open session</a>
        </Button>
      </p>
    </Narrow>
  ),
};

export const ClickAndKeyboard: Story = {
  name: 'Interaction: click and keyboard',
  play: async ({ args, canvasElement }) => {
    const action = within(canvasElement).getByRole('button', { name: 'Change slot' });
    await userEvent.click(action);
    await userEvent.keyboard('{Enter}');
    await expect(args.onClick).toHaveBeenCalledTimes(2);
    await expect(getComputedStyle(action).textDecorationLine).toBe('underline');
  },
};

export const LinkIsAnchor: Story = {
  name: 'Interaction: navigation link is an anchor',
  render: NavigationLink.render,
  play: async ({ canvasElement }) => {
    const link = within(canvasElement).getByRole('link', { name: 'Anna Kowalska’s profile' });
    await expect(link).toHaveAttribute('href', '#mentor-anna-kowalska');
    await userEvent.tab();
    await expect(link).toHaveFocus();
  },
};
