import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from '../../components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../components/ui/alert-dialog';

const meta = { title: 'Primitives/Confirm dialog', component: AlertDialog } satisfies Meta<typeof AlertDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

const body = (
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Cancel booking DM-4821?</AlertDialogTitle>
      <AlertDialogDescription>Tue 3 Nov, 09:00 with Tomasz Wrona. You get 120 zł back within 5 working days.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Keep booking</AlertDialogCancel>
      <AlertDialogAction>Cancel booking</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
);

export const Default: Story = { render: () => <AlertDialog><AlertDialogTrigger asChild><Button variant="outline">Cancel booking</Button></AlertDialogTrigger>{body}</AlertDialog> };
export const Open: Story = { render: () => <AlertDialog defaultOpen>{body}</AlertDialog> };
