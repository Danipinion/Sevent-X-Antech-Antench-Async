# 🌱 TANDUR - Platform Rantai Pasok Pertanian Digital

[![Go Report Card](https://img.shields.io/badge/go-1.23%2B-blue.svg)](https://golang.org)
[![React](https://img.shields.io/badge/react-19.0%2B-61dafb.svg)](https://react.dev)
[![Docker Compose](https://img.shields.io/badge/docker-compose-2496ED.svg)](https://docker.com)
[![PostgreSQL PostGIS](https://img.shields.io/badge/postgis-16--3.4-336791.svg)](https://postgis.net)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## 1. Deskripsi Proyek

**TANDUR** adalah platform digital rantai pasok komoditas pertanian yang menghubungkan petani, pengepul, dan pembeli secara adil, transparan, dan efisien.

Platform ini mengintegrasikan mekanisme **Smart Margin Control** untuk melindungi harga di tingkat petani sekaligus menstabilkan harga bagi pembeli, serta fitur **Stock Consolidation** berbasis geospasial untuk mengonsolidasikan stok petani lokal dalam pemenuhan pesanan volume besar.

Pengembangan mengikuti prinsip Clean Code dan Clean Architecture dengan pendekatan **Modular Monolith** pada backend serta **Feature-Based Architecture** pada frontend.

---

## 2. Tujuan & Ruang Lingkup

1. **Efisiensi Rantai Distribusi:** Memangkas perantara spekulatif dan memfasilitasi transaksi langsung berbasis data harga pasar transparan.
2. **Perlindungan Petani:** Mencegah penurunan harga tajam saat panen raya lewat sistem kuotasi dinamis.
3. **Agregasi Stok Geospasial:** Membantu kelompok tani menyatukan kuantitas komoditas untuk memenuhi kontrak skala besar.
4. **Kualitas & Penilaian Standar:** Pengelompokan mutu komoditas (*Quality Grading*) standar industri.

---

## 3. Teknologi yang Digunakan

### Frontend
- **Framework:** React 19 + TypeScript + Vite 6
- **Arsitektur:** Feature-Based Architecture
- **Icon:** Lucide React
- **Komunikasi Data:** Custom HTTP Client dengan API Contract Typed Interface

### Backend
- **Bahasa:** Go (Golang) 1.23+
- **HTTP Framework:** Fiber v3
- **Arsitektur:** Clean Architecture (Modular Monolith)
- **Logging:** Structured Logging (`log/slog`)

### Data & Infrastruktur
- **Database Utama:** PostgreSQL 16 dengan ekstensi PostGIS (Geospasial)
- **Cache & Message Broker:** Redis 7 Alpine
- **Object Storage:** Garage S3-compatible Object Storage
- **Reverse Proxy:** Traefik v3
- **Containerization:** Docker & Docker Compose v2

---

## 4. Persyaratan Perangkat Lunak

Sebelum menjalankan proyek, pastikan perangkat Anda telah terpasang:
- [Git](https://git-scm.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop) atau Docker Engine + Docker Compose v2
- [Node.js](https://nodejs.org/) (versi LTS 20+ atau 22+)
- [Go](https://golang.org/dl/) (versi 1.23+)
- [Make](https://www.gnu.org/software/make/) (Linux / macOS / WSL)

---

## 5. Struktur Direktori Repository

```
tandur/
├── apps/
│   ├── web/                    # Frontend React + TypeScript + Vite
│   │   ├── public/             # Aset statis browser
│   │   ├── src/
│   │   │   ├── app/            # Entry point & inisialisasi aplikasi
│   │   │   ├── assets/         # Gambar, SVG, aset UI
│   │   │   ├── components/     # Komponen UI bersama (UI, Layout)
│   │   │   ├── features/       # Modul fitur bisnis (Feature-Based)
│   │   │   ├── hooks/          # React custom hooks
│   │   │   ├── lib/            # Third-party library configuration
│   │   │   ├── services/       # HTTP Client API backend
│   │   │   ├── stores/         # State management
│   │   │   ├── types/          # Definisi TypeScript bersama
│   │   │   └── utils/          # Fungsi pembantu (format currency, date)
│   │   ├── tests/              # Pengujian frontend
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vite.config.ts
│   │
│   └── api/                    # Backend Modular Monolith Go Fiber v3
│       ├── cmd/api/            # Entry point aplikasi backend (main.go)
│       ├── internal/
│       │   ├── domain/         # Entitas & aturan bisnis murni (no external deps)
│       │   ├── application/    # Use cases & orkestrasi bisnis
│       │   ├── adapter/http/   # Fiber handlers, middleware, routes
│       │   └── infrastructure/ # Database, Redis, S3, Logger, Config
│       ├── tests/              # Unit & integration testing backend
│       ├── go.mod
│       └── go.sum
│
├── database/                   # Pengelolaan skema dan data
│   ├── migrations/             # Skema SQL bertahap (Up & Down)
│   ├── seeds/                  # Data awal development & pengujian
│   └── queries/                # Query SQL terstruktur
│
├── contract/                   # Kontrak komunikasi Frontend-Backend
│   └── openapi/
│       ├── openapi.yaml        # Spesifikasi REST API OpenAPI 3.0
│       └── schemas/            # Skema model request & response
│
├── infrastructure/             # Konfigurasi layanan pendukung
│   ├── docker/                 # Multi-stage Dockerfile frontend & backend
│   ├── traefik/                # Konfigurasi reverse proxy Traefik v3
│   ├── garage/                 # Dokumentasi S3 object storage
│   └── monitoring/             # Konfigurasi observability (LGTM stack)
│
├── docs/                       # Dokumentasi teknis & bisnis
│   ├── architecture/           # Dokumen arsitektur & ADR
│   ├── api/                    # Panduan integrasi API
│   ├── database/               # Dokumentasi database & PostGIS
│   ├── development/            # Panduan alur kerja dev & kode
│   ├── deployment/             # Panduan deployment produksi
│   └── business-rules/         # Aturan bisnis SMC & konsolidasi stok
│
├── scripts/                    # Script otomatisasi developer
│   ├── setup.sh                # Script setup otomatis
│   ├── check-health.sh         # Script pengecekan healthcheck
│   └── migrate.sh              # Script migrasi basis data
│
├── .editorconfig               # Standarisasi format penulisan file
├── .gitignore                  # Proteksi file lokal/secret dari git
├── .dockerignore               # Optimasi docker build context
├── .env.example                # Template konfigurasi environment
├── compose.yaml                # Konfigurasi Docker Compose development
├── Makefile                    # Command wrapper konsisten
└── README.md                   # Dokumentasi utama proyek
```

---

## 6. Panduan Instalasi & Setup Cepat

### Langkah 1: Kloning Repositori
```bash
git clone https://github.com/Danipinion/Sevent-X-Antech-Antench-Async.git
cd Sevent-X-Antech-Antench-Async/tandur
```

### Langkah 2: Menyiapkan Lingkungan Proyek
Jalankan perintah make otomatis untuk menyalin konfigurasi dan mengunduh dependencies:
```bash
make setup
```

Perintah di atas akan:
1. Menyalin `.env.example` ke `.env` lokal.
2. Mengunduh dan menginstal package Node.js untuk frontend (`npm install`).
3. Mengunduh dependensi Go module untuk backend (`go mod tidy`).

---

## 7. Menjalankan Layanan (Docker Compose)

Untuk menjalankan seluruh rangkaian layanan secara terintegrasi (Traefik, Frontend, Backend, PostgreSQL + PostGIS, Redis, Garage):

```bash
# Menjalankan kontainer di latar belakang
make up
# atau: docker compose up -d

# Memeriksa status kontainer
make ps
# atau: docker compose ps

# Memantau log real-time
make logs
# atau: docker compose logs -f

# Menghentikan seluruh kontainer
make down
# atau: docker compose down
```

### Akses Layanan Lokal
- **Aplikasi Web (Frontend):** [http://localhost:5173](http://localhost:5173)
- **API Endpoint:** [http://localhost:8080/api/v1/health](http://localhost:8080/api/v1/health)
- **Dokumentasi API (Swagger UI):** [http://localhost:8080/swagger](http://localhost:8080/swagger) atau [http://localhost:8080/docs](http://localhost:8080/docs)
- **Dokumentasi API (Scalar UI):** [http://localhost:8080/scalar](http://localhost:8080/scalar)
- **Database Web Dashboard (pgAdmin):** [http://localhost:5050](http://localhost:5050)
- **Storage Web Dashboard (Filestash):** [http://localhost:8334](http://localhost:8334)
- **Traefik Dashboard:** [http://localhost:8081](http://localhost:8081)

---

## 8. Menjalankan Frontend & Backend Secara Mandiri (Lokal)

Jika ingin menjalankan service tanpa kontainer Docker (bare-metal):

### Menjalankan Frontend (Vite)
```bash
make frontend
# Berjalan pada http://localhost:5173
```

### Menjalankan Backend (Go Fiber)
```bash
make backend
# Berjalan pada http://localhost:8080
```

---

## 9. Perintah Makefile

| Target | Fungsi |
|---|---|
| `make help` | Menampilkan ringkasan seluruh perintah yang tersedia |
| `make setup` | Menyiapkan `.env` lokal dan mengunduh semua dependencies |
| `make up` | Menyalakan seluruh service development (Docker Compose) |
| `make down` | Menghentikan seluruh service development |
| `make restart` | Memulai ulang seluruh kontainer service |
| `make logs` | Menampilkan log real-time service development |
| `make ps` | Menampilkan status kontainer yang sedang berjalan |
| `make frontend` | Menjalankan web frontend lokal (Vite dev server) |
| `make backend` | Menjalankan API backend lokal (Go run) |
| `make test` | Menjalankan seluruh pengujian unit test backend dan frontend |
| `make lint` | Menjalankan linting dan pengecekan tipe kode secara ketat |
| `make migrate-up` | Menjalankan migrasi database PostgreSQL |
| `make migrate-down` | Melakukan rollback migrasi database |
| `make clean` | Menghapus build cache dan file sementara |

---

## 10. Pengujian & Kualitas Kode

```bash
# Menjalankan seluruh unit test
make test

# Menjalankan verifikasi tipe & linting
make lint
```

---

## 11. Tautan Dokumentasi Terkait

- [Arsitektur & ADR](docs/architecture/README.md)
- [Dokumentasi API & OpenAPI Contract](docs/api/README.md)
- [Desain Database & PostGIS](docs/database/README.md)
- [Panduan Pengembangan & Git Flow](docs/development/README.md)
- [Panduan Deployment](docs/deployment/README.md)
- [Aturan Bisnis (SMC & Konsolidasi)](docs/business-rules/README.md)

---

## 12. Aturan Kontribusi & Git Workflow

1. Semua cabang fitur dibuat dari cabang `main` dengan format penamaan:
   - `feat/<nama-fitur>`
   - `fix/<nama-bug>`
   - `refactor/<cakupan>`
2. Seluruh perubahan wajib lolos pemeriksaan `make test` dan `make lint` sebelum membuat Pull Request.
3. Pesan commit mengikuti standar [Conventional Commits](https://www.conventionalcommits.org/).
4. Dilarang memasukkan kredensial, secret token, atau file `.env` ke dalam riwayat git.

---

## 13. Tim Pengembang (Sevent-X Antech)

Dikembangkan oleh **Tim Sevent-X Antech** untuk kompetisi inovasi teknologi pertanian berkelanjutan.
- Repositori: [https://github.com/Danipinion/Sevent-X-Antech-Antench-Async](https://github.com/Danipinion/Sevent-X-Antech-Antench-Async)

