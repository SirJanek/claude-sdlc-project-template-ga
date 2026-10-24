import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Shell } from './Shell';
import { FormField } from '../../backend/forms/FormField';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';

// E01 Accounts and roles. Screens from spec 2026-10-18-accounts-and-roles (branch spec/accounts-and-roles) and the brief (R07, R13, R15).
const meta = { title: 'Design system/Epics/E01 Accounts and roles', parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
type Story = StoryObj;

function SignUp({ who, error }: { who: 'mentor' | 'mentee'; error?: boolean }) {
  return (
    <Shell role="guest">
      <form className="grid max-w-sm gap-stack" noValidate>
        <h1 className="text-2xl font-semibold">{who === 'mentor' ? 'Create a mentor account' : 'Create an account to book'}</h1>
        {who === 'mentor' ? <p className="text-muted-foreground">Payout details come later, after your first booking (R07).</p> : <p className="text-muted-foreground">We verify your e-mail before you book (R13).</p>}
        <FormField label="E-mail" necessity="required" error={error ? 'This e-mail already has an account. Sign in instead.' : undefined}>
          <Input type="email" autoComplete="email" defaultValue={error ? 'jakub@example.com' : ''} />
        </FormField>
        <FormField label="Password" necessity="required" hint="At least 12 characters.">
          <Input type="password" autoComplete="new-password" />
        </FormField>
        <div><Button type="submit">Create account</Button></div>
      </form>
    </Shell>
  );
}
export const MentorSignUp: Story = { name: 'Mentor sign-up', render: () => <SignUp who="mentor" /> };
export const MenteeSignUp: Story = { name: 'Mentee sign-up', render: () => <SignUp who="mentee" /> };
export const SignUpError: Story = { name: 'Sign-up — e-mail taken', render: () => <SignUp who="mentee" error /> };
export const VerifyEmail: Story = {
  name: 'Check your e-mail',
  render: () => (
    <Shell role="guest">
      <div className="grid max-w-sm gap-stack">
        <h1 className="text-2xl font-semibold">Check your e-mail</h1>
        <Alert variant="neutral"><AlertTitle>Link sent to jakub@example.com</AlertTitle><AlertDescription>Open it to verify your account. Your chosen time is held for 15 minutes (PROPOSAL).</AlertDescription></Alert>
        <div><Button variant="outline">Send the link again</Button></div>
      </div>
    </Shell>
  ),
};
