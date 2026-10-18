# Run: lesson 03 close-out (comparison with the course reference repo)

**Date:** 2026-10-18 · **Agent:** Claude Code (Opus 5.5) · **Requested by:** Jan ("działaj z B")
**Source:** read-only comparison with the course repo `ai-techleaders-project-after-lesson-03.zip`
**Branch:** `chore/lesson-03-closeout` from `develop` (`c2eb638`)

## Decisions

- Taken over from the course repo: `BACKWARD_COMPATIBILITY.md` §7 session/roles/CSRF, "Product
  decisions", "How to make a breaking change", "What is not protected"; `CODE_REVIEW.md` sections
  "Validation gate" and "Spec-driven development artifacts"; unit-coverage artifact in CI.
- Written for this repo, not copied: our names (`x-mentorhub-request`, `USER_ROLES`), `make check`,
  on-demand integration, what our integration tests actually assert.
- Commit `.ai/cezar/.gitignore` (Cezar cockpit, keeps `launch-key` out of git); ignore `.ai/tmp/`
  (Open Mercato skill worktrees) in git and ESLint, plus `.ai/cezar/worktrees/` in ESLint.
- Fix found on the way: the CI coverage summary only globbed `packages/*`, so `tools/setup`
  (100% gate since PR #15) never appeared in it.
- Not taken over (decided by Jan): integration on every PR — stays on demand; `openmercato.toml`,
  `preview.sh`, seeder — deferred to the Cezar lesson and the first domain feature. Event bus →
  separate issue (gap against our own engineering standards).
- Protected path `.github/workflows/ci.yml` changed at Jan's request (option B).

## Verification

- `make check` green on `1b10302`: 160 tests, 100% coverage in all 5 packages (incl. `tools/setup`).
- CI run 39128951266: 5/5 required checks green; artifact `unit-coverage-39128951266` holds the 5
  `coverage-summary.json` files (downloaded and checked: all at 100% lines).
- Fresh-context review on `1b10302`: approve with fixes — 5 minor + 3 nits (contradictions and
  wrong pointers in `BACKWARD_COMPATIBILITY.md`, missing Verification here, artifact re-run
  overwrite) — all fixed; re-review on the new head before merge.
- Follow-up (not in this PR): a parity test pinning the two copies of the CSRF header name
  (AGENTS.md rule for duplicated logic).
