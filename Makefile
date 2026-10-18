# Single-command interface. Everything else in this repo calls these targets —
# AGENTS.md, CLAUDE.md, the evals, the verifier subagent, CI.
#
# The one rule that matters: EVERY TARGET MUST EXIT NON-ZERO ON FAILURE.
# Stack: pnpm workspaces (packages/app, core, db, ui) — see README.md › Architecture.

# Builds never phone home.
export NEXT_TELEMETRY_DISABLED := 1

.PHONY: install setup-browser test test-integration lint typecheck build audit check dev db-up db-down db-migrate db-migration rollback quarantine

install:   ## Install dependencies from the lockfile
	pnpm install --frozen-lockfile

test:      ## Unit tests in every package with the 100% coverage gate (Vitest, no database needed)
	pnpm -r test

setup-browser: ## Install the headless Chrome used by agent-browser (idempotent; once per machine)
	pnpm browser:install

test-integration: setup-browser ## Integration suite: ephemeral PostgreSQL (testcontainers) + app driven by agent-browser. Needs Docker
	pnpm test:integration

lint:      ## ESLint + Prettier check
	pnpm lint

typecheck: ## Static type check in every package
	pnpm typecheck

build:     ## Production build of the Next.js app
	pnpm build

audit:     ## Dependency vulnerabilities (high and above); exceptions live in pnpm-workspace.yaml
	pnpm audit --audit-level high

check: lint typecheck test build audit   ## Everything CI runs. "Done" means this passed.

dev: db-up ## Run locally: database in Docker + Next.js dev server on :3000 (dev-admin access on)
	ALLOW_DEV_ADMIN=1 pnpm dev

db-up:     ## Start local PostgreSQL (docker compose, port 5433) and wait until healthy
	docker compose up -d --wait db

db-down:   ## Stop local PostgreSQL (data stays in the volume)
	docker compose stop db

db-migrate: ## Apply pending migrations
	pnpm db:migrate

db-migration: ## Generate a migration from entity changes: make db-migration NAME=add-x
	pnpm db:migration $(NAME)

# --- Stage 6 runbooks, referenced from docs/sdlc/bands.yaml ---------------------------
# Rehearse both in staging before listing them as pre-approved. A runbook that has never
# been run is a plan, and incidents are the wrong time to find out which one you have.

rollback:  ## Roll back the last deployment
	@echo "TODO: wire up rollback" && exit 1

quarantine: ## Mark a flaky test as quarantined: make quarantine TEST=<id>
	@echo "TODO: wire up quarantine for $(TEST)" && exit 1
