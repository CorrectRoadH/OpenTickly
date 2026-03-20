#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"${SCRIPT_DIR}/verify-self-hosted.sh"

docker compose up -d --build
docker compose ps
"${SCRIPT_DIR}/smoke-self-hosted.sh"
