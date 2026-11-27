-- Rollback Migration 000015
DROP INDEX IF EXISTS idx_farmer_purchases_created_at;
DROP INDEX IF EXISTS idx_farmer_purchases_middleman_status;
DROP INDEX IF EXISTS idx_farmer_purchases_farmer_status;
DROP INDEX IF EXISTS idx_farmer_purchases_order_code;

ALTER TABLE farmer_purchases
    DROP COLUMN IF EXISTS invoice_url,
    DROP COLUMN IF EXISTS weighing_certificate_url,
    DROP COLUMN IF EXISTS final_total_amount,
    DROP COLUMN IF EXISTS final_price_per_unit,
    DROP COLUMN IF EXISTS actual_weight,
    DROP COLUMN IF EXISTS is_ready_for_pickup,
    DROP COLUMN IF EXISTS pickup_address,
    DROP COLUMN IF EXISTS driver_phone,
    DROP COLUMN IF EXISTS driver_name,
    DROP COLUMN IF EXISTS vehicle_plate,
    DROP COLUMN IF EXISTS vehicle_type,
    DROP COLUMN IF EXISTS pickup_time_slot,
    DROP COLUMN IF EXISTS pickup_date,
    DROP COLUMN IF EXISTS counter_notes,
    DROP COLUMN IF EXISTS counter_quantity,
    DROP COLUMN IF EXISTS counter_price,
    DROP COLUMN IF EXISTS notes,
    DROP COLUMN IF EXISTS margin_percentage,
    DROP COLUMN IF EXISTS margin_amount,
    DROP COLUMN IF EXISTS benchmark_price,
    DROP COLUMN IF EXISTS offered_quantity,
    DROP COLUMN IF EXISTS offered_price,
    DROP COLUMN IF EXISTS order_code;
