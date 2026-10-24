import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Alert, AlertDescription, AlertTitle } from './alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './alert-dialog';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Skeleton } from './skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { ToastProvider, useSavedToast } from './toast';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.scrollIntoView = () => {};
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});
afterEach(cleanup);

describe('Alert', () => {
  it('danger is an alert, others a status, role can be overridden', () => {
    render(
      <>
        <Alert variant="danger">
          <AlertTitle>Payment failed</AlertTitle>
          <AlertDescription>Try another card.</AlertDescription>
        </Alert>
        <Alert>Saved</Alert>
        <Alert role="note">Note</Alert>
      </>,
    );
    expect(screen.getByRole('alert').textContent).toContain('Payment failed');
    expect(screen.getByRole('status').textContent).toContain('Saved');
    expect(screen.getByRole('note')).toBeTruthy();
  });
});

describe('Dialog', () => {
  it('opens and shows title, description and close button', () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>Change your headline.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose>Done</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );
    fireEvent.click(screen.getByText('Open'));
    expect(screen.getByRole('dialog', { name: 'Edit profile' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
  });

  it('can hide the close button', () => {
    render(
      <Dialog defaultOpen>
        <DialogContent showCloseButton={false} aria-describedby={undefined}>
          <DialogTitle>Plain</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  });
});

describe('AlertDialog', () => {
  it('shows the question with cancel and action', () => {
    render(
      <AlertDialog>
        <AlertDialogTrigger>Decline</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline this question?</AlertDialogTitle>
            <AlertDialogDescription>The mentee gets a refund.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Decline question</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );
    fireEvent.click(screen.getByText('Decline'));
    expect(screen.getByRole('alertdialog', { name: 'Decline this question?' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Decline question' })).toBeTruthy();
  });
});

describe('DropdownMenu and Popover', () => {
  it('renders open menu items', () => {
    render(
      <DropdownMenu defaultOpen modal={false}>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Booking</DropdownMenuLabel>
            <DropdownMenuItem>Reschedule</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">Cancel booking</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(screen.getByRole('menuitem', { name: 'Cancel booking' })).toBeTruthy();
  });

  it('renders open popover content', () => {
    render(
      <Popover defaultOpen>
        <PopoverTrigger>Price</PopoverTrigger>
        <PopoverContent aria-label="Price breakdown">Mentor 102 zł</PopoverContent>
      </Popover>,
    );
    expect(screen.getByRole('dialog', { name: 'Price breakdown' }).textContent).toContain('Mentor 102 zł');
  });
});

describe('Tabs, Skeleton, Tooltip', () => {
  it('shows the active tab panel', () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">Upcoming</TabsTrigger>
          <TabsTrigger value="b">Past</TabsTrigger>
        </TabsList>
        <TabsContent value="a">No sessions</TabsContent>
        <TabsContent value="b">Old</TabsContent>
      </Tabs>,
    );
    expect(screen.getByRole('tab', { name: 'Upcoming' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel').textContent).toContain('No sessions');
  });

  it('skeleton is decorative', () => {
    const { container } = render(<Skeleton className="h-4" />);
    expect((container.firstChild as HTMLElement).getAttribute('aria-hidden')).toBe('true');
  });

  it('tooltip shows its text when open', () => {
    render(
      <Tooltip open>
        <TooltipTrigger>i</TooltipTrigger>
        <TooltipContent>Copy link</TooltipContent>
      </Tooltip>,
    );
    expect(screen.getByRole('tooltip').textContent).toContain('Copy link');
  });
});

describe('Toast', () => {
  function SaveButton() {
    const showSaved = useSavedToast();
    return <button onClick={() => showSaved('Saved')}>Save</button>;
  }

  it('shows a saved toast and removes it after the duration', async () => {
    render(
      <ToastProvider duration={20}>
        <SaveButton />
      </ToastProvider>,
    );
    act(() => fireEvent.click(screen.getByText('Save')));
    expect(screen.getAllByText('Saved').length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.queryAllByText('Saved')).toHaveLength(0));
  });

  it('throws outside the provider', () => {
    expect(() => render(<SaveButton />)).toThrow('useSavedToast must be used inside <ToastProvider>');
  });
});
