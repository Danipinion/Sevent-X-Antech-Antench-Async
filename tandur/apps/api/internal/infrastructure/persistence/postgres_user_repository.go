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
		INSERT INTO users (nik, name, phone, password_hash, role, is_bisnis, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at, updated_at;
	`

	err = tx.QueryRow(ctx, queryUser,
		user.NIK,
		user.Name,
		user.Phone,
		user.PasswordHash,
		string(user.Role),
		user.IsBisnis,
		user.IsActive,
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
		SELECT id, nik, name, phone, password_hash, role, is_bisnis, is_active, created_at, updated_at
		FROM users
		WHERE phone = $1;
	`

	var user domain.User
	var roleStr string
	err := r.pool.QueryRow(ctx, query, phone).Scan(
		&user.ID,
		&user.NIK,
		&user.Name,
		&user.Phone,
		&user.PasswordHash,
		&roleStr,
		&user.IsBisnis,
		&user.IsActive,
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
	return &user, nil
}

func (r *PostgresUserRepository) GetByNIK(ctx context.Context, nik string) (*domain.User, error) {
	query := `
		SELECT id, nik, name, phone, password_hash, role, is_bisnis, is_active, created_at, updated_at
		FROM users
		WHERE nik = $1;
	`

	var user domain.User
	var roleStr string
	err := r.pool.QueryRow(ctx, query, nik).Scan(
		&user.ID,
		&user.NIK,
		&user.Name,
		&user.Phone,
		&user.PasswordHash,
		&roleStr,
		&user.IsBisnis,
		&user.IsActive,
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
	return &user, nil
}

func (r *PostgresUserRepository) GetByID(ctx context.Context, id string) (*domain.User, error) {
	query := `
		SELECT id, nik, name, phone, password_hash, role, is_bisnis, is_active, created_at, updated_at
		FROM users
		WHERE id = $1;
	`

	var user domain.User
	var roleStr string
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&user.ID,
		&user.NIK,
		&user.Name,
		&user.Phone,
		&user.PasswordHash,
		&roleStr,
		&user.IsBisnis,
		&user.IsActive,
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

	// Fetch primary location if exists
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
	err = r.pool.QueryRow(ctx, locQuery, id).Scan(
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

	return &user, nil
}
