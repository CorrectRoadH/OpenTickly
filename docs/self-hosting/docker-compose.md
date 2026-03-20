# Docker Compose Startup (Wave 1)

This stack is scoped to runtime boot for current Wave 1 services.

This document defines the self-hosted runtime path only.

- It does not define the default local development workflow.
- Local development should run source processes directly from the repository root.
- Local development environment variables belong in the repository root.
- Root-level local env files such as `.env.example` and `.env.local` remain the source of truth for source-based development.

## Services

- `website`: Nginx serving the built React app on `http://localhost:3000`
- `api`: Go API runtime on `http://localhost:8080`
- `postgres`: PostgreSQL 16
- `redis`: Redis 7

`website` proxies `/web/v1/*`, `/healthz`, and `/readyz` to `api`, so browser requests stay same-origin.

`docker compose` health checks use `/readyz` for readiness.

## Start

```bash
docker compose up -d --build
```

## Verify

```bash
docker compose ps
curl -fsS http://localhost:8080/healthz
curl -fsS http://localhost:8080/readyz
curl -fsSI http://localhost:3000/
curl -fsS http://localhost:3000/healthz
curl -fsS http://localhost:3000/readyz
```

## Stop

```bash
docker compose down
```
