#!/usr/bin/env bash
set -euo pipefail

API_URL="${OPENTOGGL_API_URL:-http://localhost:8080}"
WEB_URL="${OPENTOGGL_WEB_URL:-http://localhost:3000}"
MAX_RETRIES="${SMOKE_MAX_RETRIES:-30}"

wait_for_http() {
  local url="$1"
  local attempt=1
  while [[ "${attempt}" -le "${MAX_RETRIES}" ]]; do
    if curl -fsS "${url}" >/dev/null; then
      return 0
    fi
    sleep 1
    attempt=$((attempt + 1))
  done
  echo "timed out waiting for ${url}" >&2
  return 1
}

wait_for_http "${API_URL}/readyz"
wait_for_http "${WEB_URL}/readyz"

curl -fsS "${API_URL}/healthz" >/dev/null
curl -fsS "${API_URL}/readyz" >/dev/null
curl -fsSI "${WEB_URL}/" >/dev/null
curl -fsS "${WEB_URL}/healthz" >/dev/null
curl -fsS "${WEB_URL}/readyz" >/dev/null

echo "self-hosted smoke checks passed"
