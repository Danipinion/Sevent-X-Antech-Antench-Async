CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL UNIQUE REFERENCES buyer_orders(id),
    transaction_number VARCHAR(50) NOT NULL UNIQUE,
    payment_method VARCHAR(30) NOT NULL DEFAULT 'cash_on_pickup',
    payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
    total_amount NUMERIC(18,2) NOT NULL,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT transactions_method_check
        CHECK (payment_method = 'cash_on_pickup'),

    CONSTRAINT transactions_status_check
        CHECK (
            payment_status IN (
                'unpaid',
                'paid',
                'cancelled'
            )
        ),

    CONSTRAINT transactions_amount_check
        CHECK (total_amount >= 0)
);

