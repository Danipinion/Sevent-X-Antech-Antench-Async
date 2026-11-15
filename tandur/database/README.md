# TANDUR Database Documentation & Migration Guide

Dokumentasi basis data PostgreSQL + PostGIS aplikasi TANDUR dan panduan pengelolaan migration.

## 1. Ikhtisar Arsitektur Basis Data
- **Engine:** PostgreSQL 17 + PostGIS 3.5
- **Tool Migration:** [golang-migrate](https://github.com/golang-migrate/migrate)
- **Ekstensi:**
  - `postgis`: Mendukung tipe data dan fungsi geospasial (`GEOGRAPHY(POINT, 4326)`).
  - `pgcrypto`: Mendukung fungsi kriptografi dan generasi UUID (`gen_random_uuid()`).

## 2. Struktur Direktori
```text
database/
├── migrations/
│   ├── 000001_enable_extensions.up.sql / .down.sql
│   ├── 000002_create_users.up.sql / .down.sql
│   ├── 000003_create_commodities.up.sql / .down.sql
│   ├── 000004_create_listings.up.sql / .down.sql
│   ├── 000005_create_purchases.up.sql / .down.sql
│   ├── 000006_create_inventory.up.sql / .down.sql
│   ├── 000007_create_orders.up.sql / .down.sql
│   ├── 000008_create_transactions.up.sql / .down.sql
│   ├── 000009_create_market_prices.up.sql / .down.sql
│   ├── 000010_create_notifications.up.sql / .down.sql
│   └── 000011_create_indexes.up.sql / .down.sql
├── seeds/
│   ├── 001_roles.sql
│   └── 002_commodities.sql
└── README.md
```

## 3. Menjalankan Perintah Database (Makefile)

```bash
# Menjalankan seluruh migration up
make db-up

# Rollback 1 migration terakhir
make db-down

# Memeriksa versi migration saat ini
make db-version

# Memasukkan seed data awal
make db-seed

# Mereset database development dari awal
make db-reset
```

