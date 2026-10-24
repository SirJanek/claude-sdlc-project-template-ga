import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from '../../components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';

const meta = { title: 'Primitives/Menu', component: DropdownMenu } satisfies Meta<typeof DropdownMenu>;
export default meta;
type Story = StoryObj<typeof meta>;

const items = (
  <DropdownMenuContent align="end">
    <DropdownMenuItem>Reschedule</DropdownMenuItem>
    <DropdownMenuItem>Add to calendar</DropdownMenuItem>
    <DropdownMenuItem disabled>Download invoice — after payment</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem variant="destructive">Cancel booking</DropdownMenuItem>
  </DropdownMenuContent>
);

export const Default: Story = { render: () => <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline">Booking actions</Button></DropdownMenuTrigger>{items}</DropdownMenu> };
export const Open: Story = { render: () => <DropdownMenu defaultOpen modal={false}><DropdownMenuTrigger asChild><Button variant="outline">Booking actions</Button></DropdownMenuTrigger>{items}</DropdownMenu> };
