import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Shell } from './Shell';
import * as P from '../patterns/patterns.stories';
import { FormField } from '../../backend/forms/FormField';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';

// E02 Mentors become bookable. No spec yet — screens PROPOSED from the brief (R03, R08, R09, R11, D05, D06).
const meta = { title: 'Design system/Epics/E02 Mentors become bookable', parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
type Story = StoryObj;
const r = (s: StoryObj) => (s.render as () => React.ReactElement)();

export const EditProfile: Story = {
  name: 'Mentor · edit profile (PROPOSAL)',
  render: () => (
    <Shell role="mentor" current="Profile">
      <form className="grid max-w-sm gap-stack" noValidate>
        <h1 className="text-2xl font-semibold">Your profile</h1>
        <FormField label="Headline" necessity="required" hint="What you have done, in one line."><Input defaultValue="Staff engineer, TypeScript compiler errors and monorepo builds" /></FormField>
        <FormField label="Link to public work" necessity="required" hint="Repository, talk or article. Shown instead of ratings (R08)."><Input type="url" defaultValue="https://github.com/example/ts-monorepo-notes" /></FormField>
        <FormField label="About" necessity="optional"><Textarea rows={4} /></FormField>
        <div className="flex items-center gap-inline"><Switch id="cat" /><Label htmlFor="cat">List me in the catalogue (R09)</Label></div>
        <div><Button type="submit">Publish profile</Button></div>
      </form>
    </Shell>
  ),
};
export const Prices: Story = { name: 'Mentor · set prices', render: () => <Shell role="mentor" current="Profile">{r(P.FormEmpty)}</Shell> };
export const PublicProfile: Story = { name: 'Mentee · mentor page from link', render: () => <Shell role="mentee">{r(P.DetailDefault)}</Shell> };
export const PublicProfileMissing: Story = { name: 'Mentee · mentor page — not found', render: () => <Shell role="mentee">{r(P.DetailMissing)}</Shell> };
export const Catalogue: Story = { name: 'Mentee · catalogue', render: () => <Shell role="mentee">{r(P.ListResults)}</Shell> };
export const CatalogueNoResults: Story = { name: 'Mentee · catalogue — no results', render: () => <Shell role="mentee">{r(P.ListNoResults)}</Shell> };
export const CatalogueLoading: Story = { name: 'Mentee · catalogue — loading', render: () => <Shell role="mentee">{r(P.ListLoading)}</Shell> };
export const CatalogueError: Story = { name: 'Mentee · catalogue — error', render: () => <Shell role="mentee">{r(P.ListError)}</Shell> };
export const CatalogueEmpty: Story = { name: 'Mentee · catalogue — empty', render: () => <Shell role="mentee">{r(P.ListEmpty)}</Shell> };
