-- Migration: 000001_init_schema.up.sql
-- Description: Inisialisasi skema database TANDUR dengan ekstensi PostGIS

-- 1. Enable PostGIS Extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Enum Types
CREATE TYPE user_role AS ENUM ('FARMER', 'MIDDLEMAN', 'BUYER', 'ADMIN');
CREATE TYPE quality_grade AS ENUM ('GRADE_A', 'GRADE_B', 'GRADE_C');
CREATE TYPE order_status AS ENUM ('PENDING', 'ACCEPTED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED');

-- 3. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    phone_number VARCHAR(20),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Commodities Table
CREATE TABLE IF NOT EXISTS commodities (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'kg',
    base_price NUMERIC(15, 2) NOT NULL,
    current_market_price NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Inventories Table with PostGIS Geospatial geometry
CREATE TABLE IF NOT EXISTS inventories (
    id VARCHAR(36) PRIMARY KEY,
    commodity_id VARCHAR(50) NOT NULL REFERENCES commodities(id) ON DELETE RESTRICT,
    owner_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quantity NUMERIC(12, 2) NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'kg',
    quality_grade quality_grade NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    geom geometry(Point, 4326),
    harvest_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventories_geom ON inventories USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_inventories_commodity_id ON inventories (commodity_id);

-- 6. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(36) PRIMARY KEY,
    buyer_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    seller_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    commodity_id VARCHAR(50) NOT NULL REFERENCES commodities(id) ON DELETE RESTRICT,
    quantity NUMERIC(12, 2) NOT NULL,
    total_price NUMERIC(15, 2) NOT NULL,
    status order_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Market Prices Reference Table
CREATE TABLE IF NOT EXISTS market_prices (
    id BIGSERIAL PRIMARY KEY,
    commodity_id VARCHAR(50) NOT NULL REFERENCES commodities(id) ON DELETE CASCADE,
    region VARCHAR(100) NOT NULL,
    average_price NUMERIC(15, 2) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_prices_commodity_region ON market_prices (commodity_id, region);

