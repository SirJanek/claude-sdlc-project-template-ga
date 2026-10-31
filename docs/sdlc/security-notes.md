# Security notes — agent configuration (lesson 09)

Date: 2026-10-31. Scope: what an AI agent can run, read and send when it works in this repo. Template: `wzory/security-notes.md` from the lesson 09 lab.

## 1. Agent configuration in the repo

- `AGENTS.md`, `CLAUDE.md` (plus one per `packages/*`). `AGENTS.md` has the section "Agent configuration and MCP" with the default rules (#56).
- `.claude/settings.json`:
  - `deny`: `.env`, `.env.*`, `secrets/**`, `*.pem`, `id_rsa*`, `git push --force` / `-f`;
  - `ask`: `git push`, `gh pr create`;
  - hooks listed in section 4.
- `.claude/agents/`: `verifier.md`, `spec-reviewer.md`. `.claude/commands/`: `sdlc-*`.
- `.github/CODEOWNERS` (#59): `.claude/`, `.mcp.json`, `.agents/`, `AGENTS.md`, `CLAUDE.md`, `.github/` have a named owner. "Require review from Code Owners" is **off on purpose**: the repo has one maintainer, who cannot approve their own PR. Turn it on when a second person joins.

## 2. Skills

- About 60 `SKILL.md` files in `.agents/skills/` and `.claude/skills/`, vendored by `npx skills add` (Open Mercato `om-*` and a few others).
- Dynamic commands `` !`cmd` `` inside a skill: **none** (one hit is documentation text in a table, not a skill line).
- `curl`/`wget`: two lines in the browser install docs of `om-setup-agent-pipeline` download a file without a checksum. Read them before using that skill on a new machine.
- Rule: every new or updated skill is read before merge; `` !`cmd` `` lines are code.

## 3. MCP servers

- No `.mcp.json` in the repo, no `enableAllProjectMcpServers`.
- Rule (AGENTS.md): never `enableAllProjectMcpServers: true`; each MCP server has a named owner and goes through code-owner review.

## 4. Hooks (guards outside the model)

| Hook | Event | What it does |
|---|---|---|
| `bash-guard.sh` | PreToolUse(Bash) | blocks recursive `rm` (any flag order), `find -delete`, `curl\|wget … \| sh`, reads of `~/.ssh`, `~/.aws`, `~/.config/gh`, `~/.kube`, `~/.npmrc`, `~/.pypirc`, `.env` (not `.env.example`) |
| `protect-paths.sh` | PreToolUse(Write/Edit) | protected paths need `SDLC_ALLOW_PROTECTED` |
| `no-test-edits.sh` | PreToolUse(Write/Edit) | stops the agent from weakening tests |
| `release-gate.sh` | PreToolUse(Bash) | release guard |
| `format-after-edit.sh` | PostToolUse | formatter |

`bash-guard` has its own test, `.claude/hooks/test-bash-guard.sh`: 23 cases, 14 must block and 9 must pass. Mutation check: removing the recursive-`rm` rule turns 6 cases red.

## 5. Lab results (lesson 09, run in a Docker container with `--network none`)

- **01 hook:** a `SessionStart` hook from a foreign repo runs as soon as the agent opens the folder, before any prompt or login.
- **02 MCP:** with `enableAllProjectMcpServers: true` a project MCP server starts and runs its command without asking.
- **03 skills** and **04 prompt injection:** **not run, by choice** (no agent key in the container; risk not worth it). Analysed on paper:
  - a `` !`cmd` `` line runs when the harness loads the skill, before the model reads anything, so only review before install helps;
  - a plain instruction in a skill ("append to ~/pwned.log") depends on the model obeying it, so permissions and sandbox are the defence;
  - injection in read files (`build-log`) is stopped by a `deny` rule on the private path; on a public path only the model's resistance is left.
- **06 sandbox:** not tested on the host.

## 6. Secrets in session logs

Scan of `~/.claude/projects/` with the lab script (counts only, no values printed):

- database URLs with passwords: mostly local dev or placeholders, a few to be checked by the owner;
- one LLM provider API key and one GitHub OAuth token, both pasted into commands in earlier sessions: **to rotate** (owner action);
- AWS-like strings: false positives (base64 inside embedded images);
- JWTs: short-lived session tokens.

Lesson: any secret the agent sees ends up in the session log on disk. Pass secrets as environment variables set outside the chat, never paste them.

## 7. Lethal trifecta

A leak needs three things at once: access to private data, contact with untrusted content, and a channel to the outside. **In DevMentor we cut the outside channel and the private-data leg at the harness level:** `bash-guard` blocks `curl … | sh` and reads of credential folders, `deny` rules block `.env` and keys, `git push` needs approval.

## 8. Known risks and next steps

- `.env` is still a plain file on disk (protected only by `deny` and `bash-guard`). Plan: move secrets to a secrets manager and inject them with its CLI at run time.
- Sandbox with a domain allowlist not configured yet.
- Hooks in the repo run on every developer machine; a change to a hook is a change to code that runs everywhere, so it needs code-owner review.
