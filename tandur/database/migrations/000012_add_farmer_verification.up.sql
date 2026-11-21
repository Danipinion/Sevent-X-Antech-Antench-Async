ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) NOT NULL DEFAULT 'unverified',
    ADD COLUMN IF NOT EXISTS ktp_photo_url TEXT,
    ADD COLUMN IF NOT EXISTS birth_place VARCHAR(100),
    ADD COLUMN IF NOT EXISTS birth_date VARCHAR(50),
    ADD COLUMN IF NOT EXISTS ktp_address TEXT,
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_users_verification_status ON users(verification_status);
