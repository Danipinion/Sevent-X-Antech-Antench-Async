# Database Initialization & Migration Setup

## 1. Tujuan

Menyiapkan database development TANDUR menggunakan PostgreSQL dan PostGIS, termasuk sistem migration untuk mengelola perubahan struktur database secara terkontrol.

Database harus dapat dibangun dari kondisi kosong hanya dengan menjalankan seluruh migration yang tersedia di repository.

Sistem migration digunakan agar seluruh anggota tim memiliki struktur database yang konsisten, perubahan skema dapat ditelusuri, dan proses rollback dapat dilakukan ketika terjadi kesalahan pada migration.

## 2. Teknologi yang Digunakan

| Teknologi      | Fungsi                                                     |
| -------------- | ---------------------------------------------------------- |
| PostgreSQL     | Database relasional utama                                  |
| PostGIS        | Mendukung penyimpanan dan pencarian data geografis         |
| golang-migrate | Mengelola migration database                               |
| SQL            | Mendefinisikan struktur tabel, constraint, index, dan seed |
| Docker Compose | Menjalankan database development                           |

## 3. Struktur Direktori Database

Gunakan struktur berikut:

```text
database/
├── migrations/
│   ├── 000001_enable_extensions.up.sql
│   ├── 000001_enable_extensions.down.sql
│   ├── 000002_create_users.up.sql
│   ├── 000002_create_users.down.sql
│   ├── 000003_create_commodities.up.sql
│   ├── 000003_create_commodities.down.sql
│   ├── 000004_create_listings.up.sql
│   ├── 000004_create_listings.down.sql
│   ├── 000005_create_purchases.up.sql
│   ├── 000005_create_purchases.down.sql
│   ├── 000006_create_inventory.up.sql
│   ├── 000006_create_inventory.down.sql
│   ├── 000007_create_orders.up.sql
│   ├── 000007_create_orders.down.sql
│   ├── 000008_create_transactions.up.sql
│   ├── 000008_create_transactions.down.sql
│   ├── 000009_create_market_prices.up.sql
│   ├── 000009_create_market_prices.down.sql
│   ├── 000010_create_notifications.up.sql
│   └── 000010_create_notifications.down.sql
│
├── seeds/
│   ├── 001_roles.sql
│   └── 002_commodities.sql
│
└── README.md
```

Aturan penamaan migration:

```text
{version}_{descriptive_name}.up.sql
{version}_{descriptive_name}.down.sql
```

Contoh:

```text
000001_enable_extensions.up.sql
000001_enable_extensions.down.sql
000002_create_users.up.sql
000002_create_users.down.sql
```

Setiap migration harus memiliki pasangan `up` dan `down`.

- `up` digunakan untuk menerapkan perubahan database.
- `down` digunakan untuk membatalkan perubahan database.
- Nomor migration harus berurutan dan tidak boleh digunakan kembali.
- Migration yang sudah diterapkan bersama tim tidak boleh diedit secara sembarangan. Buat migration baru untuk perubahan berikutnya.

## 4. Membuat Database Development

Database development menggunakan konfigurasi PostgreSQL dengan PostGIS.

Contoh konfigurasi environment:

```env
POSTGRES_DB=tandur
POSTGRES_USER=tandur
POSTGRES_PASSWORD=change_me
POSTGRES_PORT=5432
```

Jika menggunakan Docker Compose yang telah disiapkan sebelumnya, service PostgreSQL dapat dijalankan menggunakan:

```bash
docker compose up -d postgres
```

Periksa status container:

```bash
docker compose ps postgres
```

Masuk ke database:

```bash
docker compose exec postgres psql -U tandur -d tandur
```

Periksa database yang tersedia:

```sql
\l
```

Periksa koneksi database:

```sql
SELECT current_database();
```

Hasil yang diharapkan:

```text
tandur
```

## 5. Mengaktifkan Extension PostgreSQL

TANDUR membutuhkan PostGIS untuk mendukung data lokasi petani, tengkulak, pembeli, dan pencarian berdasarkan jarak geografis.

File: `000001_enable_extensions.up.sql`

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

File: `000001_enable_extensions.down.sql`

```sql
DROP EXTENSION IF EXISTS postgis;
DROP EXTENSION IF EXISTS pgcrypto;
```

Penjelasan:

- `postgis` digunakan untuk menyimpan dan memproses data geografis.
- `pgcrypto` digunakan untuk menyediakan fungsi kriptografi PostgreSQL, termasuk UUID melalui `gen_random_uuid()`.

Catatan: Migration `down` ini hanya boleh dijalankan ketika tidak ada objek database yang masih bergantung pada extension tersebut.

## 6. Desain Tabel Inti

Database TANDUR menggunakan pendekatan relasional dengan pemisahan data berdasarkan tanggung jawab masing-masing entitas.

### 6.1 Tabel `users`

Menyimpan akun pengguna sistem.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nik VARCHAR(16) UNIQUE,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(13) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(11) NOT NULL,
    is_bisnis BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT users_role_check
        CHECK (role IN ('farmer', 'middleman', 'buyer'))
);
```

Keterangan:

- Satu akun hanya memiliki satu role utama.
- Role yang diperbolehkan adalah farmer, middleman, dan buyer.
- Password harus disimpan dalam bentuk hash, bukan plaintext.
- Email digunakan sebagai identitas login yang unik.

### 6.2 Tabel `user_locations`

Menyimpan lokasi geografis pengguna.

```sql
CREATE TABLE user_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(100),
    address TEXT NOT NULL,
    village VARCHAR(100),
    district VARCHAR(100),
    city VARCHAR(100),
    province VARCHAR(100),
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Keterangan:

- Menggunakan `GEOGRAPHY(POINT, 4326)` untuk menyimpan koordinat longitude dan latitude.
- Satu pengguna dapat memiliki beberapa lokasi.
- Lokasi utama dapat digunakan sebagai lokasi default transaksi.
- Validasi wilayah layanan dilakukan berdasarkan aturan geografis aplikasi.

### 6.3 Tabel `commodities`

Menyimpan daftar komoditas pertanian.

```sql
CREATE TABLE commodities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,
    unit VARCHAR(30) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Contoh komoditas:

- Padi.
- Jagung.
- Cabai.
- Tomat.
- Bawang merah.

Satuan harus disepakati secara konsisten, misalnya kg, ton, atau ikat. Konversi satuan tidak boleh dilakukan secara implisit.

### 6.4 Tabel `farmer_listings`

Menyimpan penawaran atau pre-order komoditas yang dibuat petani.

```sql
CREATE TABLE farmer_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES users(id),
    commodity_id UUID NOT NULL REFERENCES commodities(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    estimated_quantity NUMERIC(14,2) NOT NULL,
    available_quantity NUMERIC(14,2) NOT NULL,
    unit VARCHAR(30) NOT NULL,
    estimated_harvest_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT farmer_listings_quantity_check
        CHECK (
            estimated_quantity > 0
            AND available_quantity >= 0
            AND available_quantity <= estimated_quantity
        ),

    CONSTRAINT farmer_listings_status_check
        CHECK (
            status IN (
                'draft',
                'published',
                'reserved',
                'completed',
                'cancelled'
            )
        )
);
```

Keterangan:

- Listing dibuat oleh pengguna dengan role farmer.
- `estimated_quantity` menyimpan estimasi jumlah hasil panen.
- `available_quantity` menyimpan jumlah yang masih tersedia untuk ditawarkan.
- Harga transaksi final tidak ditetapkan melalui listing karena kesepakatan harga dilakukan secara offline.

### 6.5 Tabel `farmer_purchases`

Menyimpan pembelian tengkulak terhadap hasil panen petani.

```sql
CREATE TABLE farmer_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES farmer_listings(id),
    middleman_id UUID NOT NULL REFERENCES users(id),
    farmer_id UUID NOT NULL REFERENCES users(id),
    quantity NUMERIC(14,2) NOT NULL,
    agreed_price NUMERIC(14,2) NOT NULL,
    total_price NUMERIC(18,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    agreement_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT farmer_purchases_quantity_check
        CHECK (quantity > 0),

    CONSTRAINT farmer_purchases_price_check
        CHECK (
            agreed_price >= 0
            AND total_price >= 0
        ),

    CONSTRAINT farmer_purchases_status_check
        CHECK (
            status IN (
                'pending',
                'accepted',
                'rejected',
                'completed',
                'cancelled'
            )
        )
);
```

Keterangan:

- Menyimpan hubungan pembelian antara tengkulak dan petani.
- `agreed_price` merupakan harga final hasil kesepakatan offline.
- `total_price` menyimpan nilai total pembelian.
- Status transaksi digunakan untuk melacak proses pembelian.

Catatan: Proses persetujuan, validasi kepemilikan listing, dan pengurangan ketersediaan harus dilakukan oleh backend dalam transaksi database.

### 6.6 Tabel `inventory`

Menyimpan stok komoditas yang dikelola tengkulak.

```sql
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    middleman_id UUID NOT NULL REFERENCES users(id),
    commodity_id UUID NOT NULL REFERENCES commodities(id),
    quantity NUMERIC(14,2) NOT NULL DEFAULT 0,
    unit VARCHAR(30) NOT NULL,
    purchase_price NUMERIC(14,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'available',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT inventory_quantity_check
        CHECK (quantity >= 0),

    CONSTRAINT inventory_price_check
        CHECK (purchase_price >= 0),

    CONSTRAINT inventory_status_check
        CHECK (
            status IN (
                'available',
                'empty',
                'inactive'
            )
        )
);
```

Keterangan:

- Stok dimiliki dan dikelola oleh tengkulak.
- Satu tengkulak dapat memiliki beberapa stok komoditas.
- Stok tidak boleh bernilai negatif.
- Stok yang berasal dari pembelian berbeda perlu tetap dapat ditelusuri.

### 6.7 Tabel `inventory_movements`

Mencatat perubahan jumlah stok.

```sql
CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID NOT NULL REFERENCES inventory(id),
    movement_type VARCHAR(20) NOT NULL,
    quantity NUMERIC(14,2) NOT NULL,
    reference_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT inventory_movements_type_check
        CHECK (
            movement_type IN (
                'in',
                'out',
                'adjustment'
            )
        ),

    CONSTRAINT inventory_movements_quantity_check
        CHECK (quantity > 0)
);
```

Keterangan:

- `in` digunakan ketika stok bertambah.
- `out` digunakan ketika stok berkurang.
- `adjustment` digunakan untuk koreksi stok.
- Perubahan stok harus tercatat agar riwayat inventori dapat ditelusuri.

### 6.8 Tabel `buyer_orders`

Menyimpan pesanan yang dibuat pembeli.

```sql
CREATE TABLE buyer_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES users(id),
    order_number VARCHAR(50) NOT NULL UNIQUE,
    total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    pickup_location_id UUID REFERENCES user_locations(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT buyer_orders_amount_check
        CHECK (total_amount >= 0),

    CONSTRAINT buyer_orders_status_check
        CHECK (
            status IN (
                'pending',
                'confirmed',
                'processing',
                'ready_for_pickup',
                'completed',
                'cancelled'
            )
        )
);
```

Keterangan:

- Satu pesanan dimiliki oleh satu pembeli.
- Pesanan dapat terdiri dari beberapa sumber stok.
- Sistem menggunakan Cash on Pickup.
- Tidak ada integrasi payment gateway dalam ruang lingkup MVP.

### 6.9 Tabel `buyer_order_items`

Menyimpan detail item dalam pesanan pembeli.

```sql
CREATE TABLE buyer_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES buyer_orders(id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL REFERENCES inventory(id),
    quantity NUMERIC(14,2) NOT NULL,
    unit VARCHAR(30) NOT NULL,
    unit_price NUMERIC(14,2) NOT NULL,
    subtotal NUMERIC(18,2) NOT NULL,

    CONSTRAINT buyer_order_items_quantity_check
        CHECK (quantity > 0),

    CONSTRAINT buyer_order_items_price_check
        CHECK (
            unit_price >= 0
            AND subtotal >= 0
        )
);
```

Keterangan:

- Setiap item terhubung dengan sumber stok tertentu.
- Pesanan dapat menggabungkan beberapa sumber stok.
- Subtotal dihitung berdasarkan jumlah dan harga satuan.
- Harga pada item menjadi snapshot harga ketika pesanan dibuat.

### 6.10 Tabel `order_suborders`

Memisahkan pemenuhan pesanan berdasarkan tengkulak atau sumber stok.

```sql
CREATE TABLE order_suborders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES buyer_orders(id) ON DELETE CASCADE,
    middleman_id UUID NOT NULL REFERENCES users(id),
    suborder_number VARCHAR(50) NOT NULL UNIQUE,
    subtotal NUMERIC(18,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT order_suborders_subtotal_check
        CHECK (subtotal >= 0),

    CONSTRAINT order_suborders_status_check
        CHECK (
            status IN (
                'pending',
                'confirmed',
                'processing',
                'ready_for_pickup',
                'completed',
                'cancelled'
            )
        )
);
```

Keterangan:

- Satu pesanan utama dapat memiliki beberapa suborder.
- Setiap suborder dikelola oleh tengkulak yang bersangkutan.
- Pemenuhan pesanan dapat dilacak secara terpisah.
- Hubungan antara item dan suborder perlu dijaga oleh backend atau ditambahkan melalui tabel penghubung jika satu item dapat dipecah ke beberapa sumber stok.

### 6.11 Tabel `transactions`

Menyimpan catatan transaksi Cash on Pickup.

```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL UNIQUE REFERENCES buyer_orders(id),
    transaction_number VARCHAR(50) NOT NULL UNIQUE,
    payment_method VARCHAR(30) NOT NULL DEFAULT 'cash_on_pickup',
    payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
    total_amount NUMERIC(18,2) NOT NULL,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT transactions_method_check
        CHECK (payment_method = 'cash_on_pickup'),

    CONSTRAINT transactions_status_check
        CHECK (
            payment_status IN (
                'unpaid',
                'paid',
                'cancelled'
            )
        ),

    CONSTRAINT transactions_amount_check
        CHECK (total_amount >= 0)
);
```

Keterangan:

- Metode pembayaran MVP hanya Cash on Pickup.
- Status `unpaid` menunjukkan pembayaran belum diterima.
- Status `paid` menunjukkan pembayaran tunai sudah dikonfirmasi.
- Konfirmasi pembayaran harus memiliki otorisasi sesuai alur bisnis.
- Tabel ini mencatat transaksi, bukan memproses pembayaran elektronik.

### 6.12 Tabel `market_prices`

Menyimpan referensi harga pasar dari API eksternal atau input yang telah divalidasi.

```sql
CREATE TABLE market_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commodity_id UUID NOT NULL REFERENCES commodities(id),
    source VARCHAR(100) NOT NULL,
    market_name VARCHAR(150),
    region VARCHAR(150),
    price NUMERIC(14,2) NOT NULL,
    unit VARCHAR(30) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT market_prices_price_check
        CHECK (price >= 0)
);
```

Keterangan:

- Data digunakan sebagai indikator referensi harga pasar.
- Harga pasar bukan harga transaksi wajib.
- Data perlu menyimpan sumber dan waktu pencatatan agar informasi dapat ditelusuri.
- Data dari API eksternal dapat mengalami keterlambatan atau kegagalan sinkronisasi.

### 6.13 Tabel `notifications`

Menyimpan notifikasi pengguna.

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    reference_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Keterangan:

- Notifikasi ditujukan kepada pengguna tertentu.
- `reference_id` dapat mengarah ke objek bisnis terkait, seperti listing atau pesanan.
- Referensi tersebut dikelola oleh backend karena dapat mengarah ke beberapa jenis entitas.

## 7. Relasi Antar-Tabel

Relasi utama database TANDUR:

| Entitas Utama     | Relasi      | Entitas Tujuan      |
| ----------------- | ----------- | ------------------- |
| users             | One-to-Many | user_locations      |
| users             | One-to-Many | farmer_listings     |
| commodities       | One-to-Many | farmer_listings     |
| farmer_listings   | One-to-Many | farmer_purchases    |
| users (middleman) | One-to-Many | farmer_purchases    |
| users (middleman) | One-to-Many | inventory           |
| commodities       | One-to-Many | inventory           |
| inventory         | One-to-Many | inventory_movements |
| users (buyer)     | One-to-Many | buyer_orders        |
| buyer_orders      | One-to-Many | buyer_order_items   |
| buyer_orders      | One-to-Many | order_suborders     |
| buyer_orders      | One-to-One  | transactions        |
| commodities       | One-to-Many | market_prices       |
| users             | One-to-Many | notifications       |

Catatan desain:

- Relasi harus menggunakan foreign key.
- Jangan menyimpan informasi yang sama berulang kali jika dapat direferensikan melalui relasi.
- Data harga transaksi perlu disimpan sebagai snapshot agar perubahan harga stok tidak mengubah transaksi yang sudah dibuat.
- Data transaksi dan riwayat pergerakan stok tidak boleh dihapus sembarangan.

## 8. Index Database

Index digunakan untuk mempercepat pencarian dan pengambilan data.

Migration berikutnya dapat berisi:

```sql
-- User
CREATE INDEX idx_users_role
ON users(role);

-- Lokasi pengguna
CREATE INDEX idx_user_locations_user_id
ON user_locations(user_id);

CREATE INDEX idx_user_locations_geo
ON user_locations USING GIST(location);

-- Listing petani
CREATE INDEX idx_farmer_listings_farmer_id
ON farmer_listings(farmer_id);

CREATE INDEX idx_farmer_listings_commodity_id
ON farmer_listings(commodity_id);

CREATE INDEX idx_farmer_listings_status
ON farmer_listings(status);

CREATE INDEX idx_farmer_listings_geo
ON farmer_listings USING GIST(location);

-- Pembelian petani
CREATE INDEX idx_farmer_purchases_listing_id
ON farmer_purchases(listing_id);

CREATE INDEX idx_farmer_purchases_middleman_id
ON farmer_purchases(middleman_id);

CREATE INDEX idx_farmer_purchases_status
ON farmer_purchases(status);

-- Inventori
CREATE INDEX idx_inventory_middleman_id
ON inventory(middleman_id);

CREATE INDEX idx_inventory_commodity_id
ON inventory(commodity_id);

-- Pergerakan inventori
CREATE INDEX idx_inventory_movements_inventory_id
ON inventory_movements(inventory_id);

CREATE INDEX idx_inventory_movements_created_at
ON inventory_movements(created_at);

-- Pesanan
CREATE INDEX idx_buyer_orders_buyer_id
ON buyer_orders(buyer_id);

CREATE INDEX idx_buyer_orders_status
ON buyer_orders(status);

CREATE INDEX idx_buyer_order_items_order_id
ON buyer_order_items(order_id);

-- Suborder
CREATE INDEX idx_order_suborders_order_id
ON order_suborders(order_id);

CREATE INDEX idx_order_suborders_middleman_id
ON order_suborders(middleman_id);

-- Harga pasar
CREATE INDEX idx_market_prices_commodity_recorded
ON market_prices(commodity_id, recorded_at DESC);

-- Notifikasi
CREATE INDEX idx_notifications_user_created
ON notifications(user_id, created_at DESC);

CREATE INDEX idx_notifications_unread
ON notifications(user_id)
WHERE is_read = FALSE;
```

Catatan:

- Index GIST digunakan untuk pencarian geografis PostGIS.
- Index B-tree digunakan untuk pencarian berdasarkan ID, status, dan waktu.
- Index tambahan harus didasarkan pada kebutuhan query aktual.
- Hindari membuat terlalu banyak index karena dapat memperlambat operasi insert dan update.

## 9. Constraint dan Integritas Data

Database harus menjaga konsistensi data melalui constraint.

Aturan minimum:

1. Primary key wajib tersedia pada setiap tabel.
2. Foreign key wajib digunakan untuk relasi antarentitas.
3. Email pengguna tidak boleh duplikat.
4. Role pengguna hanya boleh farmer, middleman, atau buyer.
5. Jumlah stok tidak boleh negatif.
6. Jumlah pembelian harus lebih besar dari nol.
7. Harga transaksi tidak boleh negatif.
8. Pesanan harus memiliki pembeli yang valid.
9. Setiap transaksi hanya boleh terhubung ke satu pesanan utama.
10. Metode pembayaran MVP hanya Cash on Pickup.
11. Data lokasi harus menggunakan koordinat dengan SRID 4326.
12. Data harga pasar harus memiliki sumber dan waktu pencatatan.

### Pencegahan Overselling

Validasi stok tidak boleh hanya dilakukan di frontend.

Backend harus melakukan validasi dan perubahan stok dalam satu transaksi database.

Contoh pendekatan:

```sql
BEGIN;

UPDATE inventory
SET
    quantity = quantity - 10,
    updated_at = NOW()
WHERE
    id = 'INVENTORY_UUID'
    AND quantity >= 10;

-- Backend harus memeriksa bahwa tepat satu baris berhasil diperbarui.
-- Jika tidak, batalkan transaksi karena stok tidak mencukupi.

COMMIT;
```

Jika jumlah baris yang diperbarui adalah nol, backend harus membatalkan proses dan memberikan respons bahwa stok tidak mencukupi.

Pencatatan `inventory_movements`, pembuatan pesanan, dan perubahan stok harus dilakukan dalam transaksi yang konsisten agar tidak terjadi perbedaan data.

## 10. Migration Tambahan untuk Index

Agar perubahan database tetap terkontrol, pembuatan index dapat dipisahkan dari migration pembuatan tabel.

Contoh:

File: `000011_create_indexes.up.sql`

```sql
CREATE INDEX idx_users_role
ON users(role);

CREATE INDEX idx_user_locations_geo
ON user_locations USING GIST(location);

CREATE INDEX idx_farmer_listings_status
ON farmer_listings(status);

CREATE INDEX idx_farmer_listings_geo
ON farmer_listings USING GIST(location);

CREATE INDEX idx_inventory_middleman_id
ON inventory(middleman_id);

CREATE INDEX idx_buyer_orders_buyer_id
ON buyer_orders(buyer_id);

CREATE INDEX idx_buyer_orders_status
ON buyer_orders(status);

CREATE INDEX idx_market_prices_commodity_recorded
ON market_prices(commodity_id, recorded_at DESC);

CREATE INDEX idx_notifications_user_created
ON notifications(user_id, created_at DESC);
```

File: `000011_create_indexes.down.sql`

```sql
DROP INDEX IF EXISTS idx_notifications_user_created;
DROP INDEX IF EXISTS idx_market_prices_commodity_recorded;
DROP INDEX IF EXISTS idx_buyer_orders_status;
DROP INDEX IF EXISTS idx_buyer_orders_buyer_id;
DROP INDEX IF EXISTS idx_inventory_middleman_id;
DROP INDEX IF EXISTS idx_farmer_listings_geo;
DROP INDEX IF EXISTS idx_farmer_listings_status;
DROP INDEX IF EXISTS idx_user_locations_geo;
DROP INDEX IF EXISTS idx_users_role;
```

## 11. Seed Data

Seed digunakan untuk memasukkan data awal yang dibutuhkan aplikasi.

Seed bukan pengganti migration. Migration bertanggung jawab atas struktur database, sedangkan seed bertanggung jawab atas data awal.

### 11.1 Seed Komoditas

File: `database/seeds/002_commodities.sql`

```sql
INSERT INTO commodities (name, description, unit)
VALUES
    ('Padi', 'Komoditas pertanian berupa padi', 'kg'),
    ('Jagung', 'Komoditas pertanian berupa jagung', 'kg'),
    ('Cabai', 'Komoditas pertanian berupa cabai', 'kg'),
    ('Tomat', 'Komoditas pertanian berupa tomat', 'kg'),
    ('Bawang Merah', 'Komoditas pertanian berupa bawang merah', 'kg')
ON CONFLICT (name) DO NOTHING;
```

### 11.2 Aturan Seed

- Seed harus dapat dijalankan lebih dari satu kali tanpa menghasilkan data duplikat.
- Gunakan `ON CONFLICT` untuk data referensi yang memiliki unique key.
- Jangan memasukkan password akun asli ke dalam seed.
- Jangan menggunakan data pribadi nyata untuk kebutuhan development.
- Gunakan data dummy untuk akun pengujian.

## 12. Sistem Migration dengan golang-migrate

TANDUR menggunakan `golang-migrate` untuk mengelola perubahan struktur database.

Dokumentasi: https://github.com/golang-migrate/migrate

Migration dapat dijalankan menggunakan CLI atau Makefile.

### 12.1 Instalasi CLI

Pastikan `golang-migrate` tersedia di perangkat pengembang.

Contoh instalasi melalui Go:

```bash
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
```

Pastikan direktori binary Go sudah masuk ke PATH.

Periksa instalasi:

```bash
migrate -version
```

### 12.2 Menjalankan Migration Up

Untuk menjalankan seluruh migration yang belum diterapkan:

```bash
migrate \
  -path database/migrations \
  -database "postgres://tandur:change_me@localhost:5432/tandur?sslmode=disable" \
  up
```

Migration akan dijalankan secara berurutan berdasarkan nomor versinya.

### 12.3 Menjalankan Migration Down

Untuk membatalkan satu migration terakhir:

```bash
migrate \
  -path database/migrations \
  -database "postgres://tandur:change_me@localhost:5432/tandur?sslmode=disable" \
  down 1
```

Perintah tersebut hanya membatalkan satu versi migration terakhir.

Jangan menjalankan rollback pada database production tanpa prosedur backup dan persetujuan yang sesuai.

### 12.4 Memeriksa Versi Migration

```bash
migrate \
  -path database/migrations \
  -database "postgres://tandur:change_me@localhost:5432/tandur?sslmode=disable" \
  version
```

### 12.5 Force Version

Perintah `force` digunakan untuk memperbaiki status versi migration secara manual ketika migration mengalami kondisi dirty.

```bash
migrate \
  -path database/migrations \
  -database "postgres://tandur:change_me@localhost:5432/tandur?sslmode=disable" \
  force VERSION
```

Catatan: `force` tidak menjalankan SQL migration. Perintah ini hanya mengubah catatan versi migration. Gunakan hanya setelah kondisi database diperiksa dan diperbaiki secara manual.

## 13. Menjalankan Migration dari Docker

Jika backend dan PostgreSQL berjalan melalui Docker Compose, migration dapat dijalankan dari host menggunakan koneksi `localhost`.

Pastikan PostgreSQL sudah berjalan:

```bash
docker compose up -d postgres
```

Periksa status:

```bash
docker compose ps postgres
```

Kemudian jalankan:

```bash
migrate \
  -path database/migrations \
  -database "postgres://tandur:change_me@localhost:5432/tandur?sslmode=disable" \
  up
```

Alternatifnya, migration dapat dijalankan melalui container khusus yang memiliki binary `migrate` dan menggunakan hostname `postgres` sebagai alamat database.

Jangan menggunakan hostname `localhost` ketika migration dijalankan dari container lain.

## 14. Makefile untuk Database

Tambahkan command berikut ke `Makefile` root repository:

```makefile
DATABASE_URL ?= postgres://tandur:change_me@localhost:5432/tandur?sslmode=disable
MIGRATIONS_DIR = database/migrations

.PHONY: db-up db-down db-version db-force db-seed db-reset

db-up:
	migrate -path $(MIGRATIONS_DIR) -database "$(DATABASE_URL)" up

db-down:
	migrate -path $(MIGRATIONS_DIR) -database "$(DATABASE_URL)" down 1

db-version:
	migrate -path $(MIGRATIONS_DIR) -database "$(DATABASE_URL)" version

db-force:
	@echo "Gunakan: make db-force VERSION=nomor_versi"
	migrate -path $(MIGRATIONS_DIR) -database "$(DATABASE_URL)" force $(VERSION)

db-seed:
	docker compose exec -T postgres psql -U tandur -d tandur < database/seeds/001_roles.sql
	docker compose exec -T postgres psql -U tandur -d tandur < database/seeds/002_commodities.sql

db-reset:
	@echo "PERINGATAN: Semua data database development akan dihapus."
	docker compose down -v
	docker compose up -d postgres
```

Catatan:

- `db-up` menjalankan seluruh migration yang belum diterapkan.
- `db-down` membatalkan satu migration terakhir.
- `db-version` menampilkan versi migration.
- `db-force` memperbaiki catatan versi secara manual.
- `db-seed` memasukkan data awal.
- `db-reset` menghapus volume database development sehingga seluruh data lokal hilang.

Pastikan nilai `DATABASE_URL` menggunakan credential yang sesuai dengan `.env`. Untuk penggunaan tim, hindari menuliskan password berbeda secara permanen di banyak tempat. Gunakan satu sumber konfigurasi yang konsisten.

## 15. Pengujian Migration

Migration harus diuji dari database kosong untuk memastikan seluruh struktur dapat dibangun secara berurutan.

### 15.1 Pengujian Migration Up

1. Siapkan database development baru.
2. Pastikan database belum memiliki tabel aplikasi.
3. Jalankan seluruh migration.

```bash
make db-up
```

4. Periksa versi migration.

```bash
make db-version
```

5. Periksa daftar tabel.

```bash
docker compose exec postgres psql -U tandur -d tandur -c "\dt"
```

6. Periksa extension PostGIS.

```bash
docker compose exec postgres psql -U tandur -d tandur \
  -c "SELECT PostGIS_Version();"
```

7. Periksa foreign key dan index yang telah dibuat.

Migration dinyatakan berhasil jika seluruh tabel, relasi, index, dan extension terbentuk tanpa error.

### 15.2 Pengujian Migration Down

1. Pastikan database berisi struktur hasil migration.
2. Catat versi migration saat ini.
3. Jalankan rollback satu migration.

```bash
make db-down
```

4. Periksa versi migration.

```bash
make db-version
```

5. Periksa apakah objek yang dibuat oleh migration terakhir telah dihapus.
6. Jalankan kembali migration up.

```bash
make db-up
```

7. Pastikan database kembali ke kondisi sebelumnya.

Catatan: Rollback dapat menghapus tabel atau data yang dibuat oleh migration tersebut. Gunakan database khusus pengujian dan jangan melakukan pengujian rollback pada database yang berisi data penting.

### 15.3 Pengujian Fresh Database

Pengujian paling penting adalah membangun database dari kondisi kosong.

Urutan:

```bash
docker compose down -v
docker compose up -d postgres
make db-up
make db-seed
```

Setelah itu periksa seluruh tabel dan data awal.

Perintah `docker compose down -v` akan menghapus seluruh named volume pada project Compose. Pastikan tidak ada data lokal yang masih diperlukan sebelum menjalankannya.

## 16. Aturan Pengelolaan Migration Tim

1. Setiap perubahan struktur database harus menggunakan migration baru.
2. Jangan mengubah migration lama yang sudah digunakan anggota tim lain.
3. Setiap migration wajib memiliki file `.up.sql` dan `.down.sql`.
4. Gunakan nomor migration yang unik dan berurutan.
5. Migration harus dapat dijalankan pada database kosong.
6. Migration harus diuji sebelum Pull Request diajukan.
7. Perubahan tabel harus memperhatikan relasi dan integritas data.
8. Hindari menghapus kolom atau tabel yang masih digunakan aplikasi tanpa prosedur transisi.
9. Perubahan database harus disertai pembaruan ERD dan dokumentasi jika mengubah desain data.
10. Migration yang mengandung perubahan data harus menjelaskan dampaknya dan prosedur rollback.
11. Jangan menggunakan migration untuk memasukkan data dummy yang bersifat sementara.
12. Jangan menjalankan migration production secara manual tanpa prosedur deployment yang disepakati.

## 17. Catatan Desain yang Perlu Dikunci

Beberapa keputusan berikut perlu dikonfirmasi melalui ERD dan business rules sebelum migration dianggap final:

| Area                 | Keputusan yang Perlu Dikonfirmasi                                            |
| -------------------- | ---------------------------------------------------------------------------- |
| Role pengguna        | Apakah satu akun hanya memiliki satu role atau dapat memiliki beberapa role? |
| Lokasi               | Apakah satu pengguna boleh memiliki banyak lokasi?                           |
| Listing petani       | Bagaimana aturan perubahan kuantitas setelah listing dipublikasikan?         |
| Pembelian petani     | Apakah persetujuan petani diperlukan sebelum stok dianggap berpindah?        |
| Inventori            | Apakah stok harus dipisahkan berdasarkan batch pembelian dan asal petani?    |
| Konsolidasi stok     | Bagaimana pemetaan item pesanan ke beberapa sumber stok?                     |
| Suborder             | Apakah satu suborder selalu dimiliki satu tengkulak?                         |
| Cash on Pickup       | Siapa yang berwenang mengonfirmasi pembayaran tunai?                         |
| Smart Margin Control | Bagaimana aturan harga dasar, biaya, dan batas margin ditetapkan?            |
| Wilayah layanan      | Bagaimana batas wilayah geografis disimpan dan divalidasi?                   |

Keputusan yang belum ditetapkan tidak boleh diasumsikan sebagai aturan final hanya karena telah dibuatkan struktur tabel sementara.

## 18. Kriteria Penyelesaian (Definition of Done)

- [ ] Database development PostgreSQL berhasil dibuat.
- [ ] Extension PostGIS berhasil diaktifkan.
- [ ] Sistem migration menggunakan `golang-migrate` berhasil disiapkan.
- [ ] Struktur direktori migration tersedia.
- [ ] Migration awal berhasil dibuat.
- [ ] Tabel inti berdasarkan ERD berhasil dibuat.
- [ ] Primary key dan foreign key telah ditentukan.
- [ ] Constraint integritas data telah dibuat.
- [ ] Index untuk kebutuhan pencarian telah dibuat.
- [ ] Relasi antarentitas dapat diverifikasi.
- [ ] Seed data awal tersedia.
- [ ] Migration up berhasil dijalankan.
- [ ] Migration down berhasil diuji pada database pengujian.
- [ ] Database dapat dibangun dari kondisi kosong.
- [ ] Prosedur menjalankan migration terdokumentasi.
- [ ] Command database tersedia melalui Makefile.
- [ ] Dokumentasi database diperbarui jika terdapat perubahan ERD.

## 19. Hasil Akhir

Database development TANDUR berhasil disiapkan menggunakan PostgreSQL dan PostGIS dengan sistem migration
