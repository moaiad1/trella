#!/usr/bin/env bash
# Debian/Ubuntu: MariaDB ships a maintenance account in /etc/mysql/debian.cnf
# Run: bash scripts/setup_mysql_debian.sh

set -euo pipefail
cd "$(dirname "$0")"
SQL="setup_mysql_native.sql"

if [[ ! -f "$SQL" ]]; then
  echo "Missing $SQL" >&2
  exit 1
fi

if [[ -f /etc/mysql/debian.cnf ]]; then
  echo "Using credentials from /etc/mysql/debian.cnf"
  sudo mysql --defaults-file=/etc/mysql/debian.cnf < "$SQL"
  echo "Done. You can use DATABASE_URL with port 3306 if this is your only server."
  exit 0
fi

echo "No /etc/mysql/debian.cnf found." >&2
echo "Try one of:" >&2
echo "  1) Docker: from repo root, docker compose up -d  then use port 3307 in DATABASE_URL" >&2
echo "  2) Ask your admin for a MariaDB user/password, or reset root (MariaDB docs)." >&2
exit 1
