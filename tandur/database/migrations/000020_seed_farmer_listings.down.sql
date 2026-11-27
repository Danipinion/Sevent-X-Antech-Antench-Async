-- Migration 000020 (Down): Hapus data seed pasokan panen dan pesanan
DELETE FROM farmer_purchases WHERE id IN (
    '7a1d5c20-8910-4e3b-9a11-000000000891',
    '7a1d5c20-8910-4e3b-9a11-000000000894',
    '7a1d5c20-8910-4e3b-9a11-000000009842'
);

DELETE FROM farmer_listings WHERE id IN (
    'f85b0bf8-4318-4786-ae0a-f5c99e1d8545',
    'd94a1d48-3162-4876-9c44-e2d6b38c92a1',
    'c72b8341-2e55-4a5f-9271-e94582f0c763'
);

ALTER TABLE farmer_purchases DROP COLUMN IF EXISTS farmer_group;
ALTER TABLE farmer_listings DROP COLUMN IF EXISTS farmer_group;
