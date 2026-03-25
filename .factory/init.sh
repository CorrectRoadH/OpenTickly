#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

test -f .env.local || {
  echo "Missing root .env.local"
  exit 1
}

command -v vp >/dev/null || {
  echo "Missing vp"
  exit 1
}

command -v air >/dev/null || {
  echo "Missing air"
  exit 1
}

command -v pgschema >/dev/null || {
  echo "Missing pgschema"
  exit 1
}

command -v go >/dev/null || {
  echo "Missing go"
  exit 1
}

test -d node_modules || {
  echo "Missing node_modules; run the install command from .factory/services.yaml"
  exit 1
}

curl -sf http://127.0.0.1:8080/readyz >/dev/null || {
  echo "Expected reused backend runtime on http://127.0.0.1:8080"
  exit 1
}

curl -sf http://127.0.0.1:5173 >/dev/null || {
  echo "Expected reused website runtime on http://127.0.0.1:5173"
  exit 1
}

pg_isready -h 127.0.0.1 -p 5432 >/dev/null || {
  echo "Expected reused PostgreSQL service on 127.0.0.1:5432"
  exit 1
}

python3 -c 'import socket,sys; s=socket.create_connection(("127.0.0.1",6379),2); s.sendall(b"*1\r\n$4\r\nPING\r\n"); data=s.recv(64); s.close(); sys.exit(0 if b"PONG" in data else 1)' || {
  echo "Expected reused Redis service on 127.0.0.1:6379"
  exit 1
}
