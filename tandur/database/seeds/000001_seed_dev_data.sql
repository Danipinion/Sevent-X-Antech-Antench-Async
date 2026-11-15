-- Seed Data: 000001_seed_dev_data.sql
-- Development and testing data for TANDUR

-- 1. Sample Users (Petani, Pengepul, Pembeli)
INSERT INTO users (id, email, password_hash, name, role, phone_number) VALUES
('usr-petani-001', 'petani.garut@tandur.local', '$2a$12$devhashpasswordpetanigarut', 'Ahmad Petani Garut', 'FARMER', '081234567890'),
('usr-petani-002', 'petani.brebes@tandur.local', '$2a$12$devhashpasswordpetanibrebes', 'Slamet Petani Brebes', 'FARMER', '081234567891'),
('usr-pengepul-001', 'pengepul.priangan@tandur.local', '$2a$12$devhashpasswordpengepul', 'Budi Pengepul Priangan', 'MIDDLEMAN', '081234567892'),
('usr-pembeli-001', 'restoran.nusantara@tandur.local', '$2a$12$devhashpasswordpembeli', 'Restoran Rasa Nusantara', 'BUYER', '081234567893')
ON CONFLICT (id) DO NOTHING;

-- 2. Sample Commodities
INSERT INTO commodities (id, name, category, unit, base_price, current_market_price) VALUES
('cabai-merah', 'Cabai Merah Keriting', 'Hortikultura', 'kg', 40000.00, 45000.00),
('bawang-merah', 'Bawang Merah Brebes', 'Hortikultura', 'kg', 32000.00, 36000.00),
('tomat-buah', 'Tomat Buah Segar', 'Hortikultura', 'kg', 12000.00, 15000.00),
('kentang-granola', 'Kentang Granola Dieng', 'Hortikultura', 'kg', 18000.00, 21000.00)
ON CONFLICT (id) DO NOTHING;

-- 3. Sample Inventories (with PostGIS Point: Garut & Brebes coordinates)
INSERT INTO inventories (id, commodity_id, owner_id, quantity, unit, quality_grade, location_name, geom, harvest_date) VALUES
('inv-001', 'cabai-merah', 'usr-petani-001', 500.00, 'kg', 'GRADE_A', 'Cikajang, Garut', ST_SetSRID(ST_MakePoint(107.8184, -7.3486), 4326), CURRENT_DATE - INTERVAL '1 day'),
('inv-002', 'bawang-merah', 'usr-petani-002', 1200.00, 'kg', 'GRADE_A', 'Wanasari, Brebes', ST_SetSRID(ST_MakePoint(109.0433, -6.8722), 4326), CURRENT_DATE - INTERVAL '2 day')
ON CONFLICT (id) DO NOTHING;

-- 4. Sample Market Prices
INSERT INTO market_prices (commodity_id, region, average_price, recorded_at) VALUES
('cabai-merah', 'Jawa Barat', 45000.00, NOW()),
('cabai-merah', 'DKI Jakarta', 48000.00, NOW()),
('bawang-merah', 'Jawa Tengah', 36000.00, NOW()),
('bawang-merah', 'DKI Jakarta', 40000.00, NOW());

