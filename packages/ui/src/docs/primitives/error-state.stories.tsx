import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ErrorState } from '../../backend/feedback/ErrorMessage';

const meta = { title: 'Primitives/Error state', component: ErrorState, args: { message: '' } } satisfies Meta<typeof ErrorState>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithRetry: Story = { args: { title: 'Could not load your bookings', message: 'The connection dropped. Your bookings are safe — try again.', onRetry: () => {} } };
export const WithoutRetry: Story = { args: { title: 'Payment declined', message: 'Your bank refused the card. Use another card or BLIK.' } };
