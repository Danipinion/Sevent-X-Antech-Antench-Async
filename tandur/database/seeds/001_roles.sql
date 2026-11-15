-- Seed: 001_roles.sql
-- Inisialisasi akun pengujian untuk masing-masing role (farmer, middleman, buyer)

INSERT INTO users (name, email, phone, password_hash, role)
VALUES
    ('Budi Santoso (Petani)', 'petani@tandur.local', '081200000001', '$2a$12$devsamplehashpasswordpetani01', 'farmer'),
    ('Agus Pengepul (Tengkulak)', 'tengkulak@tandur.local', '081200000002', '$2a$12$devsamplehashpasswordmiddle01', 'middleman'),
    ('Resto Berkah (Pembeli)', 'buyer@tandur.local', '081200000003', '$2a$12$devsamplehashpasswordbuyer001', 'buyer')
ON CONFLICT (email) DO NOTHING;

