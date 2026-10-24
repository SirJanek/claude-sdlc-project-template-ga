import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Narrow, StateMatrix } from '../../../.storybook/blocks/StateMatrix';

const meta = {
  title: 'Primitives/Switch',
  component: Switch,
  args: { 'aria-label': 'Listed in the catalogue', onCheckedChange: fn() },
  argTypes: { disabled: { control: 'boolean' }, defaultChecked: { control: 'boolean' } },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const WithLabel: Story = {
  name: 'With label and description',
  render: () => (
    <div className="flex max-w-(--measure) items-start justify-between gap-stack">
      <div className="grid gap-1">
        <Label htmlFor="cat-sw">Listed in the catalogue</Label>
        <p id="cat-sw-hint" className="text-sm text-muted-foreground">
          Applies right away. Your share link works either way.
        </p>
      </div>
      <Switch id="cat-sw" aria-describedby="cat-sw-hint" />
    </div>
  ),
};

const states: [string, Record<string, unknown>][] = [
  ['Default', {}],
  ['Hover', { 'data-preview-state': 'hover' }],
  ['Focus', { 'data-preview-state': 'focus' }],
  ['Disabled', { disabled: true }],
];

export const StateMatrixStory: Story = {
  name: 'State matrix',
  render: () => (
    <StateMatrix
      caption="Hover and focus are frozen previews of the switch's own styles."
      columns={states.map(([s]) => s)}
      rows={[false, true].map((on) => ({
        label: on ? 'On' : 'Off',
        cells: states.map(([s, props]) => (
          <Switch
            key={s}
            defaultChecked={on}
            aria-label={`Listed in the catalogue, ${on ? 'on' : 'off'}, ${s.toLowerCase()}`}
            {...props}
          />
        )),
      }))}
    />
  ),
};

export const LongTextNarrowScreen: Story = {
  name: 'Long text and narrow screen (320 px)',
  render: () => (
    <Narrow>
      <div className="flex items-start justify-between gap-stack">
        <Label htmlFor="n-sw" className="leading-normal">
          Show my profile to mentees who search the catalogue for Kubernetes and Helm
        </Label>
        <Switch id="n-sw" defaultChecked />
      </div>
    </Narrow>
  ),
};

export const ClickAndKeyboard: Story = {
  name: 'Interaction: click label and Space',
  render: (args) => (
    <div className="flex items-center gap-inline">
      <Switch id="k-sw" onCheckedChange={args.onCheckedChange} />
      <Label htmlFor="k-sw">Listed in the catalogue</Label>
    </div>
  ),
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const sw = canvas.getByRole('switch', { name: 'Listed in the catalogue' });
    await userEvent.click(canvas.getByText('Listed in the catalogue'));
    await expect(sw).toBeChecked();
    await userEvent.keyboard(' ');
    await expect(sw).not.toBeChecked();
    await expect(args.onCheckedChange).toHaveBeenCalledTimes(2);
  },
};

export const HitArea: Story = {
  name: 'Interaction: 24 px tall hit area',
  play: async ({ canvasElement }) => {
    const sw = within(canvasElement).getByRole('switch', { name: 'Listed in the catalogue' });
    const r = sw.getBoundingClientRect();
    await expect(r.width).toBe(32);
    await expect(r.height).toBe(18);
    await expect(document.elementFromPoint(r.left + r.width / 2, r.bottom + 2)).toBe(sw);
  },
};
