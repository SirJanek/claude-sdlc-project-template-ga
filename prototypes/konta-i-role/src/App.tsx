import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { ExistingAccountNotice } from '@ui/components/auth/ExistingAccountNotice';
import { SlotList } from '@ui/components/booking/SlotList';
import { MentorCard } from '@ui/components/mentors/MentorCard';
import { EmptyState } from '@ui/backend/feedback/EmptyState';
import { DataTable } from '@ui/backend/tables/DataTable';
import { FormField } from '@ui/backend/forms/FormField';
import { PageHeader } from '@ui/backend/layout/PageHeader';
import { Alert, AlertDescription } from '@ui/components/ui/alert';
import { Badge } from '@ui/components/ui/badge';
import { Button } from '@ui/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/components/ui/card';
import { Input } from '@ui/components/ui/input';
import { Skeleton } from '@ui/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@ui/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ui/components/ui/dropdown-menu';
import {
  ACCOUNTS,
  DEFAULT_CONTROLS,
  NOTES,
  DEMO_NEW_MENTOR,
  ERROR_TEXT,
  EXISTING_NOTICE_TEXT,
  MENTOR,
  SESSION_ENDED,
  SLOTS,
  SLOT_NEXT_BASE,
  isSafeNext,
  isValidEmail,
  slotFromNext,
  type Account,
  type Controls,
  type Existing,
  type Role,
} from './data';

/*
 * Epic E01 prototype (stage 2): all screens s01–s14, demo accounts, scenario controls T01–T12 (+ L12, L20).
 * Screen ids come from lekcja-07/mapa-ekranow.md and do not change. Decisions L01–L20 are all "A".
 * Simulations: s05 (mailbox), s07 (GitHub page), the e-mail and sign-in flows. No real services, no real data.
 * Design-system gaps are marked "LUKA DSxx" in the code. Review engine: ./review/ (do not edit).
 */

type Ctx = {
  next?: string; // return path after sign-in (S02-AC1, F4)
  from?: string; // screen that opened GitHub (s02 or s03; L14)
  intent?: 'mentee' | 'mentor';
  notice?: 'existing';
  error?: string; // key of ERROR_TEXT
};
type Notice = Ctx['notice'];

const SCREENS = ['s01', 's02', 's03', 's04', 's05', 's06', 's07', 's08', 's09', 's10', 's11', 's12', 's13', 's14'];
const TITLES: Record<string, string> = {
  s01: 'Home',
  s02: 'Sign in',
  s03: 'Set up your mentor profile (sign-up)',
  s04: 'Check your inbox',
  s05: 'Sign-in e-mail (simulated)',
  s06: 'Confirm sign-in',
  s07: 'GitHub authorisation (simulated)',
  s08: 'Mentor profile setup (landing)',
  s09: 'Mentor account required',
  s10: 'Admin · Dashboard',
  s11: 'Admin · Users',
  s12: 'Mentor page with slot (E02 stub)',
  s13: 'Booking refused — verify your e-mail',
  s14: 'Signed-in header',
};

const TEACHER_EMAIL = ACCOUNTS.find((a) => a.id === 'tomasz')!;
const PIOTR = ACCOUNTS.find((a) => a.id === 'piotr')!;
const MARTA = ACCOUNTS.find((a) => a.id === 'marta')!;
const KUBA = ACCOUNTS.find((a) => a.id === 'kuba')!;

const go = (target: string, patch: Partial<Ctx>, setCtx: (f: (p: Ctx) => Ctx) => void) => {
  setCtx((prev) => ({ next: prev.next, intent: prev.intent, ...patch }));
  document.dispatchEvent(new CustomEvent('prototype:navigate', { detail: target }));
};

const paramNext = (p: Controls['nextParam']): string | undefined =>
  p === 'valid' ? `${SLOT_NEXT_BASE}tue-1800-25` : p === 'invalid' ? '//evil.com' : undefined;

const accountFor = (address: string, intent: 'mentee' | 'mentor') => {
  const found = ACCOUNTS.find((a) => a.email === address);
  if (found) return { acc: { ...found, verified: true }, notice: (intent === 'mentor' ? 'existing' : undefined) as Notice };
  return {
    acc: { id: 'new', email: address, role: (intent === 'mentor' ? 'mentor' : 'mentee') as Role, verified: true, name: null },
    notice: undefined as Notice,
  };
};

const slotLabel = (id: string) => {
  const slot = SLOTS.find((s) => s.id === id);
  if (!slot) return '';
  const when = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Warsaw',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(slot.start));
  return `${when} · ${slot.minutes} min · ${slot.price}`;
};

/* ---------- small shared pieces ---------- */

function ErrorBanner({ code }: { code?: string }) {
  if (!code) return null;
  return (
    <Alert variant="danger">
      <AlertDescription>{ERROR_TEXT[code] ?? ERROR_TEXT.unknown}</AlertDescription>
    </Alert>
  );
}

/* LUKA DS05: "Access denied" pattern (not in the DS). Built from Card and Button. */
function AccessDenied({ title, text, children, onBack }: { title: string; text: string; children?: ReactNode; onBack: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{text}</CardDescription>
      </CardHeader>
      {children ? <CardContent>{children}</CardContent> : null}
      <CardContent>
        <Button type="button" variant="outline" onClick={onBack}>
          Back to home
        </Button>
      </CardContent>
    </Card>
  );
}

/* LUKA DS11: account menu with a second action and a confirmation (L10). Built from Button, DropdownMenu, AlertDialog. */
function SessionHeader({
  user,
  busy,
  error,
  onSignOut,
  onSignIn,
}: {
  user: Account | null;
  busy: boolean;
  error: boolean;
  onSignOut: () => void;
  onSignIn: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  if (!user) {
    return (
      <Button variant="outline" size="sm" type="button" onClick={onSignIn}>
        Sign in
      </Button>
    );
  }
  return (
    <div className="grid min-w-0 max-w-full gap-(--space-inline)">
      <div className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-(--space-inline)">
        {busy ? (
          <Button variant="outline" size="sm" type="button" disabled>
            Signing out…
          </Button>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" type="button" className="h-auto w-full min-w-0 max-w-full flex-wrap whitespace-normal break-all text-left">
                <span className="min-w-0 break-all">{user.email}</span> <Badge variant="neutral">{user.role}</Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onSignOut}>Sign out</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setConfirm(true)}>Sign out everywhere…</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {error ? (
        <Alert variant="danger">
          <AlertDescription className="flex flex-wrap items-center gap-(--space-inline)">
            Sign-out failed. Try again.{' '}
            <Button size="sm" variant="outline" type="button" onClick={onSignOut}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out on all devices?</AlertDialogTitle>
            <AlertDialogDescription>You will be signed out here and on every other device.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onSignOut}>Sign out everywhere</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* Resend button with the 60 s countdown (T08). LUKA DS03: a button with a reason, not in the DS. */
function ResendButton({ mode, epoch, onResend }: { mode: 'counting' | 'ready'; epoch: number; onResend: () => void }) {
  const [secs, setSecs] = useState(mode === 'counting' ? 60 : 0);
  useEffect(() => {
    setSecs(mode === 'counting' ? 60 : 0);
  }, [epoch, mode]);
  useEffect(() => {
    if (secs <= 0) return;
    const t = setTimeout(() => setSecs((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secs]);
  return (
    <div className="grid gap-(--space-inline)">
      <Button type="button" variant="outline" disabled={secs > 0} onClick={onResend}>
        {secs > 0 ? `Send a new link (${secs}s)` : 'Send a new link'}
      </Button>
      {secs > 0 ? <p className="text-xs text-muted-foreground">Available after the 60 s countdown.</p> : null}
    </div>
  );
}

/* Mailbox simulation (s05). Three variants from the map: sign-in, mentor sign-up, mail someone else triggered. */
function Mailbox({ address, intent, onOpen }: { address: string; intent: 'mentee' | 'mentor'; onOpen: (intent: 'mentee' | 'mentor') => void }) {
  const [variant, setVariant] = useState<'signin' | 'mentor' | 'other'>(intent === 'mentor' ? 'mentor' : 'signin');
  useEffect(() => setVariant(intent === 'mentor' ? 'mentor' : 'signin'), [intent]);
  const to = address || DEMO_NEW_MENTOR;
  return (
    <div className="grid gap-(--space-stack)">
      <div className="flex flex-wrap gap-(--space-inline)" role="group" aria-label="Mail variant">
        {(
          [
            ['signin', 'Sign-in e-mail'],
            ['mentor', 'Mentor sign-up e-mail'],
            ['other', 'Requested by someone else'],
          ] as const
        ).map(([key, label]) => (
          <Button key={key} type="button" size="sm" variant={variant === key ? 'default' : 'outline'} aria-pressed={variant === key} onClick={() => setVariant(key)}>
            {label}
          </Button>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{variant === 'mentor' ? 'Finish your mentor sign-up' : 'Your DevMentor sign-in link'}</CardTitle>
          <CardDescription>From: DevMentor &lt;no-reply@example.test&gt; · To: {to}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-(--space-stack)">
          {variant === 'other' ? (
            <>
              <p>Someone asked for a sign-in link to this address.</p>
              <p>If it was not you, ignore this e-mail. Nothing happens without a click.</p>
            </>
          ) : (
            <>
              <p>
                {variant === 'mentor'
                  ? 'Click the button to create or open your mentor account. The link works for 15 minutes and only once.'
                  : 'Click the button to sign in to DevMentor. The link works for 15 minutes and only once.'}
              </p>
              <p>If you did not ask for this, ignore this e-mail.</p>
              <div>
                <Button type="button" onClick={() => onOpen(variant === 'mentor' ? 'mentor' : 'mentee')}>
                  {variant === 'mentor' ? 'Continue as mentor' : 'Sign in to DevMentor'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* Confirm sign-in (s06): the click signs in; a GET does not (F1). L17: another account is already signed in. */
function ConfirmBlock({
  address,
  account,
  notice,
  linkState,
  current,
  onConfirm,
  onRequestNew,
}: {
  address: string;
  account: Account;
  notice: Notice;
  linkState: Controls['linkState'];
  current: Account | null;
  onConfirm: (acc: Account, notice: Notice) => void;
  onRequestNew: () => void;
}) {
  const [phase, setPhase] = useState<'idle' | 'busy' | 'gone'>('idle');
  const other = current && current.email !== account.email ? current : null;
  if (linkState === 'expired' || linkState === 'used') {
    return (
      <div className="grid gap-(--space-stack)">
        <ErrorBanner code="link_invalid" />
        <div>
          <Button type="button" onClick={onRequestNew}>
            Request a new link
          </Button>
        </div>
      </div>
    );
  }
  if (phase === 'gone') {
    return (
      <div className="grid gap-(--space-stack)">
        <ErrorBanner code="link_gone" />
        <div>
          <Button type="button" onClick={onRequestNew}>
            Request a new link
          </Button>
        </div>
      </div>
    );
  }
  const label = other ? `Continue as ${account.email}` : `Sign in as ${address}`;
  return (
    <div className="grid gap-(--space-stack)">
      {other ? (
        <Alert variant="warning">
          <AlertDescription>
            You are signed in as {other.email}. Continue as {account.email}? Continuing replaces the current session.
          </AlertDescription>
        </Alert>
      ) : null}
      {linkState === 'otherDevice' ? <p className="text-sm text-muted-foreground">Opened on another device: the sign-in happens here.</p> : null}
      <div>
        <Button
          type="button"
          disabled={phase === 'busy'}
          onClick={() => {
            if (linkState === 'gone410') {
              setPhase('gone');
              return;
            }
            setPhase('busy');
            setTimeout(() => onConfirm(account, notice), 300);
          }}
        >
          {phase === 'busy' ? 'Signing in…' : label}
        </Button>
      </div>
    </div>
  );
}

/* Simulated GitHub page (s07). Outcome from T03. The 10 s timeout is real (count-down on screen). */
function GitHubBlock({
  from,
  outcome,
  onOk,
  onFail,
  onCancel,
}: {
  from: string;
  outcome: Controls['ghOutcome'];
  onOk: () => void;
  onFail: (code: string) => void;
  onCancel: () => void;
}) {
  const [secs, setSecs] = useState<number | null>(null);
  useEffect(() => {
    if (secs === null) return;
    if (secs === 0) {
      onFail('github_failed');
      return;
    }
    const t = setTimeout(() => setSecs((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(t);
  }, [secs]);
  return (
    <div className="grid gap-(--space-stack)">
      <Card>
        <CardHeader>
          <CardTitle>Authorize DevMentor</CardTitle>
          <CardDescription>
            DevMentor wants to read your GitHub profile and primary e-mail. Simulation: this is not the GitHub site.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-(--space-stack)">
          {secs !== null ? (
            <p role="status" className="text-sm">
              Waiting for GitHub… {secs} s left (limit 10 s).
            </p>
          ) : null}
          <div className="flex flex-wrap gap-(--space-inline)">
            <Button
              type="button"
              disabled={secs !== null}
              onClick={() => {
                if (outcome === 'timeout') {
                  setSecs(10);
                  return;
                }
                if (outcome === 'ok') onOk();
                else if (outcome === 'unverified') onFail('github_email_unverified');
                else onFail('github_failed');
              }}
            >
              Authorize DevMentor
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={secs !== null}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">Came from {from === 's03' ? 'mentor sign-up' : 'sign-in'}. Outcome is set by control T03.</p>
    </div>
  );
}

/* ---------- the prototype ---------- */

export function App() {
  const [screen, setScreen] = useState('s01');
  const [ctx, setCtx] = useState<Ctx>({});
  const [user, setUser] = useState<Account | null>(null);
  const [email, setEmail] = useState(DEMO_NEW_MENTOR);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [pending, setPending] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [returned, setReturned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(true);
  const [signOutState, setSignOutState] = useState<'idle' | 'busy' | 'error'>('idle');
  const [resendEpoch, setResendEpoch] = useState(0);
  const [resentNote, setResentNote] = useState(false);
  // Each visit to s06 / s07 mounts the block afresh (no busy state carried over from the last visit).
  const [s06Visit, setS06Visit] = useState(0);
  const [s07Visit, setS07Visit] = useState(0);
  const [c, setC] = useState<Controls>(DEFAULT_CONTROLS);
  const patch = (p: Partial<Controls>) => setC((prev) => ({ ...prev, ...p }));

  const nav = (target: string, p: Partial<Ctx> = {}) => go(target, p, setCtx);

  // Screen changes come from the review engine (goTo). Registered before start() runs.
  useLayoutEffect(() => {
    const on = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      setScreen(id);
      if (id === 's06') setS06Visit((v) => v + 1);
      if (id === 's07') setS07Visit((v) => v + 1);
    };
    document.addEventListener('prototype:screen-change', on);
    return () => document.removeEventListener('prototype:screen-change', on);
  }, []);

  // Skeleton while "loading" on the admin screens (500 ms).
  useEffect(() => {
    setReady(false);
    const t = setTimeout(() => setReady(true), 500);
    return () => clearTimeout(t);
  }, [screen]);

  // Session: valid only when the account is there and the session state is "valid" (T07).
  const act = user && c.session === 'valid' ? user : null;
  const ended = !!user && !act;

  // Access gates (route guard). Redirect targets come from the map; the destination screen shows the message.
  useEffect(() => {
    const target = guardTarget(screen, act, selectedSlot);
    if (target) nav(target.screen, target.patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, user, c.session]);

  const completeSignIn = (acc: Account, notice: Notice) => {
    setUser(acc);
    patch({ session: 'valid' });
    setSignOutState('idle');
    setPending('');
    const raw = ctx.next ?? paramNext(c.nextParam);
    const clear = { next: undefined, notice: undefined } as Partial<Ctx>;
    if (raw === undefined) return landing(acc, notice, clear);
    if (!isSafeNext(raw)) return nav('s01', { ...clear, error: 'unsafe_next' });
    if (raw.startsWith('/m/')) {
      setSelectedSlot(slotFromNext(raw));
      setReturned(true);
      return nav('s12', clear);
    }
    if (raw === '/mentor/profile') return nav('s08', { ...clear, notice });
    if (raw === '/admin') return nav('s10', clear);
    return landing(acc, notice, clear);
  };

  const landing = (acc: Account, notice: Notice, clear: Partial<Ctx>) => {
    if (acc.role === 'mentor') return nav('s08', { ...clear, notice });
    if (acc.role === 'admin') return nav('s10', clear);
    return nav('s01', { ...clear, notice });
  };

  const signOut = (everywhere = false) => {
    void everywhere;
    setSignOutState('busy');
    setTimeout(() => {
      if (c.signOutResult === 'error') {
        setSignOutState('error');
        return;
      }
      setSignOutState('idle');
      setUser(null);
      patch({ session: 'valid' });
      setSelectedSlot(null);
      nav('s01', { next: undefined });
    }, 300);
  };

  // Sends a link (T04 result). Address comes from typed input or from T06 (existing account).
  const requestLink = (intent: 'mentee' | 'mentor', typed: string, extra: Partial<Ctx> = {}, useTyped = false) => {
    const forced = !useTyped && c.existing !== 'no' ? (c.existing === 'mentor' ? TEACHER_EMAIL : PIOTR).email : null;
    const address = (forced ?? typed).trim();
    if (!isValidEmail(address)) {
      setEmailError('Enter an e-mail address, for example name@example.com.');
      return;
    }
    setEmailError(null);
    if (c.sendResult === '422') {
      setEmailError("That e-mail address isn't valid.");
      return;
    }
    if (c.sendResult === '429' || c.sendResult === '503') {
      setCtx((p) => ({ ...p, error: c.sendResult === '429' ? 'rate_limited' : 'mail_failed' }));
      return;
    }
    setPending(address);
    setResendEpoch((e) => e + 1);
    nav('s04', { intent, ...extra });
  };

  const resend = () => {
    if (c.sendResult === '429' || c.sendResult === '503') {
      setCtx((p) => ({ ...p, error: c.sendResult === '429' ? 'rate_limited' : 'mail_failed' }));
      return;
    }
    setCtx((p) => ({ ...p, error: undefined }));
    setResentNote(true);
    setResendEpoch((e) => e + 1);
  };

  const submitEmail = (intent: 'mentee' | 'mentor', extra: Partial<Ctx> = {}) => {
    const address = email.trim();
    if (c.existing === 'no' && !isValidEmail(address)) {
      setEmailError('Enter an e-mail address, for example name@example.com.');
      return;
    }
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      requestLink(intent, email, extra);
    }, 400);
  };

  // Derived error for the sign-in page when the entry has an invalid or unknown ?next / code (T09).
  const entryError = (): string | undefined => {
    if (ctx.error) return ctx.error;
    if (c.nextParam === 'invalid' && !ctx.next) return 'invalid_request';
    if (c.nextParam === 'unknown' && !ctx.next) return 'unknown';
    return undefined;
  };

  const effectiveNext = ctx.next ?? paramNext(c.nextParam);

  const bookingNext = selectedSlot ? `${SLOT_NEXT_BASE}${selectedSlot}` : undefined;

  const visibleSlots = returned && c.slotState === 'taken' && selectedSlot ? SLOTS.filter((s) => s.id !== selectedSlot) : SLOTS;
  const takenNow = returned && c.slotState === 'taken' && !!selectedSlot;

  const pickSlot = (id: string) => {
    setSelectedSlot(id);
    setReturned(false);
    if (!act) return nav('s02', { intent: 'mentee', next: `${SLOT_NEXT_BASE}${id}` });
    if (!act.verified) return nav('s13', {});
    return undefined;
  };

  const openGitHub = (from: 's02' | 's03') => nav('s07', { from, intent: from === 's03' ? 'mentor' : 'mentee' });

  const ghOk = () => {
    const from = ctx.from ?? 's02';
    if (from === 's03') {
      if (c.existing !== 'no') return completeSignIn(accountFor((c.existing === 'mentor' ? TEACHER_EMAIL : PIOTR).email, 'mentor').acc, 'existing');
      return completeSignIn(MARTA, undefined);
    }
    return completeSignIn(KUBA, undefined);
  };

  const ghFail = (code: string) => nav(ctx.from ?? 's02', { error: code, intent: ctx.intent, next: ctx.next });

  const linkAddress = pending || DEMO_NEW_MENTOR;
  const linkIntent = ctx.intent ?? 'mentee';
  const linkAccount = accountFor(linkAddress, linkIntent);

  const userRows = (() => {
    if (c.users === 'empty') return [];
    if (c.users === 'few') return ACCOUNTS.filter((a) => a.id !== 'dev').slice(0, 3).map((a) => ({ id: a.id, email: a.email, role: a.role, verified: a.verified }));
    return Array.from({ length: 50 }, (_, i) => ({
      id: `fixture-${i + 1}`,
      email: `user-${String(i + 1).padStart(2, '0')}@example.test`,
      role: 'mentee' as Role,
      verified: true,
    }));
  })();

  return (
    <>
      <header className="doc-toolbar">
        <div className="doc-head">
          <h1>DevMentor · Accounts and roles</h1>
          <p>Epic E01 prototype · stage 2</p>
        </div>
        <nav className="screen-nav" aria-label="Screens">
          {SCREENS.map((id) => (
            <a key={id} href={`#${id}`} aria-current={screen === id ? 'page' : undefined}>
              {id}
            </a>
          ))}
        </nav>
        <Badge variant="neutral">Prototype</Badge>
        <ThemeToggle />
      </header>

      <div className="scenario-bar" role="group" aria-label="Scenario controls">
        <Ctl
          label="T01 Signed in as"
          value={act ? act.id : user ? user.id : 'guest'}
          onChange={(v) => {
            const acc = ACCOUNTS.find((a) => a.id === v) ?? null;
            setUser(acc);
            patch({ session: 'valid' });
            setSignOutState('idle');
          }}
          options={[['guest', 'Guest'], ...ACCOUNTS.map((a) => [a.id, `${a.id === 'dev' ? 'Dev' : a.id[0].toUpperCase() + a.id.slice(1)} · ${a.role}${a.verified ? '' : ' · unverified'}`] as const)]}
        />
        <Ctl label="T02 GitHub" value={c.github ? 'yes' : 'no'} onChange={(v) => patch({ github: v === 'yes' })} options={[['yes', 'configured'], ['no', 'not configured']]} />
        <Ctl
          label="T03 GitHub result"
          value={c.ghOutcome}
          onChange={(v) => patch({ ghOutcome: v as Controls['ghOutcome'] })}
          options={[['ok', 'success'], ['denied', 'denied'], ['unverified', 'e-mail unverified'], ['timeout', 'timeout 10 s'], ['state', 'bad state']]}
        />
        <Ctl
          label="T04 Send result"
          value={c.sendResult}
          onChange={(v) => patch({ sendResult: v as Controls['sendResult'] })}
          options={[['sent', 'sent'], ['422', '422 bad e-mail'], ['429', '429 rate limit'], ['503', '503 mail failed']]}
        />
        <Ctl
          label="T05 Link"
          value={c.linkState}
          onChange={(v) => patch({ linkState: v as Controls['linkState'] })}
          options={[['valid', 'valid'], ['expired', 'expired (>15 min)'], ['used', 'already used'], ['gone410', 'used between GET and click (410)'], ['otherDevice', 'opened on another device']]}
        />
        <Ctl
          label="T06 E-mail exists"
          value={c.existing}
          onChange={(v) => patch({ existing: v as Existing })}
          options={[['no', 'no'], ['mentee', 'yes, as mentee'], ['mentor', 'yes, as mentor']]}
        />
        <Ctl
          label="T07 Session"
          value={c.session}
          onChange={(v) => patch({ session: v as Controls['session'] })}
          options={[['valid', 'valid'], ['expired', 'expired (7 days)'], ['invalidated', 'invalidated (sv)']]}
        />
        <Ctl label="T08 Resend clock" value={c.resend} onChange={(v) => patch({ resend: v as Controls['resend'] })} options={[['counting', 'counting 60 s'], ['ready', 'ready']]} />
        <Ctl
          label="T09 next / code on /sign-in"
          value={c.nextParam}
          onChange={(v) => patch({ nextParam: v as Controls['nextParam'] })}
          options={[['none', 'none'], ['valid', 'valid next (slot)'], ['invalid', 'invalid next (//evil.com)'], ['unknown', 'unknown error code']]}
        />
        <Ctl label="T10 Database" value={c.dbState} onChange={(v) => patch({ dbState: v as Controls['dbState'] })} options={[['up', 'up'], ['down', 'unreachable'], ['error', 'API error']]} />
        <Ctl label="T11 Users" value={c.users} onChange={(v) => patch({ users: v as Controls['users'] })} options={[['empty', 'empty'], ['few', 'few (3)'], ['many', 'many (50)']]} />
        <Ctl label="T12 Slot on return" value={c.slotState} onChange={(v) => patch({ slotState: v as Controls['slotState'] })} options={[['free', 'free'], ['taken', 'taken while verifying']]} />
        <Ctl label="L20 Mail provider" value={c.mail ? 'on' : 'off'} onChange={(v) => patch({ mail: v === 'on' })} options={[['on', 'on'], ['off', 'off (form hidden)']]} />
        <Ctl label="L12 Sign-out" value={c.signOutResult} onChange={(v) => patch({ signOutResult: v as Controls['signOutResult'] })} options={[['ok', 'succeeds'], ['error', 'fails']]} />
      </div>

      <main>
        {/* s01 Home */}
        <Screen id="s01" title={TITLES.s01} meta="Landing page for everyone. Guest: Sign in. Signed in: Go to your profile.">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-(--space-inline)">
            <span className="font-semibold">DevMentor</span>
            <SessionHeader user={act} busy={signOutState === 'busy'} error={signOutState === 'error'} onSignOut={() => signOut(false)} onSignIn={() => nav('s02', { intent: 'mentee' })} />
          </div>
          {ctx.notice === 'existing' ? <ExistingAccountNotice /> : null}
          <ErrorBanner code={ctx.error} />
          {ended ? <Alert variant="warning"><AlertDescription>{SESSION_ENDED}</AlertDescription></Alert> : null}
          <PageHeader
            title="Paid text sessions with engineers who have been there"
            description="Mentors set their own prices for 25- and 50-minute text sessions. No video."
            actions={
              act ? (
                <Button type="button" onClick={() => nav(act.role === 'admin' ? 's10' : 's08')}>
                  {act.role === 'admin' ? 'Go to admin' : 'Go to your profile'}
                </Button>
              ) : (
                <Button type="button" onClick={() => nav('s03', { intent: 'mentor' })}>
                  Become a mentor
                </Button>
              )
            }
          />
          <div>
            <Button type="button" variant="outline" onClick={() => nav('s12')}>
              Browse a mentor
            </Button>
          </div>
        </Screen>

        {/* s02 Sign in */}
        <Screen id="s02" title={TITLES.s02} meta="/sign-in. One page for sign-in and mentee sign-up (L02 A).">
          <PageHeader title="Sign in" description="We'll send you a sign-in link. No password." />
          {ended ? <Alert variant="warning"><AlertDescription>{SESSION_ENDED}</AlertDescription></Alert> : null}
          <ErrorBanner code={entryError()} />
          {effectiveNext ? (
            <p className="text-xs text-muted-foreground">
              {isSafeNext(effectiveNext) ? `After sign-in: ${effectiveNext}` : 'The next address is not allowed and will be ignored.'}
            </p>
          ) : null}
          {c.mail ? (
            <div className="grid gap-(--space-stack)">
              <FormField label="E-mail" necessity="required" hint="We send a one-time sign-in link." error={emailError ?? undefined}>
                <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
              </FormField>
              <div>
                <Button type="button" disabled={busy} onClick={() => submitEmail('mentee')}>
                  {busy ? 'Sending…' : 'Send me a sign-in link'}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">E-mail sign-in is coming soon.</p>
          )}
          {c.github ? (
            <>
              <div className="flex items-center gap-(--space-inline) text-sm text-muted-foreground" aria-hidden="true">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
              </div>
              {/* LUKA DS01: "Continue with GitHub" button (not in the DS). Built from Button. */}
              <Button type="button" variant="outline" onClick={() => openGitHub('s02')}>
                Continue with GitHub
              </Button>
            </>
          ) : null}
          {!c.mail && !c.github ? <p className="text-sm">No sign-in method is available right now.</p> : null}
          <div>
            <Button type="button" variant="ghost" onClick={() => nav('s03', { intent: 'mentor' })}>
              Sign up as a mentor
            </Button>
          </div>
        </Screen>

        {/* s03 Mentor sign-up */}
        <Screen id="s03" title={TITLES.s03} meta="/sign-up/mentor. Entry point for mentor invitations (R15).">
          <PageHeader title={TITLES.s03} description="No bank details needed until someone books you." />
          <ErrorBanner code={ctx.error} />
          {c.mail ? (
            <div className="grid gap-(--space-stack)">
              <FormField label="E-mail" necessity="required" hint="We send a one-time sign-in link. No password." error={emailError ?? undefined}>
                <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
              </FormField>
              <div>
                <Button type="button" disabled={busy} onClick={() => submitEmail('mentor')}>
                  {busy ? 'Sending…' : 'Send me a sign-up link'}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">E-mail sign-up is coming soon.</p>
          )}
          {c.github ? (
            <>
              <div className="flex items-center gap-(--space-inline) text-sm text-muted-foreground" aria-hidden="true">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
              </div>
              <Button type="button" variant="outline" onClick={() => openGitHub('s03')}>
                Continue with GitHub
              </Button>
            </>
          ) : null}
          <div>
            <Button type="button" variant="ghost" onClick={() => nav('s02', { intent: 'mentee' })}>
              Already have an account? Sign in
            </Button>
          </div>
        </Screen>

        {/* s04 Check your inbox */}
        <Screen id="s04" title={TITLES.s04} meta="After sending the link. Shows the address the link went to (L15: without an address only the way out is shown).">
          {pending ? (
            <>
              <PageHeader title={TITLES.s04} description={`We sent a sign-in link to ${pending}. Open it within 15 minutes.`} />
              <ErrorBanner code={ctx.error} />
              {resentNote ? <p role="status" className="text-sm">A new link is on its way.</p> : null}
              <div className="flex flex-wrap gap-(--space-inline)">
                <Button type="button" onClick={() => nav('s05', { intent: ctx.intent, next: ctx.next })}>
                  Open e-mail (simulated)
                </Button>
              </div>
              <ResendButton mode={c.resend} epoch={resendEpoch} onResend={resend} />
            </>
          ) : (
            <PageHeader title={TITLES.s04} description="Check your inbox at the address you entered." />
          )}
          <div>
            <Button type="button" variant="outline" onClick={() => nav('s02', { intent: 'mentee' })}>
              Use a different e-mail
            </Button>
          </div>
        </Screen>

        {/* s05 Mailbox (simulation) */}
        <Screen id="s05" title={TITLES.s05} meta="Stands in for the recipient's mailbox. Not an app screen.">
          <Mailbox address={pending} intent={ctx.intent ?? 'mentee'} onOpen={(intent) => nav('s06', { intent, next: ctx.next })} />
          <p className="text-xs text-muted-foreground">Simulation: no real e-mail is sent.</p>
        </Screen>

        {/* s06 Confirm */}
        <Screen id="s06" title={TITLES.s06} meta="/auth/confirm?token=… Opening the link does not sign you in; the click does.">
          <PageHeader title={`Sign in as ${linkAddress}?`} description="Confirm to sign in on this device." />
          <ConfirmBlock
            key={s06Visit}
            address={linkAddress}
            account={linkAccount.acc as Account}
            notice={linkAccount.notice}
            linkState={c.linkState}
            current={act}
            onConfirm={completeSignIn}
            onRequestNew={() => nav('s02', { intent: linkIntent, error: 'link_invalid' })}
          />
        </Screen>

        {/* s07 GitHub (simulation) */}
        <Screen id="s07" title={TITLES.s07} meta="External GitHub page, simulated. Reached from s02 or s03.">
          <GitHubBlock key={s07Visit} from={ctx.from ?? 's02'} outcome={c.ghOutcome} onOk={ghOk} onFail={ghFail} onCancel={() => nav(ctx.from ?? 's02', { intent: ctx.intent, next: ctx.next })} />
        </Screen>

        {/* s08 Mentor landing */}
        <Screen id="s08" title={TITLES.s08} meta="/mentor/profile. Start page for a mentor after sign-in. Guest: gate to sign-in. Mentee/admin: s09.">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-(--space-inline)">
            <span className="text-sm text-muted-foreground">DevMentor</span>
            <SessionHeader user={act} busy={signOutState === 'busy'} error={signOutState === 'error'} onSignOut={() => signOut(false)} onSignIn={() => nav('s02', { intent: 'mentee' })} />
          </div>
          {ctx.notice === 'existing' ? <ExistingAccountNotice /> : null}
          {act && act.role === 'mentor' ? (
            <>
              <PageHeader title={`Welcome, ${act.email}`} description="You are signed in as a mentor." />
              <Card>
                <CardHeader>
                  <CardTitle>Coming next</CardTitle>
                  <CardDescription>Profile setup arrives with E02-S01 (#28).</CardDescription>
                </CardHeader>
              </Card>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Redirecting to sign-in…</p>
          )}
          <div>
            <Button type="button" variant="outline" onClick={() => nav('s01')}>
              Back to home
            </Button>
          </div>
        </Screen>

        {/* s09 Mentor required */}
        <Screen id="s09" title={TITLES.s09} meta="Signed in as a mentee or admin, opening /mentor/profile. Access denied pattern.">
          {act ? (
            <AccessDenied title="Mentor account required" text={`You are signed in with an account that is not a mentor (${act.email}).`} onBack={() => nav('s01')}>
              <p className="text-sm">To mentor, contact us (the channel is to be agreed).</p>
            </AccessDenied>
          ) : (
            <p className="text-sm text-muted-foreground">Sign in first. Redirecting…</p>
          )}
        </Screen>

        {/* s10 Admin dashboard */}
        <Screen id="s10" title={TITLES.s10} meta="/admin. Admin only. Other roles see Access denied; guests are sent to sign-in with next=/admin (L04 A).">
          {act && act.role === 'admin' ? (
            <>
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-(--space-inline)">
                <div className="flex flex-wrap items-center gap-(--space-inline)">
                  <Badge variant="neutral">{act.email}</Badge>
                  {act.id === 'dev' ? <Badge variant="warning">Dev admin — local only</Badge> : null}
                </div>
                <SessionHeader user={act} busy={signOutState === 'busy'} error={signOutState === 'error'} onSignOut={() => signOut(false)} onSignIn={() => nav('s02', { intent: 'mentee' })} />
              </div>
              <PageHeader title={TITLES.s10} description="Operator view: database and user list." />
              {!ready ? (
                <div className="grid gap-(--space-inline)" aria-busy="true">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ) : c.dbState === 'up' ? (
                <Badge variant="success">Database: Connected</Badge>
              ) : (
                <Alert variant="danger">
                  <AlertDescription className="flex flex-wrap items-center gap-(--space-inline)">
                    {c.dbState === 'down' ? 'Database unreachable.' : 'Could not load the dashboard data.'}{' '}
                    <Button size="sm" variant="outline" type="button" onClick={() => patch({ dbState: 'up' })}>
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : act ? (
            <AccessDenied title="Access denied" text={`This page is for admins. You are signed in as ${act.email} (${act.role}).`} onBack={() => nav('s01')} />
          ) : (
            <p className="text-sm text-muted-foreground">Sign in as an admin. Redirecting…</p>
          )}
        </Screen>

        {/* s11 Admin users */}
        <Screen id="s11" title={TITLES.s11} meta="/admin/users. Admin only (same gate as s10).">
          {act && act.role === 'admin' ? (
            <>
              <PageHeader title={TITLES.s11} description="All accounts. Name falls back to the e-mail until it is set." />
              {/* LUKA DS17: DataTable has no horizontal scroll container, so it overflows a 320 px phone. Wrapped here. */}
              <div className="max-w-full overflow-x-auto">
              <DataTable
                columns={[
                  { key: 'name', header: 'Name', cell: (r: { email: string }) => r.email },
                  { key: 'email', header: 'Email', cell: (r: { email: string }) => r.email },
                  { key: 'role', header: 'Role', cell: (r: { role: string }) => <Badge variant="neutral">{r.role}</Badge> },
                ]}
                rows={userRows}
                getRowId={(r) => r.id}
                isLoading={!ready}
                error={c.dbState === 'up' ? null : { message: 'Could not load users.' }}
                onRetry={() => patch({ dbState: 'up' })}
                emptyTitle="No users yet."
                emptyDescription="Accounts appear here after the first sign-in."
              />
              </div>
            </>
          ) : act ? (
            <AccessDenied title="Access denied" text={`This page is for admins. You are signed in as ${act.email} (${act.role}).`} onBack={() => nav('s01')} />
          ) : (
            <p className="text-sm text-muted-foreground">Sign in as an admin. Redirecting…</p>
          )}
        </Screen>

        {/* s12 Mentor page stub */}
        <Screen id="s12" title={TITLES.s12} meta="E02 stub with demo data. Tests the return to a slot (S02-AC1), not the mentor page (L07 A).">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-(--space-inline)">
            <Badge variant="neutral">E02 stub</Badge>
            <SessionHeader user={act} busy={signOutState === 'busy'} error={signOutState === 'error'} onSignOut={() => signOut(false)} onSignIn={() => nav('s02', { intent: 'mentee' })} />
          </div>
          <MentorCard mentor={MENTOR as never} />
          {takenNow ? <Alert variant="warning"><AlertDescription>This time was just booked — pick another.</AlertDescription></Alert> : null}
          <SlotList
            slots={visibleSlots}
            value={!takenNow && selectedSlot ? selectedSlot : undefined}
            onValueChange={pickSlot}
            label="Choose a time"
            timeZone="Europe/Warsaw"
          />
          {!takenNow && selectedSlot && act?.verified ? (
            <div className="grid gap-(--space-inline)">
              <p className="text-sm">Selected: {slotLabel(selectedSlot)}</p>
              <Button type="button" disabled>
                Book (E03, not in this prototype)
              </Button>
            </div>
          ) : null}
          {!act ? <p className="text-xs text-muted-foreground">Guest: choosing a slot opens sign-in, then returns here with the slot selected.</p> : null}
        </Screen>

        {/* s13 Booking refused */}
        <Screen id="s13" title={TITLES.s13} meta="Mentee with an unverified account tried to book (403 email_unverified).">
          <Alert variant="danger">
            <AlertDescription>Verify your e-mail to book — we'll send you a link.</AlertDescription>
          </Alert>
          <ErrorBanner code={ctx.error} />
          <div>
            <Button type="button" disabled={busy} onClick={() => { if (act) requestLink('mentee', act.email, { next: bookingNext }, true); }}>
              Send me a verification link
            </Button>
          </div>
        </Screen>

        {/* s14 Signed-in header */}
        <Screen id="s14" title={TITLES.s14} meta="Shared element of s01, s08, s10, s11, s12. The same component, shown alone.">
          <div className="flex flex-wrap items-center gap-(--space-inline)">
            <SessionHeader user={act} busy={signOutState === 'busy'} error={signOutState === 'error'} onSignOut={() => signOut(false)} onSignIn={() => nav('s02', { intent: 'mentee' })} />
          </div>
          <p className="text-sm text-muted-foreground">
            {act ? `Signed in as ${act.email} (${act.role}). Sign out returns to Home.` : 'Guest: shows Sign in.'}
          </p>
        </Screen>
      </main>
    </>
  );

  // Gate rules, as functions of the screen (computed on each render; the effect above applies them).
  function guardTarget(scr: string, a: Account | null, slot: string | null): { screen: string; patch: Partial<Ctx> } | null {
    switch (scr) {
      case 's02':
      case 's03':
        if (!a) return null;
        return { screen: a.role === 'mentor' ? 's08' : a.role === 'admin' ? 's10' : 's01', patch: {} };
      case 's08':
        if (!a) return { screen: 's02', patch: { next: '/mentor/profile' } };
        if (a.role !== 'mentor') return { screen: 's09', patch: {} };
        return null;
      case 's09':
        if (!a) return { screen: 's02', patch: { next: '/mentor/profile' } };
        if (a.role === 'mentor') return { screen: 's08', patch: {} };
        return null;
      case 's10':
      case 's11':
        if (!a) return { screen: 's02', patch: { next: '/admin' } };
        return null;
      case 's13':
        if (!a) return { screen: 's02', patch: { next: slot ? `${SLOT_NEXT_BASE}${slot}` : undefined } };
        if (a.verified) return { screen: 's12', patch: {} };
        return null;
      default:
        return null;
    }
  }
}

/* Dark / light theme toggle. The label is changed by DOM so the review engine's toolbar nodes are not disturbed. */
function ThemeToggle() {
  return (
    <Button
      id="theme-toggle"
      type="button"
      variant="outline"
      size="sm"
      onClick={(event) => {
        const dark = document.documentElement.classList.toggle('dark');
        (event.currentTarget as HTMLButtonElement).textContent = dark ? 'Light theme' : 'Dark theme';
      }}
    >
      Dark theme
    </Button>
  );
}

function Screen({ id, title, meta, children }: { id: string; title: string; meta: string; children: ReactNode }) {
  const notes = NOTES[id] ?? '';
  return (
    <section className="screen" id={id} aria-labelledby={`${id}-title`}>
      <div className="screen-meta">
        <h2 id={`${id}-title`}>
          {id} · {title}
        </h2>
        <p>{meta}</p>
      </div>
      <div className="frame">{children}</div>
      <div className="notes">
        <p className="note">{notes}</p>
      </div>
    </section>
  );
}

function Ctl({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: ReadonlyArray<readonly [string, string]> }) {
  return (
    <label className="ctl">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}
