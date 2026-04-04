# Pixelly

> A collaborative, canvas-based design editor — think Figma, but self-hosted and AI-powered.

Pixelly is a monorepo containing a Go REST/WebSocket API and a Next.js frontend. Multiple users can co-edit the same canvas in real time via CRDT (Yjs), and an on-device LLM (Ollama) can generate design elements from natural language prompts.

---

## Architecture at a Glance

```
pixelly/
├── apps/
│   ├── api/        — Go 1.22 · Fiber v2 · PostgreSQL · Redis
│   └── web/        — Next.js 16 · React 19 · Konva.js · Yjs
├── infra/
│   └── postgres/   — DB init scripts
├── docker-compose.yml          # Production stack
├── docker-compose.dev.yml      # Dev stack (+ pgAdmin on :5050)
├── Makefile
└── .env.example
```

### How it fits together

```
Browser ──HTTP──► Next.js (3000) ──REST──► Go API (8080) ──► PostgreSQL
                                │                        └──► Redis
                                └──WebSocket──► Yjs hub (CRDT sync)

Go API ──► Ollama (11434)  ← local LLM, no external key needed
```

---

## Quick Start

### Prerequisites

| Tool | Version |
|------|---------|
| Go | 1.22+ |
| Node.js | 20 LTS+ |
| Docker + Docker Compose | latest |
| [air](https://github.com/cosmtrek/air) | latest |
| [golangci-lint](https://golangci-lint.run/) | latest |

### First-time setup

```bash
# 1. Clone and enter the repo
git clone <repo-url> pixelly && cd pixelly

# 2. Copy env file and fill in secrets
cp .env.example .env

# 3. Install deps, start DBs, run migrations
make setup
```

### Daily development (3 terminals)

```bash
make dev-db     # PostgreSQL + Redis via Docker
make dev-api    # Go API on :8080 with hot-reload (air)
make dev-web    # Next.js on :3000
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

Copy `.env.example` → `.env`. Key variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL DSN |
| `REDIS_URL` | Redis DSN |
| `JWT_SECRET` | Min 32 chars — **change in production** |
| `PORT` | API port (default `8080`) |
| `CORS_ORIGINS` | Allowed frontend origins |
| `OLLAMA_URL` | Local LLM endpoint (default `http://localhost:11434`) |
| `NEXT_PUBLIC_API_URL` | Frontend → API base URL |
| `NEXT_PUBLIC_WS_URL` | Frontend → WebSocket base URL |

---

## API Overview

```
GET  /health

POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me

POST   /api/v1/projects
GET    /api/v1/projects
GET    /api/v1/projects/:id
PATCH  /api/v1/projects/:id
DELETE /api/v1/projects/:id

POST /api/v1/ai/generate          # SSE stream (legacy)
POST /api/v1/ai/chat              # Multi-turn chat with skills (SSE)
GET  /api/v1/ai/skill-fetch       # Fetch skill markdown from GitHub

GET  /ws/collab/:roomId           # WebSocket (Yjs CRDT)
```

Full details in [apps/api/README.md](apps/api/README.md).

---

## Collaboration Model

1. Editor opens → WebSocket connects to `/ws/collab/:projectId`
2. Server hub registers the client in that room
3. Canvas mutations are encoded as Yjs updates and broadcast to every peer in the room
4. Late-joining clients receive the full document state immediately

---

## AI Agent

Pixelly has a built-in AI Agent panel (open with the sparkle icon in the toolbar) powered by **Ollama** running `llama3.2` locally — no cloud API key required.

### Chat

- Full multi-turn conversation with persistent history (survives page refresh)
- Ask the agent to generate UI components and it will respond with JSON-encoded canvas objects that are immediately materialised as shapes on the canvas
- Supported shape types: `rect`, `ellipse`, `text`, `frame`
- Response streams back over SSE in real time

### Skills

Skills extend the agent with domain-specific instructions. They are plain-markdown files fetched from GitHub and injected into the system prompt for every chat message.

**Installing a skill:**

1. Open the AI Agent panel and click the **CPU icon** in the header
2. Paste any of the following into the install field and press `+`:
   - A GitHub repo slug: `owner/repo`
   - A full GitHub URL: `https://github.com/owner/repo`
   - A [skills.sh](https://skills.sh) link: `https://skills.sh/owner/repo`
3. The skill is fetched, saved locally, and enabled immediately

**Managing skills:**

- Toggle the switch on any installed skill to enable or disable it for the current session
- Disabled skills are stored but not sent to the LLM
- Remove a skill with the trash icon

### API endpoints

```
POST /api/v1/ai/generate          # Legacy single-prompt SSE stream
POST /api/v1/ai/chat              # Multi-turn chat with optional skill context (SSE)
GET  /api/v1/ai/skill-fetch?repo= # Proxy: fetch skill markdown from GitHub
```

The `/ai/chat` request body:

```json
{
  "messages": [
    { "role": "user", "content": "Design a login form" }
  ],
  "skills": [
    { "name": "design-tokens", "content": "<markdown skill content>" }
  ]
}
```

---

## Useful Commands

```bash
make migrate-up       # Apply pending migrations
# or without make:
cd apps/api && go run ./cmd/migrate/main.go up

make migrate-down     # Roll back last migration

make test-api         # Go tests
make test-web         # JS tests

make lint-api         # golangci-lint
make lint-web         # ESLint

make build            # Build all Docker images
make clean            # Remove build artifacts
```

---

## Production Deployment

```bash
docker compose build
docker compose up -d
# API → :8080   Web → :3000
```

Both services use multi-stage Docker builds: Go compiles a static binary in Alpine; Next.js uses standalone output mode.

---

## Embedding

Any project can be embedded in an `<iframe>` via `/embed/[projectId]`. The route sets permissive headers (`frame-ancestors *`) so it works in any host page.

---

## Project Structure (detailed)

```
apps/api/
├── cmd/server/main.go          # Entry point
└── internal/
    ├── handlers/               # HTTP layer (auth, project, ai, collab)
    ├── services/               # Business logic
    ├── repository/             # Data access (users, projects, pages)
    ├── middleware/             # JWT auth
    ├── collab/hub.go           # WebSocket fan-out hub
    └── db/migrations/          # SQL migration files

apps/web/
├── app/
│   ├── (auth)/                 # Login & register pages
│   ├── (dashboard)/dashboard/  # Project listing
│   ├── editor/[projectId]/     # Main canvas editor
│   └── embed/[projectId]/      # Embeddable iframe view
├── components/
│   ├── canvas/                 # Konva canvas components
│   ├── collaboration/          # Yjs WebSocket sync
│   └── ai/AgentPanel.tsx       # AI Agent chat + skills management
├── store/
│   ├── useCanvasStore.ts       # Canvas objects & selection (Zustand)
│   ├── useEditorStore.ts       # Editor UI state (Zustand)
│   └── useAgentStore.ts        # Chat history + installed skills (Zustand, persisted)
└── lib/
    ├── api/client.ts           # REST client with auth
    └── canvas/shapes.ts        # Shape type definitions
```

---

## Database Schema

| Table | Key Columns |
|-------|-------------|
| `users` | `id` UUID, `email` (unique), `password_hash`, `name`, `avatar_url` |
| `projects` | `id` UUID, `name`, `description`, `thumbnail_url`, `owner_id → users` |
| `project_members` | `(project_id, user_id)` PK, `role` (owner / editor / viewer) |
| `pages` | Design pages within a project |

---

## Contributing

1. Branch off `main`
2. Keep API changes covered by `make test-api`
3. Run `make lint-api && make lint-web` before opening a PR

---

## License

MIT
