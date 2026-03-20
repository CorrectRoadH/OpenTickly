# Docker Compose Startup (Wave 1)

This stack is scoped to runtime boot for current Wave 1 services.

## Services

- `website`: Nginx serving the built React app on `http://localhost:3000`
- `api`: Go API runtime on `http://localhost:8080`
- `postgres`: PostgreSQL 16
- `redis`: Redis 7

`website` proxies `/web/v1/*` and `/healthz` to `api`, so browser requests stay same-origin.

## Start

```bash
docker compose up -d --build
```

Or use the helper script:

```bash
./scripts/compose-up.sh
```

## Verify

```bash
docker compose ps
curl -fsS http://localhost:8080/healthz
curl -fsSI http://localhost:3000/
curl -fsS http://localhost:3000/healthz
```

## Stop

```bash
docker compose down
```
