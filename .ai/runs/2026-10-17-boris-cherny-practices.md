# Run: add Boris Cherny's Claude Code practices to AGENTS.md

**Date:** 2026-10-17 · **Agent:** Claude Code (Opus 5.5) · **Requested by:** Jan (course prompt)
**Source:** https://ykdojo.github.io/claude-code-tips/content/boris-claude-code-tips
**Status:** done

## Goal

Pick the tips useful for this project, add them concisely to AGENTS.md (planning complex work,
verifying changes, recording lessons after fixes), fit them into existing instructions without
duplication, and make sure CLAUDE.md imports `@AGENTS.md`.

## Mapping (tip → where it landed)

| Tip | Decision | Where |
|---|---|---|
| 1 Parallel worktrees | adopted (Codex + Claude work in parallel) | Workflow → "Keep the main context clean" |
| 2 Plan mode for complex tasks, re-plan, second reviewer | adopted | Workflow → "Plan complex work first" |
| 3 Update memory after every correction until errors drop | merged into existing rule | `.ai/` rule 4 (immediately, same commit; promote until it stops) |
| 4 Repeated task → skill/command in git | adopted | Workflow → "Automate repetition" |
| 5 Claude fixes bugs from reports/CI/logs | merged | Workflow → TDD bullet |
| 6 Challenge, scrap mediocre fix, detailed specs | adopted (specs already covered) | Workflow → "Done", "Prefer the elegant fix" |
| 7 Terminal setup, statusline, dictation | skipped — personal environment, not repo rules | — |
| 8 Subagents to keep context clean | adopted | Workflow → "Keep the main context clean" |
| 9 Claude for data/analytics | skipped — no data layer yet | — |
| 10 Learning output styles | skipped — personal preference | — |

## Verification

- `grep -n '^@AGENTS.md$' CLAUDE.md` → line 9.
- `claude -p` without tools answered from the new rules (see commit message).

## Handoff

- **Next step:** none for this run. Revisit tip 9 when the product has a database.
