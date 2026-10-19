# Run: E01 Phase 2 — sign in with GitHub (#45)

**Date:** 2026-10-18 → 2026-10-19 · **Agent:** Claude Code (Fable 5.1, subagent) · **Requested by:** Jan
**Spec:** [.ai/specs/2026-10-18-accounts-and-roles.md](../specs/2026-10-18-accounts-and-roles.md) › Implementation Plan › Phase 2
**Tracker:** #45 (E01-T02) · **Branch:** `feat/e01-phase2-github-sign-in` (stacked on `feat/e01-phase3-mentor-sign-up`, worktree `…-wt/e01-phase2`)
**Status:** done — Phase 2 complete on the branch; no push, no PR (Jan opens it)

## Goal

Phase 2 only (steps 1–3): env + feature flag (`GITHUB_ADAPTER`, `GITHUB_CLIENT_ID/SECRET`, button hidden
without them), the `GitHubClient` port with the real adapter on `arctic` (state + PKCE, 10 s timeout) and a
fake adapter for tests, `GET /api/auth/github/start` + `/callback`, `AuthService.signInWithGitHub` (verified
primary e-mail only, lower-cased; link by `githubId`, then by e-mail, else create; never a duplicate, never a
role change), "Continue with GitHub" on `/sign-in` and `/sign-up/mentor` (`role=mentor`), integration with
`GITHUB_ADAPTER=fake`.

## Decisions

- **`GITHUB_ADAPTER` unset = feature off** (button hidden, routes answer `invalid_request`), not an invalid
  environment: Phase 1/3 deployments and `make dev` must keep booting without GitHub. `real` without both
  credentials is invalid (a half-configured deployment fails at boot, like a missing `AUTH_SECRET`); both
  credentials alone imply `real` (plan step 1 says "env `GITHUB_CLIENT_ID/SECRET`; feature disabled when
  absent" — a deployment sets two variables, not three); `fake` in production needs `ALLOW_TEST_ADAPTERS=1`
  like the mail mock. Rejected: defaulting to `real` (every environment would need credentials) and
  silently hiding the button on `real` without ids (a typo in a secret name would look like "off").
- **The flow lives in `core` (`GitHubSignInService`), the routes are two lines each** and never throw for
  user input: both answer a `RedirectOutcome` (`status`, `location`, `cookies[]`) turned into a `Response`
  by `redirectResponse` (one `Set-Cookie` header per cookie). Every callback failure — no/invalid/expired
  cookie, state mismatch, `error=` from GitHub, no code, exchange failure, timeout, unverified e-mail, even
  a database or conflict error — is a `303 /sign-in?error=…` that clears `mh_github`; the reason goes to the
  log, never the code or the state. Rejected: letting `apiHandler` answer a JSON 500 on a browser
  navigation (a dead end for the person), and distinguishing conflict from failure in the URL (nothing the
  person can act on differently).
- **State + PKCE in a signed cookie `mh_github`** (HS256 JWT on `AUTH_SECRET`, claims `state`,
  `codeVerifier`, `role?`, `next?`, 10 min, httpOnly, `SameSite=Lax`, `Path=/api/auth/github`, `Secure` in
  production). Lax, not Strict: the callback is a top-level cross-site navigation from GitHub, and Strict
  would drop the cookie, making every sign-in fail. The cookie is scoped to the two routes so it never
  travels with the rest of the site. `buildCookie`/`readCookie` were extracted from `session.ts` so the
  session and state cookies share one set of flags (they cannot drift). Rejected: server-side state rows
  (a table and a sweep for a 10-minute value) and the role/`next` in the query to GitHub (unsigned).
- **`arctic` confined to the adapter.** The port is two methods (`createAuthorizationUrl(state, codeVerifier)`,
  `exchangeCode(code, codeVerifier)`); `state` and the verifier come from `node:crypto` in the flow, so the
  fake needs no arctic and the flow is tested without it. `ArcticGitHubClient` uses arctic's generic
  `OAuth2Client` with `createAuthorizationURLWithPKCE` (S256) rather than its `GitHub` provider class, which
  has no PKCE method; GitHub accepts the PKCE parameters. `arctic` exports no abortable token request, so the
  token call is raced against the timeout (`bounded`) and only the two REST calls (`/user`, `/user/emails`)
  get an `AbortSignal`; each of the three calls is bounded by `AUTH_LIMITS.githubTimeoutMs` (10 s). The access
  token never leaves the adapter and `accessToken`/`access_token` are in `REDACTED_PATHS`. Note for the
  reviewer: `arctic@3.7.0` and its `@oslojs/*` dependencies are marked **deprecated** on npm ("no longer
  supported"); `pnpm audit --audit-level high` reports no advisory for them, so the gate is green, but the
  spec's choice may deserve a revisit (a replacement would touch one file).
- **The fake provider is the app's own callback.** `FakeGitHubClient.createAuthorizationUrl` points at
  `/api/auth/github/callback?state=…&code=fake-github-code` (or `error=access_denied` when the scenario says
  `denied`), and `exchangeCode` answers the scenario read from `GITHUB_FAKE_FILE` on every call (Zod-validated;
  a malformed file throws rather than signs someone in), so the browser goes through the real redirect chain
  and an integration test changes the person between flows by rewriting one file per server — the same
  pattern as `MAIL_OUTBOX_FILE`. Rejected: a test-only "provider" page/route in the app, and a fixed user per
  server (no unverified/denied cases).
- **`signInWithGitHub` returns the same shape as `consumeEmailLink`** (`GitHubSignIn = ConsumedLink`) and
  reuses `defaultLandingPath` + `withAccountNotice`, so both methods land the same way and the AC3 notice
  works for GitHub too (`role=mentor` attempt for an existing account → notice, role unchanged). An account
  found by `githubId` whose GitHub e-mail changed keeps its e-mail (the new address may belong to another
  account); a new account takes GitHub's display name (cut to 120), an existing one keeps its name; an
  admin-created (unverified) account becomes verified when GitHub vouches for its e-mail.
- **Phase 3 defect (test only), fixed in `b1a93c7` (`fix(auth):`)**: the AC1 consume test compared
  `emailVerifiedAt` stamped by the service's `new Date()` default with the harness clock taken earlier
  (the trap already in `.ai/lessons.md`); it failed once by 1 ms in a full-suite run here. The clock is now
  passed as `now`.

## Steps

- [x] 1 env + flag: `GITHUB_ADAPTER`, `GITHUB_CLIENT_ID/SECRET`, `GITHUB_FAKE_FILE`, `isGitHubEnabled`,
      `AUTH_LIMITS.githubStateMinutes/githubTimeoutMs`, redaction (`1b845ba`)
- [x] 2 port + adapters + state cookie + flow + `signInWithGitHub` + container (`ff987ac`)
- [x] 3 routes, button, error copy, dev-log ignore (`efa923d`)
- [x] 4 integration: `tests/integration/github-sign-in.test.ts`, fake scenario files per server (commit below)
- [x] 5 docs: BACKWARD_COMPATIBILITY §1/§3/§5/§7, AGENTS (architecture + 3 traps), README, `.env.example`,
      spec Progress, lessons, this run

## Verification

- `make check` → exit 0: Prettier "All matched files use Prettier code style!"; typecheck Done in tools/setup, db,
  ui, core, app (route types generated); unit tests db 30, tools/setup 51, ui 44, core 187, app 82 — every package
  at 100 % statements/branches/functions/lines (the threshold is enforced; a first `make check` failed on
  typecheck — the fake-adapter test passed a verifier to the fake's one-argument methods — fixed in `ca539e1`);
  `next build` "Compiled successfully" with `ƒ /api/auth/github/start` and `ƒ /api/auth/github/callback` as dynamic
  routes; `pnpm audit`: "1 vulnerabilities found — Severity: 1 high (1 ignored)" (the documented braces exception;
  nothing from `arctic`).
- `make test-integration` → twice `Test Files 5 passed (5)`, `Tests 53 passed (53)` (auth 19, github-sign-in 6,
  mentor-sign-up 6, migrations 7, app 15), 53.7 s and 48.2 s; evidence
  `tests/integration/.evidence/github-sign-in-*.png` (`sign-up-mentor-github`, `mentor-profile-after-github`,
  `github-email-unverified`, `github-denied`, `github-linked-existing-account`, `github-invalid-request`) and
  `github-fake-{dev,prod}.json`.
- **Mutation (a) — state check removed** (`if (query.get('state') !== claims.state) return fail(…)` deleted from
  `GitHubSignInService.callback`): `× state mismatch → github_failed, the code is never exchanged (login CSRF)` —
  `AssertionError: expected { status: 303, …(2) } to deeply equal { status: 303, …(2) }` (the tampered callback
  signed the person in: `location: '/mentor/profile'` with a session cookie instead of `/sign-in?error=github_failed`);
  `Tests 1 failed | 11 passed (12)`. Restored.
- **Mutation (b) — verified-e-mail guard removed** (`if (!github.primaryEmail?.verified)` → `if (!github.primaryEmail)`
  in `signInWithGitHub`): `× refuses an unverified primary e-mail and an account without one — nothing read, written
  or emitted` — `AssertionError: promise resolved "{ userId: 'id-1', …(3) }" instead of rejecting`;
  `Tests 1 failed | 34 passed (35)`. Restored; `src/services/auth` 56/56 afterwards.
- Spec › Edge Cases rows for GitHub, each checked by: unverified e-mail → unit (service, flow) + integration
  (alert with the spec copy, no row); denied / state mismatch → unit (flow: foreign state, no/empty/tampered/
  expired cookie, `error=access_denied`, no code) + integration (browser denied, HTTP tampering, genuine pair still
  works once); API down or slow → unit (adapter: token call and REST call under a 50 ms timeout with fake timers,
  abort observed; flow: `GitHubClientError('timeout')` → `github_failed`); `role=admin` → unit (schema, flow, page
  button never carries it) + integration (`302 /sign-in?error=invalid_request`, no cookie, no admin row); same
  e-mail via GitHub and link → unit (link by e-mail: one row, id stored, no event; then found by id) + integration
  (link account, then GitHub as mentor → notice, same id, role `mentee`, `github_id` set, count unchanged); existing
  mentee signs up as mentor → unit (AC3 by GitHub) + integration (notice on `/?notice=existing_account`); `next`
  off-site → unit (flow refuses `https://`, `//`, `/\t/`) + integration (`invalid_request`).

## Handoff

Phase 2 is complete on the branch (stacked on Phase 3's branch, which is stacked on Phase 1's: merge in that
order, each PR against `develop` with `run-integration` and the Codex second-reviewer run; `risk-high` by the
spec). Deployment: create the OAuth app on GitHub with callback `APP_URL/api/auth/github/callback`, set
`GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`, sign in once with GitHub, then `make set-role EMAIL=… ROLE=admin`.
Next by delivery order: Phase 4 (`next` end to end in both methods — already carried by `github/start?next=`
and the cookie — plus `requireVerified`). Open questions: none blocking; the `arctic` deprecation note above
is for the reviewer.
