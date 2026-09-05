#!/usr/bin/env bash
# Start MySQL from docker-compose and wait until port 3307 accepts connections.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker not found. Install Docker or use SQLite (default — no .env)." >&2
  exit 1
fi

docker compose up -d mysql

for i in $(seq 1 60); do
  if command -v nc >/dev/null 2>&1 && nc -z 127.0.0.1 3307 2>/dev/null; then
    echo "MySQL is up on 127.0.0.1:3307"
    exit 0
  fi
  if command -v timeout >/dev/null 2>&1 && timeout 1 bash -c "echo >/dev/tcp/127.0.0.1/3307" 2>/dev/null; then
    echo "MySQL is up on 127.0.0.1:3307"
    exit 0
  fi
  sleep 1
done

echo "Timed out waiting for 127.0.0.1:3307 — check: docker compose logs mysql" >&2
exit 1
