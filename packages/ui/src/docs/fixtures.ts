// Example data for stories (rule 7): invented but realistic, taken from the brief (beachhead TypeScript, React,
// Python, AI agents; 25/50-minute text sessions; price set by the mentor). No ratings, no customer counts.
import type { Mentor } from '../components/mentors/MentorCard';
import type { Slot } from '../components/booking/SlotList';

export const TZ = 'Europe/Warsaw';

export const mentors: Mentor[] = [
  {
    id: 'm1',
    name: 'Marta Kowalczyk',
    headline: 'Staff engineer, TypeScript compiler errors and monorepo builds',
    technologies: ['TypeScript', 'React', 'pnpm'],
    publicWorkUrl: 'https://github.com/example/ts-monorepo-notes',
    publicWorkLabel: 'github.com/example/ts-monorepo-notes',
    photoUrl: '/storybook-photos/marta.svg',
    priceLabel: '$45 / 25 min · $80 / 50 min',
    earliestStart: 'Tomorrow, 18:00',
  },
  {
    id: 'm2',
    name: 'Tomasz Nowak',
    headline: 'Platform engineer, Helm upgrades and Kubernetes ingress on staging',
    technologies: ['Kubernetes', 'Helm', 'Python'],
    publicWorkUrl: 'https://example.dev/talks/helm-rollbacks',
    publicWorkLabel: 'Talk: Helm rollbacks without panic',
    photoUrl: '/storybook-photos/tomasz.svg',
    priceLabel: '$60 / 25 min · $110 / 50 min',
    earliestStart: 'Fri 30 Oct, 07:30',
  },
  {
    id: 'm3',
    name: 'Aleksandra Wiśniewska-Zielińska',
    headline: 'Builds AI agents in Python for support teams; evaluation, tool calling and retrieval that does not hallucinate order numbers',
    technologies: ['Python', 'AI agents', 'LangGraph', 'PostgreSQL', 'pgvector', 'FastAPI'],
    publicWorkUrl: 'https://github.com/example/agent-evals',
    priceLabel: '$70 / 25 min · $130 / 50 min',
    earliestStart: undefined,
    photoUrl: null,
  },
];

export const slots: Slot[] = [
  { id: 's1', start: '2026-10-27T18:00:00+01:00', minutes: 25, price: '$45' },
  { id: 's2', start: '2026-10-27T18:30:00+01:00', minutes: 50, price: '$80' },
  { id: 's3', start: '2026-10-28T07:30:00+01:00', minutes: 25, price: '$45' },
  { id: 's4', start: '2026-10-29T20:00:00+01:00', minutes: 50, price: '$80' },
];

export const question =
  'After upgrading to TypeScript 5.9 our pnpm workspace fails with TS2742 "inferred type cannot be named" in packages/ui. Release is tomorrow.';
