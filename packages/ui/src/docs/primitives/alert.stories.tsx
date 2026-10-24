import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';

const meta = { title: 'Primitives/Alert', component: Alert } satisfies Meta<typeof Alert>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: () => (
    <div className="grid max-w-md gap-stack">
      <Alert variant="neutral"><AlertTitle>Marta has not replied yet</AlertTitle><AlertDescription>Mentors usually answer within 24 h. You will get an email.</AlertDescription></Alert>
      <Alert variant="success"><AlertTitle>Session booked</AlertTitle><AlertDescription>Tue 3 Nov, 09:00 · 25 min with Tomasz Wrona.</AlertDescription></Alert>
      <Alert variant="warning"><AlertTitle>Free cancellation ends in 12 h</AlertTitle><AlertDescription>After that the full price of 120 zł is charged.</AlertDescription></Alert>
      <Alert variant="danger"><AlertTitle>Payment declined</AlertTitle><AlertDescription>Your bank refused the card. Try another card or pay by BLIK.</AlertDescription></Alert>
    </div>
  ),
};
