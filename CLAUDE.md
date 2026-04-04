# Pixelly - CLAUDE.md

## Project Overview

**Pixelly** is a collaborative design editor (Figma-like) built as a monorepo with:
- `apps/api` - Go backend (Fiber framework)
- `apps/web` - Next.js 16 frontend (React 19, App Router)

Core capabilities: canvas-based design editing, real-time multi-user collaboration (CRDT), and AI-powered design generation via local LLM.

---

## Tech Stack

### Backend (`apps/api`)
- **Language:** Go 1.22
- **Framework:** Fiber v2
- **Database:** PostgreSQL 16 (pgx v5 driver)
- **Cache:** Redis 7 (go-redis v9)
- **Auth:** JWT (golang-jwt v5), bcrypt passwords
- **WebSocket:** Fiber contrib websocket
- **Logging:** zerolog
- **Hot reload:** `air`

### Frontend (`apps/web`)
- **Framework:** Next.js 16 (App Router, TypeScript)
- **Canvas:** Konva.js 10 + react-konva
- **Collaboration:** Yjs 13 + y-websocket (CRDT)
- **State:** Zustand 5
- **Styling:** Tailwind CSS 4
- **UI:** Radix UI primitives, lucide-react icons, sonner toasts
- **AI:** Vercel AI SDK (@ai-sdk/openai)

### Infrastructure
- PostgreSQL 16 Alpine
- Redis 7 Alpine
- pgAdmin 4 (dev only, port 5050)
- Docker Compose (dev + prod configs)

---

## Development Workflow

```bash
# First-time setup
make setup

# Daily dev (3 terminals)
make dev-db     # Start Postgres + Redis via Docker
make dev-api    # Go API on :8080 (hot reload)
make dev-web    # Next.js on :3000

# Migrations
make migrate-up
make migrate-down

# Tests & lint
make test-api
make test-web
make lint-api
make lint-web
```

---

## Project Structure

```
pixelly/
├── apps/
│   ├── api/
│   │   ├── cmd/server/main.go          # Entry point
│   │   ├── internal/
│   │   │   ├── handlers/               # HTTP handlers (auth, project, ai, collab)
│   │   │   ├── services/               # Business logic
│   │   │   ├── repository/             # Data access layer (users, projects, pages)
│   │   │   ├── middleware/             # JWT auth middleware
│   │   │   ├── collab/hub.go           # WebSocket broadcast hub
│   │   │   └── db/migrations/          # SQL migration files
│   │   └── go.mod
│   └── web/
│       ├── app/
│       │   ├── (auth)/                 # Login, register pages
│       │   ├── (dashboard)/dashboard/  # Project listing
│       │   ├── editor/[projectId]/     # Main canvas editor
│       │   └── embed/[projectId]/      # Embeddable iframe view
│       ├── components/
│       │   ├── canvas/                 # Konva canvas components
│       │   ├── collaboration/          # Yjs WebSocket sync
│       │   └── ai/AIPanel.tsx          # AI prompt + SSE streaming
│       ├── store/
│       │   ├── useCanvasStore.ts       # Canvas objects & selection (Zustand)
│       │   └── useEditorStore.ts       # Editor UI state (Zustand)
│       └── lib/
│           ├── api/client.ts           # REST API client with auth
│           └── canvas/shapes.ts        # Shape type definitions
├── infra/
│   └── postgres/                       # DB init scripts
├── docker-compose.yml                  # Production
├── docker-compose.dev.yml              # Development (+ pgAdmin)
├── Makefile
└── .env.example
```

---

## API Routes

```
GET  /health                        # Health check (no auth)
POST /api/v1/auth/register          # Register user
POST /api/v1/auth/login             # Login → JWT
GET  /api/v1/auth/me                # Current user (auth required)
POST /api/v1/projects               # Create project
GET  /api/v1/projects               # List user's projects
GET  /api/v1/projects/:id           # Get project
PATCH /api/v1/projects/:id          # Update project
DELETE /api/v1/projects/:id         # Delete project
POST /api/v1/ai/generate            # AI design gen (SSE stream)
GET  /ws/collab/:roomId             # WebSocket collaboration
```

---

## Database Schema

| Table | Key Columns |
|-------|-------------|
| `users` | id (UUID), email (unique), password_hash, name, avatar_url |
| `projects` | id (UUID), name, description, thumbnail_url, owner_id (FK users) |
| `project_members` | project_id + user_id (composite PK), role (owner/editor/viewer) |
| `pages` | Design pages within projects |

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Min 32 chars, change in production |
| `PORT` | API port (default 8080) |
| `CORS_ORIGINS` | Frontend origin (e.g., http://localhost:3000) |
| `OLLAMA_URL` | Local LLM endpoint (default http://localhost:11434) |
| `NEXT_PUBLIC_API_URL` | Frontend → API base URL |
| `NEXT_PUBLIC_WS_URL` | Frontend → WebSocket base URL |
| `STORAGE_DIR` | File upload directory |

---

## Architecture Patterns

### Backend
- **Repository pattern** for all DB access
- **Service layer** for business logic (no DB calls in handlers)
- **Middleware** for JWT validation on protected routes
- **Hub pattern** for WebSocket fan-out (collab/hub.go)
- **SSE streaming** for AI generation responses

### Frontend
- **Next.js App Router** with server/client component split
- **Dynamic imports** for Konva canvas (client-only, no SSR)
- **Zustand stores** for canvas state and editor UI state
- **CRDT via Yjs** for conflict-free collaborative editing
- **Room-based WebSocket** sessions keyed by projectId

### Collaboration Flow
1. User opens editor → WebSocket connects to `/ws/collab/:projectId`
2. Server hub registers client in the room
3. Canvas changes encoded as Yjs updates → broadcast to all room clients
4. New clients receive full document state on join

---

## AI Design Generation

- Uses Ollama with `llama3.2` model (local LLM, no external API key needed)
- Frontend sends prompt to `POST /api/v1/ai/generate`
- Backend proxies to Ollama with a system prompt instructing it to return JSON canvas objects
- Response streamed back via SSE
- Frontend AIPanel parses JSON → creates Konva shapes on canvas

---

## Embedding

Projects can be embedded in iframes via `/embed/[projectId]`. `next.config.ts` sets permissive headers (`X-Frame-Options: ALLOWALL`, `frame-ancestors *`) for this route.

---

## Production Deployment

```bash
docker compose build
docker compose up -d
# API: :8080, Web: :3000
```

Multi-stage Docker builds: Go produces a static binary in Alpine; Next.js uses standalone output.
