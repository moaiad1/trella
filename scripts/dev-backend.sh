#!/usr/bin/env bash
# Run API from repo root. Requires: backend/.venv and deps installed.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"

if [[ ! -f .venv/bin/activate ]]; then
  echo "Missing backend/.venv — run:" >&2
  echo "  cd backend && python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt" >&2
  exit 1
fi

# shellcheck disable=SC1091
source .venv/bin/activate
exec uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
