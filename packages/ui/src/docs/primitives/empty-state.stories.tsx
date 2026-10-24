import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from '../../components/ui/button';
import { EmptyState } from '../../backend/feedback/EmptyState';

const meta = { title: 'Primitives/Empty state', component: EmptyState, args: { title: 'No sessions booked yet' } } satisfies Meta<typeof EmptyState>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithAction: Story = { args: { title: 'No sessions booked yet', description: 'Find a mentor for code review, interview prep or career advice.', action: <Button>Find a mentor</Button> } };
export const NoResults: Story = { args: { title: 'No mentors match “Rust + 25 min”', description: 'Try a 50-minute session or remove the price filter.' } };
