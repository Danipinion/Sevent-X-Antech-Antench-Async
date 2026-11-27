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

type PostgresOrderRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresOrderRepository(pool *pgxpool.Pool) *PostgresOrderRepository {
	return &PostgresOrderRepository{pool: pool}
}

func (r *PostgresOrderRepository) Create(ctx context.Context, order *domain.FarmerPurchaseOrder) error {
	farmerGroup := order.FarmerBusinessName
	if farmerGroup == "" {
		farmerGroup = "Gapoktan Sumber Makmur"
	}

	query := `
		INSERT INTO farmer_purchases (
			id, order_code, listing_id, middleman_id, farmer_id,
			quantity, agreed_price, total_price, status,
			offered_price, offered_quantity, benchmark_price,
			margin_amount, margin_percentage, notes,
			pickup_date, pickup_time_slot, vehicle_type, vehicle_plate,
			driver_name, driver_phone, pickup_address, is_ready_for_pickup,
			created_at, updated_at, farmer_group
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9,
			$10, $11, $12,
			$13, $14, $15,
			NULLIF($16, '')::DATE, $17, $18, $19,
			$20, $21, $22, $23,
			$24, $25, $26
		)
		RETURNING id, created_at, updated_at;
	`

	err := r.pool.QueryRow(
		ctx,
		query,
		order.ID,
		order.OrderCode,
		order.ListingID,
		order.MiddlemanID,
		order.FarmerID,
		order.OfferedQuantity,
		order.OfferedPrice,
		order.TotalOfferedPrice,
		string(order.Status),
		order.OfferedPrice,
		order.OfferedQuantity,
		order.BenchmarkPrice,
		order.MarginAmount,
		order.MarginPercentage,
		order.Notes,
		order.PickupDate,
		order.PickupTimeSlot,
		order.VehicleType,
		order.VehiclePlate,
		order.DriverName,
		order.DriverPhone,
		order.PickupAddress,
		order.IsReadyForPickup,
		order.CreatedAt,
		order.UpdatedAt,
		farmerGroup,
	).Scan(&order.ID, &order.CreatedAt, &order.UpdatedAt)

	if err != nil {
		return fmt.Errorf("gagal membuat pesanan/penawaran di postgres: %w", err)
	}

	return nil
}

func (r *PostgresOrderRepository) GetByID(ctx context.Context, id string) (*domain.FarmerPurchaseOrder, error) {
	query := `
		SELECT 
			fp.id, fp.order_code, fp.listing_id, fp.farmer_id, fp.middleman_id,
			fp.status,
			COALESCE(fl.commodity_id, '') AS commodity_id,
			COALESCE(fl.commodity_name, '') AS commodity_name,
			COALESCE(fl.category, '') AS category,
			COALESCE(fl.title, '') AS listing_title,
			COALESCE(fl.description, '') AS description,
			COALESCE(fl.unit, 'kg') AS unit,
			COALESCE(fl.media_urls, '{}') AS media_urls,
			COALESCE(u_mid.name, 'Pembeli Bisnis') AS buyer_name,
			COALESCE(u_mid.phone, '') AS buyer_phone,
			CASE WHEN u_mid.is_bisnis THEN 'Pembeli Kontrak Skala Menengah' ELSE 'Mitra Tengkulak Terverifikasi' END AS buyer_type,
			COALESCE(u_mid.birth_place, 'Kudus, Jawa Tengah') AS buyer_city,
			4.9 AS buyer_rating,
			fp.offered_quantity, fp.offered_price, (fp.offered_quantity * fp.offered_price) AS total_offered_price,
			fp.agreed_price, fp.total_price, fp.benchmark_price,
			fp.margin_amount, fp.margin_percentage,
			COALESCE(fp.notes, '') AS notes,
			fp.counter_price, fp.counter_quantity, COALESCE(fp.counter_notes, '') AS counter_notes,
			COALESCE(TO_CHAR(fp.pickup_date, 'YYYY-MM-DD'), '') AS pickup_date,
			COALESCE(fp.pickup_time_slot, '') AS pickup_time_slot,
			COALESCE(fp.vehicle_type, '') AS vehicle_type,
			COALESCE(fp.vehicle_plate, '') AS vehicle_plate,
			COALESCE(fp.driver_name, '') AS driver_name,
			COALESCE(fp.driver_phone, '') AS driver_phone,
			COALESCE(fp.pickup_address, fl.pickup_address, '') AS pickup_address,
			fp.is_ready_for_pickup,
			fp.actual_weight, fp.final_price_per_unit, fp.final_total_amount,
			COALESCE(fp.weighing_certificate_url, '') AS weighing_certificate_url,
			COALESCE(fp.invoice_url, '') AS invoice_url,
			fp.agreement_date, fp.created_at, fp.updated_at,
			COALESCE(u_farm.name, 'Pak Sugeng Santoso') AS farmer_name,
			COALESCE(fp.farmer_group, fl.farmer_group, 'Gapoktan Sumber Makmur') AS farmer_business_name
		FROM farmer_purchases fp
		LEFT JOIN farmer_listings fl ON fl.id = fp.listing_id
		LEFT JOIN users u_mid ON u_mid.id = fp.middleman_id
		LEFT JOIN users u_farm ON u_farm.id = fp.farmer_id
		WHERE fp.id = $1;
	`

	var o domain.FarmerPurchaseOrder
	var statusStr string
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&o.ID, &o.OrderCode, &o.ListingID, &o.FarmerID, &o.MiddlemanID,
		&statusStr,
		&o.CommodityID, &o.CommodityName, &o.Category,
		&o.ListingTitle, &o.Description, &o.Unit, &o.MediaURLs,
		&o.BuyerName, &o.BuyerPhone, &o.BuyerType, &o.BuyerCity, &o.BuyerRating,
		&o.OfferedQuantity, &o.OfferedPrice, &o.TotalOfferedPrice,
		&o.AgreedPrice, &o.TotalPrice, &o.BenchmarkPrice,
		&o.MarginAmount, &o.MarginPercentage,
		&o.Notes,
		&o.CounterPrice, &o.CounterQuantity, &o.CounterNotes,
		&o.PickupDate, &o.PickupTimeSlot, &o.VehicleType, &o.VehiclePlate,
		&o.DriverName, &o.DriverPhone, &o.PickupAddress,
		&o.IsReadyForPickup,
		&o.ActualWeight, &o.FinalPricePerUnit, &o.FinalTotalAmount,
		&o.WeighingCertificateURL, &o.InvoiceURL,
		&o.AgreementDate, &o.CreatedAt, &o.UpdatedAt,
		&o.FarmerName, &o.FarmerBusinessName,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrOrderNotFound
		}
		return nil, fmt.Errorf("gagal mengambil detail pesanan dari postgres: %w", err)
	}

	o.Status = domain.OrderStatus(statusStr)
	o.StatusLabel = domain.GetStatusLabel(o.Status)
	o.MarginNote = domain.FormatMarginNote(o.OfferedPrice, o.BenchmarkPrice)

	return &o, nil
}

func (r *PostgresOrderRepository) GetByOrderCode(ctx context.Context, code string) (*domain.FarmerPurchaseOrder, error) {
	query := `
		SELECT id FROM farmer_purchases WHERE order_code = $1;
	`
	var id string
	err := r.pool.QueryRow(ctx, query, code).Scan(&id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrOrderNotFound
		}
		return nil, err
	}
	return r.GetByID(ctx, id)
}

func (r *PostgresOrderRepository) List(ctx context.Context, filter domain.OrderFilter) (*domain.PaginatedOrders, error) {
	page := filter.Page
	if page < 1 {
		page = 1
	}
	limit := filter.Limit
	if limit < 1 || limit > 100 {
		limit = 10
	}
	offset := (page - 1) * limit

	// Status condition based on Tab
	var statusCondition string
	switch filter.Tab {
	case "waiting_confirmation":
		statusCondition = "AND fp.status IN ('waiting_confirmation', 'in_negotiation', 'pending')"
	case "scheduled_pickup":
		statusCondition = "AND fp.status IN ('scheduled_pickup', 'accepted')"
	case "completed_paid":
		statusCondition = "AND fp.status = 'completed'"
	case "cancelled":
		statusCondition = "AND fp.status IN ('cancelled', 'rejected')"
	default:
		statusCondition = ""
	}

	query := fmt.Sprintf(`
		SELECT 
			fp.id, fp.order_code, fp.listing_id, fp.farmer_id, fp.middleman_id,
			fp.status,
			COALESCE(fl.commodity_id, '') AS commodity_id,
			COALESCE(fl.commodity_name, '') AS commodity_name,
			COALESCE(fl.category, '') AS category,
			COALESCE(fl.title, '') AS listing_title,
			COALESCE(fl.description, '') AS description,
			COALESCE(fl.unit, 'kg') AS unit,
			COALESCE(fl.media_urls, '{}') AS media_urls,
			COALESCE(u_mid.name, 'Pembeli Bisnis') AS buyer_name,
			COALESCE(u_mid.phone, '') AS buyer_phone,
			CASE WHEN u_mid.is_bisnis THEN 'Pembeli Kontrak Skala Menengah' ELSE 'Mitra Tengkulak Terverifikasi' END AS buyer_type,
			COALESCE(u_mid.birth_place, 'Kudus, Jawa Tengah') AS buyer_city,
			4.9 AS buyer_rating,
			fp.offered_quantity, fp.offered_price, (fp.offered_quantity * fp.offered_price) AS total_offered_price,
			fp.agreed_price, fp.total_price, fp.benchmark_price,
			fp.margin_amount, fp.margin_percentage,
			COALESCE(fp.notes, '') AS notes,
			fp.counter_price, fp.counter_quantity, COALESCE(fp.counter_notes, '') AS counter_notes,
			COALESCE(TO_CHAR(fp.pickup_date, 'YYYY-MM-DD'), '') AS pickup_date,
			COALESCE(fp.pickup_time_slot, '') AS pickup_time_slot,
			COALESCE(fp.vehicle_type, '') AS vehicle_type,
			COALESCE(fp.vehicle_plate, '') AS vehicle_plate,
			COALESCE(fp.driver_name, '') AS driver_name,
			COALESCE(fp.driver_phone, '') AS driver_phone,
			COALESCE(fp.pickup_address, fl.pickup_address, '') AS pickup_address,
			fp.is_ready_for_pickup,
			fp.actual_weight, fp.final_price_per_unit, fp.final_total_amount,
			COALESCE(fp.weighing_certificate_url, '') AS weighing_certificate_url,
			COALESCE(fp.invoice_url, '') AS invoice_url,
			fp.agreement_date, fp.created_at, fp.updated_at,
			COALESCE(u_farm.name, 'Pak Sugeng Santoso') AS farmer_name,
			COALESCE(fp.farmer_group, fl.farmer_group, 'Gapoktan Sumber Makmur') AS farmer_business_name,
			COUNT(*) OVER() AS total_count
		FROM farmer_purchases fp
		LEFT JOIN farmer_listings fl ON fl.id = fp.listing_id
		LEFT JOIN users u_mid ON u_mid.id = fp.middleman_id
		LEFT JOIN users u_farm ON u_farm.id = fp.farmer_id
		WHERE ($1 = '' OR fp.farmer_id = $1::UUID)
		  AND ($2 = '' OR fp.middleman_id = $2::UUID)
		  AND ($3 = '' OR fp.order_code ILIKE '%%' || $3 || '%%' OR fl.title ILIKE '%%' || $3 || '%%' OR u_mid.name ILIKE '%%' || $3 || '%%')
		  %s
		ORDER BY fp.created_at DESC
		LIMIT $4 OFFSET $5;
	`, statusCondition)

	rows, err := r.pool.Query(ctx, query, filter.FarmerID, filter.MiddlemanID, filter.Search, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("gagal query daftar pesanan: %w", err)
	}
	defer rows.Close()

	items := make([]domain.FarmerPurchaseOrder, 0)
	var totalItems int64 = 0

	for rows.Next() {
		var o domain.FarmerPurchaseOrder
		var statusStr string
		err := rows.Scan(
			&o.ID, &o.OrderCode, &o.ListingID, &o.FarmerID, &o.MiddlemanID,
			&statusStr,
			&o.CommodityID, &o.CommodityName, &o.Category,
			&o.ListingTitle, &o.Description, &o.Unit, &o.MediaURLs,
			&o.BuyerName, &o.BuyerPhone, &o.BuyerType, &o.BuyerCity, &o.BuyerRating,
			&o.OfferedQuantity, &o.OfferedPrice, &o.TotalOfferedPrice,
			&o.AgreedPrice, &o.TotalPrice, &o.BenchmarkPrice,
			&o.MarginAmount, &o.MarginPercentage,
			&o.Notes,
			&o.CounterPrice, &o.CounterQuantity, &o.CounterNotes,
			&o.PickupDate, &o.PickupTimeSlot, &o.VehicleType, &o.VehiclePlate,
			&o.DriverName, &o.DriverPhone, &o.PickupAddress,
			&o.IsReadyForPickup,
			&o.ActualWeight, &o.FinalPricePerUnit, &o.FinalTotalAmount,
			&o.WeighingCertificateURL, &o.InvoiceURL,
			&o.AgreementDate, &o.CreatedAt, &o.UpdatedAt,
			&o.FarmerName, &o.FarmerBusinessName,
			&totalItems,
		)
		if err != nil {
			return nil, fmt.Errorf("gagal scan baris pesanan: %w", err)
		}
		o.Status = domain.OrderStatus(statusStr)
		o.StatusLabel = domain.GetStatusLabel(o.Status)
		o.MarginNote = domain.FormatMarginNote(o.OfferedPrice, o.BenchmarkPrice)
		items = append(items, o)
	}

	// Hitung summary metrics untuk dashboard pesanan petani
	summaryQuery := `
		SELECT 
			COALESCE(SUM(CASE WHEN fp.status = 'completed' AND DATE_TRUNC('month', fp.created_at) = DATE_TRUNC('month', NOW()) THEN COALESCE(fp.final_total_amount, fp.total_price) ELSE 0 END), 0) AS total_sales_month,
			COUNT(*) AS all_count,
			COUNT(CASE WHEN fp.status IN ('waiting_confirmation', 'in_negotiation', 'pending') THEN 1 END) AS waiting_count,
			COUNT(CASE WHEN fp.status IN ('scheduled_pickup', 'accepted') THEN 1 END) AS scheduled_count,
			COUNT(CASE WHEN fp.status = 'completed' THEN 1 END) AS completed_count,
			COUNT(CASE WHEN fp.status IN ('cancelled', 'rejected') THEN 1 END) AS cancelled_count
		FROM farmer_purchases fp
		WHERE ($1 = '' OR fp.farmer_id = $1::UUID)
		  AND ($2 = '' OR fp.middleman_id = $2::UUID);
	`
	var summary domain.FarmerOrderSummary
	summary.PartnerRating = 4.9
	_ = r.pool.QueryRow(ctx, summaryQuery, filter.FarmerID, filter.MiddlemanID).Scan(
		&summary.TotalSalesThisMonth,
		&summary.AllCount,
		&summary.WaitingConfirmationCount,
		&summary.ScheduledPickupCount,
		&summary.CompletedPaidCount,
		&summary.CancelledCount,
	)

	totalPages := 0
	if totalItems > 0 {
		totalPages = int(math.Ceil(float64(totalItems) / float64(limit)))
	}

	return &domain.PaginatedOrders{
		Items:      items,
		Summary:    summary,
		TotalItems: totalItems,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	}, nil
}

func (r *PostgresOrderRepository) Update(ctx context.Context, order *domain.FarmerPurchaseOrder) error {
	query := `
		UPDATE farmer_purchases
		SET 
			status = $1,
			agreed_price = $2,
			total_price = $3,
			counter_price = $4,
			counter_quantity = $5,
			counter_notes = $6,
			pickup_date = NULLIF($7, '')::DATE,
			pickup_time_slot = $8,
			vehicle_type = $9,
			vehicle_plate = $10,
			driver_name = $11,
			driver_phone = $12,
			pickup_address = $13,
			is_ready_for_pickup = $14,
			actual_weight = $15,
			final_price_per_unit = $16,
			final_total_amount = $17,
			weighing_certificate_url = $18,
			invoice_url = $19,
			agreement_date = $20,
			updated_at = NOW()
		WHERE id = $21;
	`

	cmd, err := r.pool.Exec(
		ctx,
		query,
		string(order.Status),
		order.AgreedPrice,
		order.TotalPrice,
		order.CounterPrice,
		order.CounterQuantity,
		order.CounterNotes,
		order.PickupDate,
		order.PickupTimeSlot,
		order.VehicleType,
		order.VehiclePlate,
		order.DriverName,
		order.DriverPhone,
		order.PickupAddress,
		order.IsReadyForPickup,
		order.ActualWeight,
		order.FinalPricePerUnit,
		order.FinalTotalAmount,
		order.WeighingCertificateURL,
		order.InvoiceURL,
		order.AgreementDate,
		order.ID,
	)

	if err != nil {
		return fmt.Errorf("gagal update pesanan di postgres: %w", err)
	}

	if cmd.RowsAffected() == 0 {
		return domain.ErrOrderNotFound
	}

	return nil
}
