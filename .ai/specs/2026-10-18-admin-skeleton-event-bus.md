# Spec: Admin panel skeleton + typed event bus with the first event (`auth.user.created`)

**Intent:** none directly — enabling infrastructure for the [intent.md](../../docs/sdlc/intent.md) › Desired outcome "core path find → book → pay → meet → review works end to end" (bookings, payments and messages need the event bus, shared validators and an admin back-office for the operations/trust & safety role). Scope source: issue #17, not an intent line. Commits cite "Desired outcome".
**Issue:** #17
**Status:** draft · autonomous spec (`om-auto-write-spec`, assumptions below await Jan's confirmation) · **one spec, one issue, two phases — deliberately not split (Jan)**

## 📝 TLDR

`/admin` today only redirects to `/admin/users`, and the app has no mutation at all (`UserService` only
has `list()`). **Phase 1** adds an admin shell (shared layout with *Dashboard* / *Users* navigation) and turns
`/admin` into a Dashboard that shows whether the database is reachable. **Phase 2** ships the first real
mutation — an admin creates a user over `POST /api/users` — together with the primitives the engineering
standards deferred "until the first feature": a typed in-process `EventBus`, the first shared Zod validator
and the first event `auth.user.created`, so they arrive with a consumer instead of as empty scaffolding.

## 📝 Problem Statement

- No navigation: every admin screen is reachable only by typing its URL; `/admin` is a bare redirect.
- Nobody can see at a glance whether the app talks to its database (today: `curl /api/health`).
- `engineering-standards.md` requires domain events through a typed emitter in `core/src/events` (registered
  in the `Cradle`) and shared Zod validators in `core/src/validators/<concept>/`; both were deferred
  ("until the first feature", `.ai/specs/implemented/2026-10-18-engineering-standards.md`) and still do not
  exist. Every later concept (bookings, payments, messages) needs them.
- `makeCrudRoute` supports `create`, but no route uses it, so its write path (CSRF, 422/409 mapping) is
  untested against a real resource.

## 📝 Proposed Solution

### Phase 1 — admin panel skeleton

- `packages/app/src/app/admin/layout.tsx` — shared shell for every `/admin/**` page: a header with a
  `<nav aria-label="Admin">` holding **Dashboard** (`/admin`) and **Users** (`/admin/users`). The active link
  carries `aria-current="page"`. Links are plain `next/link` anchors (keyboard-accessible by default, visible
  focus ring) styled with Tailwind + the existing `cn` / shadcn tokens; no new shadcn primitive is needed.
- The active-link logic needs `usePathname`, so the nav is a small client component
  `admin/AdminNav.tsx` colocated with the layout (one consumer → colocate; promoted to `ui/src/backend/`
  only when a second panel needs it). The layout itself stays a server component. `/admin/users` keeps its
  page inside the shell (its own `<main>` is fine because the layout renders only the header + `{children}`,
  no second `<main>`).
- `/admin` becomes the **Dashboard** (`admin/page.tsx`, replaces the redirect): a client page that loads
  the database state through `apiCall('/api/admin/health')` and renders one card: **Database** —
  `Connected` (db `up`), `Database unreachable` (db `down`), a loading state, and an error state with retry
  (e.g. 401/403). `GET /api/admin/health` is a new admin-only envelope route
  (`requireSession` + `requireRole('admin')`, `force-dynamic`) over the same `HealthService.check()` as
  `/api/health`; a down database is a successful `200` report (`{ ok: true, data: { status, db } }`),
  never an HTTP error. The app still builds and boots with no database.
  *Amended during implementation:* the first design was a server component awaiting `healthService.check()`
  directly (no new endpoint). The integration run showed `next dev` answers 500 for it while the database is
  down (React's dev debug serialisation throws on pg's `AggregateError`; `next start` is fine, and
  `connection()` / deferring the call did not help). A client page over `apiCall` is also what
  `packages/app/AGENTS.md` prescribes, and it puts the Dashboard data behind the admin guard.
- Auth: the Dashboard data is guarded by the API it calls. The "Local only — dev access, no auth" warning
  badge moves into the layout header so every admin page carries it (removed from the users page heading to
  avoid duplicating it).

### Phase 2 — event bus, validator, first mutation

| Piece | Where | Behaviour |
|---|---|---|
| Event catalogue | `core/src/events/events.ts` | `interface EventMap { 'auth.user.created': { userId: string; email: string } }`; IDs are `concept.entity.action`, past tense; adding an event = one line here |
| Bus | `core/src/events/event-bus.ts` | `class EventBus` (`constructor({ logger })`): `on(event, handler)` → returns an `unsubscribe` function; `emit(event, payload)` → `Promise<void>` that runs the handlers registered at that moment in registration order, **awaits each**, and **logs and swallows** a throwing/rejecting handler (`logger.error({ err, event }, 'event handler failed')`) so a subscriber can never fail the request or block the others. Payload types are inferred from `EventMap` (a wrong payload is a compile error). In-process only — no queue, no persistence. |
| Registration | `container.ts` / `cradle.ts` | `eventBus: asClass(EventBus).singleton()` (+ `eventBus: EventBus` in `Cradle`). `buildContainer` then calls `registerEventSubscribers(container.cradle)` once, so subscribers are wired exactly once per container (the container is a `globalThis` singleton, hot-reload-safe). |
| Subscriber | `core/src/events/subscribers.ts` | `registerEventSubscribers({ eventBus, logger })`: one subscriber for `auth.user.created` that writes `logger.info({ event, payload }, 'domain event')`. Log only — no email/notification port yet. |
| Redaction | `core/src/logger.ts` | `REDACTED_PATHS` gains `email` and `*.email`, so the payload's email prints as `[redacted]`; `userId` stays for correlation. Applies to every log line (nothing logs emails today). |
| Validator | `core/src/validators/auth/user-create.schema.ts` | `userCreateSchema = z.object({ email, name, role })` — `email`: trimmed, lower-cased, valid e-mail, ≤ 320 chars; `name`: trimmed, 1–120 chars; `role`: one of `USER_ROLES`, default `mentee`. Unknown keys are stripped (Zod object default) — no mass assignment. `UserCreateInput` exported. Reusable by a form later (none now). Lower-casing matters: the DB unique index on `email` is case-sensitive. |
| Service | `UserService.create(input)` | `em.create(User, …)` → `em.flush()` → **then** `eventBus.emit('auth.user.created', { userId, email })` → returns a `UserListItem` (same shape as `list()`). The `users` table has exactly one unique constraint besides the PK (`email`), so a unique violation on it is translated to `ConflictError('A user with this email already exists.')` **in the service** (not the route); any other error propagates and **nothing is emitted**. `UserService` stays `scoped`; it receives the singleton bus through the cradle. |
| DB helper | `packages/db` | `isUniqueViolation(error: unknown): boolean` (wraps MikroORM's `UniqueConstraintViolationException`) exported from `@mentorhub/db` (class-level: the service message must be revisited when another unique index is added) — `db` is the only package allowed to import `@mikro-orm/*`, so `core` cannot test the exception class itself. |
| Route | `app/src/app/api/users/route.ts` | adds `create: { schema: userCreateSchema, run: (service, input) => service.create(input) }` and `authorize: (request) => { requireRole(requireSession(request), 'admin'); }` (block body: `requireRole` returns void) to the existing `makeCrudRoute` config. The same `authorize` applies to `GET` (assumption 5). |
| Health route | `app/src/app/api/admin/health/route.ts` | see Phase 1 — `apiHandler` + admin guard + `healthService.check()` |
| Exports | `core/src/index.ts` | `EventBus`, `EventMap`, `userCreateSchema`, `UserCreateInput` (additive). |

**Alternatives considered:** `EventEmitter` from `node:events` (rejected: untyped, and a handler error
throws into `emit`); a typed lib such as `mitt` (rejected: a dependency for ~30 lines, no error isolation);
emitting inside the DB transaction (rejected: a subscriber could see an uncommitted row; emit after flush);
catching the unique violation in the route (rejected: standards put translation in services); an
`asFunction` factory that also subscribes (rejected: hides wiring inside the binding, the issue asks for
`asClass(EventBus).singleton()`); a `findOne({ email })` pre-check as the only guard (rejected: racy — the DB
constraint is the source of truth).

## 📝 Architecture

```
app → core → db                      ui (app only)
 admin/layout.tsx ─ AdminNav.tsx (client)         Card, Badge (existing)
 admin/page.tsx ──► apiCall ──► api/admin/health ──► healthService.check()
 api/users/route.ts ► makeCrudRoute(create) ► userService.create ──► db: User, isUniqueViolation
                                                   └─► eventBus.emit('auth.user.created')
                                                            └─► logger subscriber (email redacted)
```

Dependency direction unchanged (ESLint `no-restricted-imports` keeps passing). New folders are created
with their first file: `core/src/events/`, `core/src/validators/auth/`.

## 📝 Data Model

None. The `users` table already has the unique `email` and the `role` check; no migration. (Covered by
`tests/integration/migrations.test.ts` › "enforce the role check and unique email".)

## 📝 API Contracts

`POST /api/users` — admin only; header `x-mentorhub-request: 1` required (CSRF, existing `apiHandler` rule).

| Request | Response |
|---|---|
| `{ "email": "Anna@Example.com ", "name": "Anna", "role": "mentor" }` (valid; `role` optional) | `200` `{ ok: true, data: { id, email: "anna@example.com", name, role, createdAt } }` — the `apiHandler` success envelope returns 200 for every method today; 201 would change the shared handler and is out of scope |
| invalid body / bad JSON | `422` `validation_failed` with `fieldErrors` (`{ email: ["…"] }`) |
| email already exists (any case) | `409` `conflict` |
| no session | `401` `unauthorized` |
| session with a role other than `admin` | `403` `forbidden` |
| missing CSRF header | `403` |

`GET /api/users` is unchanged for the dev admin (the only session that exists today).
**Event contract:** `auth.user.created` `{ userId, email }` — emitted exactly once per successful create,
after the row is flushed; never on a failed create (422, 409, DB error).

## 📝 UI/UX

Admin shell: header (product name, **Dashboard**, **Users**, the dev-access warning badge) above a centred
content area. Dashboard: title "Admin · Dashboard", a "Database" card with the state badge (`Connected`
default, `Database unreachable` destructive) and one explanatory line. States: loading — a status line;
DB down — the unreachable state; no session — the card shows the API's denial with a retry button, as
`/admin/users` does. No create form on `/admin/users` (assumption 2). Mockups
not produced — the Dashboard is a single card in the existing design language; screenshots of the running
pages are attached to the implementation PR instead.

## 📝 Edge Cases & Failure Scenarios

| Situation | Result |
|---|---|
| DB down while opening `/admin` | Dashboard renders `Database unreachable`; navigation still works |
| DB down on `POST /api/users` | `500 internal_error`, generic message; no event |
| Two creates with the same email race | the DB unique index rejects the second → `409`; one event only |
| Email differing only in case/whitespace | normalised by the schema → `409` for the duplicate |
| Subscriber throws / rejects | logged, swallowed; request still `200`, other subscribers still run |
| Subscriber unsubscribes during `emit` | `emit` iterates a snapshot of handlers; the change applies to the next emit |
| `emit` with no subscribers | resolves immediately |
| Extra body fields (e.g. `id`, `createdAt`) | stripped by the schema, never reach the entity |
| `buildContainer` called twice (tests) | each container gets its own bus and subscribers — no cross-talk |

## 📝 Risks & Impact Review

- **Contract change:** the `/admin` → `/admin/users` redirect is asserted by `tests/integration/app.test.ts`
  and named in `BACKWARD_COMPATIBILITY.md` › *What is not protected*. The implementation PR updates both
  (dashboard text + navigation to Users in the test, and that sentence).
- Additive otherwise: new `POST /api/users`, new `@mentorhub/core` / `@mentorhub/db` exports, `REDACTED_PATHS`
  extended (redaction can only hide more). §7 (session/roles/CSRF) stays intact — the new `authorize`
  composes `requireSession` + `requireRole`, it does not change them.
- Security: first write path. Admin-only, CSRF header, Zod-validated, no mass assignment, email redacted in
  logs, generic 500. No real authentication exists yet (dev-admin allowlist `NODE_ENV=development` +
  `ALLOW_DEV_ADMIN=1`), so in every non-dev environment the route answers 401; `/admin` must still not be
  deployed before the auth spec (AGENTS.md).
- `EventBus` is a deliberate stateful singleton (an in-memory handler registry), an exception to `packages/core/AGENTS.md` › "`.singleton()` only if stateless and DB-free"; the same PR amends that rule.
- The new admin guard also tightens `GET /api/users` for non-admin sessions (200 → 403); none exists today besides the dev admin. Recorded in BC §1.
- A subscriber is awaited inside the request, so a slow subscriber slows the response. Acceptable while the
  only subscriber is a log line; revisit (fire-and-forget or a queue) when a real subscriber appears.
- Rollback: revert the PR — no migration, no data written outside `users`.

## Resolved assumptions (autonomous defaults)

Defaults 1–4 are the ones written in issue #17; 5–7 were decided while writing this spec.

| # | Question | Default taken | Notes |
|---|---|---|---|
| 1 | Dashboard content beyond DB state? | **DB state only** | counts/charts are a follow-up |
| 2 | UI form on `/admin/users`? | **No** — API + list only | a `CrudForm` bound to `userCreateSchema` is a follow-up |
| 3 | Which roles may create users? | **Admin only** | the created user's role may be any of `USER_ROLES` (admin endpoint) |
| 4 | Subscriber beyond logging? | **Log only** | no email/notification port yet |
| 5 | Does the new `authorize` also guard `GET /api/users`? | **Yes**, one admin guard for the whole route | for the only existing session (dev admin) nothing changes |
| 6 | Dashboard session check? | **Admin guard** on the new `/api/admin/health` | amended during implementation (was: none, server-rendered) |
| 7 | Success status of `POST` | **200** via the shared envelope | not 201 — would change `apiHandler` for all routes |

None of these carries `⚠ NEEDS HUMAN CONFIRMATION`.

## 📋 Phasing

Two phases in **one spec and one implementation PR** (decided by Jan; not to be split):

1. **Phase 1 — admin skeleton.** Layout + `AdminNav`, Dashboard, move the dev-access badge, update the
   integration test and the BC sentence. Independently useful.
2. **Phase 2 — event bus + user create.** `events/`, validator, `isUniqueViolation`, `UserService.create`,
   container wiring, route, redaction paths, tests.

## ✅ Acceptance criteria

**Phase 1**
1. `/admin` shows the Dashboard; with the DB up it shows `Connected`; with the DB down it shows
   `Database unreachable` and does not crash. *(unit: both states; integration: up, and down in the existing DB-stop test)*
2. `/admin/users` still lists users inside the same layout. *(integration)*
3. The nav is on both pages, uses real links (keyboard-accessible), and marks the current page with
   `aria-current="page"`; no other link has it. *(unit: per path; integration: attribute on both pages)*
4. `/admin` no longer redirects. *(integration test updated)*

**Phase 2**
5. An admin `POST /api/users` with a valid body returns the envelope with the new user (e-mail lower-cased,
   role default `mentee`); the user appears in `GET /api/users` and on `/admin/users`. *(unit service + route; integration)* A body `{ id, createdAt, role }` reaches `service.create` as `{ email, name, role }` only *(route unit test)*.
6. Invalid body → 422 `validation_failed` with `fieldErrors`; duplicate email (any case) → 409 `conflict`;
   no session → 401; wrong role → 403 on **both GET and POST**; missing CSRF header → 403. *(unit + integration; wrong role is unit-only (mentee session) because the only real session is admin)* Two concurrent creates of one email, second flush rejecting with a unique violation → one `UserListItem`, one `ConflictError`, exactly one emit *(service unit test)*.
7. `auth.user.created` is emitted exactly once per successful create, after the flush, and never on a failed one;
   a throwing subscriber neither fails the request nor stops other subscribers. *(unit: bus + service; the log line's redaction is unit-tested — the integration servers run with `LOG_LEVEL=silent`)*
8. The bus is a container singleton; `UserService` stays scoped; subscribers register once per container. *(unit: container)*
9. `make check` green at 100% coverage in every package; `make test-integration` green.

## Implementation plan

### Phase 1: Admin skeleton
1. `admin/AdminNav.tsx` (client, `usePathname`, `aria-current`) + `admin/layout.tsx` (header, nav, dev badge); remove the badge from the users page. Tests: nav marks only the active link, layout renders children.
2. `api/admin/health/route.ts` (admin guard, envelope) and `admin/page.tsx` Dashboard (client, `apiCall`); tests for `up`, `down`, loading, error + retry, and the route's 200/401/403.
3. Update `tests/integration/app.test.ts` (Dashboard text, `aria-current`, navigation to Users, Dashboard in the DB-down test) and the BC "What is not protected" sentence.

### Phase 2: Event bus + user create
4. `core/src/events/{events,event-bus,subscribers}.ts` + `REDACTED_PATHS` (`email`, `*.email`); unit tests (order, unsubscribe, failing/rejecting handler logged, redaction).
5. `validators/auth/user-create.schema.ts` + tests (trim, lower-case, default role, bounds, stripped keys).
6. `db`: `isUniqueViolation` + test; `UserService.create` (+ cradle/container wiring, exports) with tests: persists, emits once after flush, no emit on conflict / other error, 409 mapping.
7. Route: `create` + admin `authorize`; route tests (200, 422, 409, 401, 403, CSRF).
8. Integration tests: create → list → page; 422; duplicate 409; denied path (production server 401, no CSRF 403); event log redacted.
9. Docs: BC §1 (new endpoints `POST /api/users` and `GET /api/admin/health`, `GET /api/users` tightened to admin) and §3 (new exports), `packages/core/AGENTS.md` (singleton exception for `EventBus`; layout lists `events/` and `validators/auth/`), AGENTS.md "Built so far", engineering-standards (events/validators now exist), lesson + run log.
10. `make check`, `make test-integration`, UI checked in the running app with screenshots; PR labelled `run-integration`.
