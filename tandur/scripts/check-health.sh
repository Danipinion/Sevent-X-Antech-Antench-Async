#!/usr/bin/env bash
set -e

echo "🔍 Memeriksa ketersediaan service TANDUR..."
curl -s http://localhost:8080/api/v1/health | jq . || curl -s http://localhost:8080/api/v1/health || echo "API belum berjalan."

