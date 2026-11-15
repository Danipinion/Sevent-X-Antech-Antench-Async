# Repository Structure & Project Foundation

## 1. Deskripsi

Menyiapkan struktur repository sebagai fondasi pengembangan aplikasi TANDUR yang mencakup frontend, backend, konfigurasi infrastruktur, database, API specification, dan dokumentasi.

Struktur repository dirancang agar seluruh anggota tim dapat bekerja secara paralel dengan pembagian tanggung jawab yang jelas, konsisten, dan mudah dipelihara.

Pengembangan mengikuti prinsip Clean Code dan Clean Architecture, dengan pendekatan Modular Monolith pada backend serta Feature-Based Architecture pada frontend.

## 2. Tujuan

1. Menyediakan struktur direktori yang terorganisasi.
2. Memisahkan tanggung jawab frontend, backend, database, dan infrastruktur.
3. Memudahkan pengembangan fitur secara paralel.
4. Menyamakan struktur kerja seluruh anggota tim.
5. Memastikan konfigurasi proyek dapat dijalankan pada lingkungan pengembangan yang berbeda.
6. Menyediakan dokumentasi dan command wrapper untuk mempermudah penggunaan proyek.

## 3. Struktur Direktori Repository

Struktur direktori utama yang digunakan:

    tandur/
    ├── apps/
    │   ├── web/
    │   │   ├── public/
    │   │   ├── src/
    │   │   │   ├── app/
    │   │   │   ├── assets/
    │   │   │   ├── components/
    │   │   │   ├── features/
    │   │   │   ├── hooks/
    │   │   │   ├── lib/
    │   │   │   ├── services/
    │   │   │   ├── stores/
    │   │   │   ├── types/
    │   │   │   └── utils/
    │   │   ├── tests/
    │   │   ├── index.html
    │   │   ├── package.json
    │   │   ├── tsconfig.json
    │   │   └── vite.config.ts
    │   │
    │   └── api/
    │       ├── cmd/
    │       │   └── api/
    │       │       └── main.go
    │       ├── internal/
    │       │   ├── domain/
    │       │   ├── application/
    │       │   ├── adapter/
    │       │   │   └── http/
    │       │   └── infrastructure/
    │       │       ├── persistence/
    │       │       ├── cache/
    │       │       ├── storage/
    │       │       ├── external/
    │       │       ├── geospatial/
    │       │       ├── logger/
    │       │       └── config/
    │       ├── tests/
    │       ├── go.mod
    │       └── go.sum
    │
    ├── database/
    │   ├── migrations/
    │   ├── seeds/
    │   └── queries/
    │
    ├── contract/
    │   └── openapi/
    │       ├── openapi.yaml
    │       └── schemas/
    │
    ├── infrastructure/
    │   ├── docker/
    │   │   ├── frontend/
    │   │   │   └── Dockerfile
    │   │   └── backend/
    │   │       └── Dockerfile
    │   ├── traefik/
    │   │   └── traefik.yml
    │   ├── garage/
    │   │   └── README.md
    │   └── monitoring/
    │       └── README.md
    │
    ├── docs/
    │   ├── architecture/
    │   ├── api/
    │   ├── database/
    │   ├── development/
    │   ├── deployment/
    │   └── business-rules/
    │
    ├── scripts/
    │
    ├── .editorconfig
    ├── .gitignore
    ├── .dockerignore
    ├── .env.example
    ├── compose.yaml
    ├── Makefile
    └── README.md

## 4. Penjelasan Struktur Direktori

### 4.1. apps/

Direktori utama untuk aplikasi yang dikembangkan.

#### apps/web/

Berisi seluruh implementasi frontend TANDUR menggunakan React, TypeScript, dan Vite.

| Direktori       | Tanggung Jawab                                            |
| --------------- | --------------------------------------------------------- |
| public/         | File statis yang dapat diakses langsung oleh browser.     |
| src/app/        | Konfigurasi aplikasi, routing, dan inisialisasi aplikasi. |
| src/assets/     | Gambar, ikon, font, dan aset lainnya.                     |
| src/components/ | Komponen UI yang dapat digunakan kembali.                 |
| src/features/   | Implementasi fitur berdasarkan domain bisnis.             |
| src/hooks/      | Custom React hooks.                                       |
| src/lib/        | Konfigurasi dan integrasi library pihak ketiga.           |
| src/services/   | Komunikasi HTTP dengan backend API.                       |
| src/stores/     | State global aplikasi apabila diperlukan.                 |
| src/types/      | Definisi tipe TypeScript bersama.                         |
| src/utils/      | Fungsi pembantu yang bersifat umum.                       |
| tests/          | Pengujian frontend.                                       |

Setiap fitur pada `features/` dapat memiliki struktur internal sendiri, seperti components, hooks, services, types, dan utils.

Contoh:

    features/
    ├── authentication/
    ├── profile/
    ├── farmer/
    ├── commodity/
    ├── middleman/
    ├── inventory/
    ├── buyer/
    ├── orders/
    ├── market-prices/
    ├── map/
    └── notifications/

#### apps/api/

Berisi implementasi backend menggunakan Golang dan Fiber v3.

Backend menggunakan pendekatan Clean Architecture dengan pola Modular Monolith.

| Direktori                            | Tanggung Jawab                                           |
| ------------------------------------ | -------------------------------------------------------- |
| cmd/api/                             | Entry point aplikasi backend.                            |
| internal/domain/                     | Entitas, value object, dan aturan bisnis inti.           |
| internal/application/                | Use case dan orkestrasi proses bisnis.                   |
| internal/adapter/http/               | Handler, middleware, routing, dan DTO HTTP.              |
| internal/infrastructure/persistence/ | Implementasi akses database PostgreSQL.                  |
| internal/infrastructure/cache/       | Implementasi Redis.                                      |
| internal/infrastructure/storage/     | Integrasi object storage Garage.                         |
| internal/infrastructure/external/    | Integrasi API eksternal, termasuk referensi harga pasar. |
| internal/infrastructure/geospatial/  | Implementasi kebutuhan pemrosesan geospasial.            |
| internal/infrastructure/logger/      | Konfigurasi logging.                                     |
| internal/infrastructure/config/      | Pembacaan dan validasi konfigurasi aplikasi.             |
| tests/                               | Pengujian integrasi dan pengujian lainnya.               |

Ketentuan:

- Domain tidak boleh bergantung pada Fiber, PostgreSQL, Redis, atau library infrastruktur lainnya.
- Application bertanggung jawab menjalankan use case berdasarkan aturan bisnis.
- Adapter bertanggung jawab menerjemahkan komunikasi HTTP menjadi pemanggilan use case.
- Infrastructure menyediakan implementasi teknis dari kebutuhan yang didefinisikan oleh layer internal.
- Backend tetap satu aplikasi Modular Monolith untuk MVP, bukan microservices.

### 4.2. database/

Berisi seluruh kebutuhan pengelolaan skema dan data database.

| Direktori   | Tanggung Jawab                                                                        |
| ----------- | ------------------------------------------------------------------------------------- |
| migrations/ | File perubahan struktur database secara bertahap.                                     |
| seeds/      | Data awal untuk kebutuhan development dan testing.                                    |
| queries/    | Query SQL yang digunakan untuk akses data dan proses code generation jika diperlukan. |

Ketentuan:

- Setiap perubahan struktur database wajib dibuat melalui migration.
- Migration harus memiliki urutan yang jelas dan tidak boleh menggunakan nama yang ambigu.
- Data seed tidak boleh berisi informasi rahasia atau data production.
- Penghapusan atau perubahan data penting harus dipertimbangkan dampaknya terhadap data yang sudah tersimpan.
- PostgreSQL menjadi database utama dan PostGIS digunakan untuk kebutuhan geospasial.

### 4.3. contract/openapi/

Berisi kontrak komunikasi antara frontend dan backend.

| File/Direktori | Tanggung Jawab                                                          |
| -------------- | ----------------------------------------------------------------------- |
| openapi.yaml   | Spesifikasi utama REST API TANDUR.                                      |
| schemas/       | Skema request, response, dan komponen API yang dapat digunakan kembali. |

Ketentuan:

- Setiap endpoint yang digunakan frontend harus terdokumentasi.
- Perubahan request atau response harus memperbarui kontrak API.
- Frontend dan backend menggunakan kontrak yang sama sebagai acuan integrasi.
- Dokumentasi dapat digunakan untuk menghasilkan tampilan Swagger UI.
- Kontrak API tidak boleh hanya mengikuti implementasi backend tanpa kesepakatan bersama.

### 4.4. infrastructure/

Berisi konfigurasi layanan pendukung aplikasi.

| Direktori   | Tanggung Jawab                                     |
| ----------- | -------------------------------------------------- |
| docker/     | Dockerfile untuk frontend dan backend.             |
| traefik/    | Konfigurasi reverse proxy dan routing layanan.     |
| garage/     | Dokumentasi dan konfigurasi object storage Garage. |
| monitoring/ | Konfigurasi monitoring dan observability.          |

Komponen infrastruktur yang direncanakan:

- Docker untuk containerization.
- Docker Compose untuk menjalankan layanan pengembangan.
- Traefik sebagai reverse proxy.
- PostgreSQL + PostGIS sebagai database.
- Redis sebagai cache.
- Garage sebagai object storage.
- LGTM Stack untuk observability.

### 4.5. docs/

Berisi dokumentasi teknis dan bisnis proyek.

| Direktori       | Isi                                                                          |
| --------------- | ---------------------------------------------------------------------------- |
| architecture/   | Dokumentasi arsitektur sistem dan Architecture Decision Records (ADR).       |
| api/            | Dokumentasi penggunaan dan integrasi API.                                    |
| database/       | ERD, desain database, dan dokumentasi migration.                             |
| development/    | Panduan setup, coding standards, Git workflow, dan command proyek.           |
| deployment/     | Panduan deployment dan konfigurasi environment.                              |
| business-rules/ | Aturan bisnis TANDUR, termasuk Smart Margin Control dan Stock Consolidation. |

### 4.6. scripts/

Berisi script otomatisasi yang digunakan untuk membantu proses development, testing, dan kebutuhan operasional.

Contoh:

- Script inisialisasi development.
- Script pemeriksaan konfigurasi.
- Script pendukung migration.
- Script utilitas untuk development.

Script harus memiliki tujuan yang jelas dan tidak boleh menjalankan perubahan pada production tanpa prosedur yang disengaja.

## 5. Konfigurasi File Utama

### 5.1. .gitignore

File `.gitignore` digunakan untuk mencegah file yang tidak perlu masuk ke repository.

Contoh isi:

    # Environment
    .env
    .env.*
    !.env.example

    # Node.js
    node_modules/
    dist/
    .vite/
    coverage/

    # Go
    vendor/
    *.exe
    *.test
    *.out

    # IDE
    .idea/
    .vscode/
    *.swp

    # OS
    .DS_Store
    Thumbs.db

    # Logs
    *.log
    logs/

    # Temporary files
    tmp/
    temp/

    # Docker
    .docker/

    # Test artifacts
    playwright-report/
    test-results/

Ketentuan:

- File `.env` tidak boleh dimasukkan ke Git.
- File `.env.example` harus tetap tersedia sebagai contoh konfigurasi.
- File hasil build dan dependency lokal tidak boleh masuk repository.
- File yang dibutuhkan untuk menjalankan proyek tidak boleh diabaikan secara tidak sengaja.

### 5.2. .editorconfig

File `.editorconfig` digunakan untuk menyamakan format dasar penulisan file antaranggota tim.

Contoh isi:

    root = true

    [*]
    charset = utf-8
    end_of_line = lf
    insert_final_newline = true
    trim_trailing_whitespace = true

    [*.md]
    trim_trailing_whitespace = false

    [*.{ts,tsx,js,jsx,json,yml,yaml}]
    indent_style = space
    indent_size = 2

    [*.go]
    indent_style = tab

    [Makefile]
    indent_style = tab

Ketentuan:

- Seluruh file menggunakan UTF-8.
- Line ending menggunakan LF.
- File harus memiliki newline pada akhir file.
- Format indentasi mengikuti jenis file dan standar bahasa yang digunakan.

### 5.3. .dockerignore

File `.dockerignore` digunakan untuk mengecualikan file yang tidak diperlukan saat Docker membangun image.

Contoh isi:

    .git
    .github
    .env
    .env.*
    !.env.example
    node_modules
    dist
    coverage
    .idea
    .vscode
    *.log
    tmp
    temp
    test-results
    playwright-report

Pastikan file yang dibutuhkan untuk proses build tidak ikut dikecualikan.

### 5.4. .env.example

File ini menjadi referensi konfigurasi environment yang diperlukan untuk menjalankan proyek.

Contoh:

    # Application
    APP_ENV=development
    APP_PORT=8080
    APP_URL=http://localhost

    # Frontend
    VITE_API_BASE_URL=/api/v1

    # Database
    DATABASE_HOST=postgres
    DATABASE_PORT=5432
    DATABASE_NAME=tandur
    DATABASE_USER=tandur
    DATABASE_PASSWORD=change_me
    DATABASE_SSLMODE=disable

    # Redis
    REDIS_HOST=redis
    REDIS_PORT=6379
    REDIS_PASSWORD=

    # Object Storage
    S3_ENDPOINT=http://garage:3900
    S3_BUCKET=tandur
    S3_ACCESS_KEY=change_me
    S3_SECRET_KEY=change_me
    S3_REGION=garage

    # External API
    MARKET_PRICE_API_BASE_URL=

    # Map
    MAP_PROVIDER=openstreetmap
    MAP_API_KEY=

Catatan:

- Nilai di atas merupakan contoh untuk development, bukan konfigurasi production.
- Nama dan kebutuhan variabel harus disesuaikan dengan implementasi aktual.
- Jangan menyimpan credential asli pada repository.
- Setiap anggota membuat file `.env` lokal berdasarkan `.env.example`.

## 6. Konfigurasi Docker Compose

File `compose.yaml` digunakan untuk menjalankan lingkungan development secara konsisten.

Layanan yang direncanakan:

| Service  | Fungsi                                |
| -------- | ------------------------------------- |
| web      | Menjalankan frontend TANDUR.          |
| api      | Menjalankan backend TANDUR.           |
| postgres | Database utama PostgreSQL + PostGIS.  |
| redis    | Cache dan penyimpanan data sementara. |
| garage   | Object storage kompatibel S3.         |
| traefik  | Reverse proxy dan routing layanan.    |

Ketentuan:

- Seluruh service development dijalankan melalui Docker Compose.
- Service yang saling berkomunikasi menggunakan nama service sebagai hostname internal.
- Port database dan layanan internal tidak perlu diekspos ke jaringan publik.
- Volume digunakan untuk menjaga data development tetap tersedia setelah container dihentikan.
- Healthcheck digunakan pada layanan yang mendukungnya.
- Konfigurasi development harus dipisahkan dari konfigurasi production.
- Docker Compose development tidak boleh secara tidak sengaja menargetkan database production.

Contoh command:

    # Menjalankan seluruh service
    docker compose up -d

    # Melihat status service
    docker compose ps

    # Melihat log seluruh service
    docker compose logs -f

    # Melihat log service tertentu
    docker compose logs -f api

    # Menghentikan seluruh service
    docker compose down

    # Menghentikan dan menghapus volume
    # PERINGATAN: data development pada volume dapat terhapus
    docker compose down -v

Catatan: konfigurasi `compose.yaml` dibuat dan diverifikasi sebelum digunakan sebagai standar bersama. Jangan menggunakan konfigurasi placeholder sebagai lingkungan yang siap dijalankan.

## 7. Makefile

File `Makefile` digunakan sebagai command wrapper agar anggota tim dapat menjalankan perintah proyek dengan lebih mudah dan konsisten.

Contoh target yang direncanakan:

| Target            | Fungsi                                              |
| ----------------- | --------------------------------------------------- |
| make help         | Menampilkan daftar command.                         |
| make setup        | Menyiapkan kebutuhan awal proyek.                   |
| make up           | Menjalankan seluruh service development.            |
| make down         | Menghentikan seluruh service development.           |
| make restart      | Memulai ulang service development.                  |
| make logs         | Melihat log service.                                |
| make ps           | Melihat status container.                           |
| make frontend     | Menjalankan frontend.                               |
| make backend      | Menjalankan backend.                                |
| make test         | Menjalankan pengujian.                              |
| make lint         | Menjalankan pemeriksaan kode.                       |
| make migrate-up   | Menjalankan migration ke database development.      |
| make migrate-down | Melakukan rollback migration development.           |
| make clean        | Membersihkan artefak development yang aman dihapus. |

Ketentuan:

- Setiap target harus memiliki fungsi yang jelas.
- Command harus menggunakan konfigurasi development secara eksplisit.
- Target yang berpotensi menghapus data harus memberikan peringatan.
- Tidak boleh ada target yang secara tidak sengaja menjalankan migration atau operasi destruktif pada production.
- Command yang belum tersedia implementasinya tidak boleh ditampilkan sebagai command siap pakai.

## 8. README Utama

File `README.md` menjadi dokumentasi utama repository.

README minimal berisi:

1. Nama dan deskripsi proyek TANDUR.
2. Tujuan dan ruang lingkup aplikasi.
3. Teknologi yang digunakan.
4. Persyaratan perangkat lunak.
5. Struktur direktori repository.
6. Panduan instalasi dan setup awal.
7. Panduan konfigurasi environment.
8. Cara menjalankan proyek menggunakan Docker Compose.
9. Cara menjalankan frontend dan backend.
10. Daftar command Makefile.
11. Link dokumentasi arsitektur dan API.
12. Git workflow dan aturan kontribusi.
13. Panduan menjalankan testing.
14. Informasi kontak atau pembagian tanggung jawab tim.

README harus menggunakan bahasa yang jelas dan mudah dipahami anggota tim baru.

## 9. Aturan Pengembangan Repository

### 9.1. Pemisahan Tanggung Jawab

- Frontend hanya bertanggung jawab terhadap tampilan, interaksi, dan komunikasi dengan API.
- Backend bertanggung jawab terhadap autentikasi, validasi, aturan bisnis, dan pemrosesan data.
- Database menjadi sumber data utama aplikasi.
- Infrastructure berisi konfigurasi layanan pendukung.
- Contract menjadi acuan komunikasi frontend dan backend.
- Docs menjadi pusat dokumentasi teknis dan bisnis.

### 9.2. Pengembangan Paralel

- Frontend dan backend dapat dikembangkan secara paralel berdasarkan kontrak API.
- Perubahan kontrak API harus dikomunikasikan kepada anggota terkait.
- Setiap fitur harus memiliki pembagian tanggung jawab yang jelas.
- Anggota tim tidak boleh mengubah struktur direktori bersama tanpa koordinasi.
- Integrasi dilakukan secara bertahap, tidak menunggu seluruh fitur selesai.

### 9.3. Konsistensi Repository

- Seluruh anggota menggunakan struktur direktori yang sama.
- Dependency dan versi tool mengikuti dokumentasi proyek.
- File konfigurasi bersama disimpan di repository.
- Credential dan konfigurasi rahasia disimpan secara lokal atau melalui secret management.
- Perubahan konfigurasi penting harus disertai dokumentasi.

## 10. Panduan Setup Awal Anggota Tim

Setiap anggota tim harus mengikuti langkah berikut.

### Prasyarat

Pastikan perangkat sudah memiliki:

- Git.
- Docker Desktop atau Docker Engine.
- Docker Compose.
- Node.js dengan versi yang ditentukan proyek.
- Go dengan versi yang ditentukan proyek.
- Make (jika tersedia pada sistem operasi).
- Code editor, disarankan Visual Studio Code.

### Langkah Setup

1.  Clone repository.

    git clone <REPOSITORY_URL>
    cd tandur

2.  Salin file environment.

    cp .env.example .env

3.  Sesuaikan konfigurasi `.env` jika diperlukan.

4.  Periksa command yang tersedia.

    make help

5.  Jalankan service development.

        make up

    Jika target Makefile belum tersedia, gunakan:

        docker compose up -d

6.  Periksa status container.

    docker compose ps

7.  Periksa log apabila terdapat masalah.

    docker compose logs -f

8.  Pastikan frontend, backend, dan database dapat dijalankan sesuai konfigurasi proyek.

Catatan: langkah setup hanya dinyatakan selesai setelah seluruh service yang dibutuhkan berhasil dijalankan dan diuji.

## 11. Kriteria Penerimaan

Task dinyatakan selesai apabila:

- [ ] Struktur direktori repository sudah disepakati.
- [ ] Direktori frontend tersedia.
- [ ] Direktori backend tersedia.
- [ ] Struktur backend mengikuti Clean Architecture.
- [ ] Struktur frontend mengikuti Feature-Based Architecture.
- [ ] Direktori database dan migration tersedia.
- [ ] Direktori API specification tersedia.
- [ ] Direktori konfigurasi Docker tersedia.
- [ ] Direktori dokumentasi tersedia.
- [ ] File `.gitignore` tersedia dan telah diverifikasi.
- [ ] File `.editorconfig` tersedia.
- [ ] File `.dockerignore` tersedia.
- [ ] File `.env.example` tersedia.
- [ ] File `compose.yaml` tersedia dan telah diuji.
- [ ] File `Makefile` tersedia.
- [ ] Target Makefile yang disepakati dapat dijalankan.
- [ ] README utama tersedia dan berisi panduan setup.
- [ ] Seluruh anggota dapat melakukan clone repository.
- [ ] Seluruh anggota dapat menyiapkan environment lokal.
- [ ] Proyek dasar dapat dijalankan pada perangkat anggota tim.
- [ ] Tidak ada credential atau secret yang masuk ke repository.
- [ ] Konfigurasi development tidak menargetkan production.

## 12. Hasil Akhir

Hasil yang harus tersedia setelah task selesai:

1. Repository TANDUR memiliki struktur direktori yang terorganisasi dan disepakati.
2. Frontend dan backend memiliki direktori serta batas tanggung jawab yang jelas.
3. Konfigurasi database, Docker, dan infrastruktur telah disiapkan.
4. File konfigurasi standar tersedia.
5. README utama menyediakan panduan setup proyek.
6. Makefile menyediakan command wrapper untuk kebutuhan development.
7. Docker Compose dapat menjalankan lingkungan development.
8. Seluruh anggota tim dapat menggunakan struktur repository dan menjalankan proyek dasar.

**Status akhir:** Struktur repository disepakati, terdokumentasi, dan siap digunakan sebagai fondasi pengembangan TANDUR.
