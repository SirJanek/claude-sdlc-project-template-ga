import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from '../../components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';

const meta = { title: 'Primitives/Dialog', component: Dialog } satisfies Meta<typeof Dialog>;
export default meta;
type Story = StoryObj<typeof meta>;

const body = (
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Session details</DialogTitle>
      <DialogDescription>Code review of a Next.js app with Tomasz Wrona.</DialogDescription>
    </DialogHeader>
    <p>Tue 3 Nov, 09:00 · 25 min · 120 zł. The link to the call arrives 15 minutes before the start.</p>
    <DialogFooter><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
  </DialogContent>
);

export const Default: Story = { render: () => <Dialog><DialogTrigger asChild><Button variant="outline">View details</Button></DialogTrigger>{body}</Dialog> };
export const Open: Story = { render: () => <Dialog defaultOpen>{body}</Dialog> };
