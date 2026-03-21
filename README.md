# OpenToggl

## Local Development

- Frontend: `vp run website#dev`
- Backend: `go run ./apps/backend`
- Compatibility alias: `npm run dev:api` currently maps to `go run ./apps/backend` and exists only as a temporary transition alias; prefer `npm run dev:backend`.

# Self Hosting

- [Docker Compose Startup (Target Shape)](./docs/self-hosting/docker-compose.md)
- Self-hosted target is a single `opentoggl` Go runtime image (not `website + api` dual runtime).
- Existing split-runtime Docker artifacts in the repository are implementation drift pending cleanup, not target deployment guidance.
