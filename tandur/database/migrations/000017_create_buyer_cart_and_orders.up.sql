-- Migration: 000017_create_buyer_cart_and_orders.up.sql
-- Mendukung fitur pembeli (retail_buyer & business_buyer):
-- 1. Keranjang belanja pembeli (konsolidasi stok multi-penjual)
-- 2. Perluasan tabel buyer_orders & buyer_order_items untuk Cash on Pickup & produk petani/tengkulak

CREATE TABLE IF NOT EXISTS buyer_cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL,
    product_source VARCHAR(20) NOT NULL DEFAULT 'middleman',
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quantity NUMERIC(14,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT buyer_cart_items_qty_check CHECK (quantity > 0),
    CONSTRAINT buyer_cart_items_source_check CHECK (product_source IN ('farmer', 'middleman')),
    CONSTRAINT buyer_cart_items_unique_product UNIQUE (buyer_id, product_id, product_source)
);

CREATE INDEX IF NOT EXISTS idx_buyer_cart_buyer_id ON buyer_cart_items(buyer_id);
CREATE INDEX IF NOT EXISTS idx_buyer_cart_seller_id ON buyer_cart_items(seller_id);

-- Perluas buyer_orders untuk mendukung Cash on Pickup, biaya penanganan, dan informasi penjual/lokasi ambil
ALTER TABLE buyer_orders
    ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS seller_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS seller_phone VARCHAR(20),
    ADD COLUMN IF NOT EXISTS seller_role VARCHAR(20) DEFAULT 'middleman',
    ADD COLUMN IF NOT EXISTS subtotal_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS handling_fee NUMERIC(18,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30) NOT NULL DEFAULT 'cash_on_pickup',
    ADD COLUMN IF NOT EXISTS pickup_address TEXT,
    ADD COLUMN IF NOT EXISTS pickup_latitude DOUBLE PRECISION DEFAULT 0,
    ADD COLUMN IF NOT EXISTS pickup_longitude DOUBLE PRECISION DEFAULT 0,
    ADD COLUMN IF NOT EXISTS confirmed_receipt_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Perluas constraint status agar mendukung 'waiting_confirmation' selain status yang sudah ada
ALTER TABLE buyer_orders DROP CONSTRAINT IF EXISTS buyer_orders_status_check;
ALTER TABLE buyer_orders ADD CONSTRAINT buyer_orders_status_check
    CHECK (
        status IN (
            'pending',
            'waiting_confirmation',
            'confirmed',
            'processing',
            'ready_for_pickup',
            'completed',
            'cancelled'
        )
    );

-- Perluas buyer_order_items agar mendukung produk dari farmer_listings maupun middleman_sales_listings
ALTER TABLE buyer_order_items
    ALTER COLUMN inventory_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS product_id UUID,
    ADD COLUMN IF NOT EXISTS product_source VARCHAR(20) NOT NULL DEFAULT 'middleman',
    ADD COLUMN IF NOT EXISTS product_name VARCHAR(200),
    ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS media_url TEXT;

CREATE INDEX IF NOT EXISTS idx_buyer_orders_buyer_id ON buyer_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_buyer_orders_status ON buyer_orders(status);
CREATE INDEX IF NOT EXISTS idx_buyer_orders_created_at ON buyer_orders(created_at DESC);
