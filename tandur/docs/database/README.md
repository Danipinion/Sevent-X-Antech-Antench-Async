# Desain Database & Panduan Migrasi

Dokumentasi basis data PostgreSQL + PostGIS aplikasi TANDUR.

## 1. Skema Database (ERD Singkat)

- `users` (id, email, password_hash, name, role, phone_number, avatar_url, created_at, updated_at)
- `commodities` (id, name, category, unit, base_price, current_market_price, created_at, updated_at)
- `inventories` (id, commodity_id, owner_id, quantity, unit, quality_grade, location_name, geom, harvest_date, created_at, updated_at)
- `orders` (id, buyer_id, seller_id, commodity_id, quantity, total_price, status, created_at, updated_at)
- `market_prices` (id, commodity_id, region, average_price, recorded_at)

## 2. Fitur Geospasial PostGIS

Tabel `inventories` menggunakan kolom `geom geometry(Point, 4326)` dengan indeks GIST (`idx_inventories_geom`) untuk mendukung query radius seperti:

```sql
SELECT id, location_name,
       ST_Distance(geom, ST_SetSRID(ST_MakePoint(107.8184, -7.3486), 4326)::geography) / 1000 AS distance_km
FROM inventories
WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint(107.8184, -7.3486), 4326)::geography, 50000)
ORDER BY distance_km ASC;
```

## 3. Eksekusi Migrasi

```bash
# Migrasi naik (up)
make migrate-up

# Rollback migrasi (down)
make migrate-down
```
