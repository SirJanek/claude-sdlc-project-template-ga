# packages/ui — reusable UI (`@mentorhub/ui`)

Read the root `AGENTS.md` and `.ai/docs/engineering-standards.md` first; this file adds rules
for this package only.

- **Imports nothing internal** (no core/db/app); used by `app` only. The JSON envelope type is
  declared here (`backend/api/types.ts`) on purpose, not shared with core.
- **Where a component goes:**
  1. shadcn primitive → `src/components/ui/`, only via `npx shadcn@latest add <name>` run in this
     folder (`components.json` is configured) — never hand-written. The CLI imports `cn` from the
     `cn` package; that is expected.
  2. Generic panel pattern (form field, table cell, feedback state) → `src/backend/<category>/`.
  3. Component for one concept's domain shape → `src/components/<concept>/` (same name as in db/core).
  4. Used by one page only → colocate next to that `page.tsx` in `app`.
- `src/backend/api/apiCall.ts` is the **only** place allowed to call `fetch()` (ESLint enforces it);
  it never throws and always sends the `x-mentorhub-request` header.
- Lists use `DataTable`, forms `CrudForm` (same Zod schema as the route), states `feedback/*`.
- Components are presentational: no data fetching outside `apiCall`, no business rules.
- Theme tokens in `src/styles/globals.css` — MentorHub's colours, never Preply's.
- **Tests:** every component (including CLI-generated primitives) with Testing Library at 100%
  coverage; assert what the user sees and does (roles, labels, keyboard), not class names.
- Commands: `pnpm --filter @mentorhub/ui test | typecheck`.
