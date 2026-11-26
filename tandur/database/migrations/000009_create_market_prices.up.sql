CREATE TABLE IF NOT EXISTS market_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commodity_id UUID NOT NULL REFERENCES commodities(id),
    source VARCHAR(100) NOT NULL,
    market_name VARCHAR(150),
    region VARCHAR(150),
    price NUMERIC(14,2) NOT NULL,
    unit VARCHAR(30) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT market_prices_price_check
        CHECK (price >= 0)
);

