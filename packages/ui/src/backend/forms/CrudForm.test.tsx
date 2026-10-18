import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { z } from 'zod';
import { CrudForm, type CrudField } from './CrudForm';

afterEach(cleanup);

const schema = z.object({
  name: z.string().min(2, 'Too short.'),
  email: z.string().email('Enter a valid email.'),
  bio: z.string().optional(),
  role: z.enum(['mentee', 'mentor']),
});
const fields: CrudField[] = [
  { name: 'name', label: 'Name', placeholder: 'Ann' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'bio', label: 'Bio', type: 'textarea' },
  {
    name: 'role',
    label: 'Role',
    type: 'select',
    options: [
      { value: 'mentee', label: 'Mentee' },
      { value: 'mentor', label: 'Mentor' },
    ],
  },
];
const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const ok = { ok: true as const, data: null, status: 200 };

describe('CrudForm', () => {
  it('renders every field type with initial values', () => {
    render(<CrudForm schema={schema} fields={fields} initialValues={{ role: 'mentor' }} onSubmit={vi.fn()} />);
    expect((screen.getByLabelText('Bio') as HTMLElement).tagName).toBe('TEXTAREA');
    expect((screen.getByLabelText('Role') as HTMLSelectElement).value).toBe('mentor');
    expect((screen.getByLabelText('Email') as HTMLInputElement).type).toBe('email');
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  });

  it('validates on the client with the shared schema and does not submit invalid data', async () => {
    const onSubmit = vi.fn();
    render(<CrudForm schema={schema} fields={fields} initialValues={{ role: 'mentee' }} onSubmit={onSubmit} />);
    fill('Name', 'A');
    fill('Email', 'nope');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Save' })));
    expect(screen.getByText('Too short.')).toBeTruthy();
    expect(screen.getByText('Enter a valid email.')).toBeTruthy();
    const name = screen.getByLabelText('Name') as HTMLElement;
    expect(name.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById(name.getAttribute('aria-describedby') ?? '')?.textContent).toBe('Too short.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits parsed values and calls onSuccess', async () => {
    const onSubmit = vi.fn(async () => ok);
    const onSuccess = vi.fn();
    render(
      <CrudForm
        schema={schema}
        fields={fields}
        initialValues={{ role: 'mentee' }}
        submitLabel="Create"
        onSubmit={onSubmit}
        onSuccess={onSuccess}
      />,
    );
    fill('Name', 'Ann');
    fill('Email', 'ann@x.io');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Create' })));
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Ann', email: 'ann@x.io', role: 'mentee' });
    expect(onSuccess).toHaveBeenCalled();
  });

  it('shows the server message and field errors from the envelope', async () => {
    const onSubmit = vi.fn(async () => ({
      ok: false as const,
      status: 409,
      error: { code: 'conflict', message: 'Email taken.', fieldErrors: { email: ['Already registered.'] } },
    }));
    render(
      <CrudForm
        schema={schema}
        fields={fields}
        initialValues={{ name: 'Ann', email: 'ann@x.io', role: 'mentee' }}
        onSubmit={onSubmit}
      />,
    );
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Save' })));
    expect(screen.getByRole('alert').textContent).toContain('Email taken.');
    expect(screen.getByText('Already registered.')).toBeTruthy();
  });

  it('handles a server error without field errors', async () => {
    const onSubmit = vi.fn(async () => ({
      ok: false as const,
      status: 500,
      error: { code: 'internal_error', message: 'Try later.' },
    }));
    render(
      <CrudForm
        schema={schema}
        fields={fields}
        initialValues={{ name: 'Ann', email: 'ann@x.io', role: 'mentee' }}
        onSubmit={onSubmit}
      />,
    );
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Save' })));
    expect(screen.getByRole('alert').textContent).toContain('Try later.');
  });

  it('submits on Ctrl/Cmd+Enter, cancels on Escape, ignores other keys', async () => {
    const onSubmit = vi.fn(async () => ok);
    const onCancel = vi.fn();
    render(
      <CrudForm
        schema={schema}
        fields={fields}
        initialValues={{ name: 'Ann', email: 'ann@x.io', role: 'mentee' }}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    );
    const input = screen.getByLabelText('Name');
    await act(async () => fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(input, { key: 'a' });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('ignores Escape without onCancel and blocks double submit while saving', async () => {
    let resolve: (v: typeof ok) => void = () => undefined;
    const onSubmit = vi.fn(() => new Promise<typeof ok>((r) => (resolve = r)));
    render(
      <CrudForm
        schema={schema}
        fields={fields}
        initialValues={{ name: 'Ann', email: 'ann@x.io', role: 'mentee' }}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.keyDown(screen.getByLabelText('Name'), { key: 'Escape' });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Save' })));
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeTruthy();
    await act(async () => fireEvent.keyDown(screen.getByLabelText('Name'), { key: 'Enter', metaKey: true }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    await act(async () => resolve(ok));
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  });

  it('renders a select without options', () => {
    render(<CrudForm schema={schema} fields={[{ name: 'role', label: 'Role', type: 'select' }]} onSubmit={vi.fn()} />);
    expect((screen.getByLabelText('Role') as HTMLSelectElement).options.length).toBe(0);
  });
});

describe('CrudForm — textarea and select', () => {
  it('sends values typed into a textarea and picked from a select', async () => {
    const onSubmit = vi.fn(async () => ok);
    render(
      <CrudForm
        schema={schema}
        fields={fields}
        initialValues={{ name: 'Ann', email: 'ann@x.io', role: 'mentee' }}
        onSubmit={onSubmit}
      />,
    );
    fill('Bio', 'Product lead');
    fill('Role', 'mentor');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Save' })));
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Ann', email: 'ann@x.io', bio: 'Product lead', role: 'mentor' });
  });
});
