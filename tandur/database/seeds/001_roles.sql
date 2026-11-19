-- Seed: 001_roles.sql
-- Inisialisasi akun pengujian untuk masing-masing role (farmer, middleman, buyer)

INSERT INTO users (nik, name, phone, password_hash, role, is_bisnis)
VALUES
    ('3201010101010001', 'Budi Santoso (Petani)', '081200000001', '$2a$12$devsamplehashpasswordpetani01', 'farmer', false),
    ('3201010101010002', 'Agus Pengepul (Tengkulak)', '081200000002', '$2a$12$devsamplehashpasswordmiddle01', 'middleman', false),
    ('3201010101010003', 'Resto Berkah (Pembeli)', '081200000003', '$2a$12$devsamplehashpasswordbuyer001', 'buyer', true)
ON CONFLICT (phone) DO NOTHING;

