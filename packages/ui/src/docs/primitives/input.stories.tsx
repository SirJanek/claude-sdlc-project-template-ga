import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Narrow, StateMatrix } from '../../../.storybook/blocks/StateMatrix';

const meta = {
  title: 'Primitives/Input',
  component: Input,
  args: { 'aria-label': 'Link to public work', placeholder: 'https://github.com/your-name', type: 'url' },
  argTypes: {
    type: { control: 'select', options: ['text', 'email', 'url', 'password', 'search'] },
    disabled: { control: 'boolean' },
  },
  decorators: [(Story) => <div className="max-w-sm">{Story()}</div>],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Types: Story = {
  render: () => (
    <div className="grid max-w-sm gap-stack">
      <div className="grid gap-inline">
        <Label htmlFor="t-email">E-mail</Label>
        <Input id="t-email" type="email" autoComplete="email" placeholder="ola@example.dev" />
      </div>
      <div className="grid gap-inline">
        <Label htmlFor="t-url">Link to public work</Label>
        <Input id="t-url" type="url" placeholder="https://github.com/your-name" />
      </div>
      <div className="grid gap-inline">
        <Label htmlFor="t-price">Price for a 25-minute session (USD)</Label>
        <Input id="t-price" inputMode="decimal" defaultValue="40" className="font-mono" />
      </div>
    </div>
  ),
};

const states: [string, React.ComponentProps<typeof Input>][] = [
  ['Default', {}],
  ['Hover', { 'data-preview-state': 'hover' } as React.ComponentProps<typeof Input>],
  ['Focus', { 'data-preview-state': 'focus' } as React.ComponentProps<typeof Input>],
  ['Filled', { defaultValue: 'https://github.com/anna-kowalska' }],
  ['Disabled', { disabled: true, defaultValue: 'https://github.com/anna-kowalska' }],
  ['Error', { 'aria-invalid': true, defaultValue: 'github.com/anna' }],
];

export const StateMatrixStory: Story = {
  name: 'State matrix',
  render: () => (
    <StateMatrix
      caption="Hover and focus are frozen previews of the field's own :hover and :focus-visible styles. Error is always paired with a message (see Form field)."
      columns={states.map(([s]) => s)}
      rows={[
        {
          label: 'Input',
          cells: states.map(([s, props]) => (
            <Input key={s} aria-label={`Link to public work, ${s.toLowerCase()}`} placeholder="https://github.com/your-name" {...props} />
          )),
        },
      ]}
    />
  ),
};

export const LongTextNarrowScreen: Story = {
  name: 'Long text and narrow screen (320 px)',
  render: () => (
    <Narrow>
      <div className="grid gap-inline">
        <Label htmlFor="n-url">Link to public work</Label>
        <Input id="n-url" type="url" defaultValue="https://github.com/katarzyna-nowak-wisniewska/kubernetes-ingress-notes" />
      </div>
    </Narrow>
  ),
};

export const Typing: Story = {
  name: 'Interaction: typing and keyboard focus',
  render: () => (
    <div className="grid max-w-sm gap-inline">
      <Label htmlFor="i-url">Link to public work</Label>
      <Input id="i-url" type="url" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    const field = canvas.getByRole('textbox', { name: 'Link to public work' });
    await expect(field).toHaveFocus();
    await userEvent.keyboard('https://github.com/anna-kowalska');
    await expect(field).toHaveValue('https://github.com/anna-kowalska');
    await userEvent.click(canvas.getByText('Link to public work'));
    await expect(field).toHaveFocus();
  },
};
