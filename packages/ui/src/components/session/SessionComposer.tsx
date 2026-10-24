'use client';

import * as React from 'react';
import { cn } from 'cn';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';

// Composer stuck to the bottom of the session (R02.2): Enter sends, Shift+Enter makes a new line.
// After the session ends the composer is replaced by a sentence, not a disabled box without a reason.
export interface SessionComposerProps {
  onSend: (text: string) => void;
  /** True while a message is being sent — blocks double send. */
  sending?: boolean;
  /** When set, the session is over/not started and this text explains why nothing can be sent. */
  closedReason?: string;
  className?: string;
}

export function SessionComposer({ onSend, sending = false, closedReason, className }: SessionComposerProps) {
  const [text, setText] = React.useState('');
  const send = () => {
    const t = text.trim();
    if (!t || sending) return;
    onSend(t);
    setText('');
  };
  if (closedReason) {
    return (
      <p data-slot="session-composer" role="status" className={cn('sticky bottom-0 border-t border-border bg-background p-panel text-muted-foreground', className)}>
        {closedReason}
      </p>
    );
  }
  return (
    <form
      data-slot="session-composer"
      className={cn('sticky bottom-0 flex items-end gap-inline border-t border-border bg-background p-panel', className)}
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <label htmlFor="session-message" className="sr-only">
        Message
      </label>
      <Textarea
        id="session-message"
        rows={2}
        value={text}
        aria-describedby="session-message-hint"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            send();
          }
        }}
        className="flex-1"
      />
      <span id="session-message-hint" className="sr-only">
        Enter sends, Shift+Enter adds a new line.
      </span>
      <Button type="submit" disabled={sending || !text.trim()} aria-busy={sending || undefined}>
        {sending ? 'Sending…' : 'Send'}
      </Button>
    </form>
  );
}
