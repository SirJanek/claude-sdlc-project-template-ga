# packages/ui — reusable UI components (`@mentorhub/ui`)

Read the root `AGENTS.md` first; this file adds rules for this package only.

- **shadcn/ui** components (style "new-york", Tailwind 4, CSS variables) live in
  `src/components/`; add new ones with the shadcn CLI from this folder (`components.json` is
  configured) or copy the official source — then export them from `src/index.ts`.
- Theme tokens are in `src/styles/globals.css` (imported by the app as
  `@mentorhub/ui/styles.css`). MentorHub's own colours — never Preply's.
- Components are presentational: no data fetching, no app or DB imports, no business rules.
- Use `cn()` from `src/lib/utils.ts` to merge classes; keep `data-slot` attributes.
- Commands: `pnpm --filter @mentorhub/ui test | typecheck`.
