import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from '../../components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';

const meta = { title: 'Primitives/Popover', component: Popover } satisfies Meta<typeof Popover>;
export default meta;
type Story = StoryObj<typeof meta>;

const content = (
  <PopoverContent aria-label="Price breakdown">
    <p className="font-semibold">How the 120 zł is split</p>
    <p className="text-muted-foreground">Mentor 102 zł · DevMentor fee 18 zł (15 %). The money is held until the session ends.</p>
  </PopoverContent>
);

export const Default: Story = { render: () => <Popover><PopoverTrigger asChild><Button variant="ghost">Price breakdown</Button></PopoverTrigger>{content}</Popover> };
export const Open: Story = { render: () => <Popover defaultOpen><PopoverTrigger asChild><Button variant="ghost">Price breakdown</Button></PopoverTrigger>{content}</Popover> };
