# Pixelly API

REST and WebSocket backend for the Pixelly collaborative design editor.

## Features

- JWT authentication with bcrypt password hashing
- Project and page management (CRUD)
- Real-time collaboration via WebSocket room hub
- AI design generation with SSE streaming (Ollama / llama3.2)
- Repository + service layer architecture

## Quick Start

### 1. Tạo file `.env`

```bash
cp .env.example .env
```

### 2. Khởi động Database

```bash
docker compose -f docker-compose.dev.yml up -d
```

### 3. Cài dependencies

```bash
go mod download
go mod tidy
```

### 4. Chạy migration

```bash
go run ./cmd/migrate/main.go up
```

### 5. Chạy API

Với hot reload (cần cài [air](https://github.com/cosmtrek/air)):

```bash
go install github.com/cosmtrek/air@latest
air -c .air.toml
```

Hoặc chạy trực tiếp:

```bash
go run ./cmd/server/main.go
```

API chạy tại `http://localhost:8080`.

See [.env.example](../../.env.example) for required environment variables.

## Troubleshooting

### `invalid version: unknown revision` khi chạy `go mod tidy`

Một số pseudo-version của `github.com/jackc/pgservicefile` không còn tồn tại trên module proxy do lịch sử commit bị rewrite. Nếu gặp lỗi dạng:

```
github.com/jackc/pgservicefile@vX.X.X-XXXXXXXX-XXXXXXXXXXXX: invalid version: unknown revision
```

Cập nhật `go.mod` sang version đã được xác nhận hợp lệ:

```
github.com/jackc/pgservicefile v0.0.0-20240606120523-5a60cdf6a761 // indirect
```

Sau đó chạy lại `go mod tidy`.

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/v1/auth/register` | Register user |
| POST | `/api/v1/auth/login` | Login → JWT |
| GET | `/api/v1/auth/me` | Current user |
| POST | `/api/v1/projects` | Create project |
| GET | `/api/v1/projects` | List projects |
| GET | `/api/v1/projects/:id` | Get project |
| PATCH | `/api/v1/projects/:id` | Update project |
| DELETE | `/api/v1/projects/:id` | Delete project |
| POST | `/api/v1/ai/generate` | AI generation (SSE) |
| GET | `/ws/collab/:roomId` | WebSocket collaboration |

## Testing & Build

```bash
make test-api
make lint-api
make build-api   # Output: apps/api/bin/pixelly
```

## Documentation

Full architecture, database schema, and deployment guide: [CLAUDE.md](../../CLAUDE.md)
