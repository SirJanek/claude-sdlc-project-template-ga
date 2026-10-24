# packages/app — Next.js application (`@mentorhub/app`)

Read the root `AGENTS.md` and `.ai/docs/engineering-standards.md` first; this file adds rules
for this package only.

- **HTTP wiring and rendering only.** Business rules live in `core`, persistence in `db`,
  presentation primitives in `ui`. May import `@mentorhub/core` and `@mentorhub/ui` — never
  `@mikro-orm/*` (ESLint blocks it).
- **Routes:** one `route.ts` per resource under `src/app/api/<concept>/`. Plain CRUD →
  `export const { GET, POST, PUT, DELETE } = makeCrudRoute({ service, list, create, ... })`;
  workflows → `apiHandler(async (req) => { requireSession(req); …withScope(...) })`. Never a
  hand-written `try/catch` or `NextResponse.json`. Routes reading the DB export
  `dynamic = 'force-dynamic'` (the app must build and boot with no database).
- **Pages:** `<segment>/page.tsx`, default export `<Segment>Page`, under persona route groups
  `(marketing)`, `(auth)`, `(mentee)`, `(mentor)` (create a group only with its first page).
  Data via `apiCall`/`apiCallOrThrow` from `@mentorhub/ui` — no raw `fetch`. Lists →
  `DataTable`; forms → `CrudForm` with the shared schema; states → `feedback/*`.
- Reference example: `src/app/api/users/route.ts` + `src/app/admin/users/page.tsx`.
- Public pages use Tailwind directly; admin pages use components from `@mentorhub/ui`.
- Admin pages share `src/app/admin/layout.tsx` (+ colocated `AdminNav`); every `/admin/**` page fetches through `apiCall` — a server component awaiting the DB crashes `next dev` when the database is down.
- `/admin/**`, `/api/users` and `/api/admin/*` are admin-only through `await requireSession(request)` +
  `requireRole(session, 'admin')`; `(auth)` pages are server components that read `searchParams` and hand
  values to colocated client parts (`SignInForm`, `ResendButton`, `ConfirmSignIn`) — client components never
  import `@mentorhub/core` (it pulls the ORM into the bundle); `src/instrumentation.ts` validates the env at boot.
- After moving routes run `make dev` once (stale `.next/dev/types` break `tsc`).
- **Tests (100% coverage, see root AGENTS.md › Testing):** pages and components with Testing
  Library next to the file (`page.test.tsx`), mocking `apiCall` from `@mentorhub/ui`; route files
  with `// @vitest-environment node`, mocking `@mentorhub/core` to check the route's configuration.
  Every new route or page also gets a case in `tests/integration/app.test.ts`.
- Commands: `pnpm --filter @mentorhub/app dev | build | typecheck | test`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
