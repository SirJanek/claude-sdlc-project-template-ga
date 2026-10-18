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
