import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { Label } from '../../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Narrow, StateMatrix } from '../../../.storybook/blocks/StateMatrix';

const meta = {
  title: 'Primitives/Radio group',
  component: RadioGroup,
  args: { 'aria-label': 'Session length', defaultValue: '25', onValueChange: fn() },
  argTypes: { disabled: { control: 'boolean' }, orientation: { control: 'inline-radio', options: ['vertical', 'horizontal'] } },
  render: (args) => (
    <RadioGroup {...args}>
      <div className="flex items-center gap-inline">
        <RadioGroupItem value="25" id="pg-25" />
        <Label htmlFor="pg-25">25 minutes · 45 USD</Label>
      </div>
      <div className="flex items-center gap-inline">
        <RadioGroupItem value="50" id="pg-50" />
        <Label htmlFor="pg-50">50 minutes · 80 USD</Label>
      </div>
    </RadioGroup>
  ),
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

const slots = ['09:00', '09:30', '13:00', '18:30'];

export const SlotsForOneDay: Story = {
  name: 'Slots for one day (primitive only)',
  render: () => (
    <fieldset className="grid max-w-sm gap-inline">
      <legend className="pb-inline text-base font-medium text-foreground">Tuesday 3 November · 25 minutes</legend>
      <RadioGroup aria-label="Start time, Tuesday 3 November">
        {slots.map((t) => (
          <div key={t} className="flex items-center gap-inline">
            <RadioGroupItem value={t} id={`slot-${t}`} />
            <Label htmlFor={`slot-${t}`} className="font-mono">
              {t}
            </Label>
          </div>
        ))}
      </RadioGroup>
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
      caption="Hover and focus are frozen previews of the radio's own styles. Each cell is its own group of one."
      columns={states.map(([s]) => s)}
      rows={[false, true].map((selected) => ({
        label: selected ? 'Selected' : 'Not selected',
        cells: states.map(([s, props]) => (
          <RadioGroup
            key={s}
            aria-label={`09:30, ${selected ? 'selected' : 'not selected'}, ${s.toLowerCase()}`}
            defaultValue={selected ? 'x' : undefined}
          >
            <RadioGroupItem value="x" aria-label="09:30" {...props} />
          </RadioGroup>
        )),
      }))}
    />
  ),
};

export const LongTextNarrowScreen: Story = {
  name: 'Long text and narrow screen (320 px)',
  render: () => (
    <Narrow>
      <RadioGroup aria-label="What happens to the payment" defaultValue="refund">
        <div className="flex items-start gap-inline">
          <RadioGroupItem value="refund" id="n-refund" className="mt-0.5" />
          <Label htmlFor="n-refund" className="leading-normal">
            Decline and refund the mentee in full — the question stays private and nobody is charged
          </Label>
        </div>
        <div className="flex items-start gap-inline">
          <RadioGroupItem value="keep" id="n-keep" className="mt-0.5" />
          <Label htmlFor="n-keep" className="leading-normal">
            Keep the booking
          </Label>
        </div>
      </RadioGroup>
    </Narrow>
  ),
};

export const Keyboard: Story = {
  name: 'Interaction: click label and arrow keys',
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const r25 = canvas.getByRole('radio', { name: '25 minutes · 45 USD' });
    const r50 = canvas.getByRole('radio', { name: '50 minutes · 80 USD' });
    await userEvent.click(canvas.getByText('50 minutes · 80 USD'));
    await expect(r50).toBeChecked();
    // Tab enters the group on the selected radio (WAI-ARIA APG Radio Group); arrows move and select.
    await userEvent.click(canvasElement);
    await userEvent.tab();
    await expect(r50).toHaveFocus();
    // Hold the key: Radix selects on the focus that follows the arrow, while the key is down.
    await userEvent.keyboard('{ArrowUp>}');
    await waitFor(() => expect(r25).toBeChecked());
    await userEvent.keyboard('{/ArrowUp}');
    await expect(r25).toHaveFocus();
    await expect(args.onValueChange).toHaveBeenLastCalledWith('25');
  },
};

export const HitArea: Story = {
  name: 'Interaction: 24 × 24 px hit area',
  render: () => (
    <RadioGroup aria-label="Start time">
      <RadioGroupItem value="0900" aria-label="09:00" />
    </RadioGroup>
  ),
  play: async ({ canvasElement }) => {
    const radio = within(canvasElement).getByRole('radio', { name: '09:00' });
    const r = radio.getBoundingClientRect();
    await expect(document.elementFromPoint(r.right + 3, r.top + r.height / 2)).toBe(radio);
  },
};
