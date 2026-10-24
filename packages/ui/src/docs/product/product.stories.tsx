import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SlotList } from '../../components/booking/SlotList';
import { MentorCard } from '../../components/mentors/MentorCard';
import { BookingRow } from '../../components/booking/BookingRow';
import { PriceSummary } from '../../components/booking/PriceSummary';
import { SessionEntry } from '../../components/session/SessionEntry';
import { SessionComposer } from '../../components/session/SessionComposer';
import { Skeleton } from '../../components/ui/skeleton';
import { Button } from '../../components/ui/button';
import { EmptyState } from '../../backend/feedback/EmptyState';
import { ErrorState } from '../../backend/feedback/ErrorMessage';
import { mentors, slots, question, TZ } from '../fixtures';

// Product components grouped by epic (stage 3). Each has data states: loading, empty, error, partial, many, long.
const meta = { title: 'Product/All product components', parameters: { layout: 'padded' } } satisfies Meta;
export default meta;
type Story = StoryObj;

const wrap = (n: React.ReactNode) => <div className="max-w-content">{n}</div>;

// ---- E02 Mentors become bookable: MentorCard
export const E02MentorCard: Story = { name: 'E02 · Mentor card', render: () => wrap(<MentorCard mentor={mentors[0]!} href="#" />) };
export const E02MentorCardPartial: Story = {
  name: 'E02 · Mentor card — partial data (no photo, no slots)',
  render: () => wrap(<MentorCard mentor={mentors[2]!} href="#" />),
};
export const E02MentorCardMany: Story = {
  name: 'E02 · Mentor card — list, long texts',
  render: () => wrap(<div>{mentors.map((m) => <MentorCard key={m.id} mentor={m} href="#" />)}</div>),
};
export const E02MentorCardLoading: Story = {
  name: 'E02 · Mentor card — loading',
  render: () =>
    wrap(
      <div role="status" aria-busy="true" aria-label="Loading mentors" className="grid gap-stack">
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-inline"><Skeleton className="size-10 rounded-full" /><div className="grid flex-1 gap-1"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-2/3" /></div></div>
        ))}
      </div>,
    ),
};

// ---- E03 Booking: SlotList
export const E03SlotList: Story = {
  name: 'E03 · Slot list grouped by day',
  render: () => {
    const [v, setV] = React.useState<string>();
    return wrap(<SlotList slots={slots} value={v} onValueChange={setV} timeZone={TZ} />);
  },
};
export const E03SlotListEmpty: Story = {
  name: 'E03 · Slot list — empty',
  render: () => wrap(<EmptyState title="No free times this week" description="Marta has not published slots after Friday. Check again tomorrow or open another mentor from the catalogue." />),
};
export const E03SlotListError: Story = {
  name: 'E03 · Slot list — error',
  render: () => wrap(<ErrorState title="Times did not load" message="We could not reach the server. Your question is kept. Try again." onRetry={() => {}} />),
};
export const E03SlotListMany: Story = {
  name: 'E03 · Slot list — many slots',
  render: () =>
    wrap(
      <SlotList
        timeZone={TZ}
        slots={Array.from({ length: 14 }, (_, i) => ({ id: `x${i}`, start: new Date(Date.UTC(2026, 9, 27 + Math.floor(i / 3), 7 + (i % 3) * 5)).toISOString(), minutes: (i % 2 ? 50 : 25) as 25 | 50, price: i % 2 ? '$80' : '$45' }))}
      />,
    ),
};

// ---- E03: BookingRow and PriceSummary
export const E03BookingRows: Story = {
  name: 'E03 · Booking rows — every status',
  render: () =>
    wrap(
      <ul className="border-t border-border">
        <BookingRow counterpart="Marta Kowalczyk" question={question} when="Tue 27 Oct, 18:00 · 25 min" price="$45" status="confirmed" href="#" />
        <BookingRow counterpart="Tomasz Nowak" question="Helm upgrade broke staging ingress" when="Fri 30 Oct, 07:30 · 50 min" price="$110" status="awaiting-payment" href="#" />
        <BookingRow counterpart="Marta Kowalczyk" question="Vitest browser mode with Playwright" when="Mon 19 Oct, 18:00 · 25 min" price="$45" status="held" href="#" />
        <BookingRow counterpart="Tomasz Nowak" question="Terraform state lock" when="Thu 15 Oct, 20:00 · 25 min" price="$60" status="declined" href="#" />
        <BookingRow counterpart="Marta Kowalczyk" question="React 19 hydration error" when="Wed 14 Oct, 18:00 · 25 min" price="$45" status="no-show-mentor" href="#" />
        <BookingRow counterpart="Marta Kowalczyk" question="ESLint flat config" when="Tue 13 Oct, 18:00 · 25 min" price="$45" status="cancelled" href="#" />
      </ul>,
    ),
};
export const E03PriceSummary: Story = {
  name: 'E03 · Price summary',
  render: () => <div className="max-w-sm"><PriceSummary mentorName="Marta Kowalczyk" when="Tue 27 Oct, 18:00" minutes={25} total="$45" freeCancellationUntil="Tue 27 Oct, 06:00" /></div>,
};

// ---- E04 Text session: SessionEntry + SessionComposer
export const E04SessionThread: Story = {
  name: 'E04 · Session entries + composer',
  render: () => (
    <div className="flex h-96 max-w-content flex-col border border-border">
      <div role="region" aria-label="Session thread" tabIndex={0} className="grid flex-1 content-start gap-thread-gap overflow-y-auto p-panel">
        <SessionEntry author="Jakub Lewandowski" role="Mentee" time="18:01">{question}</SessionEntry>
        <SessionEntry author="Marta Kowalczyk" role="Mentor" time="18:03">
          Paste the tsconfig of packages/ui, please.
        </SessionEntry>
        <SessionEntry author="Jakub Lewandowski" role="Mentee" time="18:04">
          <pre><code>{'{\n  "compilerOptions": { "declaration": true, "composite": true }\n}'}</code></pre>
        </SessionEntry>
      </div>
      <SessionComposer onSend={() => {}} />
    </div>
  ),
};
export const E04ComposerSending: Story = { name: 'E04 · Composer — sending', render: () => <SessionComposer onSend={() => {}} sending /> };
export const E04ComposerClosed: Story = {
  name: 'E04 · Composer — session ended',
  render: () => <SessionComposer onSend={() => {}} closedReason="The session ended at 18:25. The conversation stays here for both of you." />,
};
export const E04EntryLong: Story = {
  name: 'E04 · Entry — long text and long words',
  render: () => wrap(<SessionEntry author="Aleksandra Wiśniewska-Zielińska" role="Mentor" time="18:12">{'Error: Cannot find module @mentorhub/ui/components/booking/SlotListWithAVeryLongNameThatDoesNotBreak '.repeat(3)}</SessionEntry>),
};
export const E04ActionInRow: Story = {
  name: 'E02 · Mentor card with action',
  render: () => wrap(<MentorCard mentor={mentors[1]!} href="#" action={<Button variant="outline" size="sm">Book</Button>} />),
};
