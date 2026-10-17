# packages/core — services, container and shared server layer (`@mentorhub/core`)

Read the root `AGENTS.md` and `.ai/docs/engineering-standards.md` first; this file adds rules
for this package only.

- **May import `@mentorhub/db` only** (types and helpers it exports). Never `next`, `react` or
  `@mikro-orm/*` — ESLint blocks them.
- **Layout:** `config/env.ts` (Zod-validated environment), `config/rules.ts` (`RULES` — business
  parameters, the only place for them), `logger.ts` (pino, redaction), `container/` (Awilix
  `container.ts` + `cradle.ts`), `http/` (`errors`, `apiHandler`, `makeCrudRoute`, `auth`),
  `services/<concept>/<name>.service.ts`. `events/` and `validators/<concept>/` arrive with the
  first feature that needs them.
- **Services** are classes (`UserService`), constructor-injected from the cradle, registered by an
  explicit line in `container.ts` (`asClass(...).scoped()`; `.singleton()` only if stateless and
  DB-free) and typed in `cradle.ts`. They throw `AppError` subclasses, never return HTTP responses.
  Mutations on shared state (slots, bookings) run in a DB transaction.
- **External integrations** are ports (`<name>.port.ts`) with adapters under `adapters/`; start
  with a mock adapter.
- **Auth:** `requireSession` fails closed; the dev-admin flag is temporary until the auth spec.
- Pure functions take `now: Date` instead of calling `new Date()`; every exported function has a
  test next to it, including boundary cases. Export public API through `src/index.ts`.
- Commands: `pnpm --filter @mentorhub/core test | typecheck`.
