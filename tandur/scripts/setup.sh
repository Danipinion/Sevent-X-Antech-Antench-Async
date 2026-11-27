#!/usr/bin/env bash
set -e

echo "🌱 Menyiapkan TANDUR Development Environment..."

# 1. Environment file check
if [ ! -f .env ]; then
  echo "Menyalin .env.example menjadi .env..."
  cp .env.example .env
fi

# 2. Frontend setup
echo "Menginstal paket frontend..."
cd apps/web && npm install
cd ../..

# 3. Backend setup
if command -v go >/dev/null 2>&1; then
  echo "Mengunduh modul backend Go..."
  cd apps/api && go mod tidy
  cd ../..
else
  echo "Golang tidak terpasang di lokal (dilewati). Backend akan berjalan otomatis via Docker."
fi

echo "✅ Lingkungan pengembangan TANDUR siap digunakan!"
echo "Jalankan 'make up' untuk menyalakan seluruh service docker."

