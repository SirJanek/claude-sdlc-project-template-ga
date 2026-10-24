import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import { FormField } from '../../backend/forms/FormField';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Narrow, StateMatrix } from '../../../.storybook/blocks/StateMatrix';

const meta = {
  title: 'Primitives/Label and form field',
  component: FormField,
  args: {
    label: 'Link to public work',
    hint: 'A GitHub profile, a blog or a talk. Mentees see it instead of ratings.',
    necessity: 'required',
    children: <Input type="url" placeholder="https://github.com/your-name" />,
  },
  argTypes: {
    necessity: { control: 'select', options: [undefined, 'required', 'optional'] },
    error: { control: 'text' },
    hint: { control: 'text' },
    children: { control: false },
  },
  decorators: [(Story) => <div className="max-w-sm">{Story()}</div>],
} satisfies Meta<typeof FormField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const LabelOnly: Story = {
  name: 'Label on its own',
  render: () => (
    <div className="grid gap-inline">
      <Label htmlFor="lbl-headline">Headline</Label>
      <Input id="lbl-headline" defaultValue="Kubernetes and Helm on AWS, 9 years in production" />
    </div>
  ),
};

export const Parts: Story = {
  name: 'Parts: hint, required, optional, error',
  render: () => (
    <div className="grid gap-stack">
      <FormField label="E-mail" necessity="required" hint="We send the booking confirmation here.">
        <Input type="email" autoComplete="email" defaultValue="ola@example.dev" />
      </FormField>
      <FormField label="Headline" necessity="optional">
        <Input defaultValue="Kubernetes and Helm on AWS" />
      </FormField>
      <FormField
        label="Link to public work"
        necessity="required"
        error="Enter a full link starting with https://, for example https://github.com/anna-kowalska."
      >
        <Input type="url" defaultValue="github.com/anna" />
      </FormField>
      <FormField label="Your question" necessity="required" hint="What you are stuck on and what you have tried.">
        <Textarea />
      </FormField>
    </div>
  ),
};

export const StateMatrixStory: Story = {
  name: 'State matrix',
  render: () => (
    <StateMatrix
      caption="Form field states. Hover and focus belong to the control (see Input); the field adds hint and error."
      columns={['Default', 'With hint', 'Error', 'Disabled']}
      rows={[
        {
          label: 'Form field',
          cells: [
            <FormField key="d" label="Price, 25 min (USD)">
              <Input defaultValue="40" />
            </FormField>,
            <FormField key="h" label="Price, 50 min (USD)" hint="Shown on your profile next to the slot.">
              <Input defaultValue="75" />
            </FormField>,
            <FormField key="e" label="Price, 25 min, error (USD)" error="Enter a price as a number, for example 40.">
              <Input defaultValue="forty" />
            </FormField>,
            <FormField key="x" label="Price, 50 min, disabled (USD)" hint="Prices lock while a session is booked.">
              <Input defaultValue="75" disabled />
            </FormField>,
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
      <FormField
        label="Link to the repository or gist you want the mentor to read before the session"
        necessity="optional"
        hint="Public links only. The mentor opens it before the session starts, so a private repository will not load."
        error="This link does not open. Check that the repository is public, or paste the code in the question."
      >
        <Input type="url" defaultValue="https://github.com/ola-dev/private-checkout" />
      </FormField>
    </Narrow>
  ),
};

function ValidateOnBlur() {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | undefined>();
  return (
    <FormField
      label="Link to public work"
      necessity="required"
      hint="A GitHub profile, a blog or a talk."
      error={error}
    >
      <Input
        type="url"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() =>
          setError(
            value.startsWith('https://')
              ? undefined
              : 'Enter a full link starting with https://, for example https://github.com/anna-kowalska.',
          )
        }
      />
    </FormField>
  );
}

export const Validation: Story = {
  name: 'Interaction: validation on leaving the field',
  render: () => <ValidateOnBlur />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const field = canvas.getByRole('textbox', { name: /Link to public work/ });
    await expect(field).toBeRequired();
    await userEvent.click(field);
    await userEvent.tab();
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(field).toHaveAccessibleDescription(/Enter a full link starting with https:\/\//);
    await userEvent.click(field);
    await userEvent.keyboard('https://github.com/anna-kowalska');
    await userEvent.tab();
    await expect(field).not.toHaveAttribute('aria-invalid');
    await expect(field).toHaveAccessibleDescription('A GitHub profile, a blog or a talk.');
  },
};
