-- Seed: 001_roles.sql
-- Inisialisasi akun pengujian untuk masing-masing role (farmer, middleman, buyer)

INSERT INTO users (nik, name, phone, password_hash, role, is_bisnis, is_verified, verification_status)
VALUES
    ('3201010101010001', 'Budi Santoso (Petani)', '081200000001', '$2a$10$1e2ZAwea9cZj.fypx/67Q.FPY8tJtT10yx4evzs.eXmpjNydRN4V2', 'farmer', false, true, 'verified'),
    ('3201010101010002', 'Agus Pengepul (Tengkulak)', '081200000002', '$2a$10$1e2ZAwea9cZj.fypx/67Q.FPY8tJtT10yx4evzs.eXmpjNydRN4V2', 'middleman', false, true, 'verified'),
    ('3201010101010003', 'Resto Berkah (Pembeli)', '081200000003', '$2a$10$1e2ZAwea9cZj.fypx/67Q.FPY8tJtT10yx4evzs.eXmpjNydRN4V2', 'buyer', true, true, 'verified')
ON CONFLICT (phone) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    nik = EXCLUDED.nik,
    is_verified = true,
    verification_status = 'verified';

