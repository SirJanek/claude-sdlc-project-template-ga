# MentorHub — agent instructions

<!--
Shared project memory for every coding agent (Codex, Claude Code, others). Claude Code loads
it through the `@AGENTS.md` import in CLAUDE.md; CLAUDE.md adds only Claude-specific rules.
Keep this file to ONE page — it is read on every turn.
THE RULE THAT MATTERS: when you correct an agent on the same thing twice, the correction
belongs here (or in CLAUDE.md if it is Claude-only).
-->

1:1 video mentoring marketplace (mentees book vetted practitioners; intro session → weekly
plan on credits). Course project for AI Tech Leaders. Preply.com is a functional/UX benchmark
only — never copy its visual identity, copy or code.

## Stack (assumptions every agent keeps to)

- **Next.js** (latest, App Router) + **React** + **TypeScript** (strict) — one Next.js app.
- **PostgreSQL** with **MikroORM** (entities via `defineEntity`, no decorators; migrations;
  connection pool from `DATABASE_URL`). Local DB: `docker compose` (port 5433).
- **Awilix** for dependency injection — composition root `packages/app/src/server/container.ts`.
- **Tailwind CSS** for public (frontend) pages; **shadcn/ui** for admin (backend) pages.
- **pnpm workspaces monorepo** — code lives in `packages/*`; each package has its own
  `AGENTS.md` with local rules (read it when you work there) and a one-line `CLAUDE.md`
  importing it for Claude Code. Start agents at the repo root so root and package rules both apply.

| Package | Purpose | May depend on |
|---|---|---|
| `packages/app` (`@mentorhub/app`) | Next.js application: routes, pages, API, DI container, services | core, db, ui |
| `packages/core` (`@mentorhub/core`) | Reusable, framework-free logic: business rules and policies | nothing internal |
| `packages/db` (`@mentorhub/db`) | MikroORM config, entities, migrations, ORM helpers | core |
| `packages/ui` (`@mentorhub/ui`) | Reusable UI components (shadcn/ui) and theme tokens | nothing internal |

## Commands

| Task | Command |
|---|---|
| Install | `make install` (pnpm, from the lockfile) |
| Test | `make test` (Vitest in every package, no DB needed) |
| Lint + format | `make lint` (ESLint + Prettier check; fix with `pnpm format`) |
| Typecheck | `make typecheck` |
| Build | `make build` |
| Full check (what CI runs) | `make check` — lint, typecheck, test, build |
| Run locally | `make dev` (starts the DB, then Next.js on :3000) |
| Database | `make db-up`, `make db-down`, `make db-migrate`, `make db-migration NAME=<slug>` |

## Conventions

- Tests sit next to the code as `*.test.ts` inside each package's `src/`.
- Product UI text is English. Human-facing docs are Polish; files agents read
  (`AGENTS.md`, `CLAUDE.md`, skills, hooks, `docs/sdlc/*`) are English.
- Never edit files under `docs/sdlc/` without being asked — they are SDLC artifacts, not docs.
- `docs/discovery/` is input, not requirements. Its business rules, screens (IDs P*, M*, C*,
  T*, A*) and API catalogue are proposals until a spec in `.ai/specs/` adopts them; when they
  disagree, the spec wins. Reuse the screen IDs so artifacts stay traceable.
- `docs/discovery/mockups/` is a throwaway prototype (mock API in the browser). Do not import
  from it into `packages/`, and do not treat its mock as a contract.
- Business parameters (prices, notice periods, fees) live only in `RULES` in `@mentorhub/core`,
  never as literals elsewhere.
- Services never import the ORM singleton: they receive `em` (request-scoped) or other
  dependencies from the Awilix container. Only `container.ts` calls `getOrm()`.
- Schema changes only through migrations (`make db-migration`); never edit an applied migration.
- Workspace packages are consumed as TypeScript source: relative imports without `.js`.
- Respect package boundaries in the table above; a new internal dependency needs a spec.
- Branch from `develop`, merge via PR. Commit messages: imperative mood, reference the
  `intent.md` heading they serve.

## Architecture

- Request → Next.js route/page (`packages/app/src/app`) → request scope from the Awilix
  container → service (`packages/app/src/server/services`) → MikroORM `EntityManager` fork →
  PostgreSQL. Pure rules come from `@mentorhub/core`; admin UI from `@mentorhub/ui`.
- Roles: guest, mentee, mentor, admin. Built so far: `/` (public), `/admin` (users list,
  **no auth yet — local only**), `/api/health`; table `user`.
- Domains to come (from discovery): catalogue, booking & holds, payments & plans, sessions &
  video room, messaging, mentor onboarding, payouts, admin moderation & disputes.
- External systems (to be chosen in spec): payment provider (source of truth for charges and
  refunds), video provider (room tokens; join/leave logs are dispute evidence), email/push,
  KYC for mentors.
- **GitHub is the single source of truth** (chosen over GitHub Projects, Linear or Jira as
  simple and good enough): tasks are GitHub Issues; code **and specs** (`.ai/specs/*.md`) land
  through pull requests; issue and PR states are GitHub labels (taxonomy set in L03 by
  `/om-setup-agent-pipeline`). Requirements history lives in the repo. When repo and tracker
  disagree, the repo wins for code and the tracker wins for scope.

## Workflow

- Process: `docs/sdlc/intent.md` → spec `.ai/specs/YYYY-MM-DD-slug.md` (format: `docs/sdlc/spec.md`)
  → its `## Implementation plan` section (format: `docs/sdlc/plan.md`) → code. No accepted spec,
  nothing to plan; commit the accepted plan before editing code. Anything the diff does that the
  plan does not describe is a review finding.
- **Plan complex work first.** Anything touching more than one module, or with an unclear
  approach, starts as a plan detailed enough to implement in one pass. Get the plan reviewed by
  a second agent or model acting as a skeptical staff engineer. If implementation goes
  sideways, stop and re-plan — do not stack patches on a broken plan.
- "Done" means verified: paste the output of `make check` as evidence, do not assert success.
  For every acceptance criterion, say how it was checked; UI changes are checked in the
  running app, not only by tests. Before a PR, challenge your own diff: what could break,
  and what proves it does not.
- **Prefer the elegant fix.** If a fix works but is a hack, say so, discard it and implement
  the clean solution while the context is fresh.
- Bug fixes are TDD: failing test first, committed separately, then the fix. Never edit the
  test to make it pass. Given a bug report, failing CI or logs, investigate and fix from
  that evidence yourself instead of asking how.
- **Keep the main context clean.** Delegate research, broad code search and independent
  sub-tasks to subagents; verification runs in a separate agent that checks, never fixes.
  Parallel work uses one git worktree per agent — never two agents in one working tree.
- **Automate repetition.** A task done more than once a day becomes a skill or command in
  `.claude/skills/` or `.claude/commands/`, committed to git — propose it, do not wait to be asked.

## Hard rules (Claude Code enforces these with hooks; every other agent must follow them unaided)

- Do not change protected paths as a side effect of other work: `.github/workflows/`,
  `.claude/hooks/`, `.claude/settings.json`, `docs/sdlc/LESSONS.md`, `docs/sdlc/bands.yaml`.
  If a change there is genuinely needed, stop and ask the human; say in the PR what control
  changes and why.
- Never read `.env*`, `secrets/`, `*.pem` or `id_rsa*`. Never force-push.
- Nothing reaches production without a named human release approval.

## Agent workspace: `.ai/` (mandatory)

| Path | What goes there | Name format |
|---|---|---|
| `.ai/specs/` | Specifications for spec-driven development (SDD), one per change | `YYYY-MM-DD-slug.md` |
| `.ai/specs/implemented/` | Specs whose change is merged — move the file here, keep its name | same |
| `.ai/specs/archive/` | Specs abandoned or superseded — move here with a line saying why | same |
| `.ai/runs/` | Log of every autonomous AI run | `YYYY-MM-DD-slug.md` |
| `.ai/lessons.md` | One-line findings, conclusions and improvements written by agents (long-term memory) | newest on top |
| `.ai/lessons/` | Longer write-ups linked from `lessons.md` | `YYYY-MM-DD-slug.md` |
| `.ai/skills/` | Project extensions/overrides of skills (rules in `.ai/skills/README.md`) | `<skill-name>/SKILL.md` |
| `.ai/analyses/README.md` | Index of requirement analyses and project docs kept for humans in `docs/` | one row per analysis |

Rules — follow them on every task, without being reminded:

1. **Before starting:** read `.ai/lessons.md` and the spec in `.ai/specs/` that the task belongs to.
2. **Specs:** write new specs only in `.ai/specs/` with the date of creation and a kebab-case
   slug. Never rename a spec; when the change merges, move it to `implemented/`.
3. **Runs:** every autonomous AI run creates `.ai/runs/YYYY-MM-DD-slug.md` at the start and
   keeps it current: goal, spec link, steps done, **Decisions** (what was decided, why, and
   which alternatives were rejected), files changed, verification evidence, status, and a
   **Handoff** section (exact next step, open questions) so an interrupted run can be
   resumed by another agent or person. Commit it with the work.
4. **Lessons:** after fixing a bug, after a human corrects you, or when you learn something
   non-obvious about this project, add a line to `.ai/lessons.md` (details in `.ai/lessons/`)
   **immediately, in the same commit as the fix** — not at the end of the session.
   A lesson that keeps recurring is promoted to "Things agents get wrong" below; keep doing
   this until the same mistake stops appearing.
5. **Skills and analyses:** before running a skill, check `.ai/skills/<skill-name>/` and
   apply it on top (project specifics win, but never relax safety or quality rules). Requirement analyses and project docs are written
   to `docs/` for humans and get a row in `.ai/analyses/README.md` in the same commit.
6. **Keep this file current:** when you introduce a convention or a structure, make sure
   `AGENTS.md` contains the instruction for it — that is how the system persists.

**Specs live only in `.ai/specs/`** (decided 2026-10-17). `docs/sdlc/` keeps the process:
`intent.md`, the format templates `spec.md` and `plan.md` (never filled in place),
`00-OVERVIEW.md`, `bands.yaml` and `LESSONS.md` (production incidents only — agent learnings
go to `.ai/lessons.md`). The `/sdlc-*` commands read and write `.ai/specs/`.

**Open Mercato skills (`om-*`) are not set up here yet — do not run `/om-setup-agent-pipeline`.**
Order agreed with the course: stack and repo setup (L02) → safety net (CI, tests,
`make check` wired) → Open Mercato pipeline and SDLC (L03). When L03 runs setup:
`tracker: github`, `validation.commands: ["make check"]`, `paths.analysis: ".ai/analyses"`,
`paths.prototypes: "docs/discovery/mockups"`, keep `runs`/`specs` defaults, and decide which
process description is primary (`docs/sdlc/00-OVERVIEW.md` vs the generated `SDLC.md`). Until then the `om-*`
skills stop on the missing `.ai/agentic.config.json` — that is expected.

## Things agents get wrong

<!--
Append-only. One line per mistake, phrased as the correction, not as a complaint.
Shared traps go here; Claude-only traps go to CLAUDE.md. Delete an entry only when the
underlying cause is gone. Entries here are also the best source of eval tasks — see
evals/README.md.
-->
