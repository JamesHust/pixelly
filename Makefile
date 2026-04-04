.PHONY: dev dev-db dev-api dev-web build migrate seed lint test clean

# Start development databases
dev-db:
	docker compose -f docker-compose.dev.yml up -d

# Stop development databases
stop-db:
	docker compose -f docker-compose.dev.yml down

# Start Go API with live reload (requires: go install github.com/cosmtrek/air@latest)
dev-api:
	cd apps/api && air -c .air.toml

# Start Next.js dev server
dev-web:
	cd apps/web && npm run dev

# Run database migrations
migrate-up:
	cd apps/api && go run ./cmd/migrate/main.go up

migrate-down:
	cd apps/api && go run ./cmd/migrate/main.go down

# Build Go binary
build-api:
	cd apps/api && go build -o bin/pixelly ./cmd/server/main.go

# Build Next.js production
build-web:
	cd apps/web && npm run build

# Build all Docker images
build:
	docker compose build

# Run all tests
test-api:
	cd apps/api && go test ./... -v

test-web:
	cd apps/web && npm run test

# Lint
lint-api:
	cd apps/api && golangci-lint run

lint-web:
	cd apps/web && npm run lint

# Install all dependencies
install:
	cd apps/web && npm install
	cd apps/api && go mod download

# Clean build artifacts
clean:
	rm -rf apps/api/bin apps/api/tmp
	rm -rf apps/web/.next apps/web/out

# Setup: first-time project init
setup: install dev-db
	sleep 5
	make migrate-up
	@echo "\n✅ Pixelly is ready! Run 'make dev-api' and 'make dev-web' to start.\n"
