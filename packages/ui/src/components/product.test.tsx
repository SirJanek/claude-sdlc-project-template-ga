import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import * as ui from '../index';
import { BookingRow } from './booking/BookingRow';
import { PriceSummary } from './booking/PriceSummary';
import { SlotList } from './booking/SlotList';
import { MentorCard, type Mentor } from './mentors/MentorCard';
import { SessionComposer } from './session/SessionComposer';
import { SessionEntry } from './session/SessionEntry';
import { RowAction } from '../backend/feedback/RowAction';
import { FilterBar, resultCount } from '../backend/filters/FilterBar';
import { PageHeader } from '../backend/layout/PageHeader';

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
});
afterEach(cleanup);

const anna: Mentor = {
  id: '1',
  name: 'Anna Kowalska',
  headline: 'Senior React dev',
  technologies: ['React', 'TypeScript'],
  publicWorkUrl: 'https://github.com/anna',
  priceLabel: '$45 / 25 min',
  earliestStart: 'Tomorrow, 18:00',
};

describe('index exports', () => {
  it('exposes the product and panel components', () => {
    expect(ui.MentorCard).toBe(MentorCard);
    expect(ui.RowAction).toBe(RowAction);
    expect(typeof ui.Dialog).toBe('function');
  });
});

describe('BookingRow and PriceSummary', () => {
  it('shows question, status label and optional link', () => {
    render(
      <ul>
        <BookingRow counterpart="Anna" question="Hooks?" when="Tue" price="$45" status="confirmed" href="/b/1" />
        <BookingRow counterpart="Jan" question="Tests?" when="Wed" price="$45" status="cancelled" action={<b>x</b>} />
      </ul>,
    );
    expect(screen.getByRole('link', { name: 'Hooks?' }).getAttribute('href')).toBe('/b/1');
    expect(screen.getByText('Paid')).toBeTruthy();
    expect(screen.getByText('Cancelled')).toBeTruthy();
  });

  it('price summary states total and cancellation rule', () => {
    render(<PriceSummary mentorName="Anna" when="Tue" minutes={25} total="$45" freeCancellationUntil="Tue 06:00" />);
    expect(screen.getByRole('region', { name: 'Price summary' }).textContent).toContain('$45');
    expect(screen.getByText(/until Tue 06:00/)).toBeTruthy();
  });
});

describe('SlotList', () => {
  it('groups slots by day and picks one', () => {
    const onValueChange = vi.fn();
    render(
      <SlotList
        timeZone="UTC"
        onValueChange={onValueChange}
        slots={[
          { id: 'b', start: '2026-10-28T09:00:00Z', minutes: 50, price: '$80' },
          { id: 'a', start: '2026-10-27T18:00:00Z', minutes: 25, price: '$45' },
          { id: 'c', start: '2026-10-27T19:00:00Z', minutes: 25, price: '$45' },
        ]}
      />,
    );
    expect(screen.getAllByRole('group')).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('radio')[0]!);
    expect(onValueChange).toHaveBeenCalledWith('a');
  });
});

describe('MentorCard', () => {
  it('full card with link, price, earliest start and public work', () => {
    render(<MentorCard mentor={anna} href="/m/1" action={<button>Save</button>} busy />);
    expect(screen.getByRole('link', { name: 'Anna Kowalska' }).getAttribute('href')).toBe('/m/1');
    expect(screen.getByText('Earliest start: Tomorrow, 18:00')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Public work' })).toBeTruthy();
    expect(screen.getByRole('article').getAttribute('aria-busy')).toBe('true');
  });

  it('no slots badge, hidden badge, compact and unavailable variants', () => {
    const bare: Mentor = { id: '2', name: 'Jan', headline: 'Dev', technologies: [] };
    render(
      <>
        <MentorCard mentor={bare} />
        <MentorCard mentor={{ ...bare, name: 'Ola' }} hideNoSlotsBadge />
        <MentorCard mentor={{ ...anna, publicWorkLabel: 'Blog' }} variant="compact" />
        <MentorCard mentor={anna} href="/m/1" unavailable />
      </>,
    );
    expect(screen.getAllByText('No slots yet')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Blog' })).toBeTruthy();
    expect(screen.getByText('No longer available')).toBeTruthy();
  });
});

describe('Session', () => {
  it('entry shows author, role and time', () => {
    render(
      <SessionEntry author="Anna" role="Mentor" time="18:04">
        Hi
      </SessionEntry>,
    );
    expect(screen.getByText('Mentor')).toBeTruthy();
    expect(screen.getByText('18:04')).toBeTruthy();
  });

  it('entry without role', () => {
    render(
      <SessionEntry author="Jan" time="18:05">
        Yo
      </SessionEntry>,
    );
    expect(screen.queryByText('Mentor')).toBeNull();
  });

  it('composer sends on Enter and button, not on Shift+Enter or empty', () => {
    const onSend = vi.fn();
    render(<SessionComposer onSend={onSend} />);
    const box = screen.getByLabelText('Message');
    fireEvent.keyDown(box, { key: 'Enter' });
    fireEvent.change(box, { target: { value: ' hello ' } });
    fireEvent.keyDown(box, { key: 'Enter', shiftKey: true });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onSend).toHaveBeenCalledWith('hello');
    fireEvent.change(box, { target: { value: 'again' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(onSend).toHaveBeenCalledTimes(2);
  });

  it('composer while sending and when closed', () => {
    const onSend = vi.fn();
    const { rerender } = render(<SessionComposer onSend={onSend} sending />);
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'x' } });
    fireEvent.keyDown(screen.getByLabelText('Message'), { key: 'Enter' });
    expect(onSend).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Sending…' }).hasAttribute('disabled')).toBe(true);
    rerender(<SessionComposer onSend={onSend} closedReason="Session ended" />);
    expect(screen.getByRole('status').textContent).toContain('Session ended');
  });
});

describe('RowAction', () => {
  it('idle, pending and error states', () => {
    const onAction = vi.fn();
    const props = { label: 'Remove', pendingLabel: 'Removing…', accessibleName: 'Remove Anna', onAction };
    const { rerender } = render(<RowAction {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Anna' }));
    expect(onAction).toHaveBeenCalled();
    rerender(<RowAction {...props} state="pending" />);
    expect(screen.getByRole('button', { name: 'Removing…' }).hasAttribute('disabled')).toBe(true);
    rerender(<RowAction {...props} state="error" />);
    expect(screen.getByRole('button', { name: 'Try again: Remove Anna' })).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('Did not work. Try again.');
  });
});

describe('FilterBar and PageHeader', () => {
  it('removes a chip and shows the count', () => {
    const onRemove = vi.fn();
    render(<FilterBar active={[{ id: 'py', label: 'Python' }]} onRemove={onRemove} count="2 of 3 mentors" />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove filter Python' }));
    expect(onRemove).toHaveBeenCalledWith('py');
    expect(screen.getByRole('status').textContent).toContain('2 of 3 mentors');
  });

  it('empty bar and result count copy', () => {
    render(<FilterBar active={[{ id: 'x', label: 'X' }]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove filter X' }));
    cleanup();
    render(<FilterBar />);
    expect(screen.queryByRole('list')).toBeNull();
    expect(resultCount(3, 3, 'mentors')).toBe('3 mentors');
    expect(resultCount(2, 3, 'mentors')).toBe('2 of 3 mentors');
    expect(resultCount(2, 3, 'mentors', true)).toBe('');
  });

  it('page header with and without extras', () => {
    render(<PageHeader title="Mentors" description="Find help" actions={<button>Add</button>} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Mentors' })).toBeTruthy();
    expect(screen.getByText('Find help')).toBeTruthy();
    cleanup();
    render(<PageHeader title="Plain" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
