'use client';

import * as React from 'react';
import { cn } from 'cn';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';

// Slot list grouped by day (stage 0 decision 4: a list, no calendar; R01.1 dense rows split by thin lines).
// One RadioGroup for all days, so arrow keys move across days (WAI-ARIA radio group). Taken slots are not shown
// (PROPOSAL, batch 2 #9). Earliest start is the first row (R03, D05).
export interface Slot {
  id: string;
  /** ISO start, e.g. 2026-10-27T18:00:00+01:00 */
  start: string;
  /** 25 or 50 (R01) */
  minutes: 25 | 50;
  /** Price label already formatted, e.g. "$45" */
  price: string;
}

export interface SlotListProps {
  slots: Slot[];
  value?: string;
  onValueChange?: (id: string) => void;
  /** Visible name of the group, e.g. "Choose a time". */
  label?: string;
  /** IANA zone used for display, e.g. "Europe/Warsaw". */
  timeZone?: string;
  className?: string;
}

const dayFmt = (tz?: string) => new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'short', timeZone: tz });
const timeFmt = (tz?: string) => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz });

export function groupSlotsByDay(slots: Slot[], timeZone?: string) {
  const groups = new Map<string, Slot[]>();
  for (const s of [...slots].sort((a, b) => a.start.localeCompare(b.start))) {
    const key = dayFmt(timeZone).format(new Date(s.start));
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  return [...groups.entries()];
}

export function SlotList({ slots, value, onValueChange, label = 'Choose a time', timeZone, className }: SlotListProps) {
  const labelId = React.useId();
  const groups = groupSlotsByDay(slots, timeZone);
  return (
    <div data-slot="slot-list" className={cn('grid gap-stack', className)}>
      <p id={labelId} className="font-semibold">
        {label}
      </p>
      <RadioGroup aria-labelledby={labelId} value={value} onValueChange={onValueChange} className="gap-stack">
        {groups.map(([day, daySlots]) => (
          <div key={day} role="group" aria-label={day} className="grid">
            <p className="text-sm text-muted-foreground">{day}</p>
            <ul className="divide-y divide-border border-y border-border">
              {daySlots.map((s) => {
                const id = `slot-${s.id}`;
                return (
                  <li key={s.id} className="flex h-control items-center gap-inline px-list-row-x">
                    <RadioGroupItem id={id} value={s.id} />
                    <label htmlFor={id} className="flex flex-1 items-center justify-between gap-inline">
                      <span className="font-mono tabular-nums">{timeFmt(timeZone).format(new Date(s.start))}</span>
                      <span className="text-muted-foreground">{s.minutes} min</span>
                      <span className="tabular-nums">{s.price}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
