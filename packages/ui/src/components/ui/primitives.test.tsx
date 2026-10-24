import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Badge, badgeVariants } from './badge';
import { Button, buttonVariants } from './button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from './table';

afterEach(cleanup);

describe('shadcn primitives', () => {
  it('Button renders variants and can render as its child element', () => {
    render(
      <>
        <Button variant="destructive" size="sm">
          Delete
        </Button>
        <Button asChild>
          <a href="/x">Link</a>
        </Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Delete' }).dataset.slot).toBe('button');
    const link = screen.getByRole('link', { name: 'Link' });
    expect(link.tagName).toBe('A');
    expect(link.dataset.slot).toBe('button');
    expect(buttonVariants({ variant: 'outline' })).toContain('border');
  });

  it('Badge renders as span or as its child element', () => {
    render(
      <>
        <Badge variant="neutral">mentor</Badge>
        <Badge asChild>
          <a href="/y">tag</a>
        </Badge>
      </>,
    );
    expect(screen.getByText('mentor').tagName).toBe('SPAN');
    expect(screen.getByText('tag').tagName).toBe('A');
    expect(badgeVariants({ variant: 'danger' })).toContain('text-status-danger');
  });

  it('Card renders every part with its data-slot', () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Desc</CardDescription>
          <CardAction>Act</CardAction>
        </CardHeader>
        <CardContent>Body</CardContent>
        <CardFooter>Foot</CardFooter>
      </Card>,
    );
    const slots = [...container.querySelectorAll('[data-slot]')].map((el) => (el as HTMLElement).dataset.slot);
    expect(slots).toEqual([
      'card',
      'card-header',
      'card-title',
      'card-description',
      'card-action',
      'card-content',
      'card-footer',
    ]);
  });

  it('Table renders header, body, footer and caption', () => {
    render(
      <Table>
        <TableCaption>Users</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Ann</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>1 user</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );
    expect(screen.getByRole('table', { name: 'Users' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeTruthy();
    expect(screen.getByRole('cell', { name: 'Ann' })).toBeTruthy();
    expect(screen.getByText('1 user').closest('tfoot')).toBeTruthy();
  });
});
