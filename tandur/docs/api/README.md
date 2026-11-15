# Panduan & Dokumentasi API TANDUR

Dokumentasi penggunaan dan integrasi REST API TANDUR.

## 1. Lokasi Kontrak API

Spesifikasi resmi OpenAPI 3.0 tersedia di file:
[`contract/openapi/openapi.yaml`](../../contract/openapi/openapi.yaml)

## 2. Standar Respon API

### Respon Sukses (200 OK)
```json
{
  "data": { ... }
}
```

### Respon Error (4xx / 5xx)
```json
{
  "error": "Pesan deskripsi kesalahan"
}
```

## 3. Daftar Endpoint Utama

| Metode | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/v1/health` | Healthcheck ketersediaan API dan status koneksi database |
| `GET` | `/api/v1/commodities` | Mengambil daftar komoditas beserta harga dasar |
| `GET` | `/api/v1/commodities/{id}` | Mengambil informasi detail komoditas tertentu |
| `GET` | `/api/v1/market-prices` | Mengambil indeks harga pasar regional terkini |
| `GET` | `/api/v1/inventories` | Mengambil daftar inventaris komoditas petani |
| `POST` | `/api/v1/orders` | Membuat transaksi pesanan komoditas baru |

