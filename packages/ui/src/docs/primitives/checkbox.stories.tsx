import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Checkbox } from '../../components/ui/checkbox';
import { Label } from '../../components/ui/label';
import { Narrow, StateMatrix } from '../../../.storybook/blocks/StateMatrix';

const meta = {
  title: 'Primitives/Checkbox',
  component: Checkbox,
  args: { 'aria-label': 'Show my profile in the catalogue', onCheckedChange: fn() },
  argTypes: { disabled: { control: 'boolean' }, defaultChecked: { control: 'boolean' } },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const WithLabel: Story = {
  name: 'With label and description',
  render: () => (
    <div className="grid max-w-(--measure) gap-stack">
      <div className="flex items-start gap-inline">
        <Checkbox id="catalogue" className="mt-0.5" aria-describedby="catalogue-hint" />
        <div className="grid gap-1">
          <Label htmlFor="catalogue">Show my profile in the catalogue</Label>
          <p id="catalogue-hint" className="text-sm text-muted-foreground">
            Off by default. Mentees can always book you through your share link.
          </p>
        </div>
      </div>
    </div>
  ),
};

export const Group: Story = {
  name: 'Group: session lengths offered',
  render: () => (
    <fieldset className="grid gap-inline">
      <legend className="pb-inline text-base font-medium text-foreground">Session lengths you offer</legend>
      <div className="flex items-center gap-inline">
        <Checkbox id="len-25" defaultChecked />
        <Label htmlFor="len-25">25 minutes</Label>
      </div>
      <div className="flex items-center gap-inline">
        <Checkbox id="len-50" />
        <Label htmlFor="len-50">50 minutes</Label>
      </div>
    </fieldset>
  ),
};

const states: [string, Record<string, unknown>][] = [
  ['Default', {}],
  ['Hover', { 'data-preview-state': 'hover' }],
  ['Focus', { 'data-preview-state': 'focus' }],
  ['Disabled', { disabled: true }],
  ['Error', { 'aria-invalid': true }],
];

export const StateMatrixStory: Story = {
  name: 'State matrix',
  render: () => (
    <StateMatrix
      caption="Hover and focus are frozen previews of the checkbox's own styles. The dashed square is not drawn: the hit area is 24 × 24 px around the 16 px box."
      columns={states.map(([s]) => s)}
      rows={[false, true].map((checked) => ({
        label: checked ? 'Checked' : 'Unchecked',
        cells: states.map(([s, props]) => (
          <Checkbox
            key={s}
            defaultChecked={checked}
            aria-label={`25 minutes, ${checked ? 'checked' : 'unchecked'}, ${s.toLowerCase()}`}
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
      <div className="flex items-start gap-inline">
        <Checkbox id="n-terms" className="mt-0.5" />
        <Label htmlFor="n-terms" className="leading-normal">
          I understand that free cancellation ends 12 hours before the session and the mentor is paid after that
        </Label>
      </div>
    </Narrow>
  ),
};

export const ClickAndKeyboard: Story = {
  name: 'Interaction: click label and Space',
  render: (args) => (
    <div className="flex items-center gap-inline">
      <Checkbox id="k-cat" onCheckedChange={args.onCheckedChange} />
      <Label htmlFor="k-cat">Show my profile in the catalogue</Label>
    </div>
  ),
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const box = canvas.getByRole('checkbox', { name: 'Show my profile in the catalogue' });
    await userEvent.click(canvas.getByText('Show my profile in the catalogue'));
    await expect(box).toBeChecked();
    await userEvent.keyboard(' ');
    await expect(box).not.toBeChecked();
    await expect(args.onCheckedChange).toHaveBeenCalledTimes(2);
  },
};

export const HitArea: Story = {
  name: 'Interaction: 24 × 24 px hit area',
  render: () => <Checkbox aria-label="50 minutes" />,
  play: async ({ canvasElement }) => {
    const box = within(canvasElement).getByRole('checkbox', { name: '50 minutes' });
    const r = box.getBoundingClientRect();
    // A click 3 px outside the visible 16 px box still lands on the checkbox (::before extends it to 24 px).
    const hit = document.elementFromPoint(r.right + 3, r.top + r.height / 2);
    await expect(hit).toBe(box);
    const before = getComputedStyle(box, '::before');
    await expect(r.width + 2 * -parseFloat(before.left) - 2).toBeGreaterThanOrEqual(24);
  },
};
