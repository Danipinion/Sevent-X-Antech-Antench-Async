ALTER TABLE farmer_listings
    DROP COLUMN IF EXISTS price_per_unit,
    DROP COLUMN IF EXISTS min_order_quantity,
    DROP COLUMN IF EXISTS estimated_gross_revenue,
    DROP COLUMN IF EXISTS pickup_address,
    DROP COLUMN IF EXISTS media_urls,
    DROP COLUMN IF EXISTS deleted_at;

DROP INDEX IF EXISTS idx_farmer_listings_farmer_deleted;
DROP INDEX IF EXISTS idx_farmer_listings_status_deleted;
