import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Shell } from './Shell';
import * as P from '../patterns/patterns.stories';
import { BookingRow } from '../../components/booking/BookingRow';
import { Button } from '../../components/ui/button';
import { EmptyState } from '../../backend/feedback/EmptyState';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { FormField } from '../../backend/forms/FormField';
import { Input } from '../../components/ui/input';
import { question } from '../fixtures';

// E03 Booking and payment. No spec yet — screens PROPOSED from the brief (R04, R05, R06, R07, R10, R12, R14).
const meta = { title: 'Design system/Epics/E03 Booking and payment', parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
type Story = StoryObj;
const r = (s: StoryObj) => (s.render as () => React.ReactElement)();

export const Checkout: Story = { name: 'Mentee · question and pay', render: () => <Shell role="mentee"><h1 className="text-2xl font-semibold">Book Marta Kowalczyk</h1>{r(P.BookAndPay)}</Shell> };
export const PaymentFailed: Story = {
  name: 'Mentee · payment failed',
  render: () => <Shell role="mentee"><Alert variant="danger"><AlertTitle>Payment did not go through</AlertTitle><AlertDescription>Your card was declined by the bank. The time is held for 10 minutes (PROPOSAL); try another card.</AlertDescription></Alert>{r(P.BookAndPay)}</Shell>,
};
export const MySessions: Story = {
  name: 'Mentee · my sessions',
  render: () => (
    <Shell role="mentee" current="My sessions">
      <h1 className="text-2xl font-semibold">My sessions</h1>
      <ul className="border-t border-border">
        <BookingRow counterpart="Marta Kowalczyk" question={question} when="Tue 27 Oct, 18:00 · 25 min" price="$45" status="confirmed" href="#" action={<Button variant="outline" size="sm">Reschedule</Button>} />
        <BookingRow counterpart="Tomasz Nowak" question="Terraform state lock" when="Thu 15 Oct, 20:00 · 25 min" price="$60" status="declined" href="#" />
      </ul>
    </Shell>
  ),
};
export const MySessionsEmpty: Story = {
  name: 'Mentee · my sessions — empty',
  render: () => <Shell role="mentee" current="My sessions"><h1 className="text-2xl font-semibold">My sessions</h1><EmptyState title="No sessions yet" description="Open a mentor's link or the catalogue to book your first 25-minute session." action={<Button asChild><a href="#">Browse mentors</a></Button>} /></Shell>,
};
export const MentorSessions: Story = {
  name: 'Mentor · sessions with decline',
  render: () => (
    <Shell role="mentor" current="Sessions">
      <h1 className="text-2xl font-semibold">Sessions</h1>
      <ul className="border-t border-border">
        <BookingRow counterpart="Jakub Lewandowski" question={question} when="Tue 27 Oct, 18:00 · 25 min" price="$45" status="confirmed" href="#" action={<Button variant="outline" size="sm">Decline question</Button>} />
      </ul>
    </Shell>
  ),
};
export const DeclineConfirm: Story = { name: 'Mentor · decline confirmation', render: () => <Shell role="mentor" current="Sessions">{r(P.ConfirmDecline)}</Shell> };
export const Payouts: Story = {
  name: 'Mentor · payouts after first booking (R07)',
  render: () => (
    <Shell role="mentor" current="Payouts">
      <h1 className="text-2xl font-semibold">Payouts</h1>
      <Alert variant="warning"><AlertTitle>Add payout details to get paid</AlertTitle><AlertDescription>You have a first booking. Earnings are paid weekly after held sessions (R14).</AlertDescription></Alert>
      <form className="grid max-w-sm gap-stack"><FormField label="Account holder" necessity="required"><Input /></FormField><div><Button>Continue to Stripe</Button></div></form>
    </Shell>
  ),
};
