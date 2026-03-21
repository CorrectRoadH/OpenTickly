# OpenToggl

## Local Development

- Install backend dev runtime: `go install github.com/air-verse/air@latest`
- Create root `.env.local` from `.env.local.example` before starting local source processes
- Required backend env: `PORT`, `DATABASE_URL`, `REDIS_URL`
- Frontend: `vp run website#dev`
- Backend: `air`
- Backend hot reload config: root `.air.toml`
- `.env.local.example` is only a template; the local backend must fail to start if `.env.local` or required datasource env is missing
- Local backend development is expected to connect to the real PostgreSQL and Redis instances you started separately; in-memory fallback is not a valid default runtime

# Self Hosting

- [Docker Compose Startup (Target Shape)](./docs/self-hosting/docker-compose.md)
- Self-hosted target is a single `opentoggl` Go runtime image (not `website + api` dual runtime).
- Existing split-runtime Docker artifacts in the repository are implementation drift pending cleanup, not target deployment guidance.
