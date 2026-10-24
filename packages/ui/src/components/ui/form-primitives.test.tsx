import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Button } from './button';
import { Checkbox } from './checkbox';
import { Input } from './input';
import { Label } from './label';
import { Textarea } from './textarea';

afterEach(cleanup);

describe('Button (stage 2)', () => {
  it('fires onClick and is not clickable when disabled', () => {
    const onClick = vi.fn();
    render(
      <>
        <Button onClick={onClick}>Book session</Button>
        <Button disabled onClick={onClick}>
          Pay 45 USD
        </Button>
      </>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Book session' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pay 45 USD' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('a link-styled button takes no control size', () => {
    render(
      <>
        <Button variant="link">Change slot</Button>
        <Button size="icon-sm" aria-label="Remove slot" />
      </>,
    );
    expect(screen.getByRole('button', { name: 'Change slot' }).dataset.size).toBeUndefined();
    expect(screen.getByRole('button', { name: 'Remove slot' }).dataset.size).toBe('icon-sm');
  });
});

describe('Input, Textarea, Label', () => {
  it('label names the field and typing updates the value', () => {
    render(
      <>
        <Label htmlFor="link">Link to public work</Label>
        <Input id="link" type="url" />
        <Label htmlFor="q">Your question</Label>
        <Textarea id="q" />
      </>,
    );
    const input = screen.getByRole('textbox', { name: 'Link to public work' }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'https://github.com/anna-k' } });
    expect(input.value).toBe('https://github.com/anna-k');
    expect(screen.getByRole('textbox', { name: 'Your question' }).tagName).toBe('TEXTAREA');
  });
});

describe('Checkbox', () => {
  it('toggles with click and is named by its label', () => {
    render(
      <>
        <Checkbox id="cat" />
        <Label htmlFor="cat">Show my profile in the catalogue</Label>
      </>,
    );
    const box = screen.getByRole('checkbox', { name: 'Show my profile in the catalogue' });
    expect(box.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(box);
    expect(box.getAttribute('aria-checked')).toBe('true');
  });
});
