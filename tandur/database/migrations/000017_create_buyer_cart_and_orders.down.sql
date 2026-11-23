-- Migration: 000017_create_buyer_cart_and_orders.down.sql

DROP TABLE IF EXISTS buyer_cart_items;

ALTER TABLE buyer_order_items
    DROP COLUMN IF EXISTS media_url,
    DROP COLUMN IF EXISTS seller_id,
    DROP COLUMN IF EXISTS product_name,
    DROP COLUMN IF EXISTS product_source,
    DROP COLUMN IF EXISTS product_id;

ALTER TABLE buyer_orders
    DROP COLUMN IF EXISTS cancelled_at,
    DROP COLUMN IF EXISTS confirmed_receipt_at,
    DROP COLUMN IF EXISTS pickup_longitude,
    DROP COLUMN IF EXISTS pickup_latitude,
    DROP COLUMN IF EXISTS pickup_address,
    DROP COLUMN IF EXISTS payment_method,
    DROP COLUMN IF EXISTS handling_fee,
    DROP COLUMN IF EXISTS subtotal_amount,
    DROP COLUMN IF EXISTS seller_role,
    DROP COLUMN IF EXISTS seller_phone,
    DROP COLUMN IF EXISTS seller_name,
    DROP COLUMN IF EXISTS seller_id;
