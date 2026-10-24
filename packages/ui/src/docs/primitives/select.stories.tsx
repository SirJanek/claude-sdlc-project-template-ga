import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Narrow, StateMatrix } from '../../../.storybook/blocks/StateMatrix';

type Args = { disabled?: boolean; invalid?: boolean; onValueChange?: (v: string) => void };

function LengthSelect({ id, disabled, invalid, onValueChange, defaultValue, triggerProps }: Args & {
  id: string;
  defaultValue?: string;
  triggerProps?: Record<string, unknown>;
}) {
  return (
    <Select disabled={disabled} onValueChange={onValueChange} defaultValue={defaultValue}>
      <SelectTrigger id={id} aria-invalid={invalid || undefined} className="max-w-sm" {...triggerProps}>
        <SelectValue placeholder="Choose a length" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="25">25 minutes · 45 USD</SelectItem>
        <SelectItem value="50">50 minutes · 80 USD</SelectItem>
      </SelectContent>
    </Select>
  );
}

const meta = {
  title: 'Primitives/Select',
  component: LengthSelect,
  args: { id: 'pg-len', disabled: false, invalid: false, onValueChange: fn() },
  argTypes: { disabled: { control: 'boolean' }, invalid: { control: 'boolean' } },
  render: (args) => (
    <div className="grid max-w-sm gap-1">
      <Label htmlFor={args.id}>Session length</Label>
      <LengthSelect {...args} />
    </div>
  ),
} satisfies Meta<typeof LengthSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Grouped: Story = {
  name: 'Grouped options: time zone',
  render: () => (
    <div className="grid max-w-sm gap-1">
      <Label htmlFor="tz">Time zone for your slots</Label>
      <Select defaultValue="Europe/Warsaw">
        <SelectTrigger id="tz">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Europe</SelectLabel>
            <SelectItem value="Europe/Warsaw">Warsaw (UTC+1)</SelectItem>
            <SelectItem value="Europe/London">London (UTC+0)</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Americas</SelectLabel>
            <SelectItem value="America/New_York">New York (UTC−5)</SelectItem>
            <SelectItem value="America/Sao_Paulo" disabled>
              São Paulo (UTC−3) — no slots yet
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  ),
};

const states: [string, Args & { triggerProps?: Record<string, unknown>; defaultValue?: string }][] = [
  ['Default', {}],
  ['Hover', { triggerProps: { 'data-preview-state': 'hover' } }],
  ['Focus', { triggerProps: { 'data-preview-state': 'focus' } }],
  ['Disabled', { disabled: true }],
  ['Error', { invalid: true }],
];

export const StateMatrixStory: Story = {
  name: 'State matrix',
  render: () => (
    <StateMatrix
      caption="Hover and focus are frozen previews of the trigger's own styles. Open the Playground to see the list."
      columns={states.map(([s]) => s)}
      rows={[undefined, '50'].map((value) => ({
        label: value ? 'Selected' : 'Placeholder',
        cells: states.map(([s, props]) => (
          <LengthSelect
            key={s}
            id={`m-${s}-${value ?? 'none'}`}
            defaultValue={value}
            {...props}
            triggerProps={{ ...props.triggerProps, 'aria-label': `Session length, ${s.toLowerCase()}`, className: 'w-field-sm' }}
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
      <div className="grid gap-1">
        <Label htmlFor="n-reason">Reason for declining</Label>
        <Select defaultValue="scope">
          <SelectTrigger id="n-reason">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="scope">The question needs more than a 50-minute session to answer properly</SelectItem>
            <SelectItem value="stack">I do not work with this stack</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </Narrow>
  ),
};

export const Keyboard: Story = {
  name: 'Interaction: keyboard pick',
  args: { id: 'k-len' },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('combobox', { name: 'Session length' });
    trigger.focus();
    await userEvent.keyboard('{Enter}');
    const body = within(canvasElement.ownerDocument.body);
    const list = await body.findByRole('listbox');
    await expect(list).toBeVisible();
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await waitFor(() => expect(args.onValueChange).toHaveBeenCalledWith('50'));
    await expect(trigger).toHaveTextContent('50 minutes · 80 USD');
    await expect(trigger).toHaveFocus();
  },
};

export const OpenListHasNoShadow: Story = {
  name: 'Interaction: open list, 40 px options, no shadow',
  args: { id: 'o-len' },
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('combobox', { name: 'Session length' });
    await userEvent.click(trigger);
    const body = within(canvasElement.ownerDocument.body);
    const option = await body.findByRole('option', { name: '25 minutes · 45 USD' });
    await expect(option.getBoundingClientRect().height).toBe(40);
    const content = option.closest('[data-slot="select-content"]') as HTMLElement;
    await expect(getComputedStyle(content).boxShadow).toBe('none');
    await userEvent.keyboard('{Escape}');
  },
};
