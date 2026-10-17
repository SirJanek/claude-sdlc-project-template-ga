# packages/core — reusable domain logic (`@mentorhub/core`)

Read the root `AGENTS.md` first; this file adds rules for this package only.

- **Framework-free:** no React, Next.js, MikroORM or Node-only APIs here. Pure TypeScript that
  runs anywhere (server, client, tests).
- **Business parameters** live only in `RULES` (`src/rules.ts`). Logic takes `rules` as an
  optional last argument so tests can vary it. Values are discovery proposals until a spec
  adopts them — cite the spec in a comment when one does.
- Functions are pure and deterministic: pass `now: Date` in, never call `new Date()` inside.
- Every exported function has a unit test next to it (`*.test.ts`), including boundary cases.
- Export public API only through `src/index.ts`.
- Commands: `pnpm --filter @mentorhub/core test | typecheck`.
