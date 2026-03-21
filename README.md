# OpenToggl

## Local Development

- Install backend dev runtime: `go install github.com/air-verse/air@latest`
- Create root `.env.local` from `.env.local.example` before starting local source processes
- Required backend env: `PORT`, `DATABASE_URL`, `REDIS_URL`
- Frontend: `vp run website#dev`
- Backend: `air`
- Backend hot reload config: root `.air.toml`
- `.env.local.example` is only a template; the canonical source-based backend startup path requires a real root `.env.local`
- `air` must fail immediately if `.env.local`, `PORT`, `DATABASE_URL`, or `REDIS_URL` is missing
- `air` must also fail immediately if PostgreSQL or Redis is unreachable; local backend development is expected to connect to the real dependencies you started separately

# Self Hosting

- [Docker Compose Startup (Target Shape)](./docs/self-hosting/docker-compose.md)
- Self-hosted target is a single `opentoggl` Go runtime image (not `website + api` dual runtime).
- Existing split-runtime Docker artifacts in the repository are implementation drift pending cleanup, not target deployment guidance.
