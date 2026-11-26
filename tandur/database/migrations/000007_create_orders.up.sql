CREATE TABLE IF NOT EXISTS buyer_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES users(id),
    order_number VARCHAR(50) NOT NULL UNIQUE,
    total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    pickup_location_id UUID REFERENCES user_locations(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT buyer_orders_amount_check
        CHECK (total_amount >= 0),

    CONSTRAINT buyer_orders_status_check
        CHECK (
            status IN (
                'pending',
                'confirmed',
                'processing',
                'ready_for_pickup',
                'completed',
                'cancelled'
            )
        )
);

CREATE TABLE IF NOT EXISTS buyer_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES buyer_orders(id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL REFERENCES inventory(id),
    quantity NUMERIC(14,2) NOT NULL,
    unit VARCHAR(30) NOT NULL,
    unit_price NUMERIC(14,2) NOT NULL,
    subtotal NUMERIC(18,2) NOT NULL,

    CONSTRAINT buyer_order_items_quantity_check
        CHECK (quantity > 0),

    CONSTRAINT buyer_order_items_price_check
        CHECK (
            unit_price >= 0
            AND subtotal >= 0
        )
);

CREATE TABLE IF NOT EXISTS order_suborders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES buyer_orders(id) ON DELETE CASCADE,
    middleman_id UUID NOT NULL REFERENCES users(id),
    suborder_number VARCHAR(50) NOT NULL UNIQUE,
    subtotal NUMERIC(18,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT order_suborders_subtotal_check
        CHECK (subtotal >= 0),

    CONSTRAINT order_suborders_status_check
        CHECK (
            status IN (
                'pending',
                'confirmed',
                'processing',
                'ready_for_pickup',
                'completed',
                'cancelled'
            )
        )
);

