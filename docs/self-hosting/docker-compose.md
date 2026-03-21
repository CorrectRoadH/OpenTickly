# Docker Compose Startup (Target Shape)

This document defines the self-hosted runtime path only.

- It does not define the default local development workflow.
- Local development should run source processes directly from the repository root.
- Local development environment variables belong in the repository root.
- Root-level local env files such as `.env.example` and `.env.local` remain the source of truth for source-based development.

## Services

- `opentoggl`: single Go runtime serving embedded Web assets and HTTP API on `http://localhost:8080`
- `postgres`: PostgreSQL 16
- `redis`: Redis 7

Self-hosted delivery should default to one application image:

- build `apps/website`
- embed the built frontend assets into the Go backend binary
- serve SPA routes and `/web/v1/*` from the same Go runtime

`docker compose` health checks use `/readyz` for readiness on the single `opentoggl` service.

## Start

```bash
pnpm run self-hosted:up
```

## Verify

```bash
pnpm run self-hosted:verify
pnpm run self-hosted:smoke
```

## Stop

```bash
docker compose down
```

## Drift Note

If the repository currently contains a separate `website` container or Nginx runtime, treat that as implementation drift to be removed. The target self-hosted shape is a single Go application image, not a `website + api` dual-runtime deployment.
Current examples of this drift may still exist in historical branches or local worktrees (for example, an old dedicated website Dockerfile) and should not be interpreted as the target architecture.
