FROM golang:1.25-alpine AS builder

WORKDIR /workspace

COPY go.mod go.sum ./
RUN go mod download

COPY apps ./apps
COPY backend ./backend
COPY internal ./internal

RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/opentoggl-api ./apps/api/cmd/api

FROM alpine:3.22

WORKDIR /app

COPY --from=builder /out/opentoggl-api /usr/local/bin/opentoggl-api

EXPOSE 8080

ENTRYPOINT ["opentoggl-api"]
