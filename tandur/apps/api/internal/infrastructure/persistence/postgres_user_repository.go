package persistence

import (
	"context"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"tandur/api/internal/domain"
)

type PostgresUserRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresUserRepository(pool *pgxpool.Pool) *PostgresUserRepository {
	return &PostgresUserRepository{pool: pool}
}

func (r *PostgresUserRepository) Create(ctx context.Context, user *domain.User, location *domain.UserLocation) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	queryUser := `
		INSERT INTO users (
			nik, name, phone, password_hash, role, is_bisnis, is_active,
			is_verified, verification_status, ktp_photo_url, birth_place, birth_date, ktp_address, avatar_url
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		RETURNING id, created_at, updated_at;
	`

	verStatus := string(user.VerificationStatus)
	if verStatus == "" {
		verStatus = string(domain.VerificationStatusUnverified)
	}

	err = tx.QueryRow(ctx, queryUser,
		user.NIK,
		user.Name,
		user.Phone,
		user.PasswordHash,
		string(user.Role),
		user.IsBisnis,
		user.IsActive,
		user.IsVerified,
		verStatus,
		user.KTPPhotoURL,
		user.BirthPlace,
		user.BirthDate,
		user.KTPAddress,
		user.AvatarURL,
	).Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			if strings.Contains(pgErr.ConstraintName, "phone") {
				return domain.ErrPhoneAlreadyExists
			}
			if strings.Contains(pgErr.ConstraintName, "nik") {
				return domain.ErrNIKAlreadyExists
			}
		}
		return err
	}

	if location != nil {
		queryLoc := `
			INSERT INTO user_locations (
				user_id, label, address, village, district, city, province, location, is_primary
			) VALUES (
				$1, $2, $3, $4, $5, $6, $7,
				ST_SetSRID(ST_MakePoint($8, $9), 4326)::geography,
				$10
			)
			RETURNING id, created_at, updated_at;
		`

		location.UserID = user.ID
		err = tx.QueryRow(ctx, queryLoc,
			location.UserID,
			location.Label,
			location.Address,
			location.Village,
			location.District,
			location.City,
			location.Province,
			location.Longitude, // ST_MakePoint(longitude, latitude)
			location.Latitude,
			location.IsPrimary,
		).Scan(&location.ID, &location.CreatedAt, &location.UpdatedAt)

		if err != nil {
			return err
		}
		user.Location = location
	}

	return tx.Commit(ctx)
}

func (r *PostgresUserRepository) GetByPhone(ctx context.Context, phone string) (*domain.User, error) {
	query := `
		SELECT id, nik, name, phone, password_hash, role, is_bisnis, is_active,
		       is_verified, verification_status, ktp_photo_url, birth_place, birth_date,
		       ktp_address, verified_at, rejection_reason, avatar_url, created_at, updated_at
		FROM users
		WHERE phone = $1;
	`

	var user domain.User
	var roleStr, verStatusStr string
	err := r.pool.QueryRow(ctx, query, phone).Scan(
		&user.ID,
		&user.NIK,
		&user.Name,
		&user.Phone,
		&user.PasswordHash,
		&roleStr,
		&user.IsBisnis,
		&user.IsActive,
		&user.IsVerified,
		&verStatusStr,
		&user.KTPPhotoURL,
		&user.BirthPlace,
		&user.BirthDate,
		&user.KTPAddress,
		&user.VerifiedAt,
		&user.RejectionReason,
		&user.AvatarURL,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}

	user.Role = domain.UserRole(roleStr)
	user.VerificationStatus = domain.VerificationStatus(verStatusStr)
	user.CanSellHarvest = user.CheckCanSellHarvest()
	r.attachPrimaryLocation(ctx, &user)
	return &user, nil
}

func (r *PostgresUserRepository) GetByNIK(ctx context.Context, nik string) (*domain.User, error) {
	query := `
		SELECT id, nik, name, phone, password_hash, role, is_bisnis, is_active,
		       is_verified, verification_status, ktp_photo_url, birth_place, birth_date,
		       ktp_address, verified_at, rejection_reason, avatar_url, created_at, updated_at
		FROM users
		WHERE nik = $1;
	`

	var user domain.User
	var roleStr, verStatusStr string
	err := r.pool.QueryRow(ctx, query, nik).Scan(
		&user.ID,
		&user.NIK,
		&user.Name,
		&user.Phone,
		&user.PasswordHash,
		&roleStr,
		&user.IsBisnis,
		&user.IsActive,
		&user.IsVerified,
		&verStatusStr,
		&user.KTPPhotoURL,
		&user.BirthPlace,
		&user.BirthDate,
		&user.KTPAddress,
		&user.VerifiedAt,
		&user.RejectionReason,
		&user.AvatarURL,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}

	user.Role = domain.UserRole(roleStr)
	user.VerificationStatus = domain.VerificationStatus(verStatusStr)
	user.CanSellHarvest = user.CheckCanSellHarvest()
	r.attachPrimaryLocation(ctx, &user)
	return &user, nil
}

func (r *PostgresUserRepository) GetByID(ctx context.Context, id string) (*domain.User, error) {
	query := `
		SELECT id, nik, name, phone, password_hash, role, is_bisnis, is_active,
		       is_verified, verification_status, ktp_photo_url, birth_place, birth_date,
		       ktp_address, verified_at, rejection_reason, avatar_url, created_at, updated_at
		FROM users
		WHERE id = $1;
	`

	var user domain.User
	var roleStr, verStatusStr string
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&user.ID,
		&user.NIK,
		&user.Name,
		&user.Phone,
		&user.PasswordHash,
		&roleStr,
		&user.IsBisnis,
		&user.IsActive,
		&user.IsVerified,
		&verStatusStr,
		&user.KTPPhotoURL,
		&user.BirthPlace,
		&user.BirthDate,
		&user.KTPAddress,
		&user.VerifiedAt,
		&user.RejectionReason,
		&user.AvatarURL,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}

	user.Role = domain.UserRole(roleStr)
	user.VerificationStatus = domain.VerificationStatus(verStatusStr)
	user.CanSellHarvest = user.CheckCanSellHarvest()
	r.attachPrimaryLocation(ctx, &user)
	return &user, nil
}

func (r *PostgresUserRepository) UpdateVerification(ctx context.Context, user *domain.User) error {
	query := `
		UPDATE users
		SET nik = $1,
		    name = $2,
		    ktp_photo_url = $3,
		    birth_place = $4,
		    birth_date = $5,
		    ktp_address = $6,
		    is_verified = $7,
		    verification_status = $8,
		    verified_at = $9,
		    rejection_reason = $10,
		    updated_at = NOW()
		WHERE id = $11;
	`
	_, err := r.pool.Exec(ctx, query,
		user.NIK,
		user.Name,
		user.KTPPhotoURL,
		user.BirthPlace,
		user.BirthDate,
		user.KTPAddress,
		user.IsVerified,
		string(user.VerificationStatus),
		user.VerifiedAt,
		user.RejectionReason,
		user.ID,
	)
	return err
}

func (r *PostgresUserRepository) UpdateProfile(ctx context.Context, user *domain.User, location *domain.UserLocation) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	queryUser := `
		UPDATE users
		SET name = $1,
		    phone = $2,
		    is_bisnis = $3,
		    avatar_url = $4,
		    updated_at = NOW()
		WHERE id = $5;
	`
	_, err = tx.Exec(ctx, queryUser,
		user.Name,
		user.Phone,
		user.IsBisnis,
		user.AvatarURL,
		user.ID,
	)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			if strings.Contains(pgErr.ConstraintName, "phone") {
				return domain.ErrPhoneAlreadyExists
			}
		}
		return err
	}

	if location != nil && strings.TrimSpace(location.Address) != "" {
		var existingLocID string
		checkQuery := `SELECT id FROM user_locations WHERE user_id = $1 AND is_primary = true LIMIT 1;`
		err = tx.QueryRow(ctx, checkQuery, user.ID).Scan(&existingLocID)

		if err == nil && existingLocID != "" {
			updateLoc := `
				UPDATE user_locations
				SET label = $1,
				    address = $2,
				    village = $3,
				    district = $4,
				    city = $5,
				    province = $6,
				    location = ST_SetSRID(ST_MakePoint($7, $8), 4326)::geography,
				    updated_at = NOW()
				WHERE id = $9;
			`
			_, err = tx.Exec(ctx, updateLoc,
				location.Label,
				location.Address,
				location.Village,
				location.District,
				location.City,
				location.Province,
				location.Longitude,
				location.Latitude,
				existingLocID,
			)
			if err != nil {
				return err
			}
			location.ID = existingLocID
		} else {
			insertLoc := `
				INSERT INTO user_locations (
					user_id, label, address, village, district, city, province, location, is_primary
				) VALUES (
					$1, $2, $3, $4, $5, $6, $7,
					ST_SetSRID(ST_MakePoint($8, $9), 4326)::geography,
					true
				)
				RETURNING id, created_at, updated_at;
			`
			location.UserID = user.ID
			location.IsPrimary = true
			err = tx.QueryRow(ctx, insertLoc,
				location.UserID,
				location.Label,
				location.Address,
				location.Village,
				location.District,
				location.City,
				location.Province,
				location.Longitude,
				location.Latitude,
			).Scan(&location.ID, &location.CreatedAt, &location.UpdatedAt)
			if err != nil {
				return err
			}
		}
		user.Location = location
	}

	return tx.Commit(ctx)
}

func (r *PostgresUserRepository) attachPrimaryLocation(ctx context.Context, user *domain.User) {
	locQuery := `
		SELECT id, user_id, label, address, village, district, city, province,
		       ST_Y(location::geometry) AS latitude,
		       ST_X(location::geometry) AS longitude,
		       is_primary, created_at, updated_at
		FROM user_locations
		WHERE user_id = $1 AND is_primary = true
		LIMIT 1;
	`

	var loc domain.UserLocation
	err := r.pool.QueryRow(ctx, locQuery, user.ID).Scan(
		&loc.ID,
		&loc.UserID,
		&loc.Label,
		&loc.Address,
		&loc.Village,
		&loc.District,
		&loc.City,
		&loc.Province,
		&loc.Latitude,
		&loc.Longitude,
		&loc.IsPrimary,
		&loc.CreatedAt,
		&loc.UpdatedAt,
	)
	if err == nil {
		user.Location = &loc
	}
}
