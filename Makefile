.PHONY: help setup dev build test lint typecheck tokens audit \
        db-start db-stop db-reset db-status migrate \
        e2e docker-build docker-run docker-stop

# ── Default ───────────────────────────────────────────────────────────────────
help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}' | sort

# ── First-time setup ─────────────────────────────────────────────────────────
setup: ## Install deps, copy .env.example, and start local Supabase
	@[ -f .env.local ] || cp .env.example .env.local && echo "Created .env.local — fill in your Supabase values"
	npm ci --legacy-peer-deps
	npx supabase start
	@echo ""
	@echo "Local Supabase is running. Copy the printed API URL and anon key into .env.local"
	@echo "Then run: make migrate && make dev"

# ── Development ──────────────────────────────────────────────────────────────
dev: ## Start the Next.js development server
	npm run dev

build: ## Production build (outputs to .next/standalone)
	npm run build

# ── Quality checks (mirrors CI jobs) ─────────────────────────────────────────
lint: ## Run ESLint
	npm run lint

typecheck: ## Run TypeScript compiler check
	npx tsc --noEmit

test: ## Run Vitest unit tests
	npm test -- --run

test-watch: ## Run Vitest in watch mode
	npm test

tokens: ## Build design tokens (Style Dictionary)
	npm run build:tokens

audit: ## Check for high-severity dependency vulnerabilities
	npm audit --audit-level=high

check: lint typecheck test tokens build ## Run all CI checks locally

# ── Database (local Supabase via Docker) ─────────────────────────────────────
db-start: ## Start local Supabase (Docker)
	npx supabase start

db-stop: ## Stop local Supabase
	npx supabase stop

db-reset: ## Reset local Supabase DB and re-apply all migrations
	npx supabase db reset

db-status: ## Show local Supabase service status and credentials
	npx supabase status

migrate: ## Apply pending migrations to the local DB
	npx supabase db push --local

migrate-remote: ## Apply pending migrations to a remote DB (requires SUPABASE_DB_URL)
	@[ -n "$$SUPABASE_DB_URL" ] || (echo "SUPABASE_DB_URL is not set" && exit 1)
	npx supabase db push --db-url "$$SUPABASE_DB_URL"

# ── E2E tests ─────────────────────────────────────────────────────────────────
e2e: ## Run Playwright E2E tests
	npx playwright test

e2e-ui: ## Open Playwright UI mode
	npx playwright test --ui

# ── Docker (local image build/run) ───────────────────────────────────────────
docker-build: ## Build the production Docker image locally
	@[ -f .env.local ] || (echo ".env.local not found — run 'make setup' first" && exit 1)
	docker build \
		--build-arg NEXT_PUBLIC_SUPABASE_URL=$$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d= -f2) \
		--build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=$$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local | cut -d= -f2) \
		-t evecosys:local .

docker-run: ## Run the local Docker image on port 3000
	docker run -d \
		--name evecosys-local \
		--env-file .env.local \
		-p 3000:3000 \
		evecosys:local
	@echo "Running at http://localhost:3000"

docker-stop: ## Stop and remove the local Docker container
	docker stop evecosys-local 2>/dev/null || true
	docker rm   evecosys-local 2>/dev/null || true
