#!/usr/bin/env bash
set -e

ACTION=${1:-up}

if [ "$ACTION" = "up" ]; then
  echo "🚀 Menjalankan migrasi database up..."
  docker compose exec -T postgres psql -U tandur -d tandur -f /docker-entrypoint-initdb.d/01_schema.sql
elif [ "$ACTION" = "down" ]; then
  echo "⚠️ Menjalankan rollback migrasi database..."
  docker compose exec -T postgres psql -U tandur -d tandur -f /docker-entrypoint-initdb.d/000001_init_schema.down.sql
else
  echo "Penggunaan: ./scripts/migrate.sh [up|down]"
  exit 1
fi

