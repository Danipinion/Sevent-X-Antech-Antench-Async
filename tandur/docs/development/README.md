# Panduan Pengembangan (Development Guide)

Panduan standar alur kerja, standar coding, dan perintah kerja untuk tim pengembang TANDUR.

## 1. Prasyarat Lokal
- Docker Desktop / Docker Engine (>= 24.0)
- Node.js (>= 20.0)
- Go (>= 1.23)
- Make CLI

## 2. Standar Kode & Konvensi
- Mengikuti `.editorconfig`:
  - LF end of line.
  - Tab indent untuk Golang & Makefile.
  - 2-space indent untuk TypeScript, JSON, YAML.
  - File encoding UTF-8.
- Semua commit message mengikuti konvensi **Conventional Commits**:
  - `feat:` Fitur baru
  - `fix:` Perbaikan bug
  - `docs:` Perubahan dokumentasi
  - `refactor:` Restrukturisasi kode tanpa mengubah fungsionalitas
  - `chore:` Perubahan dependensi atau konfigurasi build

## 3. Menjalankan Server Lokal
```bash
# Setup awal
make setup

# Menjalankan kontainer docker
make up

# Menjalankan pengujian
make test

# Menjalankan linting
make lint
```

