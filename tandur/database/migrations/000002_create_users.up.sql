CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nik VARCHAR(16) UNIQUE,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(13) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(11) NOT NULL,
    is_bisnis BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT users_role_check
        CHECK (role IN ('farmer', 'middleman', 'buyer'))
);

CREATE TABLE user_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(100),
    address TEXT NOT NULL,
    village VARCHAR(100),
    district VARCHAR(100),
    city VARCHAR(100),
    province VARCHAR(100),
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

