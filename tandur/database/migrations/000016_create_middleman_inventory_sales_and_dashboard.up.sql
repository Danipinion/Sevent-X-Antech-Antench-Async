-- Migration: 000016_create_middleman_inventory_sales_and_dashboard.up.sql
-- Menambahkan tabel inventaris stok gudang tengkulak, riwayat mutasi logistik,
-- listing penjualan stok ke Rice Mill/pembeli grosir, dan penawaran masuk (bids).

CREATE TABLE IF NOT EXISTS middleman_inventories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    middleman_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lot_code VARCHAR(50) NOT NULL UNIQUE,
    commodity_id VARCHAR(100) NOT NULL,
    commodity_name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'gabah',
    variety VARCHAR(100) NOT NULL,
    warehouse_name VARCHAR(150) NOT NULL DEFAULT 'Gudang A - Demak',
    warehouse_capacity_tons NUMERIC(10,2) NOT NULL DEFAULT 50.00,
    total_weight_kg NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_weight_tons NUMERIC(10,2) NOT NULL DEFAULT 0,
    average_buy_price NUMERIC(14,2) NOT NULL DEFAULT 0,
    current_market_price NUMERIC(14,2) NOT NULL DEFAULT 0,
    moisture_content NUMERIC(5,2) DEFAULT 0,
    impurity_content NUMERIC(5,2) DEFAULT 0,
    source_gapoktan VARCHAR(150),
    status VARCHAR(30) NOT NULL DEFAULT 'aman',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT middleman_inventories_weight_check CHECK (total_weight_kg >= 0),
    CONSTRAINT middleman_inventories_status_check CHECK (status IN ('aman', 'menipis', 'perlu_tindakan', 'habis'))
);

CREATE INDEX IF NOT EXISTS idx_middleman_inv_middleman_id ON middleman_inventories(middleman_id);
CREATE INDEX IF NOT EXISTS idx_middleman_inv_category ON middleman_inventories(category);
CREATE INDEX IF NOT EXISTS idx_middleman_inv_status ON middleman_inventories(status);
CREATE INDEX IF NOT EXISTS idx_middleman_inv_created_at ON middleman_inventories(created_at DESC);

-- Tabel Riwayat Mutasi Arus Logistik Keluar/Masuk Gudang
CREATE TABLE IF NOT EXISTS middleman_inventory_mutations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    middleman_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    inventory_id UUID REFERENCES middleman_inventories(id) ON DELETE SET NULL,
    lot_code VARCHAR(50) NOT NULL,
    mutation_type VARCHAR(10) NOT NULL, -- 'in' (+ MASUK) atau 'out' (- KELUAR)
    commodity_name VARCHAR(150) NOT NULL,
    quantity_tons NUMERIC(10,2) NOT NULL,
    partner_name VARCHAR(150) NOT NULL, -- Gapoktan / Penggilingan / Pembeli
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT middleman_mutations_type_check CHECK (mutation_type IN ('in', 'out')),
    CONSTRAINT middleman_mutations_qty_check CHECK (quantity_tons > 0)
);

CREATE INDEX IF NOT EXISTS idx_middleman_mut_middleman_id ON middleman_inventory_mutations(middleman_id);
CREATE INDEX IF NOT EXISTS idx_middleman_mut_created_at ON middleman_inventory_mutations(created_at DESC);

-- Tabel Listing Penjualan Stok Gudang ke Rice Mill / Grosir
CREATE TABLE IF NOT EXISTS middleman_sales_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    middleman_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL REFERENCES middleman_inventories(id) ON DELETE CASCADE,
    lot_code VARCHAR(50) NOT NULL,
    commodity_name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'gabah',
    variety VARCHAR(100) NOT NULL,
    offered_tons NUMERIC(10,2) NOT NULL,
    min_order_tons NUMERIC(10,2) NOT NULL DEFAULT 1.00,
    cost_price_per_kg NUMERIC(14,2) NOT NULL,
    selling_price_per_kg NUMERIC(14,2) NOT NULL,
    total_selling_value NUMERIC(14,2) NOT NULL,
    target_margin_per_kg NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_target_margin NUMERIC(14,2) NOT NULL DEFAULT 0,
    delivery_option VARCHAR(50) NOT NULL DEFAULT 'warehouse_pickup',
    target_markets TEXT[] DEFAULT ARRAY['rice_mill', 'wholesaler'],
    valid_until DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT middleman_sales_status_check CHECK (status IN ('active', 'closed', 'sold_out')),
    CONSTRAINT middleman_sales_offered_tons_check CHECK (offered_tons > 0)
);

CREATE INDEX IF NOT EXISTS idx_middleman_sales_middleman_id ON middleman_sales_listings(middleman_id);
CREATE INDEX IF NOT EXISTS idx_middleman_sales_status ON middleman_sales_listings(status);
CREATE INDEX IF NOT EXISTS idx_middleman_sales_created_at ON middleman_sales_listings(created_at DESC);

-- Tabel Penawaran Pembeli Masuk ke Listing Jual Stok
CREATE TABLE IF NOT EXISTS middleman_sales_bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_listing_id UUID NOT NULL REFERENCES middleman_sales_listings(id) ON DELETE CASCADE,
    buyer_name VARCHAR(150) NOT NULL,
    buyer_type VARCHAR(100) NOT NULL DEFAULT 'Pabrik Penggilingan (Rice Mill)',
    offered_price_per_kg NUMERIC(14,2) NOT NULL,
    requested_tons NUMERIC(10,2) NOT NULL,
    total_offered_amount NUMERIC(14,2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT middleman_sales_bids_status_check CHECK (status IN ('pending', 'accepted', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_middleman_sales_bids_listing_id ON middleman_sales_bids(sales_listing_id);
CREATE INDEX IF NOT EXISTS idx_middleman_sales_bids_created_at ON middleman_sales_bids(created_at DESC);
