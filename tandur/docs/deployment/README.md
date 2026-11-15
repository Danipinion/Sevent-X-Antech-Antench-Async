# Panduan Deployment & Environment

Panduan deployment aplikasi TANDUR untuk lingkungan staging dan production.

## 1. Arsitektur Deployment Container

Aplikasi dijalankan dalam kontainer Docker:
- **Frontend Container:** Multi-stage build dengan Nginx alpine server.
- **Backend Container:** Distroless / minimal alpine container mengeksekusi binary Go statis.
- **Reverse Proxy:** Traefik menangani TLS termination dan perutean traffic.
- **Data Persistence:** Volume terkelola untuk data database PostgreSQL dan Redis.

## 2. Pemisahan Lingkungan (Environment Separation)

- File `.env.example` menyediakan referensi default konfigurasi lokal.
- Variabel rahasia (*credentials*, API keys, database password) **tidak boleh di-commit** ke repositori git.
- Setiap environment (Development, Staging, Production) menggunakan file `.env` tersendiri yang dikelola melalui CI/CD secret manager.
