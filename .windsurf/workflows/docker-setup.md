---
description: Generate Dockerfile and docker-compose configuration for the project
---

# Docker Setup Workflow

This workflow generates production-ready Docker configuration based on the detected tech stack.

## Step 1: Detect Tech Stack

Read `.windsurf/project-init-config.json` or analyze the project to determine:

- **Runtime:** Node.js, Python, .NET, Java, Go
- **Package manager:** npm, yarn, pnpm, pip, poetry
- **Framework:** Next.js, NestJS, Django, FastAPI, Spring Boot
- **Database:** PostgreSQL, MySQL, MongoDB, Redis
- **Additional services:** Message queues, search engines, cache layers

## Step 2: Generate Dockerfile

Create a multi-stage `Dockerfile` optimized for the detected stack.

### Node.js / Next.js

```dockerfile
# Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 2: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 appuser

COPY --from=builder --chown=appuser:appgroup /app/.next/standalone ./
COPY --from=builder --chown=appuser:appgroup /app/.next/static ./.next/static
COPY --from=builder --chown=appuser:appgroup /app/public ./public

USER appuser
EXPOSE 3000
CMD ["node", "server.js"]
```

### Python / FastAPI / Django

```dockerfile
FROM python:3.12-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.12-slim
WORKDIR /app

RUN addgroup --system appgroup && \
    adduser --system --ingroup appgroup appuser

COPY --from=builder /install /usr/local
COPY . .

USER appuser
EXPOSE 8000

# FastAPI
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# Django (uncomment)
# CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4"]
```

### .NET

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY *.csproj .
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app/publish .

RUN addgroup --system appgroup && \
    adduser --system --ingroup appgroup appuser
USER appuser

EXPOSE 8080
ENTRYPOINT ["dotnet", "App.dll"]
```

### Go

```dockerfile
FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/server ./cmd/server

FROM alpine:3.20
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/server .

USER appuser
EXPOSE 8080
CMD ["./server"]
```

### Rust

```dockerfile
FROM rust:1.82-slim AS builder
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs && cargo build --release && rm -rf src
COPY . .
RUN touch src/main.rs && cargo build --release

FROM debian:bookworm-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && \
    rm -rf /var/lib/apt/lists/* && \
    addgroup --system appgroup && adduser --system --ingroup appgroup appuser

COPY --from=builder /app/target/release/app .

USER appuser
EXPOSE 8080
CMD ["./app"]
```

## Step 3: Generate .dockerignore

```
node_modules
.next
.git
.env
.env.local
*.log
coverage
dist
__pycache__
*.pyc
.pytest_cache
bin/
obj/
```

## Step 4: Generate docker-compose.yml

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    env_file:
      - .env
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test:
        ["CMD", "wget", "--spider", "-q", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  db:
    image: postgres:16-alpine
    env_file:
      - .env
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d appdb"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

Create a `.env` file (gitignored) with the actual values:

```
POSTGRES_USER=app
POSTGRES_PASSWORD=<generate-a-strong-password>
POSTGRES_DB=appdb
```

Adapt services based on detected stack (swap PostgreSQL for MySQL/MongoDB, add nginx reverse proxy if needed).

## Step 5: Generate docker-compose.dev.yml

For local development with hot-reloading:

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: deps
    command: npm run dev
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
    depends_on:
      - db
```

## Step 6: Security Checklist

Before committing Docker configuration:

- [ ] No secrets hardcoded in Dockerfile or docker-compose.yml
- [ ] Non-root user configured (`USER appuser`)
- [ ] Multi-stage build (build artifacts not in final image)
- [ ] `.dockerignore` excludes `.env`, `.git`, `node_modules`
- [ ] Health checks configured for all services
- [ ] Pinned base image versions (no `latest` tags)
- [ ] `COPY` is specific (not `COPY . .` in final stage)
- [ ] Production dependencies only (`npm ci --omit=dev`)

## Gotchas

- **`COPY . .` before `npm ci`** -- invalidates the dependency cache on every file change. Always copy `package.json` first, install, then copy source.
- **Running as root** -- containers run as root by default. Always create and switch to a non-root user.
- **`latest` tag** -- not reproducible. Pin to specific versions: `node:22-alpine`, `postgres:16-alpine`.
- **Missing `.dockerignore`** -- without it, `node_modules`, `.git`, and `.env` are sent to the Docker daemon, bloating context and leaking secrets.
- **`docker-compose.yml` secrets in `environment`** -- use Docker secrets or `.env` files (gitignored) instead of inline values for production.

## References

- `docs.docker.com/build/building/multi-stage/` -- Multi-stage builds
- `docs.docker.com/compose/` -- Docker Compose documentation
- `snyk.io/blog/10-best-practices-to-containerize-nodejs-web-applications-with-docker/` -- Node.js Docker best practices

## Step 7: Output Summary

```
Docker Configuration Generated

Files created:
- Dockerfile (multi-stage, non-root user)
- .dockerignore
- docker-compose.yml (app + db + redis)
- docker-compose.dev.yml (development with hot-reload)

Commands:
- Production: docker compose up -d --build
- Development: docker compose -f docker-compose.dev.yml up
- Build only: docker build -t app:latest .
```

## Step 8: Save to Dashboard

Persist the Docker setup results for the dashboard:

1. Read `.windsurf/dashboard-data.json` (create with `{"projects":[],"runs":[],"globalStats":{}}` if missing)
2. Build a timestamp string: current ISO time with colons replaced by hyphens
3. Build a date string from the timestamp: `YYYY-MM-DD` (e.g. `2026-04-10`)
4. Create directory `.windsurf/dashboard/runs/docker-setup/[date]/[timestamp]/`
5. Write `findings.json` + `report.md` into that directory
6. Append a new entry to `runs[]` in `dashboard-data.json`:

```json
{
  "workflow": "docker-setup",
  "timestamp": "[ISO timestamp]",
  "score": 100,
  "maxScore": 100,
  "verdict": "Docker configuration generated",
  "findings": { "critical": 0, "high": 0, "medium": 0, "low": 0 },
  "highlights": ["[files created: Dockerfile, docker-compose.yml, etc.]"],
  "issues": [],
  "summary": "Docker configuration generated with [N] services",
  "reportPath": ".windsurf/dashboard/runs/docker-setup/[date]/[timestamp]/"
}
```

6. Write updated `dashboard-data.json` back to disk
