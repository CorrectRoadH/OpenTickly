# Deploying OpenToggl on fnnas NAS (forum-style tutorial)

> This guide is written for users of the fnnas (fnOS) forum. The style follows the fnnas forum Docker application sharing section (`club.fnnas.com/forum-12`): one-sentence intro + full compose + parameter table + usage steps + star rating summary.
>
> When posting on the fnnas forum, you can pick one of the "Title suggestions" as the post title, and copy the content below as the post body, replacing each `[Image: xxx]` with your own screenshot.

---

## Title suggestions

- `Deploy OpenToggl on your NAS: your own Toggl Track, free, no API rate limits`
- `Bring Toggl back to your own NAS: full OpenToggl deployment on fnnas`
- `Tired of paying for Toggl subscription? One-click deploy OpenToggl on fnnas`

---

## Body

OpenToggl is an open-source, self-hosted time tracking application with an API fully compatible with Toggl Track v9 and Reports v3. Mobile web, browsers, and `toggl-cli` can all connect directly. Data lives on your own NAS, and there's no `30 requests/hour` API rate limit like the official Toggl. It's well suited for people who want to self-host time tracking or let AI / scripts run automated clock-ins.

`[Image: Timer page overview]`

### Why self-host

- Free, no more monthly subscription
- Data stays on your own NAS, doesn't pass through third parties
- API has no rate limit, great for AI / scripts / automation
- Can be installed as a PWA in mobile browsers, feels like a native app
- Keeps Toggl's operation habits — no need to relearn after migration

---

### 1. Prepare docker-compose.yml

The version below has been adjusted to fit fnnas NAS habits:

- Postgres and Redis only run on the internal network, not exposed to the host
- Data persistence uses Docker named volumes, so reinstalling containers doesn't lose data
- Only one port `8080` is exposed externally

```yaml
name: opentoggl

services:
  postgres:
    image: postgres:17-alpine
    container_name: opentoggl-postgres
    environment:
      POSTGRES_DB: opentoggl
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: change-me-please
    networks: [internal]
    volumes:
      - opentoggl-postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
      interval: 5s
      timeout: 3s
      retries: 20
    restart: unless-stopped

  redis:
    image: redis:8-alpine
    container_name: opentoggl-redis
    command: ["redis-server", "--save", "", "--appendonly", "no"]
    networks: [internal]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 20
    restart: unless-stopped

  opentoggl:
    image: ghcr.io/correctroadh/opentoggl:latest
    container_name: opentoggl
    environment:
      PORT: "8080"
      DATABASE_URL: postgres://postgres:change-me-please@postgres:5432/opentoggl?sslmode=disable
      REDIS_URL: redis://redis:6379/0
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks: [internal]
    ports:
      - "8080:8080"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:8080/readyz"]
      interval: 5s
      timeout: 3s
      retries: 20
    restart: unless-stopped

networks:
  internal:
    driver: bridge

volumes:
  opentoggl-postgres-data:
```

⚠️ Remember to change the two `change-me-please` entries to your own strong password, and **they must match** (one is the Postgres `POSTGRES_PASSWORD`, the other is the password inside `opentoggl`'s `DATABASE_URL`).

---

### 2. Create a Compose project in fnnas

1. Open the **Docker** app on the fnnas desktop (searchable in the app center; install it first if not already installed)
2. On the left pick **Compose** > **New project**
3. For **Project name** enter `opentoggl`
4. Keep **Storage path** at its default (usually `/vol1/1000/docker/opentoggl`, fnnas creates it automatically)
5. Paste the YAML above into **Compose content**
6. Click **Deploy** and wait for all three containers to turn green (healthy)

`[Image: Docker > Compose new project interface]`
`[Image: Three containers in healthy state]`

### 3. Open the port (if you have a firewall)

The default fnnas Docker network bridge already binds port `8080` to the host, but if you've enabled fnnas's **Security Center > Firewall**, you need to allow `8080`:

1. Open **Security Center** > **Firewall**
2. Add an inbound rule, TCP protocol, port `8080`, action **Allow**

`[Image: Firewall allow screenshot]`

### 4. Access and first use

Open in your browser:

```
http://<fnnas LAN IP>:8080
```

(for example `http://192.168.1.100:8080`)

The first visit lands on the registration page; once registered you can start using it directly.

`[Image: Registration page]`
`[Image: Timer start timing]`
`[Image: Reports page]`

---

### 5. Pair with `toggl-cli` (optional)

The official `toggl-cli` directly supports switching to your own instance:

```bash
toggl auth <your API_TOKEN> --type opentoggl \
  --api-url http://<fnnas IP>:8080/api/v9
```

After that, `toggl start` / `toggl stop` / `toggl list` all hit your own fnnas, with no API rate limit — super nice for scripts and AI agents.

`[Image: toggl-cli terminal demo]`

### 6. Install as a PWA on mobile

Open in Safari / Chrome and pick "Add to Home Screen" — the icon appears on your desktop, tapping it opens the full-screen app, and it works offline too.

`[Image: Mobile PWA icon + full-screen UI]`

---

### Backup

Database data lives in the Docker named volume `opentoggl-postgres-data`. On fnnas the path is typically:

```
/vol1/@docker/volumes/opentoggl_opentoggl-postgres-data/_data
```

You can also export SQL via `pg_dump`:

```bash
docker exec opentoggl-postgres pg_dump -U postgres opentoggl > opentoggl-backup.sql
```

### Upgrade

```bash
cd /vol1/1000/docker/opentoggl     # your compose project directory
docker compose pull
docker compose up -d
```

Database schema migrations run automatically on startup — no manual handling needed.

---

- Recommendation: ⭐⭐⭐⭐
- Experience: ⭐⭐⭐⭐
- Deployment difficulty: ⭐⭐

Project page: <https://github.com/CorrectRoadH/opentoggl>
Official site: <https://opentoggl.com>
