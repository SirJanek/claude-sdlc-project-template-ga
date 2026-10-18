# Lessons

<!--
Long-term memory written by agents. One line per lesson, newest at the top:
  - YYYY-MM-DD — <the lesson, phrased as what to do> → lessons/YYYY-MM-DD-slug.md (if details exist)
Read this file before starting any task. Add a line after fixing a bug, after a correction
from a human, or when you learn something non-obvious about this project. Longer write-ups
(context, root cause, evidence) go to lessons/YYYY-MM-DD-slug.md and are linked from here.
-->

- 2026-10-18 — Gate dev-only behaviour on an allowlist (`NODE_ENV === "development"`), never on `!== "production"`: Vitest sets NODE_ENV=test, `next start` kept it, and the dev-admin flag opened on a production build (found by the integration suite). Child servers started from tests must not inherit NODE_ENV.
- 2026-10-18 — Never put files other than migrations in `packages/db/src/migrations/`: the migrator glob `!(*.d).{js,ts}` picked up a test file as a pending migration. Migration tests live in `src/migrator/`.
- 2026-10-18 — After moving or renaming Next.js routes, run `next dev` once (or `make dev`): stale `.next/dev/types` still point at the old files and break `tsc`, and neither `next typegen` nor `next build` refreshes them.
- 2026-10-18 — Never silence `git add` (`2>/dev/null`) or pass it a deleted path: one missing pathspec aborts the whole add and the commit goes out with only what was staged before (f25fdf0 shipped without its new files; fixed by a follow-up commit, history not rewritten). Check `git status --short` is empty after committing.
- 2026-10-18 — Review every generated migration: MikroORM turns a table rename into `create` + `drop … cascade` (data loss). Write renames by hand (`alter table … rename`, plus constraint renames), rehearse up → down → up with rows, then confirm `make db-migration` reports no changes.
- 2026-10-17 — Start agents at the repo root. Claude Code reads AGENTS.md only through `@AGENTS.md` in a CLAUDE.md; each package has its own CLAUDE.md importing its AGENTS.md, loaded when the agent touches files there. Launched inside a package, `claude -p` skips imports from parent CLAUDE.md files (outside the working dir), so root rules go missing — verify instructions from the root.
- 2026-10-17 — Health checks must run a real query (`select 1`): MikroORM 7 connects lazily and `checkConnection()` reports "Connection not established" until the first query, so a fake that returns ok hides the bug (unit tests were green, the live server said "down").
- 2026-10-17 — In workspace packages consumed by Next.js (Turbopack) write relative imports without `.js` (`from './rules'`); Turbopack does not map `.js` to `.ts`, `tsc` with `moduleResolution: Bundler` and `tsx` accept both.
- 2026-10-17 — Run logs must record Decisions: what was decided, why, and rejected alternatives (gap found by Jan when checking the repo against the course description; rule 3 now requires it).
