# Run: E01 Phase 3 — mentor sign-up (#26)

**Date:** 2026-10-18 · **Agent:** Claude Code (Fable 5.1, subagent) · **Requested by:** Jan
**Spec:** [.ai/specs/2026-10-18-accounts-and-roles.md](../specs/2026-10-18-accounts-and-roles.md) › Implementation Plan › Phase 3
**Tracker:** #26 (E01-S01) · **Branch:** `feat/e01-phase3-mentor-sign-up` (stacked on `feat/e01-phase1-auth-foundation`, worktree `…-wt/e01-phase3`)
**Status:** done — Phase 3 complete on the branch; no push, no PR (Jan opens it)

## Goal

Phase 3 only: `/sign-up/mentor` (e-mail link with `intentRole: 'mentor'`; the GitHub button is Phase 2),
`/mentor/profile` placeholder in a new `(mentor)` group (mentor role required, no payout/bank/Stripe field or
step — R07), role-aware landing after a consumed link, and the existing-account notice (AC3 as reworded in #26:
signed in to the existing account, role unchanged, nothing created, no e-mail enumeration).

## Decisions

- **Role-aware landing lives in `AuthService.consumeEmailLink`** (`next = token.nextPath ?? defaultLandingPath(user.role)`),
  not in the route or the confirm page: the consume response is the contract every client lands by
  (BACKWARD_COMPATIBILITY §1). A new mentor account has role `mentor`, so "token carried `intentRole: 'mentor'`"
  and "user already is a mentor" collapse into one rule. Rejected: deciding in `ConfirmSignIn` (a client
  would have to know roles; the API would still say `/`).
- **One-time notice = a validated query parameter on the landing path** (`?notice=existing_account`,
  `accountNoticeSchema` is a Zod literal; `withAccountNotice` keeps the path relative, query and hash intact).
  Chosen over a flash cookie because it needs no new cookie contract (§7), no server state and no
  clearing step: it is shown exactly while the parameter is in the URL and gone on the next navigation
  (integration test "shown once"). Only a known literal renders anything, so the URL can never inject text.
  Rejected: a flash cookie (a second cookie to document, clear and redact in logs) and a global component in
  the root layout (`useSearchParams` there needs a Suspense boundary on every page and would make the
  landing-page test depend on `next/navigation`). Consequence: the notice is rendered by the two landing
  pages that can receive it — `/mentor/profile` and `/` (a mentee's default) — and `/sign-up/mentor` carries
  no `next`, so no other page can be the landing page of a sign-up link.
- **Existing account: the role is never written for an existing user** — `consumeEmailLink` only sets
  `emailVerifiedAt` on that branch and returns `existingAccount: true` when the link carried an intent role.
  Phase 1 already behaved this way (its test "never changes an existing account"); Phase 3 adds the explicit
  AC3 test with the mutation proof (below). `make set-role` stays the only way to change a role (grill-me Q10).
- **`pageAccess(headers, { role, path })` in `core/src/http/page-access.ts`** so the server page stays
  configuration: `sign-in` (→ `/sign-in?next=<path>`), `forbidden`, or `granted` with the session and the
  account (`authService.currentUser` through the request scope). It wraps `requireSession` with a `Request`
  built from the page's headers (the guard reads only the cookie). Rejected: building the `Request` in the
  page and calling `requireSession`/`requireRole` + `currentUser` there (logic in a route file), and a
  Next.js `forbidden()` interrupt (needs `experimental.authInterrupts`; the refusal page is enough — no
  content is rendered for another role, and the integration test proves it).
- **`SignInForm` → `(auth)/EmailLinkForm.tsx`**: a second consumer appeared (`/sign-up/mentor`), so the
  colocated rule says move it; it cannot go to `ui` (it needs `next/navigation`). Props: `intentRole`,
  `submitLabel`. It also carries `?role=mentor` to `/check-email`, so a resend keeps the intent
  (`intentRoleSchema` validates it; anything else is ignored).
- **AC2 is asserted by absence**: the unit and integration tests check that `/mentor/profile` renders no
  `input`/`select`/`textarea`/`form` and that its text matches none of `payout|bank|iban|stripe|card|billing`.
  The R07 sentence ("No bank details needed until someone books you.") is on the sign-up page, as the spec's
  copy says, not on the profile page.
- **Phase 1 defect (test only), fixed in `da11f23` (`fix(auth):`)**: the consume test for an admin-created
  user compared `emailVerifiedAt` (stamped by the service's real-clock default) with the fake database's
  clock taken earlier; it flaked once by 1 ms during this run. The harness clock is now passed as `now`.

## Steps

- [x] 1 core: role-aware landing + notice in `consumeEmailLink`, `landing-path.ts`, `account-notice.schema.ts`,
      `intentRoleSchema`, `page-access.ts` (`9ef8db5`)
- [x] 2 ui: `ExistingAccountNotice` (`fad76aa`)
- [x] 3 app: `/sign-up/mentor`, shared `EmailLinkForm`, `/check-email?role=mentor`, `/mentor/profile`, notice on `/` (`fad76aa`)
- [x] 4 integration: `tests/integration/mentor-sign-up.test.ts` (`119455d`)
- [x] 5 docs: AGENTS.md (+ traps), app AGENTS.md, BACKWARD_COMPATIBILITY.md §1, README (`009157b`); spec Progress + this run (last commit)

## Verification

- `make check` → exit 0: Prettier "All matched files use Prettier code style!"; typecheck clean; unit tests
  tools/setup 51, db 28, ui 44, core 129, app 71 — every package at 100 % statements/branches/functions/lines;
  `next build` compiled (`/mentor/profile`, `/sign-up/mentor` listed as dynamic routes; `/` is now dynamic
  because it reads `searchParams`); `pnpm audit`: 1 vulnerability, the documented braces exception.
- `make test-integration` → `Test Files 4 passed (4)`, `Tests 41 passed (41)` (mentor-sign-up 6, auth 13,
  migrations 7, app 15), 40 s; evidence in `tests/integration/.evidence/mentor-sign-up-*.png`
  (`sign-up-mentor`, `mentor-profile`, `existing-account-notice`, `existing-mentor-notice`,
  `mentor-profile-refused`).
- **Mutation (Phase 3 step 3):** in `consumeEmailLink`'s existing-account branch add
  `if (token.intentRole) user.role = token.intentRole;` → test "AC3 (#26): a mentor sign-up link for an
  e-mail in use …" fails: `AssertionError: expected { userId: 'id-2', …(3) } to deeply equal …` with
  `- "next": "/?notice=existing_account"` / `+ "next": "/mentor/profile?notice=existing_account"` (the
  mentee became a mentor, so the landing path changed; the same test also pins `users[0].role === 'mentee'`
  and `users.length === 1`). Restored; suite 23/23 three times in a row.
- AC1 checked by: unit (`auth.service.test.ts` "AC1", `(mentor)/mentor/profile/page.test.tsx` "AC1") and
  integration (browser: sign-up page → outbox link → confirm → `/mentor/profile`, DB row `mentor|verified`).
- AC2 checked by: unit ("AC2") and integration (no form fields, no payout/bank words on the rendered page).
- AC3 checked by: unit (service "AC3", page "AC3", landing page notice test) and integration (existing mentee
  → notice on `/?notice=existing_account`, same id, role `mentee`, users count unchanged; existing mentor →
  notice on `/mentor/profile`, gone on reload; same 200 for known and unknown e-mails).
- Denied paths (integration): mentee cookie on `/mentor/profile` → "Mentor account required", no profile
  content; no cookie → `307` to `/sign-in?next=%2Fmentor%2Fprofile`.

## Merge with Phase 1's Codex review fixes (after the first handback)

`git merge origin/feat/e01-phase1-auth-foundation` (`edb97e0` … `7281795`), a merge commit — no rebase.
Conflicts: `.ai/lessons.md` and `AGENTS.md` traps (both sides kept, Phase 3 lines first), and
`auth.service.test.ts` (the admin-created-user test: Phase 1 pinned the clock as `da11f23` did, Phase 3
expects `next: '/mentor/profile'` + `existingAccount: false` — Phase 3's expectation kept on Phase 1's
line). Auto-merged: `auth.service.ts` (two-bucket locks + Phase 3 landing), `global-setup.ts`,
`BACKWARD_COMPATIBILITY.md`, `tests/integration/auth.test.ts`.
Checked against the hardened rules: `withAccountNotice` output passes the stricter `nextPathSchema`
(`isSameOriginPath`; test extended with a query path); the role-aware landing is untouched by the new
`requireSession` semantics (the consume route never reads a cookie); `pageAccess` inherits "a PRESENT
cookie decides on its own" — new unit case: `mh_session=` (empty) and `mh_session=garbage` with
`ALLOW_DEV_ADMIN=1`/`development` → `sign-in`, never the dev admin, no lookup. No Phase 3 behaviour had
to change. Gates after the merge: see the handback report (`make check`, `make test-integration` ×2).

## Review fixes (Codex review of PR #47, two major findings)

1. **`withAccountNotice` normalised dot segments** (`landing-path.ts`): the `URL` round-trip turned the
   validated `/a/..//evil.example` into the protocol-relative `//evil.example?notice=…`, so the consume
   API could return a `next` that breaks its same-origin contract (the client's `safeDestination` blocked
   it, but fell back to `/` and lost the notice). Fix: pure string append on the validated input (query
   joined with `?`/`&`, hash kept), then the joined string is re-checked with `isSameOriginPath` and, if it
   would ever fail, replaced by `/?notice=…` (defence in depth; unreachable through `nextPathSchema`).
   Regressions: `landing-path.test.ts` (literal and encoded dot segments, `/a/../b`, query + hash variant,
   the fallback), `auth.service.test.ts` (existing account with `next=/a/..//evil.example` → exact path
   kept, passes `nextPathSchema`; the two notice landings re-validated), integration (`mentor-sign-up`:
   API consume with that `next` answers `/a/..//evil.example?notice=existing_account`). Against the old
   helper the three new unit tests are red.
2. **AC1 test repeated the timestamp flake**: `consumeEmailLink(h.lastToken())` stamped
   `emailVerifiedAt` with the real clock while the test compared it with `h.db.clock`. Every Phase 3
   consume call now passes `h.db.clock`; the exact assertion stays. The remaining default-clock call in the
   file (`:448`, Phase 1's "earlier verification is kept") asserts no timestamp equality.

## Handoff

Phase 3 is complete on the branch (stacked on Phase 1's branch — merge Phase 1's PR first, then open this
one against `develop` with `run-integration` and the Codex second-reviewer run; `risk-high` by the spec).
Next by delivery order: Phase 2 (GitHub): add "Continue with GitHub" to `/sign-in` and `/sign-up/mentor`
(`role=mentor` on `github/start`) and reuse `defaultLandingPath` + `withAccountNotice` in the callback, so
both methods land the same way. Open questions: none; the three documented deviations are in the spec's
Progress block.
