CREATE TABLE IF NOT EXISTS farmer_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES farmer_listings(id),
    middleman_id UUID NOT NULL REFERENCES users(id),
    farmer_id UUID NOT NULL REFERENCES users(id),
    quantity NUMERIC(14,2) NOT NULL,
    agreed_price NUMERIC(14,2) NOT NULL,
    total_price NUMERIC(18,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    agreement_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT farmer_purchases_quantity_check
        CHECK (quantity > 0),

    CONSTRAINT farmer_purchases_price_check
        CHECK (
            agreed_price >= 0
            AND total_price >= 0
        ),

    CONSTRAINT farmer_purchases_status_check
        CHECK (
            status IN (
                'pending',
                'accepted',
                'rejected',
                'completed',
                'cancelled'
            )
        )
);

