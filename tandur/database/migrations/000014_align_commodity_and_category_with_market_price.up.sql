-- Migration: 000014_align_commodity_and_category_with_market_price
-- Menyelaraskan commodity_id dan category dengan data market price (SP2KP)

-- 1. Hapus foreign key constraint UUID ke tabel commodities agar mendukung ID string dari market-prices
ALTER TABLE farmer_listings DROP CONSTRAINT IF EXISTS farmer_listings_commodity_id_fkey;

-- 2. Ubah kolom commodity_id menjadi VARCHAR(100)
ALTER TABLE farmer_listings ALTER COLUMN commodity_id TYPE VARCHAR(100) USING commodity_id::text;

-- 3. Tambahkan kolom commodity_name dan category
ALTER TABLE farmer_listings ADD COLUMN IF NOT EXISTS commodity_name VARCHAR(150);
ALTER TABLE farmer_listings ADD COLUMN IF NOT EXISTS category VARCHAR(150);

-- 4. Indeks untuk pencarian dan filter cepat
CREATE INDEX IF NOT EXISTS idx_farmer_listings_commodity_str ON farmer_listings(commodity_id);
