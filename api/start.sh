#!/usr/bin/env bash
exec node --env-file="$(dirname "$0")/.env" "$(dirname "$0")/dist/src/main"
