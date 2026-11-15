INSERT INTO commodities (name, description, unit)
VALUES
    ('Padi', 'Komoditas pertanian berupa padi', 'kg'),
    ('Jagung', 'Komoditas pertanian berupa jagung', 'kg'),
    ('Cabai', 'Komoditas pertanian berupa cabai', 'kg'),
    ('Tomat', 'Komoditas pertanian berupa tomat', 'kg'),
    ('Bawang Merah', 'Komoditas pertanian berupa bawang merah', 'kg')
ON CONFLICT (name) DO NOTHING;

