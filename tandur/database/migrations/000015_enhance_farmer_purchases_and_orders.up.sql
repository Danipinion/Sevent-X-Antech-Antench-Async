-- Migration 000015: Enhance farmer_purchases to support orders, negotiation, fleet logistics, and digital weighing

-- 1. Tambahkan order_code
ALTER TABLE farmer_purchases
    ADD COLUMN IF NOT EXISTS order_code VARCHAR(50);

-- Update existing rows if any
UPDATE farmer_purchases
SET order_code = 'TND-ORD-' || TO_CHAR(created_at, 'YYYY') || '-' || LPAD(SUBSTRING(id::text FROM 1 FOR 6), 6, '0')
WHERE order_code IS NULL;

ALTER TABLE farmer_purchases
    ALTER COLUMN order_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_farmer_purchases_order_code ON farmer_purchases(order_code);

-- 2. Update status constraint agar mendukung alur pesanan & penawaran
ALTER TABLE farmer_purchases DROP CONSTRAINT IF EXISTS farmer_purchases_status_check;
ALTER TABLE farmer_purchases
    ADD CONSTRAINT farmer_purchases_status_check
    CHECK (
        status IN (
            'waiting_confirmation',
            'in_negotiation',
            'scheduled_pickup',
            'completed',
            'cancelled',
            'pending',
            'accepted',
            'rejected'
        )
    );

-- 3. Field penawaran, acuan pasar, dan margin
ALTER TABLE farmer_purchases
    ADD COLUMN IF NOT EXISTS offered_price NUMERIC(14,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS offered_quantity NUMERIC(14,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS benchmark_price NUMERIC(14,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS margin_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS margin_percentage NUMERIC(6,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS counter_price NUMERIC(14,2),
    ADD COLUMN IF NOT EXISTS counter_quantity NUMERIC(14,2),
    ADD COLUMN IF NOT EXISTS counter_notes TEXT;

-- 4. Field logistik armada jemput
ALTER TABLE farmer_purchases
    ADD COLUMN IF NOT EXISTS pickup_date DATE,
    ADD COLUMN IF NOT EXISTS pickup_time_slot VARCHAR(50),
    ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS vehicle_plate VARCHAR(30),
    ADD COLUMN IF NOT EXISTS driver_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS driver_phone VARCHAR(30),
    ADD COLUMN IF NOT EXISTS pickup_address VARCHAR(255),
    ADD COLUMN IF NOT EXISTS is_ready_for_pickup BOOLEAN NOT NULL DEFAULT FALSE;

-- 5. Field penimbangan digital & nota
ALTER TABLE farmer_purchases
    ADD COLUMN IF NOT EXISTS actual_weight NUMERIC(14,2),
    ADD COLUMN IF NOT EXISTS final_price_per_unit NUMERIC(14,2),
    ADD COLUMN IF NOT EXISTS final_total_amount NUMERIC(18,2),
    ADD COLUMN IF NOT EXISTS weighing_certificate_url TEXT,
    ADD COLUMN IF NOT EXISTS invoice_url TEXT;

-- 6. Indexes untuk performa dashboard petani & tengkulak
CREATE INDEX IF NOT EXISTS idx_farmer_purchases_farmer_status ON farmer_purchases(farmer_id, status);
CREATE INDEX IF NOT EXISTS idx_farmer_purchases_middleman_status ON farmer_purchases(middleman_id, status);
CREATE INDEX IF NOT EXISTS idx_farmer_purchases_created_at ON farmer_purchases(created_at DESC);
