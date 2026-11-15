# Garage Object Storage

Dokumentasi dan panduan konfigurasi Garage S3-compatible Object Storage untuk aplikasi TANDUR.

## 1. Tentang Garage

Garage adalah sistem penyimpanan objek terdistribusi sumber terbuka yang kompatibel dengan protokol Amazon S3. Dalam TANDUR, Garage digunakan untuk menyimpan:
- Foto profil pengguna (petani, pengepul, pembeli).
- Foto bukti komoditas hasil panen dan sertifikasi mutu grade.
- Dokumen manifest pengiriman komoditas.

## 2. Menjalankan Garage di Lingkungan Development

Garage dijalankan secara otomatis melalui `compose.yaml`:

```bash
docker compose up -d garage
```

Garage menyediakan endpoint S3 pada port `3900` dan API administrasi pada port `3901`.

## 3. Konfigurasi Awal Bucket

Untuk menginisialisasi bucket `tandur` pada container garage pertama kali:

```bash
# 1. Masuk ke container garage
docker compose exec garage /garage status

# 2. Buat API key
docker compose exec garage /garage key create tandur-dev-key

# 3. Buat bucket tandur
docker compose exec garage /garage bucket create tandur

# 4. Berikan izin baca/tulis ke key
docker compose exec garage /garage bucket allow --read --write tandur --key <KEY_ID>
```

Nilai access key dan secret key disalin ke file `.env` lokal:
```env
S3_ENDPOINT=http://garage:3900
S3_BUCKET=tandur
S3_ACCESS_KEY=<KEY_ID>
S3_SECRET_KEY=<SECRET_KEY>
S3_REGION=garage
```

