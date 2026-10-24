import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Skeleton } from '../../components/ui/skeleton';

const meta = { title: 'Primitives/Skeleton', component: Skeleton } satisfies Meta<typeof Skeleton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const MentorRow: Story = {
  name: 'Loading mentor list',
  render: () => (
    <div aria-busy="true" aria-label="Loading mentors" className="grid max-w-md gap-stack">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-inline">
          <Skeleton className="size-10 rounded-full" />
          <div className="grid flex-1 gap-1"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-3/4" /></div>
        </div>
      ))}
    </div>
  ),
};
