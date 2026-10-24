import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Narrow, StateMatrix } from '../../../.storybook/blocks/StateMatrix';

const QUESTION =
  'After upgrading the ingress-nginx Helm chart from 4.10 to 4.11, staging returns 404 for every route. ' +
  'Rollback fixes it. I need to ship on Tuesday. I will paste values.yaml and the controller log in the session.';

const meta = {
  title: 'Primitives/Textarea',
  component: Textarea,
  args: { 'aria-label': 'Your question', placeholder: 'What are you stuck on, and what have you tried?' },
  argTypes: { disabled: { control: 'boolean' } },
  decorators: [(Story) => <div className="max-w-lg">{Story()}</div>],
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

const states: [string, React.ComponentProps<typeof Textarea>][] = [
  ['Default', {}],
  ['Hover', { 'data-preview-state': 'hover' } as React.ComponentProps<typeof Textarea>],
  ['Focus', { 'data-preview-state': 'focus' } as React.ComponentProps<typeof Textarea>],
  ['Filled', { defaultValue: 'Helm upgrade broke staging, ingress returns 404.' }],
  ['Disabled', { disabled: true, defaultValue: 'Helm upgrade broke staging, ingress returns 404.' }],
  ['Error', { 'aria-invalid': true }],
];

export const StateMatrixStory: Story = {
  name: 'State matrix',
  render: () => (
    <StateMatrix
      caption="Hover and focus are frozen previews of the field's own styles."
      columns={states.map(([s]) => s)}
      rows={[
        {
          label: 'Textarea',
          cells: states.map(([s, props]) => (
            <Textarea key={s} aria-label={`Your question, ${s.toLowerCase()}`} {...props} />
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
        <Label htmlFor="n-q">Your question</Label>
        <Textarea id="n-q" defaultValue={QUESTION} />
      </div>
    </Narrow>
  ),
};

export const Typing: Story = {
  name: 'Interaction: typing several lines',
  render: () => (
    <div className="grid max-w-lg gap-inline">
      <Label htmlFor="i-q">Your question</Label>
      <Textarea id="i-q" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const field = within(canvasElement).getByRole('textbox', { name: 'Your question' });
    await userEvent.click(field);
    await userEvent.keyboard('Staging returns 404 after the Helm upgrade.{Enter}Rollback fixes it.');
    await expect(field).toHaveValue('Staging returns 404 after the Helm upgrade.\nRollback fixes it.');
  },
};
