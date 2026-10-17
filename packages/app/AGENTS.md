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
- `/admin/**` and `/api/users` have **no real auth** — dev flag only; do not deploy them.
- After moving routes run `make dev` once (stale `.next/dev/types` break `tsc`).
- Commands: `pnpm --filter @mentorhub/app dev | build | typecheck`.
