# packages/app — Next.js application (`@mentorhub/app`)

Read the root `AGENTS.md` first; this file adds rules for this package only.

- **Layout:** `src/app/` routes (App Router) · `src/server/container.ts` Awilix composition
  root · `src/server/services/` services (one factory function per service, `makeXService`).
- **DI:** register every service in `container.ts`. Stateless and DB-independent → `.singleton()`;
  anything that uses `em` → `.scoped()`. Pages and route handlers get a scope with
  `createRequestScope()` and resolve from `scope.cradle`. Never import `getOrm` outside
  `container.ts`; inject it.
- **UI:** public pages use Tailwind utility classes directly; admin pages (`src/app/admin/**`)
  use components from `@mentorhub/ui`. Add new shadcn components to `packages/ui`, not here.
- **Data access** happens on the server only (server components, route handlers). Pages that
  read the DB export `dynamic = 'force-dynamic'`.
- `/admin` has **no authentication** yet — do not deploy it (see spec 2026-10-17-stack-bootstrap).
- **Tests:** `src/**/*.test.ts` with Vitest; test services through `buildContainer({ getOrm })`
  with fakes. Fakes must behave like the real dependency (see `.ai/lessons.md` on health checks).
- Commands: `pnpm --filter @mentorhub/app dev | build | test | typecheck`.
