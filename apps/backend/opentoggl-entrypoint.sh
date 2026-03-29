#!/bin/sh
set -eu

if [ "$#" -gt 0 ]; then
  exec "$@"
fi

export OPENTOGGL_SCHEMA_PATH="${OPENTOGGL_SCHEMA_PATH:-/app/schema.sql}"

if [ "${OPENTOGGL_SCHEMA_RECONCILE:-apply}" = "apply" ]; then
  /usr/local/bin/opentoggl schema-apply
fi

exec /usr/local/bin/opentoggl serve
