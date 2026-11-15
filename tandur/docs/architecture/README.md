# Arsitektur Sistem TANDUR

Dokumentasi rancangan arsitektur sistem TANDUR yang mengintegrasikan Frontend, Backend, Database, dan Infrastruktur Cloud/Container.

## 1. Ikhtisar Arsitektur

TANDUR dibangun dengan prinsip:
- **Backend: Modular Monolith** dengan **Clean Architecture (Onion/Hexagonal)**.
- **Frontend: Feature-Based Architecture** berbasis React, TypeScript, dan Vite.
- **Data: PostgreSQL 16 + PostGIS** untuk manajemen relasional dan analitik geospasial lokasi komoditas/rute.
- **Cache: Redis 7** untuk caching referensi harga pasar dan sesi.
- **Storage: Garage (S3 Compatible)** untuk penyimpanan objek foto dan dokumen.
- **Proxy: Traefik v3** sebagai reverse proxy dan dynamic routing.

## 2. Lapisan Clean Architecture Backend

```
+-------------------------------------------------------+
| Adapter Layer (HTTP Handlers, DTOs, Fiber Routes)    |
|   +-----------------------------------------------+   |
|   | Application Layer (Use Cases, Workflows)      |   |
|   |   +---------------------------------------+   |   |
|   |   | Domain Layer (Entities, Rules, Enums) |   |   |
|   |   +---------------------------------------+   |   |
|   +-----------------------------------------------+   |
| Infrastructure Layer (Postgres, Redis, S3, Logger)   |
+-------------------------------------------------------+
```

1. **Domain:** Entitas murni tanpa dependensi eksternal (`Commodity`, `User`, `Inventory`, `Order`).
2. **Application:** Orkestrasi use case bisnis (contoh: kalkulasi margin, agregasi kuantitas).
3. **Adapter:** Menerjemahkan request HTTP Fiber ke pemanggilan use case aplikasi.
4. **Infrastructure:** Implementasi driver teknis (database query, cache, object storage).

## 3. Architecture Decision Records (ADRs)

- **ADR-001: Modular Monolith vs Microservices**
  - *Keputusan:* Memilih Modular Monolith untuk fase MVP agar percepatan pengembangan dan integrasi tim tetap efisien tanpa kompleksitas operasional service terpisah.
- **ADR-002: PostGIS untuk Geospasial**
  - *Keputusan:* Menggunakan ekstensi PostGIS pada PostgreSQL guna mendukung pencarian radius komoditas terdekat dan optimasi rute logistik secara terpadu dalam satu basis data.
