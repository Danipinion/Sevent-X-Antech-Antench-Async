# Local Development Environment & Docker Compose

## 1. Tujuan

Menyiapkan lingkungan pengembangan lokal berbasis Docker agar seluruh anggota tim TANDUR dapat menjalankan aplikasi dan dependensi utamanya secara konsisten tanpa perlu melakukan instalasi database, cache, dan object storage secara manual.

Lingkungan development menggunakan Docker Compose untuk mengelola beberapa service dalam satu konfigurasi terpusat.

Dengan konfigurasi ini, setiap anggota tim cukup memiliki Docker Desktop atau Docker Engine beserta Docker Compose untuk menjalankan lingkungan pengembangan.

## 2. Teknologi yang Digunakan

| Service          | Teknologi                    | Fungsi                                            |
| ---------------- | ---------------------------- | ------------------------------------------------- |
| Frontend         | React.js + TypeScript + Vite | Menjalankan aplikasi web TANDUR                   |
| Backend          | Golang + Fiber v3            | Menjalankan REST API                              |
| Database         | PostgreSQL + PostGIS         | Menyimpan data utama dan data geografis           |
| Cache            | Redis                        | Menyimpan cache dan mendukung kebutuhan sementara |
| Object Storage   | Garage                       | Menyimpan file dan objek menggunakan S3 API       |
| Containerization | Docker                       | Menjalankan aplikasi dalam container              |
| Orchestration    | Docker Compose               | Mengelola service dan jaringan container          |

## 3. Struktur File Docker

Pastikan repository memiliki struktur berikut:

```text
tandur/
├── apps/
│   ├── web/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── ...
│   │
│   └── api/
│       ├── Dockerfile
│       ├── go.mod
│       └── ...
│
├── infrastructure/
│   ├── docker/
│   │   ├── frontend/
│   │   │   └── Dockerfile
│   │   └── backend/
│   │       └── Dockerfile
│   │
│   └── garage/
│       └── garage.toml
│
├── database/
│   ├── migrations/
│   └── seeds/
│
├── compose.yaml
├── .env.example
├── .env
├── .dockerignore
└── Makefile
```

Catatan: Dockerfile dapat ditempatkan langsung di dalam `apps/web` dan `apps/api`, atau mengikuti direktori `infrastructure/docker` di atas. Pilih satu pendekatan dan gunakan secara konsisten. Contoh berikut menggunakan Dockerfile di direktori `infrastructure/docker`.

## 4. Dockerfile Frontend

File: `infrastructure/docker/frontend/Dockerfile`

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY apps/web/package*.json ./

RUN npm install

COPY apps/web/ .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

Penjelasan:

- Menggunakan Node.js sebagai runtime frontend.
- Menyalin dependency manifest terlebih dahulu agar instalasi dependency dapat memanfaatkan Docker layer cache.
- Menjalankan Vite development server.
- Menggunakan `0.0.0.0` agar frontend dapat diakses dari luar container.
- Port frontend menggunakan `5173`.

Catatan: Contoh ini menggunakan npm. Jika proyek menggunakan pnpm, sesuaikan proses instalasi dan command-nya dengan package manager yang dipilih tim.

## 5. Dockerfile Backend

File: `infrastructure/docker/backend/Dockerfile`

```dockerfile
FROM golang:1.25-alpine

WORKDIR /app

RUN apk add --no-cache git ca-certificates tzdata

COPY apps/api/go.mod apps/api/go.sum ./

RUN go mod download

COPY apps/api/ .

EXPOSE 8080

CMD ["go", "run", "./cmd/api"]
```

Penjelasan:

- Menggunakan Golang sebagai runtime backend.
- Mengunduh dependency berdasarkan `go.mod` dan `go.sum`.
- Menyalin source code backend.
- Menjalankan aplikasi melalui entry point `cmd/api`.
- Backend menggunakan port `8080`.

Catatan:

- Sesuaikan versi Go dengan versi yang ditetapkan di `go.mod` dan standar tim.
- Pastikan entry point `./cmd/api` benar-benar tersedia.
- Jika nama package atau lokasi entry point berubah, sesuaikan command pada Dockerfile.
- Dockerfile ini ditujukan untuk development, bukan image production.

## 6. Docker Compose

File: `compose.yaml`

```yaml
services:
  web:
    build:
      context: .
      dockerfile: infrastructure/docker/frontend/Dockerfile
    container_name: tandur-web
    restart: unless-stopped
    ports:
      - "${WEB_PORT:-5173}:5173"
    volumes:
      - ./apps/web:/app
      - web_node_modules:/app/node_modules
    environment:
      VITE_API_BASE_URL: ${VITE_API_BASE_URL:-http://localhost:8080}
    depends_on:
      api:
        condition: service_healthy
    networks:
      - tandur-network

  api:
    build:
      context: .
      dockerfile: infrastructure/docker/backend/Dockerfile
    container_name: tandur-api
    restart: unless-stopped
    ports:
      - "${API_PORT:-8080}:8080"
    volumes:
      - ./apps/api:/app
      - go_modules:/go/pkg/mod
    environment:
      APP_ENV: development
      APP_PORT: 8080
      DATABASE_URL: postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?sslmode=disable
      REDIS_URL: redis://redis:6379/0
      S3_ENDPOINT: http://garage:3900
      S3_REGION: ${S3_REGION:-garage}
      S3_BUCKET: ${S3_BUCKET:-tandur}
      S3_ACCESS_KEY: ${S3_ACCESS_KEY}
      S3_SECRET_KEY: ${S3_SECRET_KEY}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      garage:
        condition: service_healthy
    healthcheck:
      test:
        - CMD
        - wget
        - --spider
        - -q
        - http://localhost:8080/health
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 20s
    networks:
      - tandur-network

  postgres:
    image: postgis/postgis:17-3.5
    container_name: tandur-postgres
    restart: unless-stopped
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test:
        - CMD-SHELL
        - pg_isready -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - tandur-network

  redis:
    image: redis:7-alpine
    container_name: tandur-redis
    restart: unless-stopped
    ports:
      - "${REDIS_PORT:-6379}:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test:
        - CMD
        - redis-cli
        - ping
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - tandur-network

  garage:
    image: dxflrs/garage:v2.1.0
    container_name: tandur-garage
    restart: unless-stopped
    ports:
      - "${GARAGE_S3_PORT:-3900}:3900"
      - "${GARAGE_WEB_PORT:-3902}:3902"
      - "${GARAGE_ADMIN_PORT:-3903}:3903"
    volumes:
      - garage_data:/var/lib/garage/data
      - garage_meta:/var/lib/garage/meta
      - ./infrastructure/garage/garage.toml:/etc/garage.toml:ro
    healthcheck:
      test:
        - CMD
        - /garage
        - status
      interval: 15s
      timeout: 10s
      retries: 5
      start_period: 15s
    networks:
      - tandur-network

volumes:
  postgres_data:
  redis_data:
  garage_data:
  garage_meta:
  web_node_modules:
  go_modules:

networks:
  tandur-network:
    driver: bridge
```

Catatan penting:

1. `depends_on` dengan `condition: service_healthy` memastikan service yang bergantung pada database, Redis, dan Garage menunggu health check dependency-nya.
2. Health check backend mengasumsikan endpoint `GET /health` sudah dibuat.
3. Health check Garage menggunakan perintah `garage status`. Pastikan perintah tersebut tersedia dan berfungsi pada versi image yang dipilih. Jika tidak, sesuaikan dengan mekanisme pemeriksaan yang didukung image.
4. Port yang diekspos ke host dapat diubah melalui `.env`.
5. Semua komunikasi antar-container menggunakan nama service, bukan `localhost`. Contohnya backend mengakses PostgreSQL melalui `postgres:5432`.
6. Konfigurasi ini merupakan baseline development. Production harus menggunakan konfigurasi terpisah.

## 7. Konfigurasi Garage

File: `infrastructure/garage/garage.toml`

```toml
metadata_dir = "/var/lib/garage/meta"
data_dir = "/var/lib/garage/data"

db_engine = "lmdb"

replication_factor = 1

rpc_bind_addr = "[::]:3901"
rpc_public_addr = "127.0.0.1:3901"

rpc_secret = "CHANGE_THIS_TO_A_RANDOM_64_CHARACTER_HEX_SECRET"

[s3_api]
s3_region = "garage"
api_bind_addr = "[::]:3900"
root_domain = ".s3.localhost"

[admin]
api_bind_addr = "[::]:3903"
```

Penjelasan:

- Garage digunakan sebagai object storage yang kompatibel dengan S3 API.
- `replication_factor = 1` digunakan untuk lingkungan lokal satu node.
- Port `3900` digunakan untuk S3 API.
- Port `3903` digunakan untuk Admin API.
- Direktori data dan metadata dipersistenkan melalui Docker volume.
- `rpc_secret` harus berupa secret acak dan tidak boleh menggunakan nilai contoh di atas pada lingkungan bersama atau production.

Catatan: Setelah Garage berjalan, node perlu diinisialisasi dan bucket serta access key perlu dibuat menggunakan CLI Garage. Proses bootstrap ini merupakan bagian dari setup awal, bukan otomatis dilakukan hanya dengan menjalankan Docker Compose.

Contoh command inisialisasi (jalankan sesuai petunjuk CLI versi Garage yang digunakan):

```bash
docker compose exec garage /garage status
docker compose exec garage /garage layout assign -z dc1 -c 1G <NODE_ID>
docker compose exec garage /garage layout apply --version 1
docker compose exec garage /garage bucket create tandur
docker compose exec garage /garage key create tandur-dev
docker compose exec garage /garage bucket allow --read --write tandur --key tandur-dev
```

Periksa kembali sintaks CLI sesuai versi Garage yang digunakan. Simpan access key dan secret key hasil pembuatan ke `.env` lokal.

## 8. Environment Variables

File: `.env.example`

```env
# Application
APP_ENV=development

# Frontend
WEB_PORT=5173
VITE_API_BASE_URL=http://localhost:8080

# Backend
API_PORT=8080

# PostgreSQL
POSTGRES_DB=tandur
POSTGRES_USER=tandur
POSTGRES_PASSWORD=change_me
POSTGRES_PORT=5432

# Redis
REDIS_PORT=6379

# Garage
GARAGE_S3_PORT=3900
GARAGE_WEB_PORT=3902
GARAGE_ADMIN_PORT=3903

S3_REGION=garage
S3_BUCKET=tandur
S3_ACCESS_KEY=replace_with_garage_access_key
S3_SECRET_KEY=replace_with_garage_secret_key
```

Aturan penggunaan environment variable:

- `.env.example` menjadi template konfigurasi yang boleh masuk repository.
- `.env` berisi konfigurasi lokal masing-masing anggota tim dan tidak boleh di-commit.
- Jangan menyimpan password, access key, secret key, atau credential asli di repository.
- Semua anggota tim harus membuat `.env` dari `.env.example`.
- Jika ada perubahan environment variable, perbarui `.env.example` dan dokumentasikan perubahan tersebut.
- Untuk production, gunakan secret management yang sesuai dan jangan menggunakan credential development.

Command membuat file `.env`:

```bash
cp .env.example .env
```

## 9. Docker Ignore

File: `.dockerignore`

```dockerignore
.git
.gitignore

.env
.env.*
!.env.example

**/node_modules
**/vendor
**/dist
**/build

**/.idea
**/.vscode

**/*.log
**/coverage
**/tmp

.DS_Store
Thumbs.db
```

Tujuan `.dockerignore` adalah mencegah file yang tidak diperlukan masuk ke build context Docker, mengurangi ukuran build context, serta menghindari credential lokal ikut tersalin ke image.

## 10. Volume Persistence

Docker volume digunakan agar data penting tidak hilang ketika container dihentikan atau dibuat ulang.

| Volume             | Service    | Fungsi                           |
| ------------------ | ---------- | -------------------------------- |
| `postgres_data`    | PostgreSQL | Menyimpan database               |
| `redis_data`       | Redis      | Menyimpan data persistence Redis |
| `garage_data`      | Garage     | Menyimpan objek/file             |
| `garage_meta`      | Garage     | Menyimpan metadata Garage        |
| `web_node_modules` | Frontend   | Menyimpan dependency Node.js     |
| `go_modules`       | Backend    | Menyimpan cache dependency Go    |

Aturan:

- Jangan menggunakan `docker compose down -v` jika masih membutuhkan data lokal.
- Gunakan `docker compose down` untuk menghentikan dan menghapus container tanpa menghapus named volume.
- Backup database dan object storage secara berkala jika data development penting.
- Volume dependency frontend dan backend dapat dihapus dan dibuat ulang jika terjadi masalah dependency.

## 11. Network Antar-Container

Seluruh service menggunakan satu bridge network bernama `tandur-network`.

| Service    | Alamat yang Digunakan Antar-Container |
| ---------- | ------------------------------------- |
| Frontend   | `web:5173`                            |
| Backend    | `api:8080`                            |
| PostgreSQL | `postgres:5432`                       |
| Redis      | `redis:6379`                          |
| Garage S3  | `garage:3900`                         |

Aturan:

- Gunakan nama service Docker Compose sebagai hostname.
- Jangan menggunakan `localhost` untuk komunikasi dari satu container ke container lain.
- `localhost` di dalam container hanya merujuk ke container itu sendiri.
- Browser pengguna mengakses frontend dan API melalui port host, misalnya `localhost:5173` dan `localhost:8080`.
- Backend mengakses dependency internal melalui network Docker.

## 12. Health Check

Health check digunakan untuk memeriksa apakah service sudah siap menerima koneksi.

| Service    | Pemeriksaan             | Tujuan                                    |
| ---------- | ----------------------- | ----------------------------------------- |
| Frontend   | HTTP development server | Memastikan frontend dapat diakses         |
| Backend    | `GET /health`           | Memastikan API berjalan                   |
| PostgreSQL | `pg_isready`            | Memastikan database siap menerima koneksi |
| Redis      | `redis-cli ping`        | Memastikan Redis merespons                |
| Garage     | `garage status`         | Memeriksa status node Garage              |

Backend harus menyediakan endpoint sederhana:

```http
GET /health
```

Contoh respons:

```json
{
  "status": "ok",
  "service": "tandur-api"
}
```

Health check service tidak otomatis menjamin seluruh fitur aplikasi berjalan dengan benar. Pengujian integrasi tetap diperlukan.

## 13. Command Menjalankan Lingkungan Lokal

### 13.1 Persiapan

Pastikan perangkat sudah memiliki:

- Docker Desktop atau Docker Engine.
- Docker Compose.
- Git.
- Repository TANDUR.

Periksa instalasi:

```bash
docker --version
docker compose version
```

### 13.2 Membuat Environment File

```bash
cp .env.example .env
```

Sesuaikan credential lokal dan konfigurasi Garage sebelum menjalankan aplikasi.

### 13.3 Build dan Menjalankan Semua Service

```bash
docker compose up -d --build
```

Command tersebut akan:

- Membuat image frontend dan backend.
- Mengunduh image dependency.
- Membuat network.
- Membuat volume.
- Menjalankan seluruh container di background.

### 13.4 Memeriksa Status Container

```bash
docker compose ps
```

Pastikan seluruh service berada dalam kondisi berjalan dan health check service yang memilikinya menunjukkan `healthy`.

### 13.5 Melihat Log

Semua service:

```bash
docker compose logs -f
```

Frontend:

```bash
docker compose logs -f web
```

Backend:

```bash
docker compose logs -f api
```

PostgreSQL:

```bash
docker compose logs -f postgres
```

Redis:

```bash
docker compose logs -f redis
```

Garage:

```bash
docker compose logs -f garage
```

### 13.6 Menghentikan Service

```bash
docker compose stop
```

Menghentikan sekaligus menghapus container dan network:

```bash
docker compose down
```

Data dalam named volume tetap dipertahankan.

### 13.7 Menjalankan Ulang Service

```bash
docker compose restart
```

### 13.8 Rebuild Setelah Perubahan Dockerfile

```bash
docker compose up -d --build
```

### 13.9 Mengakses Container

Frontend:

```bash
docker compose exec web sh
```

Backend:

```bash
docker compose exec api sh
```

PostgreSQL:

```bash
docker compose exec postgres sh
```

Redis:

```bash
docker compose exec redis sh
```

Garage:

```bash
docker compose exec garage sh
```

### 13.10 Mengakses PostgreSQL

```bash
docker compose exec postgres psql -U tandur -d tandur
```

### 13.11 Mengakses Redis

```bash
docker compose exec redis redis-cli
```

## 14. Akses Aplikasi Lokal

Setelah seluruh service berhasil dijalankan:

| Service              | Alamat                       |
| -------------------- | ---------------------------- |
| Frontend             | http://localhost:5173        |
| Backend API          | http://localhost:8080        |
| Backend Health Check | http://localhost:8080/health |
| PostgreSQL           | localhost:5432               |
| Redis                | localhost:6379               |
| Garage S3 API        | http://localhost:3900        |
| Garage Admin API     | http://localhost:3903        |

Port database, Redis, dan Garage hanya untuk kebutuhan development lokal. Jangan mengekspos port tersebut ke jaringan publik.

## 15. Integrasi Frontend dan Backend

Frontend menggunakan:

```env
VITE_API_BASE_URL=http://localhost:8080
```

Backend menggunakan:

```env
DATABASE_URL=postgres://tandur:password@postgres:5432/tandur?sslmode=disable
REDIS_URL=redis://redis:6379/0
S3_ENDPOINT=http://garage:3900
```

Perbedaan alamat perlu diperhatikan:

- Browser mengakses backend melalui `localhost:8080`.
- Backend mengakses PostgreSQL melalui `postgres:5432`.
- Backend mengakses Redis melalui `redis:6379`.
- Backend mengakses Garage melalui `garage:3900`.

Pastikan konfigurasi CORS backend mengizinkan origin frontend development, yaitu `http://localhost:5173`, jika frontend mengakses API secara langsung dari browser.

## 16. Pengujian Startup Seluruh Service

Lakukan pengujian berikut setelah konfigurasi Docker selesai.

### Checklist Pengujian

- [ ] Docker Compose berhasil membaca `compose.yaml`.
- [ ] Semua image berhasil dibangun atau diunduh.
- [ ] Container frontend berhasil berjalan.
- [ ] Container backend berhasil berjalan.
- [ ] PostgreSQL berhasil berjalan.
- [ ] Extension PostGIS tersedia di PostgreSQL.
- [ ] Redis berhasil berjalan.
- [ ] Garage berhasil berjalan.
- [ ] Garage dapat diinisialisasi sebagai single-node development.
- [ ] Bucket dan access key Garage berhasil dibuat.
- [ ] Backend berhasil terhubung ke PostgreSQL.
- [ ] Backend berhasil terhubung ke Redis.
- [ ] Backend berhasil terhubung ke Garage.
- [ ] Frontend berhasil diakses melalui browser.
- [ ] Frontend berhasil berkomunikasi dengan backend.
- [ ] Health check service berjalan sesuai konfigurasi.
- [ ] Data PostgreSQL tetap tersedia setelah container direstart.
- [ ] Data Redis tetap tersedia sesuai konfigurasi persistence.
- [ ] Data Garage tetap tersedia setelah container direstart.
- [ ] Seluruh service dapat dihentikan dan dijalankan kembali.

### Pengujian PostgreSQL dan PostGIS

```bash
docker compose exec postgres psql -U tandur -d tandur \
  -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

Periksa versi PostGIS:

```bash
docker compose exec postgres psql -U tandur -d tandur \
  -c "SELECT PostGIS_Version();"
```

### Pengujian Redis

```bash
docker compose exec redis redis-cli ping
```

Hasil yang diharapkan:

```text
PONG
```

### Pengujian Backend

```bash
curl http://localhost:8080/health
```

Hasil yang diharapkan adalah HTTP 200 dengan status aplikasi sehat.

### Pengujian Frontend

Buka:

```text
http://localhost:5173
```

Pastikan halaman frontend dapat dimuat tanpa error.

## 17. Makefile (Opsional)

Untuk mempermudah penggunaan command Docker, tim dapat menyediakan Makefile pada root repository.

File: `Makefile`

```makefile
.PHONY: up down stop restart build logs ps clean

up:
	docker compose up -d

build:
	docker compose build

up-build:
	docker compose up -d --build

down:
	docker compose down

stop:
	docker compose stop

restart:
	docker compose restart

logs:
	docker compose logs -f

ps:
	docker compose ps

clean:
	docker compose down --remove-orphans
```

Penggunaan:

```bash
make up
make up-build
make ps
make logs
make down
```

Catatan: `make clean` tidak menghapus named volume sehingga data development tetap tersimpan.

## 18. Aturan Penggunaan Docker untuk Tim

1. Seluruh anggota tim wajib menggunakan konfigurasi Docker Compose yang tersedia di repository.
2. Jangan mengubah port, credential, atau konfigurasi service secara sepihak tanpa memperbarui dokumentasi.
3. Jangan melakukan commit terhadap file `.env`.
4. Jangan menggunakan credential production untuk development.
5. Jangan menghapus volume database tanpa memastikan data tidak lagi dibutuhkan.
6. Setiap perubahan Dockerfile, Compose, atau environment variable harus disertai dokumentasi perubahan.
7. Setiap anggota tim harus menguji startup service setelah melakukan perubahan konfigurasi.
8. Jangan menggunakan `docker compose down -v` sembarangan karena dapat menghapus seluruh data pada named volume.
9. Gunakan versi image yang ditentukan agar lingkungan pengembangan antaranggota tetap konsisten.
10. Konfigurasi development dan production harus dipisahkan.

## 19. Batasan Lingkungan Development

Konfigurasi ini hanya ditujukan untuk pengembangan lokal dan pengujian integrasi awal.

Hal-hal berikut belum menjadi bagian dari konfigurasi ini:

- Deployment production.
- High availability dan replikasi database.
- Redis cluster.
- Garage multi-node dan replikasi antar-node.
- Reverse proxy production dengan HTTPS.
- Backup otomatis production.
- Monitoring dan observability production.
- Secret management production.

Kebutuhan tersebut akan ditangani pada tahap infrastruktur dan deployment production.

## 20. Kriteria Penyelesaian (Definition of Done)

Task dinyatakan selesai apabila:

- [ ] Dockerfile frontend tersedia dan dapat dibangun.
- [ ] Dockerfile backend tersedia dan dapat dibangun.
- [ ] Docker Compose berhasil mengelola seluruh service.
- [ ] PostgreSQL dengan PostGIS berhasil berjalan.
- [ ] Redis berhasil berjalan.
- [ ] Garage berhasil berjalan dan dapat digunakan sebagai S3-compatible storage.
- [ ] Environment variable terdokumentasi melalui `.env.example`.
- [ ] File `.env` tidak masuk ke repository.
- [ ] Health check tersedia dan berfungsi untuk service yang relevan.
- [ ] Volume persistence telah dikonfigurasi.
- [ ] Network antar-container telah dikonfigurasi.
- [ ] Frontend berhasil berkomunikasi dengan backend.
- [ ] Backend berhasil terhubung ke seluruh dependency utama.
- [ ] Seluruh service berhasil dijalankan menggunakan Docker Compose.
- [ ] Data tetap tersimpan setelah container direstart.
- [ ] Dokumentasi command Docker tersedia dan dapat diikuti seluruh anggota tim.
- [ ] Anggota tim dapat menjalankan lingkungan development tanpa instalasi dependency secara manual.

## 21. Hasil Akhir

Lingkungan pengembangan lokal TANDUR berhasil disiapkan menggunakan Docker Compose dengan service frontend, backend, PostgreSQL + PostGIS, Redis, dan Garage.

Seluruh service dapat dijalankan melalui satu konfigurasi terpusat sehingga anggota tim memiliki lingkungan pengembangan yang konsisten, mudah direproduksi, dan lebih mudah dipelihara selama proses pengembangan aplikasi.
