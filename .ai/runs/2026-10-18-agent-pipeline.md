# Run: Open Mercato agent pipeline setup (L03)

**Date:** 2026-10-18 · **Agent:** Claude Code (Opus 5.5) · **Requested by:** Jan
**Skill:** `om-setup-agent-pipeline` (repo-installed copy in `.agents/skills/`)
**Branch:** `chore/agent-pipeline` from `develop` (`575f561`)

## Decisions (Jan's answers to the setup interview)

- Validation gate `make check` (lint, typecheck, unit 100%, build, audit); integration stays a
  required CI check, not part of the local gate (Docker, +2–3 min).
- Tracker `github`; GitHub Issues **enabled** on the repo (they were off, fork default).
- `SDLC.md` is the primary process doc; `docs/sdlc/00-OVERVIEW.md` keeps the course overview and
  links to it.
- `CODE_REVIEW.md` generated from the stack; `REVIEW.md` stays for the Claude review workflow and
  links to it.
- Defaults kept: full label taxonomy, QA gate on, agent-browser, specs in `.ai/specs`. Mapped to
  our layout: `paths.analysis: .ai/analyses`, `paths.prototypes: docs/discovery/mockups`.
- `ci.maxWaitMinutes: 20` (default 40) — our full CI takes ~2 min, 20 is ample headroom.
- `AGENTS.md` not generated (exists); its Open Mercato note rewritten.

## Done

- `.ai/agentic.config.json`, `.ai/trackers/github.md`, `.ai/browsers/agent-browser.md`,
  `.ai/scripts/`, `.ai/qa/` (+ `.gitignore` for per-run QA state).
- `SDLC.md` from the template (discovery blocks dropped, labels + QA gate kept) plus a MentorHub
  section (protected `develop`, five required checks, 0 approvals in a one-person repo).
- `BACKWARD_COMPATIBILITY.md` from an inventory of the code: HTTP envelope/CSRF/health contract,
  migrations, workspace exports, `RULES`, env vars, Makefile/CI job names.
- Labels: 25 created, 2 existed (`bug`, `documentation`) — none renamed or recoloured.
- Cross-skill coverage: `SKILL_COVERAGE_OK` (42/42).

## Known gaps

- `om-approve-merge-pr` squash-merges and approves; GitHub will not let the PR author approve their
  own PR (one account) — approval stays a human step, protection requires 0 approvals.
- History so far uses merge commits; the pipeline will squash from now on (both allowed).

## Follow-up: integration tests on demand (Jan, same day)

Jan: the course recommends integration tests on demand — by default they would take too long.
- Integration job moved from `ci.yml` to `.github/workflows/integration.yml`; runs on the
  `run-integration` PR label (labelling + later pushes) or `workflow_dispatch`. Separate file
  because a `labeled` trigger in `ci.yml` would restart and cancel the whole CI on every label the
  pipeline adds.
- Branch protection: required checks 6 → 5 (Integration removed — a never-started required check
  would block every PR without the label).
- The obligation moved into rules: routes, pages, migrations need the label and a green run
  (AGENTS.md, SDLC.md, CODE_REVIEW.md). Protected path `.github/workflows/` changed at Jan's
  explicit request.

