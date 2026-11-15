# Aturan Bisnis Inti TANDUR (Business Rules)

Dokumentasi spesifikasi aturan bisnis yang menjadi pembeda utama platform TANDUR.

## 1. Smart Margin Control (SMC)

Mekanisme pengendalian margin dinamis yang memastikan transparansi harga:
- **Harga Batas Bawah Petani (Farm-Gate Price Floor):** Memastikan petani menerima harga minimal 70% dari harga referensi pasar daerah, mencegah pembelian tengkulak yang menjatuhkan harga di bawah biaya pokok produksi.
- **Margin Pengepul Terukur (Fair Distribution Cap):** Margin pengepul dibatasi pada persentase wajar (maksimal 15-20%) berdasarkan jarak tempuh logistik dan susut komoditas.
- **Stabilitas Harga Pembeli (Consumer/Buyer Ceiling):** Pembeli institusi dan ritel mendapatkan harga yang kompetitif langsung dari sumber terkonsolidasi.

## 2. Stock Consolidation (Agregasi Stok Multi-Petani)

- Petani skala kecil seringkali tidak dapat memenuhi pesanan partai besar dari restoran/hotel secara individu.
- Sistem agregasi TANDUR secara otomatis mengonsolidasikan stok petani terdekat dalam satu wilayah geografis (menggunakan query PostGIS) yang memiliki grade mutu komoditas serupa (`GRADE_A`, `GRADE_B`) untuk memenuhi kontrak kuota pembeli.

## 3. Penentuan Mutu Komoditas (Quality Grading)

- `GRADE_A`: Komoditas kualitas prima, ukuran seragam, segar (< 24 jam panen), ditujukan untuk Horeka & ekspor.
- `GRADE_B`: Komoditas pasar umum, kondisi baik, ukuran variatif.
- `GRADE_C`: Komoditas untuk industri olahan (pasta cabai, saus, keripik).
