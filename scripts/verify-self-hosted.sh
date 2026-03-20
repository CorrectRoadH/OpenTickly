#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

assert_file_exists() {
  local path="$1"
  if [[ ! -f "${ROOT_DIR}/${path}" ]]; then
    echo "missing required file: ${path}" >&2
    exit 1
  fi
}

assert_file_contains() {
  local path="$1"
  local pattern="$2"
  if ! rg -q --fixed-strings "${pattern}" "${ROOT_DIR}/${path}"; then
    echo "expected '${pattern}' in ${path}" >&2
    exit 1
  fi
}

assert_file_exists "docker-compose.yml"
assert_file_exists "docker/api.Dockerfile"
assert_file_exists "docker/website.Dockerfile"
assert_file_exists "docker/nginx/website.conf"
assert_file_exists "scripts/compose-up.sh"
assert_file_exists "scripts/smoke-self-hosted.sh"

assert_file_contains "docker-compose.yml" "api:"
assert_file_contains "docker-compose.yml" "website:"
assert_file_contains "docker-compose.yml" "postgres:"
assert_file_contains "docker-compose.yml" "redis:"
assert_file_contains "docker-compose.yml" "/readyz"

assert_file_contains "apps/api/internal/http/server.go" "\"/healthz\""
assert_file_contains "apps/api/internal/http/server.go" "\"/readyz\""

assert_file_contains "docker/nginx/website.conf" "location /web/v1/"
assert_file_contains "docker/nginx/website.conf" "location = /healthz"
assert_file_contains "docker/nginx/website.conf" "location = /readyz"
assert_file_contains "scripts/compose-up.sh" "smoke-self-hosted.sh"

echo "self-hosted artifacts verification passed"
