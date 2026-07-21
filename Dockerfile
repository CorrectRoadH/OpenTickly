FROM --platform=$BUILDPLATFORM node:22.12.0-bookworm-slim AS website-builder

WORKDIR /workspace

RUN npm install -g pnpm@10.32.1

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./

# Manifests-first: copy every workspace member's package.json so pnpm can resolve
# the full graph, keeping the install layer cached across source-only edits.
COPY apps/website/package.json ./apps/website/
COPY apps/landing/package.json ./apps/landing/
COPY apps/update-worker/package.json ./apps/update-worker/
COPY packages/web-ui/package.json ./packages/web-ui/
COPY packages/shared-contracts/package.json ./packages/shared-contracts/

RUN pnpm install --filter @opentickly/website... --no-frozen-lockfile --ignore-scripts

COPY apps/website ./apps/website
COPY packages ./packages

RUN pnpm --filter @opentickly/website run build

FROM --platform=$BUILDPLATFORM golang:1.25.10-alpine AS builder

ARG OPENTOGGL_VERSION=dev
ARG TARGETOS
ARG TARGETARCH

WORKDIR /workspace

COPY go.mod go.sum ./
RUN go mod download
COPY apps ./apps
COPY --from=website-builder /workspace/apps/website/dist ./apps/backend/internal/web/dist

RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} \
    go build -trimpath -ldflags="-s -w -X main.version=${OPENTOGGL_VERSION}" \
    -o /out/opentoggl ./apps/backend

FROM alpine:3.22

WORKDIR /app

COPY --from=builder /out/opentoggl /usr/local/bin/opentoggl
COPY --chmod=0755 apps/backend/opentoggl-entrypoint.sh /usr/local/bin/opentoggl-entrypoint

RUN apk add --no-cache ca-certificates tzdata

ARG OPENTOGGL_VERSION=dev
LABEL org.opencontainers.image.title="OpenTickly" \
      org.opencontainers.image.description="Single-image OpenTickly runtime (web + API)" \
      org.opencontainers.image.source="https://github.com/CorrectRoadH/OpenTickly" \
      org.opencontainers.image.version="${OPENTOGGL_VERSION}"

RUN printf '# required by current bootstrap env loader for runtime startup\n' > /app/.env.local \
    && adduser -D -u 10001 opentoggl
USER opentoggl

EXPOSE 8080

ENTRYPOINT ["opentoggl-entrypoint"]
