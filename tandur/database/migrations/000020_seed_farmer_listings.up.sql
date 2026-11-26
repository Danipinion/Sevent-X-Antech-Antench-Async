-- Migration 000020: Seed data pasokan panen petani (farmer_listings) dan pesanan awal (farmer_purchases)
-- Selaras dengan mockup "TENGKULAK - CARI PETANI" dan "PETANI - PESANAN"

-- 1. Tambah kolom farmer_group jika belum ada
ALTER TABLE farmer_listings ADD COLUMN IF NOT EXISTS farmer_group VARCHAR(150);
ALTER TABLE farmer_purchases ADD COLUMN IF NOT EXISTS farmer_group VARCHAR(150);

-- 2. Pastikan profil user dan komoditas pendukung tersedia (idempotent untuk fresh DB maupun existing DB)
DO $$
BEGIN
    -- Pastikan user 0a853503-09ff-414c-9546-ec5e252161c9 (Pak Sugeng Santoso - Petani)
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = '0a853503-09ff-414c-9546-ec5e252161c9') THEN
        DELETE FROM users WHERE phone = '081399998888' OR nik = '3321010101010001';
        INSERT INTO users (id, nik, name, phone, password_hash, role, is_bisnis, birth_place, ktp_address)
        VALUES ('0a853503-09ff-414c-9546-ec5e252161c9', '3321010101010001', 'Pak Sugeng Santoso', '081399998888', '$2a$10$1piOVtZ9vwgtk3C2UX/zzOC.MO1vAzIz2jnOIaC2lC9/GwjU5DjFq', 'farmer', false, 'Demak, Jawa Tengah', 'Desa Karangawen, Kab. Demak');
    ELSE
        UPDATE users
        SET name = 'Pak Sugeng Santoso',
            birth_place = 'Demak, Jawa Tengah',
            ktp_address = 'Desa Karangawen, Kab. Demak',
            role = 'farmer'
        WHERE id = '0a853503-09ff-414c-9546-ec5e252161c9';
    END IF;

    -- Pastikan user b0a5f026-51c1-4211-8d71-af3ba699be4c (Pak Budi Santoso - Petani)
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = 'b0a5f026-51c1-4211-8d71-af3ba699be4c') THEN
        DELETE FROM users WHERE phone = '081200000001' OR nik = '3321010101010002';
        INSERT INTO users (id, nik, name, phone, password_hash, role, is_bisnis, birth_place, ktp_address)
        VALUES ('b0a5f026-51c1-4211-8d71-af3ba699be4c', '3321010101010002', 'Pak Budi Santoso', '081200000001', '$2a$10$1piOVtZ9vwgtk3C2UX/zzOC.MO1vAzIz2jnOIaC2lC9/GwjU5DjFq', 'farmer', false, 'Grobogan, Jawa Tengah', 'Desa Bumiharjo, Kab. Grobogan');
    ELSE
        UPDATE users
        SET name = 'Pak Budi Santoso',
            birth_place = 'Grobogan, Jawa Tengah',
            ktp_address = 'Desa Bumiharjo, Kab. Grobogan',
            role = 'farmer'
        WHERE id = 'b0a5f026-51c1-4211-8d71-af3ba699be4c';
    END IF;

    -- Pastikan user b3618e70-e4dc-48e8-9189-48c824a42f98 (Haji Supardi - Tengkulak/Pembeli)
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = 'b3618e70-e4dc-48e8-9189-48c824a42f98') THEN
        DELETE FROM users WHERE phone = '081288887777' OR nik = '3321010101010003';
        INSERT INTO users (id, nik, name, phone, password_hash, role, is_bisnis, birth_place, ktp_address)
        VALUES ('b3618e70-e4dc-48e8-9189-48c824a42f98', '3321010101010003', 'Haji Supardi', '081288887777', '$2a$10$1piOVtZ9vwgtk3C2UX/zzOC.MO1vAzIz2jnOIaC2lC9/GwjU5DjFq', 'middleman', true, 'Demak, Jawa Tengah', 'Kota Demak');
    ELSE
        UPDATE users
        SET name = 'Haji Supardi',
            is_bisnis = true,
            birth_place = 'Demak, Jawa Tengah',
            role = 'middleman'
        WHERE id = 'b3618e70-e4dc-48e8-9189-48c824a42f98';
    END IF;

    -- Pastikan komoditas yang direferensikan listing sudah ada dengan ID yang tepat
    IF EXISTS (SELECT 1 FROM commodities WHERE name = 'Gabah GKP') THEN
        UPDATE commodities SET id = '806931f2-c469-48c3-b5ee-7097fd078053' WHERE name = 'Gabah GKP';
    ELSIF NOT EXISTS (SELECT 1 FROM commodities WHERE id = '806931f2-c469-48c3-b5ee-7097fd078053') THEN
        INSERT INTO commodities (id, name, description, unit, is_active)
        VALUES ('806931f2-c469-48c3-b5ee-7097fd078053', 'Gabah GKP', 'Gabah Kering Panen standar SNI/SP2KP', 'kg', true);
    END IF;

    IF EXISTS (SELECT 1 FROM commodities WHERE name = 'Gabah GKG') THEN
        UPDATE commodities SET id = 'adadd29d-e743-4bff-8d72-1bf747a21912' WHERE name = 'Gabah GKG';
    ELSIF NOT EXISTS (SELECT 1 FROM commodities WHERE id = 'adadd29d-e743-4bff-8d72-1bf747a21912') THEN
        INSERT INTO commodities (id, name, description, unit, is_active)
        VALUES ('adadd29d-e743-4bff-8d72-1bf747a21912', 'Gabah GKG', 'Gabah Kering Giling standar SNI/SP2KP', 'kg', true);
    END IF;

    IF EXISTS (SELECT 1 FROM commodities WHERE name = 'Jagung Pipil') THEN
        UPDATE commodities SET id = 'd338fe10-dd71-4fb4-affa-5e88d4b1817e' WHERE name = 'Jagung Pipil';
    ELSIF NOT EXISTS (SELECT 1 FROM commodities WHERE id = 'd338fe10-dd71-4fb4-affa-5e88d4b1817e') THEN
        INSERT INTO commodities (id, name, description, unit, is_active)
        VALUES ('d338fe10-dd71-4fb4-affa-5e88d4b1817e', 'Jagung Pipil', 'Jagung Pipil Kering pakan & konsumsi', 'kg', true);
    END IF;

    IF EXISTS (SELECT 1 FROM commodities WHERE name = 'Beras Medium') THEN
        UPDATE commodities SET id = '27a56d2a-4f6f-4a7e-a0f9-7eb21774d685' WHERE name = 'Beras Medium';
    ELSIF NOT EXISTS (SELECT 1 FROM commodities WHERE id = '27a56d2a-4f6f-4a7e-a0f9-7eb21774d685') THEN
        INSERT INTO commodities (id, name, description, unit, is_active)
        VALUES ('27a56d2a-4f6f-4a7e-a0f9-7eb21774d685', 'Beras Medium', 'Beras Medium standar SP2KP', 'kg', true);
    END IF;
END $$;

-- 3. Seed Pasokan Panen Petani (farmer_listings)
INSERT INTO farmer_listings (
    id,
    farmer_id,
    commodity_id,
    commodity_name,
    category,
    farmer_group,
    title,
    description,
    estimated_quantity,
    available_quantity,
    min_order_quantity,
    unit,
    price_per_unit,
    estimated_gross_revenue,
    estimated_harvest_date,
    pickup_address,
    media_urls,
    status,
    location,
    created_at,
    updated_at
) VALUES 
(
    'f85b0bf8-4318-4786-ae0a-f5c99e1d8545',
    '0a853503-09ff-414c-9546-ec5e252161c9',
    '806931f2-c469-48c3-b5ee-7097fd078053',
    'Gabah Kering Panen (GKP)',
    'Padi Sawah',
    'Gapoktan Sumber Makmur',
    'Gabah Kering Panen (GKP) Ciherang',
    'Kadar Air (KA): 21.0% • Hampa Kotoran: < 2.8% • Varietas Ciherang Panen Musim Rendeng',
    8500.00,
    8500.00,
    1000.00,
    'kg',
    6800.00,
    57800000.00,
    CURRENT_DATE + INTERVAL '3 days',
    'Desa Karangawen, Kab. Demak',
    ARRAY['https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80'],
    'published',
    ST_SetSRID(ST_MakePoint(110.5342, -7.0519), 4326)::geography,
    NOW(),
    NOW()
),
(
    'd94a1d48-3162-4876-9c44-e2d6b38c92a1',
    '0a853503-09ff-414c-9546-ec5e252161c9',
    '27a56d2a-4f6f-4a7e-a0f9-7eb21774d685',
    'Beras Mentik Wangi',
    'Beras Berkualitas',
    'Gapoktan Sumber Makmur',
    'Beras Mentik Wangi Susu Organik',
    'Derajat Sosoh: 95% • Aroma Wangi: Alami Tanpa Esens • Kemasan Karung 50 Kg',
    3200.00,
    3200.00,
    500.00,
    'kg',
    13500.00,
    43200000.00,
    CURRENT_DATE + INTERVAL '1 days',
    'Gudang Gapoktan Sumber Makmur, Desa Karangawen, Kab. Demak',
    ARRAY['https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=600&q=80'],
    'published',
    ST_SetSRID(ST_MakePoint(110.5342, -7.0519), 4326)::geography,
    NOW(),
    NOW()
),
(
    'c72b8341-2e55-4a5f-9271-e94582f0c763',
    'b0a5f026-51c1-4211-8d71-af3ba699be4c',
    'd338fe10-dd71-4fb4-affa-5e88d4b1817e',
    'Jagung Pipil Kering',
    'Palawija',
    'Gapoktan Tani Mulya',
    'Jagung Pipil Kering Hibrida',
    'Kadar Air Maks 14% • Standar Pakan Ternak • Bebas Aflatoksin',
    15000.00,
    15000.00,
    1000.00,
    'kg',
    5600.00,
    84000000.00,
    CURRENT_DATE + INTERVAL '5 days',
    'Desa Bumiharjo, Kab. Grobogan',
    ARRAY['https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=600&q=80'],
    'published',
    ST_SetSRID(ST_MakePoint(110.9167, -7.0333), 4326)::geography,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    available_quantity = EXCLUDED.available_quantity,
    price_per_unit = EXCLUDED.price_per_unit,
    status = 'published',
    updated_at = NOW();

-- 4. Seed Data Transaksi / Pesanan Panen (farmer_purchases)
INSERT INTO farmer_purchases (
    id,
    order_code,
    listing_id,
    middleman_id,
    farmer_id,
    quantity,
    agreed_price,
    total_price,
    status,
    offered_price,
    offered_quantity,
    benchmark_price,
    margin_amount,
    margin_percentage,
    notes,
    pickup_date,
    pickup_time_slot,
    vehicle_type,
    vehicle_plate,
    driver_name,
    driver_phone,
    pickup_address,
    is_ready_for_pickup,
    farmer_group,
    created_at,
    updated_at
) VALUES 
(
    '7a1d5c20-8910-4e3b-9a11-000000000891',
    '#TND-ORD-2025-0891',
    'f85b0bf8-4318-4786-ae0a-f5c99e1d8545',
    'b3618e70-e4dc-48e8-9189-48c824a42f98',
    '0a853503-09ff-414c-9546-ec5e252161c9',
    8500.00,
    7300.00,
    62050000.00,
    'scheduled_pickup',
    7300.00,
    8500.00,
    7200.00,
    850000.00,
    1.39,
    'Timbang digital bersama di titik muat',
    CURRENT_DATE + INTERVAL '1 day',
    '09.00 - 11.00 WIB',
    'Truk Isuzu Elf',
    'AD 8291 QA',
    'Pak Suparno',
    '081234567801',
    'Desa Karangawen, Kab. Demak',
    true,
    'Gapoktan Sumber Makmur',
    NOW() - INTERVAL '1 day',
    NOW()
),
(
    '7a1d5c20-8910-4e3b-9a11-000000000894',
    '#TND-ORD-2025-0894',
    'c72b8341-2e55-4a5f-9271-e94582f0c763',
    'b3618e70-e4dc-48e8-9189-48c824a42f98',
    'b0a5f026-51c1-4211-8d71-af3ba699be4c',
    5000.00,
    5750.00,
    28750000.00,
    'waiting_confirmation',
    5750.00,
    5000.00,
    5600.00,
    750000.00,
    2.68,
    'Ambil di lumbung sentra pakan ternak',
    CURRENT_DATE + INTERVAL '2 days',
    '13.00 - 15.00 WIB',
    'Truk Mitsubishi Canter',
    'H 1892 BC',
    'Sutrisno',
    '081234567802',
    'Desa Bumiharjo, Kab. Grobogan',
    false,
    'Gapoktan Tani Mulya',
    NOW() - INTERVAL '45 minutes',
    NOW()
),
(
    '7a1d5c20-8910-4e3b-9a11-000000009842',
    '#TND-ORD-2025-9842',
    'f85b0bf8-4318-4786-ae0a-f5c99e1d8545',
    'b3618e70-e4dc-48e8-9189-48c824a42f98',
    '0a853503-09ff-414c-9546-ec5e252161c9',
    12000.00,
    8100.00,
    97200000.00,
    'completed',
    8100.00,
    12000.00,
    8100.00,
    0.00,
    0.00,
    'Selesai pelunasan dan penimbangan jembatan digital',
    CURRENT_DATE - INTERVAL '15 days',
    '10.00 - 12.00 WIB',
    'Truk Tronton Fuso',
    'K 9021 BA',
    'Wahyudi',
    '081234567803',
    'Desa Karangawen, Kab. Demak',
    true,
    'Gapoktan Sumber Makmur',
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '14 days'
)
ON CONFLICT (id) DO NOTHING;
