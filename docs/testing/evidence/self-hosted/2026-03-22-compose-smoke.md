# Self-Hosted Compose Smoke Evidence (2026-03-22)

## Context

- Repository: `opentoggl`
- Flow: self-hosted compose startup, schema tooling, readiness, and HTTP smoke
- Baseline source: committed defaults in `docker-compose.yml` (no required env template)
- Local host override for this run only: `OPENTOGGL_POSTGRES_PORT=55432` and `PGPORT=55432` (because host `5432` was already allocated)

## Commands and Outputs

### 1. Compose dependency startup

Command:

```bash
OPENTOGGL_POSTGRES_PORT=55432 docker compose up -d postgres redis
```

Follow-up status:

```bash
docker compose ps
```

Observed output (healthy):

```text
NAME                               IMAGE                COMMAND                  SERVICE    CREATED          STATUS                    PORTS
opentoggl-self-hosted-postgres-1   postgres:16-alpine   "docker-entrypoint.s…"   postgres   8 seconds ago    Up 7 seconds (healthy)    0.0.0.0:55432->5432/tcp, [::]:55432->5432/tcp
opentoggl-self-hosted-redis-1      redis:7-alpine       "docker-entrypoint.s…"   redis      19 seconds ago   Up 18 seconds (healthy)   6379/tcp
```

### 2. Schema plan/apply evidence

Command:

```bash
PGHOST=127.0.0.1 \
PGPORT=55432 \
PGDATABASE=opentoggl \
PGUSER=postgres \
PGPASSWORD=postgres \
PGSSLMODE=disable \
pgschema plan --file apps/backend/internal/platform/schema/schema.sql
```

Output:

```text
No changes detected.
```

Command:

```bash
PGHOST=127.0.0.1 \
PGPORT=55432 \
PGDATABASE=opentoggl \
PGUSER=postgres \
PGPASSWORD=postgres \
PGSSLMODE=disable \
pgschema apply --file apps/backend/internal/platform/schema/schema.sql --auto-approve
```

Output:

```text
No changes to apply. Database schema is already up to date.
```

### 3. Single-image build and runtime startup

Command:

```bash
OPENTOGGL_POSTGRES_PORT=55432 docker compose up -d --build opentoggl
```

Observed result:

```text
opentoggl:local  Built
Container opentoggl-self-hosted-opentoggl-1  Started
```

Follow-up status:

```bash
docker compose ps
```

Observed output (all healthy):

```text
NAME                                IMAGE                COMMAND                  SERVICE     CREATED         STATUS                   PORTS
opentoggl-self-hosted-opentoggl-1   opentoggl:local      "opentoggl"              opentoggl   9 seconds ago   Up 8 seconds (healthy)   0.0.0.0:8080->8080/tcp, [::]:8080->8080/tcp
opentoggl-self-hosted-postgres-1    postgres:16-alpine   "docker-entrypoint.s…"   postgres    8 minutes ago   Up 8 minutes (healthy)   0.0.0.0:55432->5432/tcp, [::]:55432->5432/tcp
opentoggl-self-hosted-redis-1       redis:7-alpine       "docker-entrypoint.s…"   redis       8 minutes ago   Up 8 minutes (healthy)   6379/tcp
```

### 4. Final smoke verification

Command:

```bash
curl -fsS http://localhost:8080/healthz
```

Output:

```json
{"service":"opentoggl-api","status":"ok","modules":["identity","tenant","membership","catalog","tracking","governance","reports","webhooks","billing","importing"]}
```

Command:

```bash
curl -fsS http://localhost:8080/readyz
```

Output:

```json
{"service":"opentoggl-api","status":"ok","checks":[{"name":"configuration","status":"ok","message":"required runtime configuration loaded"},{"name":"postgres","status":"ok","target":"127.0.0.1:5432","message":"tcp connectivity ok"},{"name":"redis","status":"ok","target":"127.0.0.1:6379","message":"tcp connectivity ok"}]}
```

Command:

```bash
curl -fsSI http://localhost:8080/
```

Output:

```text
HTTP/1.1 200 OK
Accept-Ranges: bytes
Cache-Control: no-cache
Content-Length: 272
Content-Type: text/html; charset=utf-8
```

## Verdict

Self-hosted compose baseline smoke passed for this run:

- compose services healthy
- `pgschema plan/apply` successful
- `/healthz` and `/readyz` successful
- root HTTP response successful
