DROP INDEX IF EXISTS idx_users_verification_status;

ALTER TABLE users
    DROP COLUMN IF EXISTS is_verified,
    DROP COLUMN IF EXISTS verification_status,
    DROP COLUMN IF EXISTS ktp_photo_url,
    DROP COLUMN IF EXISTS birth_place,
    DROP COLUMN IF EXISTS birth_date,
    DROP COLUMN IF EXISTS ktp_address,
    DROP COLUMN IF EXISTS verified_at,
    DROP COLUMN IF EXISTS rejection_reason;
