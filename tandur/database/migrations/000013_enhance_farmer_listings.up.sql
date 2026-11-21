-- Migration: Enhance farmer_listings with price per unit, revenue calculation, media URLs, and soft delete
ALTER TABLE farmer_listings
    ADD COLUMN IF NOT EXISTS price_per_unit NUMERIC(14,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS min_order_quantity NUMERIC(14,2) NOT NULL DEFAULT 500,
    ADD COLUMN IF NOT EXISTS estimated_gross_revenue NUMERIC(14,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS pickup_address VARCHAR(255),
    ADD COLUMN IF NOT EXISTS media_urls TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_farmer_listings_farmer_deleted ON farmer_listings(farmer_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_farmer_listings_status_deleted ON farmer_listings(status, deleted_at);

-- Tambahkan komoditas default sesuai mockup dashboard & kanal jual panen
INSERT INTO commodities (name, description, unit, is_active)
VALUES
    ('Gabah GKP', 'Gabah Kering Panen (Kadar air 20-25%)', 'kg', true),
    ('Gabah GKG', 'Gabah Kering Giling (Kadar air 12-14%)', 'kg', true),
    ('Jagung Pipil', 'Jagung Pipil Kering (Kadar air 14-15%)', 'kg', true),
    ('Kedelai Lokal', 'Kedelai Lokal Bersih (Grade A Bersih)', 'kg', true),
    ('Cabai Rawit', 'Cabai Rawit Petik Segar', 'kg', true)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    is_active = true;
