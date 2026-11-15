CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    middleman_id UUID NOT NULL REFERENCES users(id),
    commodity_id UUID NOT NULL REFERENCES commodities(id),
    quantity NUMERIC(14,2) NOT NULL DEFAULT 0,
    unit VARCHAR(30) NOT NULL,
    purchase_price NUMERIC(14,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'available',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT inventory_quantity_check
        CHECK (quantity >= 0),

    CONSTRAINT inventory_price_check
        CHECK (purchase_price >= 0),

    CONSTRAINT inventory_status_check
        CHECK (
            status IN (
                'available',
                'empty',
                'inactive'
            )
        )
);

CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID NOT NULL REFERENCES inventory(id),
    movement_type VARCHAR(20) NOT NULL,
    quantity NUMERIC(14,2) NOT NULL,
    reference_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT inventory_movements_type_check
        CHECK (
            movement_type IN (
                'in',
                'out',
                'adjustment'
            )
        ),

    CONSTRAINT inventory_movements_quantity_check
        CHECK (quantity > 0)
);

