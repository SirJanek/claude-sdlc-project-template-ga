import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Shell } from './Shell';
import { SessionEntry } from '../../components/session/SessionEntry';
import { SessionComposer } from '../../components/session/SessionComposer';
import { question } from '../fixtures';

// E04 Text session (R01, R02, N01). Question panel stays next to the thread (R02.3). PROPOSED layout (no spec yet).
const meta = { title: 'Design system/Epics/E04 Text session', parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Room({ state }: { state: 'before' | 'live' | 'ended' }) {
  return (
    <Shell role="mentor" current="Sessions">
      <div className="grid gap-section md:grid-cols-3">
        <aside className="grid content-start gap-stack rounded-lg border border-border p-panel">
          <h2 className="font-semibold">Question</h2>
          <p>{question}</p>
          <p className="text-sm text-muted-foreground">Tue 27 Oct, 18:00–18:25 · 25 min</p>
        </aside>
        <section aria-label="Conversation" className="flex min-h-96 flex-col rounded-lg border border-border md:col-span-2">
          <div className="grid flex-1 content-start gap-thread-gap p-panel">
            {state === 'before' ? <p className="text-muted-foreground">The session starts at 18:00. You can read the question now.</p> : (
              <>
                <SessionEntry author="Jakub Lewandowski" role="Mentee" time="18:01">I pasted the error above. Release is tomorrow.</SessionEntry>
                <SessionEntry author="Marta Kowalczyk" role="Mentor" time="18:03">Add an explicit return type to createTheme in packages/ui/src/theme.ts.</SessionEntry>
              </>
            )}
          </div>
          <SessionComposer onSend={() => {}} closedReason={state === 'before' ? 'Writing opens at 18:00.' : state === 'ended' ? 'The session ended at 18:25. The conversation stays here, visible only to you two.' : undefined} />
        </section>
      </div>
    </Shell>
  );
}
export const Before: Story = { name: 'Before start', render: () => <Room state="before" /> };
export const Live: Story = { name: 'Live', render: () => <Room state="live" /> };
export const Ended: Story = { name: 'Ended', render: () => <Room state="ended" /> };
