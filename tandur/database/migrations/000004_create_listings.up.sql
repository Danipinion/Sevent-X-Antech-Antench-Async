CREATE TABLE IF NOT EXISTS farmer_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES users(id),
    commodity_id UUID NOT NULL REFERENCES commodities(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    estimated_quantity NUMERIC(14,2) NOT NULL,
    available_quantity NUMERIC(14,2) NOT NULL,
    unit VARCHAR(30) NOT NULL,
    estimated_harvest_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT farmer_listings_quantity_check
        CHECK (
            estimated_quantity > 0
            AND available_quantity >= 0
            AND available_quantity <= estimated_quantity
        ),

    CONSTRAINT farmer_listings_status_check
        CHECK (
            status IN (
                'draft',
                'published',
                'reserved',
                'completed',
                'cancelled'
            )
        )
);

