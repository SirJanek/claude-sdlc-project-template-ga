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

## Commands

The stack is not chosen yet: every target below is a stub that exits 1 on purpose.
Wire them up in the first build plan; until then nothing counts as verified.

| Task | Command |
|---|---|
| Install | `make install` |
| Test | `make test` |
| Lint + format | `make lint` |
| Typecheck | `make typecheck` |
| Run locally | `make dev` |
| Full check (what CI runs) | `make check` |

## Conventions

- Source lives in `src/`, tests mirror it under `tests/`.
- Product UI text is English. Human-facing docs are Polish; files agents read
  (`AGENTS.md`, `CLAUDE.md`, skills, hooks, `docs/sdlc/*`) are English.
- Never edit files under `docs/sdlc/` without being asked — they are SDLC artifacts, not docs.
- `docs/discovery/` is input, not requirements. Its business rules, screens (IDs P*, M*, C*,
  T*, A*) and API catalogue are proposals until `docs/sdlc/spec.md` adopts them; when they
  disagree, `spec.md` wins. Reuse the screen IDs so artifacts stay traceable.
- `docs/discovery/mockups/` is a throwaway prototype (mock API in the browser). Do not import
  from it into `src/`, and do not treat its mock as a contract.
- Business parameters (prices, notice periods, fees) are configuration, never literals
  scattered through code.
- Branch from `develop`, merge via PR. Commit messages: imperative mood, reference the
  `intent.md` heading they serve.

## Architecture

- Planned, not built. Roles: guest, mentee, mentor, admin.
- Domains (from discovery): catalogue, booking & holds, payments & plans, sessions & video
  room, messaging, mentor onboarding, payouts, admin moderation & disputes.
- External systems (to be chosen in spec): payment provider (source of truth for charges and
  refunds), video provider (room tokens; join/leave logs are dispute evidence), email/push,
  KYC for mentors.
- Source of truth per artifact: requirements live in `docs/sdlc/`, tickets live in GitHub
  Issues. When these disagree, the repo wins for code and the tracker wins for scope.

## Workflow

- Process: `docs/sdlc/intent.md` → `spec.md` → `plan.md` → code. No accepted `spec.md`, nothing
  to plan; commit the accepted `plan.md` before editing code. Anything the diff does that the
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

Rules — follow them on every task, without being reminded:

1. **Before starting:** read `.ai/lessons.md` and the spec in `.ai/specs/` that the task belongs to.
2. **Specs:** write new specs only in `.ai/specs/` with the date of creation and a kebab-case
   slug. Never rename a spec; when the change merges, move it to `implemented/`.
3. **Runs:** every autonomous AI run creates `.ai/runs/YYYY-MM-DD-slug.md` at the start and
   keeps it current: goal, spec link, steps done, files changed, verification evidence,
   status, and a **Handoff** section (exact next step, open questions) so an interrupted
   run can be resumed by another agent or person. Commit it with the work.
4. **Lessons:** after fixing a bug, after a human corrects you, or when you learn something
   non-obvious about this project, add a line to `.ai/lessons.md` (details in `.ai/lessons/`)
   **immediately, in the same commit as the fix** — not at the end of the session.
   A lesson that keeps recurring is promoted to "Things agents get wrong" below; keep doing
   this until the same mistake stops appearing.
5. **Keep this file current:** when you introduce a convention or a structure, make sure
   `AGENTS.md` contains the instruction for it — that is how the system persists.

`docs/sdlc/` (template SDLC artifacts and `/sdlc-*` commands) still exists alongside `.ai/`;
how the two relate is not decided yet — do not merge or move content between them unasked.

## Things agents get wrong

<!--
Append-only. One line per mistake, phrased as the correction, not as a complaint.
Shared traps go here; Claude-only traps go to CLAUDE.md. Delete an entry only when the
underlying cause is gone. Entries here are also the best source of eval tasks — see
evals/README.md.
-->
