import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { FormField } from '../../backend/forms/FormField';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '../../components/ui/alert-dialog';
import { EmptyState } from '../../backend/feedback/EmptyState';
import { ErrorState } from '../../backend/feedback/ErrorMessage';
import { MentorCard } from '../../components/mentors/MentorCard';
import { SlotList } from '../../components/booking/SlotList';
import { PriceSummary } from '../../components/booking/PriceSummary';
import { mentors, slots, TZ, question } from '../fixtures';

const meta = { title: 'Patterns/All patterns', parameters: { layout: 'padded' } } satisfies Meta;
export default meta;
type Story = StoryObj;

/* ---------------- Form: "Set your prices" (E02-S02) ----------------
   Label always visible, validate on blur and on submit, focus first error after failed submit, values kept,
   double submit blocked, success only after the server confirms. API outcomes are simulated in the story
   (PROPOSAL: a fake async call instead of MSW handlers — faster, same states). */
type Outcome = 'success' | 'pending' | 'field-error' | 'server-error' | 'offline';

function PricesForm({ outcome, initial }: { outcome: Outcome; initial?: { p25: string; p50: string } }) {
  const [v, setV] = React.useState(initial ?? { p25: '', p50: '' });
  const [errors, setErrors] = React.useState<Partial<Record<'p25' | 'p50', string>>>({});
  const [state, setState] = React.useState<'idle' | 'sending' | 'saved' | 'server' | 'offline'>('idle');
  const ref25 = React.useRef<HTMLInputElement>(null);
  const ref50 = React.useRef<HTMLInputElement>(null);
  const check = (k: 'p25' | 'p50', val: string) => {
    const n = Number(val);
    return !val ? 'Enter a price in USD.' : !Number.isInteger(n) || n < 20 || n > 300 ? 'Use a whole number between 20 and 300.' : undefined;
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (state === 'sending') return;
    const next = { p25: check('p25', v.p25), p50: check('p50', v.p50) };
    setErrors(next);
    if (next.p25) return ref25.current?.focus();
    if (next.p50) return ref50.current?.focus();
    setState('sending');
    if (outcome === 'pending') return;
    setTimeout(() => {
      if (outcome === 'success') setState('saved');
      else if (outcome === 'field-error') {
        setState('idle');
        setErrors({ p50: 'The 50-minute price must be higher than the 25-minute price.' });
        ref50.current?.focus();
      } else setState(outcome === 'offline' ? 'offline' : 'server');
    }, 600);
  };
  return (
    <form noValidate onSubmit={submit} className="grid max-w-sm gap-stack">
      <h2 className="text-lg font-semibold">Set your prices</h2>
      {state === 'server' ? (
        <Alert variant="danger"><AlertTitle>Prices were not saved</AlertTitle><AlertDescription>The server returned an error. Your values are kept. Try again in a minute.</AlertDescription></Alert>
      ) : null}
      {state === 'offline' ? (
        <Alert variant="danger"><AlertTitle>No connection</AlertTitle><AlertDescription>Check your network and press Save prices again. Nothing was lost.</AlertDescription></Alert>
      ) : null}
      {state === 'saved' ? <Alert variant="success"><AlertTitle>Prices saved</AlertTitle><AlertDescription>New bookings use these prices.</AlertDescription></Alert> : null}
      <FormField label="25-minute session" hint="Whole USD, between 20 and 300." error={errors.p25} necessity="required">
        <Input ref={ref25} inputMode="numeric" placeholder="45" value={v.p25} onChange={(e) => setV({ ...v, p25: e.target.value })} onBlur={(e) => setErrors((x) => ({ ...x, p25: check('p25', e.target.value) }))} />
      </FormField>
      <FormField label="50-minute session" hint="Whole USD, between 20 and 300." error={errors.p50} necessity="required">
        <Input ref={ref50} inputMode="numeric" placeholder="80" value={v.p50} onChange={(e) => setV({ ...v, p50: e.target.value })} onBlur={(e) => setErrors((x) => ({ ...x, p50: check('p50', e.target.value) }))} />
      </FormField>
      <div><Button type="submit" disabled={state === 'sending'} aria-busy={state === 'sending' || undefined}>{state === 'sending' ? 'Saving…' : 'Save prices'}</Button></div>
    </form>
  );
}
export const FormEmpty: Story = { name: 'Form · empty', render: () => <PricesForm outcome="success" /> };
export const FormSuccess: Story = { name: 'Form · API success', render: () => <PricesForm outcome="success" initial={{ p25: '45', p50: '80' }} /> };
export const FormPending: Story = { name: 'Form · API pending (double submit blocked)', render: () => <PricesForm outcome="pending" initial={{ p25: '45', p50: '80' }} /> };
export const FormFieldError: Story = { name: 'Form · API field error', render: () => <PricesForm outcome="field-error" initial={{ p25: '45', p50: '40' }} /> };
export const FormServerError: Story = { name: 'Form · API server error', render: () => <PricesForm outcome="server-error" initial={{ p25: '45', p50: '80' }} /> };
export const FormOffline: Story = { name: 'Form · no network', render: () => <PricesForm outcome="offline" initial={{ p25: '45', p50: '80' }} /> };

/* ---------------- List with filters: catalogue (E02-S04) ---------------- */
type ListState = 'results' | 'no-results' | 'empty' | 'loading' | 'error' | 'many';
function Catalogue({ state, initialTech = '' }: { state: ListState; initialTech?: string }) {
  const [tech, setTech] = React.useState(initialTech);
  const all = state === 'many' ? Array.from({ length: 4 }, () => mentors).flat().map((m, i) => ({ ...m, id: `${m.id}-${i}` })) : mentors;
  const shown = state === 'no-results' ? [] : all.filter((m) => !tech || m.technologies.includes(tech));
  return (
    <section className="grid max-w-content gap-stack" aria-labelledby="cat-h">
      <h2 id="cat-h" className="text-lg font-semibold">Mentors</h2>
      {state !== 'empty' ? (
        <div className="flex flex-wrap items-end gap-inline">
          <div className="grid gap-inline">
            <label id="tech-l" className="font-medium">Technology</label>
            <Select value={tech || 'all'} onValueChange={(x) => setTech(x === 'all' ? '' : x)}>
              <SelectTrigger aria-labelledby="tech-l" className="w-field-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['all', 'TypeScript', 'React', 'Python', 'Kubernetes', 'AI agents'].map((t) => <SelectItem key={t} value={t}>{t === 'all' ? 'All technologies' : t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {tech ? <Button variant="ghost" size="sm" onClick={() => setTech('')} aria-label={`Remove filter ${tech}`}>{tech} ×</Button> : null}
          <p role="status" className="ml-auto text-sm text-muted-foreground">{state === 'loading' || state === 'error' ? '' : `${shown.length} mentors`}</p>
        </div>
      ) : null}
      {state === 'loading' ? <div aria-busy="true" aria-label="Loading mentors" className="grid gap-stack">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div> : null}
      {state === 'error' ? <ErrorState title="Mentors did not load" message="The catalogue is unavailable right now. Try again; links shared by mentors still work." onRetry={() => {}} /> : null}
      {state === 'empty' ? <EmptyState title="No mentors in the catalogue yet" description="Mentors appear here only after they choose to join it (R09). Ask your mentor for their link." /> : null}
      {state === 'no-results' || (state !== 'loading' && state !== 'error' && state !== 'empty' && shown.length === 0) ? (
        <EmptyState title={`No mentors for ${tech || 'these filters'}`} description="Remove the filter to see every mentor." action={<Button variant="outline" onClick={() => setTech('')}>Clear filters</Button>} />
      ) : null}
      {['results', 'many'].includes(state) && shown.length ? <div className="border-t border-border">{shown.map((m) => <MentorCard key={m.id} mentor={m} href="#" />)}</div> : null}
    </section>
  );
}
export const ListResults: Story = { name: 'List with filters · results', render: () => <Catalogue state="results" /> };
export const ListFiltered: Story = { name: 'List with filters · active filter', render: () => <Catalogue state="results" initialTech="Python" /> };
export const ListNoResults: Story = { name: 'List with filters · no results for filters', render: () => <Catalogue state="no-results" initialTech="React" /> };
export const ListEmpty: Story = { name: 'List with filters · nothing here yet', render: () => <Catalogue state="empty" /> };
export const ListLoading: Story = { name: 'List with filters · loading', render: () => <Catalogue state="loading" /> };
export const ListError: Story = { name: 'List with filters · error', render: () => <Catalogue state="error" /> };
export const ListMany: Story = { name: 'List with filters · many results', render: () => <Catalogue state="many" /> };

/* ---------------- Detail view: mentor profile (E02-S03) ---------------- */
function Profile({ missing }: { missing?: boolean }) {
  const [slot, setSlot] = React.useState<string>();
  const m = mentors[0]!;
  if (missing)
    return <EmptyState title="This mentor page does not exist" description="The link may be old, or the mentor unpublished the profile. Check the link with the person who sent it." action={<Button variant="outline" asChild><a href="#">Browse the catalogue</a></Button>} />;
  return (
    <div className="grid max-w-content gap-section md:grid-cols-2">
      <div className="grid content-start gap-stack">
        <h1 className="text-2xl font-semibold">{m.name}</h1>
        <p>{m.headline}</p>
        <p className="text-sm">Price: <span className="tabular-nums">{m.priceLabel}</span> · Earliest start: {m.earliestStart}</p>
        <a className="w-fit underline underline-offset-2" href={m.publicWorkUrl}>{m.publicWorkLabel}</a>
      </div>
      <div className="grid content-start gap-stack">
        <SlotList slots={slots} value={slot} onValueChange={setSlot} timeZone={TZ} />
        <div><Button disabled={!slot}>Book this time</Button></div>
        {!slot ? <p className="text-sm text-muted-foreground">Choose a time to continue.</p> : null}
      </div>
    </div>
  );
}
export const DetailDefault: Story = { name: 'Detail view · mentor profile', render: () => <Profile /> };
export const DetailMissing: Story = { name: 'Detail view · does not exist or no access', render: () => <Profile missing /> };

/* ---------------- Destructive confirmation: decline a question (E03-S02) ---------------- */
export const ConfirmDecline: Story = {
  name: 'Destructive confirmation · decline question',
  render: () => (
    <AlertDialog defaultOpen>
      <AlertDialogTrigger asChild><Button variant="outline">Decline question</Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Decline Jakub's question?</AlertDialogTitle>
          <AlertDialogDescription>“{question.slice(0, 70)}…” Jakub gets a full refund of $45 (R12). This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep booking</AlertDialogCancel>
          <AlertDialogAction>Decline question</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

/* ---------------- Key backlog pattern: book and pay (E03-S01) ---------------- */
export const BookAndPay: Story = {
  name: 'Booking · question + price summary before pay',
  render: () => (
    <div className="grid max-w-sm gap-stack">
      <FormField label="Your question" hint="What you tried and what you expect. The mentor reads it before the session (R05)." necessity="required">
        <Textarea rows={5} defaultValue={question} />
      </FormField>
      <PriceSummary mentorName="Marta Kowalczyk" when="Tue 27 Oct, 18:00" minutes={25} total="$45" freeCancellationUntil="Tue 27 Oct, 06:00" />
      <div><Button>Pay $45</Button></div>
      <p className="text-sm text-muted-foreground">Payment by card through Stripe (R04). The booking is confirmed when the payment succeeds.</p>
    </div>
  ),
};
export const StatusOnlyWithText: Story = {
  name: 'Status · always text, colour second',
  render: () => <div className="flex gap-inline"><Badge variant="success">Paid</Badge><Badge variant="warning">Awaiting payment</Badge><Badge variant="danger">Declined · refunded</Badge><Badge variant="neutral">Cancelled</Badge></div>,
};
