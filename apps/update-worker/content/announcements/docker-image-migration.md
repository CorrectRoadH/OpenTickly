---
id: "docker-image-migration-2026-05"
title: "Docker Image Migration Notice"
severity: "warning"
publishedAt: "2026-05-05"
---
**Important**: The Docker image has been renamed to better reflect the project identity.

If you're self-hosting OpenTickly, please update your Docker image reference:

**Docker Hub**:
- **Old**: `correctroadh/opentoggl:latest`
- **New**: `correctroad/opentickly:latest`

**GHCR**:
- **Old**: `ghcr.io/correctroadh/opentoggl:latest`
- **New**: `ghcr.io/correctroadh/opentickly:latest`

The old images will continue to receive updates for now, but we recommend switching
to the new images to ensure you get all future releases.

Read more on [GitHub](https://github.com/CorrectRoadH/OpenTickly).
