-- Rollback migration 000014
DROP INDEX IF EXISTS idx_farmer_listings_commodity_str;
ALTER TABLE farmer_listings DROP COLUMN IF EXISTS category;
ALTER TABLE farmer_listings DROP COLUMN IF EXISTS commodity_name;
