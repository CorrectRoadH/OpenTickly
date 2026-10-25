FROM --platform=$BUILDPLATFORM ghcr.io/voidzero-dev/vite-plus:1.4.0 AS website-builder

USER root
RUN mkdir -p /workspace && chown vp:vp /workspace
USER vp
WORKDIR /workspace

COPY --chown=vp:vp package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./

# Manifests-first: copy every workspace member's package.json so pnpm can resolve
# the full graph, keeping the install layer cached across source-only edits.
COPY --chown=vp:vp apps/website/package.json ./apps/website/
COPY --chown=vp:vp apps/landing/package.json ./apps/landing/
COPY --chown=vp:vp apps/update-worker/package.json ./apps/update-worker/
COPY --chown=vp:vp packages/web-ui/package.json ./packages/web-ui/
COPY --chown=vp:vp packages/shared-contracts/package.json ./packages/shared-contracts/

RUN vp install --filter @opentickly/website... --frozen-lockfile --ignore-scripts

COPY --chown=vp:vp apps/website ./apps/website
COPY --chown=vp:vp packages ./packages

RUN vp run @opentickly/website#build

FROM --platform=$BUILDPLATFORM golang:1.26.10-alpine AS builder

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
