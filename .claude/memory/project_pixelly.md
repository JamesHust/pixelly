---
name: Pixelly Project Overview
description: Architecture and stack details for the Pixelly collaborative design tool
type: project
---

Pixelly is a Figma-like Collaborative Interface Design Tool.

**Why:** Building a self-hosted, AI-assisted design tool with micro-frontend embedding capability.

**How to apply:** Use this context when suggesting features, debugging, or extending the project.

## Stack
- **Frontend**: Next.js 16 (App Router, Turbopack), TypeScript, Tailwind CSS, Konva.js + react-konva (canvas), Zustand (state), Y.js + y-websocket (real-time CRDT collaboration)
- **Backend**: Go + Fiber v2, pgx/v5 (PostgreSQL), go-redis/v9
- **DB**: PostgreSQL 16, Redis 7
- **AI**: Ollama (llama3.2, free/local) via SSE streaming
- **Infra**: Docker Compose (dev: db-only; prod: full stack)

## Key Paths
- Frontend: `apps/web/`
- Backend: `apps/api/`
- Canvas components: `apps/web/components/canvas/`
- Collaboration hub: `apps/api/internal/collab/hub.go`
- DB migrations: `apps/api/internal/db/migrations/`
- Micro-frontend embed route: `apps/web/app/embed/[projectId]/page.tsx`

## Dev Commands
- `docker compose -f docker-compose.dev.yml up -d` — start PostgreSQL + Redis
- `cd apps/api && air -c .air.toml` — Go API with live reload
- `cd apps/web && npm run dev` — Next.js frontend
- `cd apps/api && go run ./cmd/migrate/main.go up` — run migrations

## Architecture Notes
- Real-time collab: Y.js CRDT on frontend, Go WebSocket hub at `WS /ws/collab/:roomId` relays binary Y.js updates
- AI: Go proxies prompts to Ollama, streams SSE back to browser
- Embed: `/embed/[projectId]?token=JWT&readOnly=true` — iframe-embeddable canvas viewer
- Auth: JWT stored in localStorage, `Bearer` header on all API calls
