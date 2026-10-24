import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

const meta = { title: 'Primitives/Tabs', component: Tabs } satisfies Meta<typeof Tabs>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="upcoming" className="max-w-md">
      <TabsList aria-label="Bookings">
        <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
        <TabsTrigger value="past">Past</TabsTrigger>
        <TabsTrigger value="cancelled" disabled>Cancelled</TabsTrigger>
      </TabsList>
      <TabsContent value="upcoming">Tue 3 Nov, 09:00 · Code review with Tomasz Wrona</TabsContent>
      <TabsContent value="past">Mon 26 Oct, 13:00 · Interview prep with Marta Kowal</TabsContent>
    </Tabs>
  ),
};
