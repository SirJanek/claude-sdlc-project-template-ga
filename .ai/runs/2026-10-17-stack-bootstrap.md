# Run: stack bootstrap (pnpm monorepo, Next.js, MikroORM, Awilix, Tailwind, shadcn/ui)

**Date:** 2026-10-17 · **Agent:** Claude Code (Opus 5.5) · **Requested by:** Jan (course L02 prompt)
**Spec:** [.ai/specs/2026-10-17-stack-bootstrap.md](../specs/2026-10-17-stack-bootstrap.md)
**Branch:** `feat/stack-bootstrap` from `develop` (after PR #1 merged as `ebe13a0`)
**Status:** in progress

## Decisions

- Name stays **MentorHub** (course prompt says "DevMentor"); packages `@mentorhub/*` — Jan.
- **pnpm workspaces** (strict deps, monorepo standard) over npm workspaces — Jan.
- **docker compose** Postgres on port 5433 (does not clash with the local Homebrew Postgres 16 on
  5432) over native install — Jan.
- PR #1 merged first, then a fresh branch from `develop` — Jan.
- Versions at start: Next.js 16.4.2, MikroORM 7.2.5, Awilix 13.0.5, Tailwind 4.3.3, Node 26.5,
  pnpm 10.34.5, Docker 29.6.

## Steps

- [x] Merge PR #1, branch `feat/stack-bootstrap`
- [x] Spec + implementation plan
- [ ] Workspace tooling
- [ ] core · db · ui · app
- [ ] Makefile + docker compose
- [ ] Verification (make check, migrations, live app, headless render, mutation)
- [ ] Docs (AGENTS.md files, README)
- [ ] PR

## Handoff

- **Next step:** workspace tooling (commit 2 in the plan).
