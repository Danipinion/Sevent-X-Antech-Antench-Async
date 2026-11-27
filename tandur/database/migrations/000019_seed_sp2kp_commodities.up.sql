-- Migration 000019: Seed komoditas acuan resmi dari SP2KP Kemendag RI
INSERT INTO commodities (name, description, unit, is_active)
VALUES
    ('Beras Medium', 'Beras Medium sesuai standar SP2KP Kemendag RI', 'kg', true),
    ('Beras Premium', 'Beras Premium sesuai standar SP2KP Kemendag RI', 'kg', true),
    ('Beras SPHP Bulog', 'Beras SPHP (Stabilisasi Pasokan dan Harga Pangan) Bulog', 'kg', true),
    ('Gula Pasir Curah', 'Gula Pasir Curah konsumsi', 'kg', true),
    ('Minyak Goreng Sawit Kemasan Premium', 'Minyak Goreng Sawit Kemasan Premium', 'lt', true),
    ('Minyak Goreng Sawit Curah', 'Minyak Goreng Sawit Curah', 'lt', true),
    ('Minyakita', 'Minyak Goreng Minyakita kemasan', 'lt', true),
    ('Daging Sapi Paha Belakang', 'Daging Sapi Paha Belakang segar', 'kg', true),
    ('Daging Ayam Ras', 'Daging Ayam Ras pedaging utuh/karkas', 'kg', true),
    ('Telur Ayam Ras', 'Telur Ayam Ras segar', 'kg', true),
    ('Tepung Terigu', 'Tepung Terigu protein sedang konsumsi', 'kg', true),
    ('Kedelai Impor', 'Kedelai Impor biji kering', 'kg', true),
    ('Cabai Merah Keriting', 'Cabai Merah Keriting segar petik', 'kg', true),
    ('Cabai Rawit Merah', 'Cabai Rawit Merah segar petik', 'kg', true),
    ('Cabai Merah Besar', 'Cabai Merah Besar segar petik', 'kg', true),
    ('Bawang Merah', 'Bawang Merah konsumsi siap jual', 'kg', true),
    ('Bawang Putih Honan', 'Bawang Putih Honan kering', 'kg', true)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    unit = EXCLUDED.unit,
    is_active = true,
    updated_at = NOW();
