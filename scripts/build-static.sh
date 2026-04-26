#!/usr/bin/env bash

set -euo pipefail

api_dir="app/api"
temp_dir=".pages-temp-api"

cleanup() {
  if [ -d "$temp_dir" ] && [ ! -d "$api_dir" ]; then
    mv "$temp_dir" "$api_dir"
  fi
}

trap cleanup EXIT

if [ -e "$temp_dir" ]; then
  echo "Temporary directory '$temp_dir' already exists. Resolve it before running static build." >&2
  exit 1
fi

if [ -d "$api_dir" ]; then
  mv "$api_dir" "$temp_dir"
fi

STATIC_EXPORT=true next build
