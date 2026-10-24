import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CalendarPlusIcon } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';

const meta = { title: 'Primitives/Tooltip', component: Tooltip } satisfies Meta<typeof Tooltip>;
export default meta;
type Story = StoryObj<typeof meta>;

const trigger = <TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label="Add to calendar"><CalendarPlusIcon aria-hidden="true" /></Button></TooltipTrigger>;

export const IconName: Story = { name: 'Icon button name', render: () => <Tooltip>{trigger}<TooltipContent>Add to calendar</TooltipContent></Tooltip> };
export const Open: Story = { render: () => <Tooltip defaultOpen>{trigger}<TooltipContent>Add to calendar</TooltipContent></Tooltip> };
