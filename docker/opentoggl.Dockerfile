FROM node:22.12.0-bookworm-slim AS website-builder

WORKDIR /workspace

RUN npm install -g pnpm@10.32.1

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --no-frozen-lockfile --ignore-scripts
RUN pnpm --filter @opentoggl/website run build

FROM golang:1.25-alpine AS builder

WORKDIR /workspace

COPY go.mod go.sum ./
RUN go mod download

COPY apps ./apps
COPY --from=website-builder /workspace/apps/website/dist ./apps/backend/internal/web/dist

RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/opentoggl ./apps/backend

FROM alpine:3.22

WORKDIR /app

COPY --from=builder /out/opentoggl /usr/local/bin/opentoggl

RUN adduser -D -u 10001 opentoggl
USER opentoggl

EXPOSE 8080

ENTRYPOINT ["opentoggl"]
