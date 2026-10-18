# packages/core — services, container and shared server layer (`@mentorhub/core`)

Read the root `AGENTS.md` and `.ai/docs/engineering-standards.md` first; this file adds rules
for this package only.

- **May import `@mentorhub/db` only** (types and helpers it exports). Never `next`, `react` or
  `@mikro-orm/*` — ESLint blocks them.
- **Layout:** `config/env.ts` (Zod-validated environment), `config/rules.ts` (`RULES` — business
  parameters, the only place for them), `logger.ts` (pino, redaction), `container/` (Awilix
  `container.ts` + `cradle.ts`), `http/` (`errors`, `apiHandler`, `makeCrudRoute`, `auth`),
  `services/<concept>/<name>.service.ts`, `events/` (`EventMap` catalogue, typed `EventBus`,
  `subscribers.ts`), `validators/<concept>/<name>-<action>.schema.ts`. Create a new concept folder with
  its first file.
- **Services** are classes (`UserService`), constructor-injected from the cradle, registered by an
  explicit line in `container.ts` (`asClass(...).scoped()`; `.singleton()` only if stateless and
  DB-free — the one exception is `EventBus`, an in-memory handler registry) and typed in `cradle.ts`. They throw `AppError` subclasses, never return HTTP responses.
  Mutations on shared state (slots, bookings) run in a DB transaction.
- **External integrations** are ports (`<name>.port.ts`) with adapters under `adapters/`; start
  with a mock adapter.
- **Auth:** `requireSession` fails closed; the dev-admin flag works only with `NODE_ENV=development`
  (allowlist) and is temporary until the auth spec.
- Pure functions take `now: Date` instead of calling `new Date()`; every exported function has a
  test next to it, including boundary cases. Export public API through `src/index.ts`.
- **Tests:** every service, http helper and rule at 100% coverage; services tested through the
  container with fakes that behave like the real dependency (e.g. a fake ORM that only answers a
  real query). Security rules need a regression test that fails without the rule.
- Commands: `pnpm --filter @mentorhub/core test | typecheck`.
