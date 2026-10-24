import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PageHeader } from '../../backend/layout/PageHeader';
import { FilterBar, resultCount } from '../../backend/filters/FilterBar';
import { RowAction, type RowActionState } from '../../backend/feedback/RowAction';
import { MentorCard } from '../../components/mentors/MentorCard';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { mentors } from '../fixtures';

// Gaps closed after agent test 1: PageHeader, FilterBar + chips, RowAction states, MentorCard compact / unavailable.
const meta = { title: 'Patterns/Screen building blocks', parameters: { layout: 'padded' } } satisfies Meta;
export default meta;
type Story = StoryObj;

const wrap = (n: React.ReactNode) => <div className="grid max-w-content gap-stack">{n}</div>;

export const PageHeaderTitleOnly: Story = { name: 'PageHeader · title only', render: () => wrap(<PageHeader title="Favourite mentors" />) };
export const PageHeaderFull: Story = {
  name: 'PageHeader · description + action',
  render: () => wrap(<PageHeader title="My sessions" description="Upcoming and past sessions with your mentors." actions={<Button asChild><a href="#">Find a mentor</a></Button>} />),
};
export const PageHeaderLong: Story = {
  name: 'PageHeader · long title (320 px)',
  globals: { viewport: { value: 'mobile320', isRotated: false } },
  render: () => wrap(<PageHeader title="Payout details for sessions completed in October and November" description="Payouts go out on the 1st and 15th." />),
};

function Filters({ loading }: { loading?: boolean }) {
  const [tech, setTech] = React.useState('Python');
  return wrap(
    <FilterBar active={tech ? [{ id: tech, label: tech }] : []} onRemove={() => setTech('')} count={resultCount(tech ? 2 : 3, 3, 'saved mentors', loading)}>
      <div className="grid gap-inline">
        <label id="fb-tech" className="font-medium">Technology</label>
        <Select value={tech || 'all'} onValueChange={(x) => setTech(x === 'all' ? '' : x)}>
          <SelectTrigger aria-labelledby="fb-tech" className="w-field-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['all', 'TypeScript', 'React', 'Python'].map((t) => <SelectItem key={t} value={t}>{t === 'all' ? 'All technologies' : t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </FilterBar>,
  );
}
export const FilterBarActive: Story = { name: 'FilterBar · active chip + count', render: () => <Filters /> };
export const FilterBarLoading: Story = { name: 'FilterBar · loading (enabled, empty count)', render: () => <Filters loading /> };

const row = (state: RowActionState) =>
  wrap(
    <MentorCard
      mentor={mentors[0]!}
      href="#"
      variant="compact"
      busy={state === 'pending'}
      action={<RowAction label="Remove" pendingLabel="Removing…" accessibleName={`Remove ${mentors[0]!.name} from favourites`} state={state} errorMessage="Not removed. Check your connection and try again." onAction={() => {}} />}
    />,
  );
export const RowIdle: Story = { name: 'Row action · idle', render: () => row('idle') };
export const RowPending: Story = { name: 'Row action · in progress', render: () => row('pending') };
export const RowError: Story = { name: 'Row action · failed (inline + retry)', render: () => row('error') };

export const CompactCard: Story = { name: 'MentorCard · compact (no price, no slot)', render: () => wrap(<MentorCard mentor={mentors[0]!} href="#" variant="compact" />) };
export const HiddenBadge: Story = { name: 'MentorCard · full, no slots badge hidden', render: () => wrap(<MentorCard mentor={{ ...mentors[0]!, earliestStart: undefined }} href="#" hideNoSlotsBadge />) };
export const Unavailable: Story = {
  name: 'MentorCard · saved, no longer available',
  render: () => wrap(<MentorCard mentor={mentors[1]!} href="#" variant="compact" unavailable action={<RowAction label="Remove" pendingLabel="Removing…" accessibleName={`Remove ${mentors[1]!.name} from favourites`} onAction={() => {}} />} />),
};
export const RowMobile: Story = { name: 'Row action · 320 px', globals: { viewport: { value: 'mobile320', isRotated: false } }, render: () => row('idle') };
