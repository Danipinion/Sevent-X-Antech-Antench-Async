package persistence

import (
	"context"
	"errors"
	"fmt"
	"math"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"tandur/api/internal/domain"
)

type PostgresListingRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresListingRepository(pool *pgxpool.Pool) *PostgresListingRepository {
	return &PostgresListingRepository{pool: pool}
}

// Create menyimpan data listing panen baru ke PostgreSQL
func (r *PostgresListingRepository) Create(ctx context.Context, listing *domain.FarmerListing) error {
	query := `
		INSERT INTO farmer_listings (
			id, farmer_id, commodity_id, title, description,
			estimated_quantity, available_quantity, min_order_quantity, unit,
			price_per_unit, estimated_gross_revenue, estimated_harvest_date,
			pickup_address, media_urls, status, location, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9,
			$10, $11, NULLIF($12, '')::DATE,
			$13, $14, $15,
			ST_SetSRID(ST_MakePoint($16, $17), 4326)::geography,
			$18, $19
		)
		RETURNING id, created_at, updated_at;
	`

	harvestDate := listing.EstimatedHarvestDate
	if harvestDate == "" {
		harvestDate = listing.ReadyDate
	}

	err := r.pool.QueryRow(
		ctx,
		query,
		listing.ID,
		listing.FarmerID,
		listing.CommodityID,
		listing.Title,
		listing.Description,
		listing.EstimatedQuantity,
		listing.AvailableQuantity,
		listing.MinOrderQuantity,
		listing.Unit,
		listing.PricePerUnit,
		listing.EstimatedGrossRevenue,
		harvestDate,
		listing.PickupAddress,
		listing.MediaURLs,
		string(listing.Status),
		listing.Longitude, // ST_MakePoint(X, Y) -> (lon, lat)
		listing.Latitude,
		listing.CreatedAt,
		listing.UpdatedAt,
	).Scan(&listing.ID, &listing.CreatedAt, &listing.UpdatedAt)

	if err != nil {
		return fmt.Errorf("gagal membuat listing panen di postgres: %w", err)
	}

	return nil
}

// GetByID mengambil satu listing panen berdasarkan ID
func (r *PostgresListingRepository) GetByID(ctx context.Context, id string) (*domain.FarmerListing, error) {
	query := `
		SELECT 
			fl.id, fl.farmer_id, fl.commodity_id, COALESCE(c.name, '') AS commodity_name,
			fl.title, COALESCE(fl.description, '') AS description,
			fl.estimated_quantity, fl.available_quantity, fl.min_order_quantity, fl.unit,
			fl.price_per_unit, fl.estimated_gross_revenue,
			COALESCE(TO_CHAR(fl.estimated_harvest_date, 'YYYY-MM-DD'), '') AS ready_date,
			COALESCE(fl.pickup_address, '') AS pickup_address,
			COALESCE(fl.media_urls, '{}') AS media_urls,
			fl.status,
			ST_Y(fl.location::geometry) AS latitude,
			ST_X(fl.location::geometry) AS longitude,
			fl.created_at, fl.updated_at, fl.deleted_at
		FROM farmer_listings fl
		LEFT JOIN commodities c ON c.id = fl.commodity_id
		WHERE fl.id = $1 AND fl.deleted_at IS NULL;
	`

	var l domain.FarmerListing
	var statusStr string
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&l.ID, &l.FarmerID, &l.CommodityID, &l.CommodityName,
		&l.Title, &l.Description,
		&l.EstimatedQuantity, &l.AvailableQuantity, &l.MinOrderQuantity, &l.Unit,
		&l.PricePerUnit, &l.EstimatedGrossRevenue,
		&l.ReadyDate,
		&l.PickupAddress,
		&l.MediaURLs,
		&statusStr,
		&l.Latitude,
		&l.Longitude,
		&l.CreatedAt, &l.UpdatedAt, &l.DeletedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrListingNotFound
		}
		return nil, fmt.Errorf("gagal mengambil detail panen dari postgres: %w", err)
	}

	l.Status = domain.ListingStatus(statusStr)
	l.EstimatedHarvestDate = l.ReadyDate
	return &l, nil
}

// List mengambil daftar listing panen berpaginasi dengan filter
func (r *PostgresListingRepository) List(ctx context.Context, filter domain.ListingFilter) (*domain.PaginatedListings, error) {
	page := filter.Page
	if page < 1 {
		page = 1
	}
	limit := filter.Limit
	if limit < 1 || limit > 100 {
		limit = 10
	}
	offset := (page - 1) * limit

	query := `
		SELECT 
			fl.id, fl.farmer_id, fl.commodity_id, COALESCE(c.name, '') AS commodity_name,
			fl.title, COALESCE(fl.description, '') AS description,
			fl.estimated_quantity, fl.available_quantity, fl.min_order_quantity, fl.unit,
			fl.price_per_unit, fl.estimated_gross_revenue,
			COALESCE(TO_CHAR(fl.estimated_harvest_date, 'YYYY-MM-DD'), '') AS ready_date,
			COALESCE(fl.pickup_address, '') AS pickup_address,
			COALESCE(fl.media_urls, '{}') AS media_urls,
			fl.status,
			ST_Y(fl.location::geometry) AS latitude,
			ST_X(fl.location::geometry) AS longitude,
			fl.created_at, fl.updated_at, fl.deleted_at,
			COUNT(*) OVER() AS total_count
		FROM farmer_listings fl
		LEFT JOIN commodities c ON c.id = fl.commodity_id
		WHERE fl.deleted_at IS NULL
		  AND ($1 = '' OR fl.farmer_id = $1::UUID)
		  AND ($2 = '' OR $2 = 'all' OR fl.status = $2)
		  AND ($3 = '' OR fl.commodity_id = $3::UUID)
		ORDER BY fl.created_at DESC
		LIMIT $4 OFFSET $5;
	`

	rows, err := r.pool.Query(ctx, query, filter.FarmerID, filter.Status, filter.CommodityID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("gagal query daftar panen: %w", err)
	}
	defer rows.Close()

	items := make([]domain.FarmerListing, 0)
	var totalItems int64 = 0

	for rows.Next() {
		var l domain.FarmerListing
		var statusStr string
		err := rows.Scan(
			&l.ID, &l.FarmerID, &l.CommodityID, &l.CommodityName,
			&l.Title, &l.Description,
			&l.EstimatedQuantity, &l.AvailableQuantity, &l.MinOrderQuantity, &l.Unit,
			&l.PricePerUnit, &l.EstimatedGrossRevenue,
			&l.ReadyDate,
			&l.PickupAddress,
			&l.MediaURLs,
			&statusStr,
			&l.Latitude,
			&l.Longitude,
			&l.CreatedAt, &l.UpdatedAt, &l.DeletedAt,
			&totalItems,
		)
		if err != nil {
			return nil, fmt.Errorf("gagal scan baris listing: %w", err)
		}
		l.Status = domain.ListingStatus(statusStr)
		l.EstimatedHarvestDate = l.ReadyDate
		items = append(items, l)
	}

	totalPages := 0
	if totalItems > 0 {
		totalPages = int(math.Ceil(float64(totalItems) / float64(limit)))
	}

	return &domain.PaginatedListings{
		Items:      items,
		TotalItems: totalItems,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	}, nil
}

// Update mengubah data penjualan panen yang statusnya masih draft atau published
func (r *PostgresListingRepository) Update(ctx context.Context, listing *domain.FarmerListing) error {
	harvestDate := listing.EstimatedHarvestDate
	if harvestDate == "" {
		harvestDate = listing.ReadyDate
	}

	query := `
		UPDATE farmer_listings
		SET 
			title = $1,
			description = $2,
			estimated_quantity = $3,
			available_quantity = $4,
			min_order_quantity = $5,
			price_per_unit = $6,
			estimated_gross_revenue = $7,
			estimated_harvest_date = NULLIF($8, '')::DATE,
			pickup_address = $9,
			media_urls = $10,
			location = ST_SetSRID(ST_MakePoint($11, $12), 4326)::geography,
			updated_at = NOW()
		WHERE id = $13 AND farmer_id = $14 AND deleted_at IS NULL;
	`

	cmd, err := r.pool.Exec(
		ctx,
		query,
		listing.Title,
		listing.Description,
		listing.EstimatedQuantity,
		listing.AvailableQuantity,
		listing.MinOrderQuantity,
		listing.PricePerUnit,
		listing.EstimatedGrossRevenue,
		harvestDate,
		listing.PickupAddress,
		listing.MediaURLs,
		listing.Longitude,
		listing.Latitude,
		listing.ID,
		listing.FarmerID,
	)

	if err != nil {
		return fmt.Errorf("gagal mengupdate listing panen di postgres: %w", err)
	}

	if cmd.RowsAffected() == 0 {
		return domain.ErrListingNotFound
	}

	return nil
}

// SoftDelete menandai listing sebagai cancelled dan mencatat waktu penghapusan
func (r *PostgresListingRepository) SoftDelete(ctx context.Context, id string, farmerID string) error {
	query := `
		UPDATE farmer_listings
		SET 
			status = 'cancelled',
			deleted_at = NOW(),
			updated_at = NOW()
		WHERE id = $1 AND farmer_id = $2 AND deleted_at IS NULL;
	`

	cmd, err := r.pool.Exec(ctx, query, id, farmerID)
	if err != nil {
		return fmt.Errorf("gagal membatalkan/menghapus listing panen di postgres: %w", err)
	}

	if cmd.RowsAffected() == 0 {
		return domain.ErrListingNotFound
	}

	return nil
}
