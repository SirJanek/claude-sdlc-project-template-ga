import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Avatar } from './avatar';
import { Badge } from './badge';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Label } from './label';
import { RadioGroup, RadioGroupItem } from './radio-group';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './select';
import { Switch } from './switch';

beforeAll(() => {
  // jsdom lacks the pointer-capture and scroll APIs Radix Select calls.
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.scrollIntoView = () => {};
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Select', () => {
  it('opens from the trigger and picks a session length', () => {
    const onValueChange = vi.fn();
    render(
      <>
        <Label htmlFor="len">Session length</Label>
        <Select onValueChange={onValueChange}>
          <SelectTrigger id="len">
            <SelectValue placeholder="Choose a length" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Lengths this mentor offers</SelectLabel>
              <SelectItem value="25">25 minutes · 45 USD</SelectItem>
              <SelectSeparator />
              <SelectItem value="50">50 minutes · 80 USD</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </>,
    );
    const trigger = screen.getByRole('combobox', { name: 'Session length' });
    expect(trigger.textContent).toContain('Choose a length');
    fireEvent.keyDown(trigger, { key: 'Enter' });
    fireEvent.click(screen.getByRole('option', { name: '50 minutes · 80 USD' }));
    expect(onValueChange).toHaveBeenCalledWith('50');
    expect(trigger.textContent).toContain('50 minutes · 80 USD');
  });
});

describe('RadioGroup', () => {
  it('selects exactly one slot', () => {
    render(
      <RadioGroup aria-label="Available slots, Tuesday 3 November">
        <RadioGroupItem value="0900" aria-label="09:00–09:25" />
        <RadioGroupItem value="1000" aria-label="10:00–10:25" />
      </RadioGroup>,
    );
    const second = screen.getByRole('radio', { name: '10:00–10:25' });
    fireEvent.click(second);
    expect(second.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: '09:00–09:25' }).getAttribute('aria-checked')).toBe('false');
  });
});

describe('Switch', () => {
  it('toggles and reports the new state', () => {
    const onCheckedChange = vi.fn();
    render(<Switch aria-label="Accept new bookings" onCheckedChange={onCheckedChange} />);
    const sw = screen.getByRole('switch', { name: 'Accept new bookings' });
    fireEvent.click(sw);
    expect(sw.getAttribute('aria-checked')).toBe('true');
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
});

describe('Card and Badge', () => {
  it('card title is a heading and a status badge always shows its text', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle as="h3">Booking DM-4821</CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant="success">Paid</Badge>
          <Badge>Awaiting mentor</Badge>
        </CardContent>
      </Card>,
    );
    expect(screen.getByRole('heading', { level: 3, name: 'Booking DM-4821' })).toBeTruthy();
    expect(screen.getByText('Paid').dataset.variant).toBe('success');
    expect(screen.getByText('Awaiting mentor').dataset.variant).toBe('neutral');
  });
});

describe('Avatar (photo only)', () => {
  class LoadingImage {
    onload: ((e: { currentTarget: unknown }) => void) | null = null;
    onerror: (() => void) | null = null;
    complete = false;
    naturalWidth = 0;
    set src(value: string) {
      setTimeout(() => {
        if (value.includes('broken')) this.onerror?.();
        else {
          this.complete = true;
          this.naturalWidth = 64;
          this.onload?.({ currentTarget: this });
        }
      });
    }
    addEventListener(type: string, cb: (e: { currentTarget: unknown }) => void) {
      if (type === 'load') this.onload = cb;
      else this.onerror = cb as () => void;
    }
    removeEventListener() {}
  }

  it('renders nothing without a photo', () => {
    const { container } = render(<Avatar alt="" src={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('shows the photo once loaded and stays hidden when it fails', async () => {
    vi.stubGlobal('Image', LoadingImage);
    render(
      <>
        <Avatar alt="Marta Kowalczyk" src="/photos/marta.jpg" size="lg" />
        <Avatar alt="Tomasz Nowak" src="/photos/broken.jpg" size="sm" />
      </>,
    );
    await act(() => new Promise((r) => setTimeout(r, 10)));
    expect(screen.getByRole('img', { name: 'Marta Kowalczyk' })).toBeTruthy();
    expect(screen.queryByRole('img', { name: 'Tomasz Nowak' })).toBeNull();
    const roots = document.querySelectorAll('[data-slot="avatar"]');
    expect([...roots].map((r) => (r as HTMLElement).dataset.status)).toEqual(['loaded', 'error']);
  });
});
