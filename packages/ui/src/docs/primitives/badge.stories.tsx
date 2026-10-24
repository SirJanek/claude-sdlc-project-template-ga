import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';
import { Badge } from '../../components/ui/badge';
import { Narrow, StateMatrix } from '../../../.storybook/blocks/StateMatrix';

const meta = {
  title: 'Primitives/Badge',
  component: Badge,
  args: { children: 'Paid', variant: 'success' },
  argTypes: { variant: { control: 'select', options: ['neutral', 'success', 'danger', 'warning'] } },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

const statuses = [
  { variant: 'warning', label: 'Awaiting payment' },
  { variant: 'success', label: 'Paid' },
  { variant: 'success', label: 'Held' },
  { variant: 'success', label: 'Paid out' },
  { variant: 'danger', label: 'Declined' },
  { variant: 'danger', label: 'Refunded' },
  { variant: 'danger', label: 'No-show' },
  { variant: 'neutral', label: 'Mentor' },
] as const;

export const Statuses: Story = {
  name: 'Booking and payment statuses',
  render: () => (
    <ul className="flex flex-wrap gap-inline" aria-label="Statuses">
      {statuses.map((s) => (
        <li key={s.label}>
          <Badge variant={s.variant}>{s.label}</Badge>
        </li>
      ))}
    </ul>
  ),
};

export const InAListRow: Story = {
  name: 'In a list row',
  render: () => (
    <ul className="max-w-md">
      {[
        ['DM-4821', 'Tue 3 Nov, 09:00 · 25 min', 'success', 'Paid'],
        ['DM-4822', 'Wed 4 Nov, 18:30 · 50 min', 'warning', 'Awaiting payment'],
        ['DM-4790', 'Mon 26 Oct, 13:00 · 25 min', 'danger', 'Refunded'],
      ].map(([id, when, v, label]) => (
        <li key={id} className="flex h-control items-center justify-between gap-inline border-b border-border text-base">
          <span className="font-mono text-sm">{id}</span>
          <span className="text-muted-foreground">{when}</span>
          <Badge variant={v as 'success' | 'warning' | 'danger'}>{label}</Badge>
        </li>
      ))}
    </ul>
  ),
};

export const StateMatrixStory: Story = {
  name: 'State matrix',
  render: () => (
    <StateMatrix
      caption="A badge is not interactive: no hover, focus, pressed or disabled state. Each variant is a state of the booking, with its text."
      columns={['Short', 'Long']}
      rows={(['neutral', 'success', 'warning', 'danger'] as const).map((v) => ({
        label: v,
        cells: [
          <Badge key="s" variant={v}>
            {{ neutral: 'Mentor', success: 'Paid', warning: 'Awaiting payment', danger: 'Declined' }[v]}
          </Badge>,
          <Badge key="l" variant={v}>
            {
              {
                neutral: 'Not in catalogue',
                success: 'Paid out on 30 Oct',
                warning: 'Free cancellation ends in 12 h',
                danger: 'Refunded: mentor no-show',
              }[v]
            }
          </Badge>,
        ],
      }))}
    />
  ),
};

export const LongTextNarrowScreen: Story = {
  name: 'Long text and narrow screen (320 px)',
  render: () => (
    <Narrow>
      <div className="flex flex-wrap items-center gap-inline text-base">
        <span>Booking DM-4822</span>
        <Badge variant="warning">Free cancellation ends in 12 h</Badge>
      </div>
    </Narrow>
  ),
};

export const AdminPanel: Story = {
  name: 'Admin panel usage',
  render: () => (
    <div className="flex gap-inline">
      <Badge variant="neutral">admin</Badge>
      <Badge variant="success">Connected</Badge>
      <Badge variant="danger">Database unreachable</Badge>
    </div>
  ),
};

export const TextAlwaysPresent: Story = {
  name: 'Check: status is text, not only colour',
  render: () => <Badge variant="danger">Declined</Badge>,
  play: async ({ canvasElement }) => {
    const badge = within(canvasElement).getByText('Declined');
    await expect(badge.dataset.variant).toBe('danger');
    await expect(getComputedStyle(badge).fontSize).toBe('13px');
    await expect(getComputedStyle(badge).borderTopLeftRadius).toBe('9999px');
  },
};
