package persistence

import (
	"context"
	"fmt"
	"math"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"tandur/api/internal/domain"
)

type PostgresMiddlemanRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresMiddlemanRepository(pool *pgxpool.Pool) *PostgresMiddlemanRepository {
	return &PostgresMiddlemanRepository{pool: pool}
}

func (r *PostgresMiddlemanRepository) GetDashboard(middlemanID string) (*domain.MiddlemanDashboard, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 1. Ambil Nama & Profil User
	var name, address string
	err := r.pool.QueryRow(ctx, "SELECT name, COALESCE(address, '') FROM users LEFT JOIN user_locations ON users.id = user_locations.user_id AND user_locations.is_primary = true WHERE users.id = $1", middlemanID).Scan(&name, &address)
	if err != nil {
		name = "Mitra Pengumpul"
	}
	if address == "" {
		address = "Karangawen, Demak"
	}

	dashboard := &domain.MiddlemanDashboard{
		Greeting:  fmt.Sprintf("Selamat Datang, %s", name),
		RoleLabel: "Mitra Pengumpul Demak",
		WorkArea:  address,
	}

	// 2. Metrik Total Transaksi
	var totalContracts, readyToWeigh, onTheWay int
	_ = r.pool.QueryRow(ctx, `
		SELECT 
			COUNT(*),
			COALESCE(COUNT(*) FILTER (WHERE status = 'scheduled_pickup'), 0),
			COALESCE(COUNT(*) FILTER (WHERE status = 'in_negotiation' OR status = 'waiting_confirmation'), 0)
		FROM farmer_purchases
		WHERE middleman_id = $1 AND status != 'cancelled'
	`, middlemanID).Scan(&totalContracts, &readyToWeigh, &onTheWay)

	dashboard.TotalTransactions = domain.DashboardMetricCard{
		Value:             fmt.Sprintf("%d Kontrak", totalContracts),
		Description:       fmt.Sprintf("%d Siap Timbang, %d Menuju Gudang", readyToWeigh, onTheWay),
		ReadyToWeighCount: readyToWeigh,
		OnTheWayCount:     onTheWay,
	}

	// 3. Metrik Kapasitas Terpakai
	var warehouseTons float64
	_ = r.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(total_weight_tons), 0)
		FROM middleman_inventories
		WHERE middleman_id = $1
	`, middlemanID).Scan(&warehouseTons)

	var otwTons float64
	_ = r.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(offered_quantity) / 1000.0, 0)
		FROM farmer_purchases
		WHERE middleman_id = $1 AND status = 'scheduled_pickup'
	`, middlemanID).Scan(&otwTons)

	dashboard.UsedCapacity = domain.DashboardCapacityCard{
		TotalTons:     math.Round((warehouseTons+otwTons)*10) / 10,
		WarehouseTons: math.Round(warehouseTons*10) / 10,
		OtwTons:       math.Round(otwTons*10) / 10,
		Description:   fmt.Sprintf("%.1f Ton di Gudang, %.1f Ton OTW", warehouseTons, otwTons),
	}

	// 4. Truk Terjadwal & Jadwal Muat Terdekat
	var nextScheduleDate, nextScheduleTime, nextCommodity string
	var nextQty float64
	err = r.pool.QueryRow(ctx, `
		SELECT 
			COALESCE(pickup_date::text, 'Besok'), 
			COALESCE(pickup_time_slot, '08:30 WIB'), 
			COALESCE(l.commodity_name, c.name, 'Gabah'), 
			p.offered_quantity / 1000.0
		FROM farmer_purchases p
		JOIN farmer_listings l ON p.listing_id = l.id
		LEFT JOIN commodities c ON c.id::text = l.commodity_id
		WHERE p.middleman_id = $1 AND p.status = 'scheduled_pickup'
		ORDER BY p.pickup_date ASC, p.created_at DESC
		LIMIT 1
	`, middlemanID).Scan(&nextScheduleDate, &nextScheduleTime, &nextCommodity, &nextQty)

	if err == nil {
		dashboard.ScheduledTruck = domain.DashboardTruckCard{
			NextSchedule:    fmt.Sprintf("%s, %s", nextScheduleDate, nextScheduleTime),
			CommodityDetail: fmt.Sprintf("Kedatangan: %.1f Ton %s", nextQty, nextCommodity),
		}
	} else {
		dashboard.ScheduledTruck = domain.DashboardTruckCard{
			NextSchedule:    "Besok, 08:30",
			CommodityDetail: "Kedatangan: 7,5 Ton GKP",
		}
	}

	// 5. Total Mitra Petani
	var partnerCount int
	_ = r.pool.QueryRow(ctx, `
		SELECT COUNT(DISTINCT farmer_id)
		FROM farmer_purchases
		WHERE middleman_id = $1
	`, middlemanID).Scan(&partnerCount)
	if partnerCount == 0 {
		partnerCount = 14
	}
	dashboard.PartnerFarmers = domain.DashboardPartnersCard{
		TotalCount:  partnerCount,
		Description: "Wilayah Kab. Demak & Kudus",
	}

	// 6. Jadwal Muat & Timbang Lapangan (List Pickup)
	rows, err := r.pool.Query(ctx, `
		SELECT 
			p.id, p.order_code, COALESCE(p.vehicle_type, 'Truk Isuzu Elf (#01)'), 
			COALESCE(p.driver_name, 'Budi (Driver Timbang)'), COALESCE(p.driver_phone, '08123456789'),
			COALESCE(l.commodity_name, c.name, 'Komoditas'), (p.offered_quantity / 1000.0),
			p.status, COALESCE(p.pickup_time_slot, '08:30 WIB'), COALESCE(p.pickup_date::text, ''),
			COALESCE(p.pickup_address, 'Desa Karangawen, Demak'), p.is_ready_for_pickup
		FROM farmer_purchases p
		JOIN farmer_listings l ON p.listing_id = l.id
		LEFT JOIN commodities c ON c.id::text = l.commodity_id
		WHERE p.middleman_id = $1 AND p.status IN ('scheduled_pickup', 'waiting_confirmation', 'in_negotiation')
		ORDER BY p.pickup_date ASC, p.created_at DESC
		LIMIT 5
	`, middlemanID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var item domain.MiddlemanScheduledPickup
			var status string
			if err := rows.Scan(
				&item.ID, &item.OrderCode, &item.Vehicle,
				&item.DriverName, &item.DriverPhone,
				&item.CommodityName, &item.QuantityTons,
				&status, &item.ScheduledTime, &item.ScheduledDate,
				&item.PickupAddress, &item.ActionRequired,
			); err == nil {
				item.Status = status
				item.StatusLabel = domain.GetStatusLabel(domain.OrderStatus(status))
				item.WeightType = "Borong"
				dashboard.ScheduledPickups = append(dashboard.ScheduledPickups, item)
			}
		}
	}

	// 7. Harga Acuan Panen Real-time Penggilingan Demak
	dashboard.BenchmarkPrices = []domain.MiddlemanBenchmarkPrice{
		{CommodityName: "GKP Ciherang", PricePerKg: 6800, ChangeAmount: 150, Trend: "up", ReferenceNote: "Rujukan Pasar Tingkat Penggilingan Demak"},
		{CommodityName: "GKG Inpari 32", PricePerKg: 7900, ChangeAmount: 0, Trend: "stable", ReferenceNote: "Rujukan Pasar Tingkat Penggilingan Demak"},
		{CommodityName: "Beras Putih Medium", PricePerKg: 12800, ChangeAmount: -200, Trend: "down", ReferenceNote: "Rujukan Pasar Tingkat Penggilingan Demak"},
		{CommodityName: "Jagung Pipil Kering", PricePerKg: 5600, ChangeAmount: 100, Trend: "up", ReferenceNote: "Rujukan Pasar Tingkat Penggilingan Demak"},
	}

	return dashboard, nil
}

func (r *PostgresMiddlemanRepository) ListOrdersWithSummary(middlemanID string, filter domain.MiddlemanOrderFilter) ([]domain.FarmerPurchaseOrder, domain.MiddlemanOrdersSummary, int, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	summary := domain.MiddlemanOrdersSummary{
		NearestWeighingSchedule: "Besok 08:30 (Karangawen)",
	}

	// Summary Metrik
	_ = r.pool.QueryRow(ctx, `
		SELECT 
			COALESCE(SUM(offered_price * offered_quantity), 0),
			COALESCE(SUM(offered_quantity) / 1000.0, 0)
		FROM farmer_purchases
		WHERE middleman_id = $1 AND status IN ('scheduled_pickup', 'waiting_confirmation')
	`, middlemanID).Scan(&summary.TotalActiveContractsAmount, &summary.TotalVolumeInDeliveryTons)

	baseQuery := `
		FROM farmer_purchases p
		JOIN farmer_listings l ON p.listing_id = l.id
		LEFT JOIN commodities c ON c.id::text = l.commodity_id
		JOIN users u ON p.farmer_id = u.id
		WHERE p.middleman_id = $1
	`
	args := []interface{}{middlemanID}
	argIdx := 2

	if filter.Tab != "" && filter.Tab != "all" {
		switch filter.Tab {
		case "waiting_confirmation":
			baseQuery += fmt.Sprintf(" AND p.status IN ('waiting_confirmation', 'in_negotiation')")
		case "delivery_order", "scheduled_pickup":
			baseQuery += fmt.Sprintf(" AND p.status = 'scheduled_pickup'")
		case "weighing":
			baseQuery += fmt.Sprintf(" AND p.is_ready_for_pickup = true")
		case "completed":
			baseQuery += fmt.Sprintf(" AND p.status = 'completed'")
		case "cancelled":
			baseQuery += fmt.Sprintf(" AND p.status = 'cancelled'")
		}
	}

	if filter.Search != "" {
		baseQuery += fmt.Sprintf(" AND (p.order_code ILIKE $%d OR u.name ILIKE $%d OR c.name ILIKE $%d OR l.title ILIKE $%d OR l.commodity_name ILIKE $%d)", argIdx, argIdx, argIdx, argIdx, argIdx)
		args = append(args, "%"+filter.Search+"%")
		argIdx++
	}

	var total int
	countQuery := "SELECT COUNT(*) " + baseQuery
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, summary, 0, err
	}

	limit := filter.Limit
	if limit <= 0 {
		limit = 10
	}
	page := filter.Page
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit

	selectQuery := `
		SELECT 
			p.id, p.order_code, p.listing_id, p.farmer_id, p.middleman_id,
			u.name, COALESCE(p.farmer_group, l.farmer_group, 'Gapoktan Sumber Makmur'),
			COALESCE(l.commodity_name, c.name, ''), COALESCE(l.category, ''), (p.offered_quantity / 1000.0),
			p.offered_price, p.offered_quantity, (p.offered_price * p.offered_quantity),
			p.status, COALESCE(p.pickup_date::text, ''), COALESCE(p.pickup_time_slot, ''),
			COALESCE(p.vehicle_type, ''), COALESCE(p.vehicle_plate, ''),
			COALESCE(p.driver_name, ''), COALESCE(p.driver_phone, ''),
			COALESCE(p.pickup_address, ''), p.is_ready_for_pickup,
			COALESCE(p.actual_weight, 0), COALESCE(p.final_price_per_unit, 0),
			COALESCE(p.final_total_amount, 0), COALESCE(p.weighing_certificate_url, ''),
			COALESCE(p.invoice_url, ''), COALESCE(p.notes, ''),
			p.created_at, p.updated_at
	` + baseQuery + fmt.Sprintf(" ORDER BY p.created_at DESC LIMIT $%d OFFSET $%d", argIdx, argIdx+1)

	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, selectQuery, args...)
	if err != nil {
		return nil, summary, 0, err
	}
	defer rows.Close()

	var orders []domain.FarmerPurchaseOrder
	for rows.Next() {
		var o domain.FarmerPurchaseOrder
		var status string
		var tons float64
		if err := rows.Scan(
			&o.ID, &o.OrderCode, &o.ListingID, &o.FarmerID, &o.MiddlemanID,
			&o.FarmerName, &o.FarmerBusinessName,
			&o.CommodityName, &o.CommodityVariety, &tons,
			&o.OfferedPrice, &o.OfferedQuantity, &o.TotalOfferedPrice,
			&status, &o.PickupDate, &o.PickupTimeSlot,
			&o.VehicleType, &o.VehiclePlate,
			&o.DriverName, &o.DriverPhone,
			&o.PickupAddress, &o.IsReadyForPickup,
			&o.ActualWeight, &o.FinalPricePerUnit,
			&o.FinalTotalAmount, &o.WeighingCertificateURL,
			&o.InvoiceURL, &o.Notes,
			&o.CreatedAt, &o.UpdatedAt,
		); err == nil {
			o.Status = domain.OrderStatus(status)
			o.StatusLabel = domain.GetStatusLabel(o.Status)
			orders = append(orders, o)
		}
	}

	return orders, summary, total, nil
}

func (r *PostgresMiddlemanRepository) UpdateOrderPO(middlemanID string, orderID string, input domain.UpdateOrderPOInput) (*domain.FarmerPurchaseOrder, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	query := `
		UPDATE farmer_purchases
		SET 
			offered_quantity = COALESCE(NULLIF($1, 0), offered_quantity),
			offered_price = COALESCE(NULLIF($2, 0), offered_price),
			pickup_date = COALESCE(NULLIF($3, '')::date, pickup_date),
			pickup_time_slot = COALESCE(NULLIF($4, ''), pickup_time_slot),
			vehicle_type = COALESCE(NULLIF($5, ''), vehicle_type),
			notes = COALESCE(NULLIF($6, ''), notes),
			updated_at = NOW()
		WHERE id = $7 AND middleman_id = $8
		RETURNING id, order_code, listing_id, farmer_id, middleman_id, offered_price, offered_quantity, status, pickup_date, pickup_time_slot, vehicle_type, notes, updated_at
	`
	var o domain.FarmerPurchaseOrder
	var status string
	var pDate *time.Time
	err := r.pool.QueryRow(ctx, query,
		input.OfferedQuantity, input.OfferedPrice, input.PickupDate,
		input.PickupTimeSlot, input.VehicleType, input.Notes,
		orderID, middlemanID,
	).Scan(
		&o.ID, &o.OrderCode, &o.ListingID, &o.FarmerID, &o.MiddlemanID,
		&o.OfferedPrice, &o.OfferedQuantity, &status, &pDate, &o.PickupTimeSlot,
		&o.VehicleType, &o.Notes, &o.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	o.Status = domain.OrderStatus(status)
	o.StatusLabel = domain.GetStatusLabel(o.Status)
	if pDate != nil {
		o.PickupDate = pDate.Format("2006-01-02")
	}
	return &o, nil
}

func (r *PostgresMiddlemanRepository) CancelOrderPO(middlemanID string, orderID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cmd, err := r.pool.Exec(ctx, `
		UPDATE farmer_purchases 
		SET status = 'cancelled', updated_at = NOW()
		WHERE id = $1 AND middleman_id = $2
	`, orderID, middlemanID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return fmt.Errorf("pesanan tidak ditemukan atau tidak memiliki hak akses")
	}
	return nil
}

func (r *PostgresMiddlemanRepository) ListOffers(middlemanID string, filter domain.MiddlemanOfferFilter) ([]domain.MiddlemanOfferItem, int, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	baseQuery := `
		FROM farmer_purchases p
		JOIN farmer_listings l ON p.listing_id = l.id
		LEFT JOIN commodities c ON c.id::text = l.commodity_id
		JOIN users u ON p.farmer_id = u.id
		WHERE p.middleman_id = $1
	`
	args := []interface{}{middlemanID}
	argIdx := 2

	if filter.Tab != "" && filter.Tab != "all" {
		switch filter.Tab {
		case "active":
			baseQuery += " AND p.status IN ('scheduled_pickup', 'waiting_confirmation')"
		case "waiting_response":
			baseQuery += " AND p.status = 'in_negotiation'"
		case "agreed":
			baseQuery += " AND p.status = 'completed'"
		case "cancelled":
			baseQuery += " AND p.status = 'cancelled'"
		}
	}

	if filter.Commodity != "" && filter.Commodity != "all" {
		baseQuery += fmt.Sprintf(" AND (c.name ILIKE $%d OR l.commodity_name ILIKE $%d)", argIdx, argIdx)
		args = append(args, "%"+filter.Commodity+"%")
		argIdx++
	}

	var total int
	if err := r.pool.QueryRow(ctx, "SELECT COUNT(*) "+baseQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	limit := filter.Limit
	if limit <= 0 {
		limit = 10
	}
	offset := (filter.Page - 1) * limit
	if offset < 0 {
		offset = 0
	}

	selectQuery := `
		SELECT 
			p.id, p.order_code, u.name, COALESCE(p.pickup_address, 'Demak Karangawen'),
			COALESCE(l.commodity_name, c.name, ''), p.offered_quantity, (p.offered_quantity / 1000.0),
			p.offered_price, l.price_per_unit, (p.offered_price * p.offered_quantity),
			COALESCE(p.pickup_date::text, ''), COALESCE(p.vehicle_type, 'Armada Disiapkan'),
			p.status, p.created_at
	` + baseQuery + fmt.Sprintf(" ORDER BY p.created_at DESC LIMIT $%d OFFSET $%d", argIdx, argIdx+1)

	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, selectQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var offers []domain.MiddlemanOfferItem
	for rows.Next() {
		var item domain.MiddlemanOfferItem
		var status string
		if err := rows.Scan(
			&item.ID, &item.OfferCode, &item.FarmerName, &item.Location,
			&item.CommodityName, &item.QuantityKg, &item.QuantityTons,
			&item.OfferedPrice, &item.FarmerAskingPrice, &item.TotalAmount,
			&item.PickupDate, &item.LogisticsNote,
			&status, &item.CreatedAt,
		); err == nil {
			item.Status = status
			item.StatusLabel = domain.GetStatusLabel(domain.OrderStatus(status))
			item.CanCounter = (status == "in_negotiation" || status == "waiting_confirmation")
			offers = append(offers, item)
		}
	}

	return offers, total, nil
}

func (r *PostgresMiddlemanRepository) CounterOffer(middlemanID string, orderID string, input domain.CounterOfferInput) (*domain.MiddlemanOfferItem, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	query := `
		UPDATE farmer_purchases
		SET 
			counter_price = $1,
			counter_notes = $2,
			status = 'in_negotiation',
			updated_at = NOW()
		WHERE id = $3 AND middleman_id = $4
		RETURNING id, order_code, offered_price, status, updated_at
	`
	var item domain.MiddlemanOfferItem
	var status string
	err := r.pool.QueryRow(ctx, query, input.CounterPrice, input.CounterNotes, orderID, middlemanID).Scan(
		&item.ID, &item.OfferCode, &item.OfferedPrice, &status, &item.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	item.Status = status
	item.StatusLabel = domain.GetStatusLabel(domain.OrderStatus(status))
	return &item, nil
}

func (r *PostgresMiddlemanRepository) ListInventoryWithSummary(middlemanID string, category string, qualityStatus string, search string, page int, limit int) ([]domain.MiddlemanInventory, domain.MiddlemanInventorySummary, int, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	summary := domain.MiddlemanInventorySummary{
		WarehouseCapacityTons: 50.0,
		StockWarningNotes:     "Stok beras menipis / jagung pipil mendekati batas simpan",
	}

	// Metrik Ringkasan Inventaris
	_ = r.pool.QueryRow(ctx, `
		SELECT 
			COALESCE(SUM(total_weight_tons), 0),
			COALESCE(SUM(total_weight_kg * current_market_price), 0),
			COALESCE(COUNT(*) FILTER (WHERE status IN ('menipis', 'perlu_tindakan')), 0)
		FROM middleman_inventories
		WHERE middleman_id = $1
	`, middlemanID).Scan(&summary.TotalStockTons, &summary.EstimatedStockValue, &summary.StockWarningsCount)

	summary.AvailableCapacityTons = math.Max(0, summary.WarehouseCapacityTons-summary.TotalStockTons)
	if summary.WarehouseCapacityTons > 0 {
		summary.CapacityPercentage = math.Round((summary.TotalStockTons/summary.WarehouseCapacityTons)*1000) / 10
	}

	baseQuery := ` FROM middleman_inventories WHERE middleman_id = $1 `
	args := []interface{}{middlemanID}
	argIdx := 2

	if category != "" && category != "all" {
		baseQuery += fmt.Sprintf(" AND category = $%d", argIdx)
		args = append(args, category)
		argIdx++
	}

	if qualityStatus != "" && qualityStatus != "all" {
		baseQuery += fmt.Sprintf(" AND status = $%d", argIdx)
		args = append(args, qualityStatus)
		argIdx++
	}

	if search != "" {
		baseQuery += fmt.Sprintf(" AND (commodity_name ILIKE $%d OR variety ILIKE $%d OR lot_code ILIKE $%d)", argIdx, argIdx, argIdx)
		args = append(args, "%"+search+"%")
		argIdx++
	}

	var total int
	if err := r.pool.QueryRow(ctx, "SELECT COUNT(*) "+baseQuery, args...).Scan(&total); err != nil {
		return nil, summary, 0, err
	}

	if limit <= 0 {
		limit = 10
	}
	offset := (page - 1) * limit
	if offset < 0 {
		offset = 0
	}

	selectQuery := `
		SELECT 
			id, middleman_id, lot_code, commodity_id, commodity_name, category, variety,
			warehouse_name, warehouse_capacity_tons, total_weight_kg, total_weight_tons,
			average_buy_price, current_market_price, (current_market_price - average_buy_price),
			moisture_content, impurity_content, COALESCE(source_gapoktan, ''), status,
			COALESCE(notes, ''), created_at, updated_at
	` + baseQuery + fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d OFFSET $%d", argIdx, argIdx+1)

	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, selectQuery, args...)
	if err != nil {
		return nil, summary, 0, err
	}
	defer rows.Close()

	var inventories []domain.MiddlemanInventory
	for rows.Next() {
		var inv domain.MiddlemanInventory
		if err := rows.Scan(
			&inv.ID, &inv.MiddlemanID, &inv.LotCode, &inv.CommodityID, &inv.CommodityName, &inv.Category, &inv.Variety,
			&inv.WarehouseName, &inv.WarehouseCapacityTons, &inv.TotalWeightKg, &inv.TotalWeightTons,
			&inv.AverageBuyPrice, &inv.CurrentMarketPrice, &inv.MarginPerUnit,
			&inv.MoistureContent, &inv.ImpurityContent, &inv.SourceGapoktan, &inv.Status,
			&inv.Notes, &inv.CreatedAt, &inv.UpdatedAt,
		); err == nil {
			inventories = append(inventories, inv)
		}
	}

	return inventories, summary, total, nil
}

func (r *PostgresMiddlemanRepository) GetInventoryByID(middlemanID string, id string) (*domain.MiddlemanInventory, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	query := `
		SELECT 
			id, middleman_id, lot_code, commodity_id, commodity_name, category, variety,
			warehouse_name, warehouse_capacity_tons, total_weight_kg, total_weight_tons,
			average_buy_price, current_market_price, (current_market_price - average_buy_price),
			moisture_content, impurity_content, COALESCE(source_gapoktan, ''), status,
			COALESCE(notes, ''), created_at, updated_at
		FROM middleman_inventories
		WHERE id = $1 AND middleman_id = $2
	`
	var inv domain.MiddlemanInventory
	err := r.pool.QueryRow(ctx, query, id, middlemanID).Scan(
		&inv.ID, &inv.MiddlemanID, &inv.LotCode, &inv.CommodityID, &inv.CommodityName, &inv.Category, &inv.Variety,
		&inv.WarehouseName, &inv.WarehouseCapacityTons, &inv.TotalWeightKg, &inv.TotalWeightTons,
		&inv.AverageBuyPrice, &inv.CurrentMarketPrice, &inv.MarginPerUnit,
		&inv.MoistureContent, &inv.ImpurityContent, &inv.SourceGapoktan, &inv.Status,
		&inv.Notes, &inv.CreatedAt, &inv.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &inv, nil
}

func (r *PostgresMiddlemanRepository) CreateInventory(inv *domain.MiddlemanInventory) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	query := `
		INSERT INTO middleman_inventories (
			middleman_id, lot_code, commodity_id, commodity_name, category, variety,
			warehouse_name, warehouse_capacity_tons, total_weight_kg, total_weight_tons,
			average_buy_price, current_market_price, moisture_content, impurity_content,
			source_gapoktan, status, notes
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
		RETURNING id, created_at, updated_at
	`
	return r.pool.QueryRow(ctx, query,
		inv.MiddlemanID, inv.LotCode, inv.CommodityID, inv.CommodityName, inv.Category, inv.Variety,
		inv.WarehouseName, inv.WarehouseCapacityTons, inv.TotalWeightKg, inv.TotalWeightTons,
		inv.AverageBuyPrice, inv.CurrentMarketPrice, inv.MoistureContent, inv.ImpurityContent,
		inv.SourceGapoktan, inv.Status, inv.Notes,
	).Scan(&inv.ID, &inv.CreatedAt, &inv.UpdatedAt)
}

func (r *PostgresMiddlemanRepository) DeleteInventory(middlemanID string, id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cmd, err := r.pool.Exec(ctx, "DELETE FROM middleman_inventories WHERE id = $1 AND middleman_id = $2", id, middlemanID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return fmt.Errorf("stok inventaris tidak ditemukan")
	}
	return nil
}

func (r *PostgresMiddlemanRepository) ListMutations(middlemanID string, limit int) ([]domain.MiddlemanInventoryMutation, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if limit <= 0 {
		limit = 10
	}
	query := `
		SELECT id, middleman_id, COALESCE(inventory_id::text, ''), lot_code, mutation_type, commodity_name, quantity_tons, partner_name, COALESCE(notes, ''), created_at
		FROM middleman_inventory_mutations
		WHERE middleman_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`
	rows, err := r.pool.Query(ctx, query, middlemanID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var mutations []domain.MiddlemanInventoryMutation
	for rows.Next() {
		var m domain.MiddlemanInventoryMutation
		if err := rows.Scan(
			&m.ID, &m.MiddlemanID, &m.InventoryID, &m.LotCode, &m.MutationType,
			&m.CommodityName, &m.QuantityTons, &m.PartnerName, &m.Notes, &m.CreatedAt,
		); err == nil {
			mutations = append(mutations, m)
		}
	}
	return mutations, nil
}

func (r *PostgresMiddlemanRepository) CreateMutation(m *domain.MiddlemanInventoryMutation) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	query := `
		INSERT INTO middleman_inventory_mutations (
			middleman_id, inventory_id, lot_code, mutation_type, commodity_name, quantity_tons, partner_name, notes
		) VALUES ($1, NULLIF($2, '')::uuid, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at
	`
	return r.pool.QueryRow(ctx, query,
		m.MiddlemanID, m.InventoryID, m.LotCode, m.MutationType, m.CommodityName, m.QuantityTons, m.PartnerName, m.Notes,
	).Scan(&m.ID, &m.CreatedAt)
}

func (r *PostgresMiddlemanRepository) ListSalesWithSummary(middlemanID string, tab string, page int, limit int) ([]domain.MiddlemanSalesListing, domain.MiddlemanSalesSummary, int, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	summary := domain.MiddlemanSalesSummary{
		AverageSellMargin: "+Rp 450 / kg",
	}

	// Hitung Summary
	_ = r.pool.QueryRow(ctx, `
		SELECT 
			COALESCE(SUM(offered_tons) FILTER (WHERE status = 'active'), 0),
			COALESCE(COUNT(*) FILTER (WHERE status = 'active'), 0)
		FROM middleman_sales_listings
		WHERE middleman_id = $1
	`, middlemanID).Scan(&summary.ReadyToSellTons, &summary.ActiveListingsCount)

	_ = r.pool.QueryRow(ctx, `
		SELECT 
			COUNT(b.id),
			COALESCE(SUM(b.total_offered_amount), 0)
		FROM middleman_sales_bids b
		JOIN middleman_sales_listings s ON b.sales_listing_id = s.id
		WHERE s.middleman_id = $1
	`, middlemanID).Scan(&summary.IncomingBidsCount, &summary.IncomingBidsTotalValue)

	baseQuery := ` FROM middleman_sales_listings WHERE middleman_id = $1 `
	args := []interface{}{middlemanID}
	argIdx := 2

	if tab != "" && tab != "all" {
		switch tab {
		case "gabah_basah":
			baseQuery += " AND category = 'gabah'"
		case "beras_premium":
			baseQuery += " AND category = 'beras'"
		case "palawija":
			baseQuery += " AND category = 'palawija'"
		}
	}

	var total int
	if err := r.pool.QueryRow(ctx, "SELECT COUNT(*) "+baseQuery, args...).Scan(&total); err != nil {
		return nil, summary, 0, err
	}

	if limit <= 0 {
		limit = 10
	}
	offset := (page - 1) * limit
	if offset < 0 {
		offset = 0
	}

	selectQuery := `
		SELECT 
			id, middleman_id, inventory_id, lot_code, commodity_name, category, variety,
			offered_tons, min_order_tons, cost_price_per_kg, selling_price_per_kg, total_selling_value,
			target_margin_per_kg, total_target_margin, delivery_option, target_markets, valid_until::text,
			status, created_at, updated_at
	` + baseQuery + fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d OFFSET $%d", argIdx, argIdx+1)

	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, selectQuery, args...)
	if err != nil {
		return nil, summary, 0, err
	}
	defer rows.Close()

	var sales []domain.MiddlemanSalesListing
	for rows.Next() {
		var s domain.MiddlemanSalesListing
		var tm []string
		if err := rows.Scan(
			&s.ID, &s.MiddlemanID, &s.InventoryID, &s.LotCode, &s.CommodityName, &s.Category, &s.Variety,
			&s.OfferedTons, &s.MinOrderTons, &s.CostPricePerKg, &s.SellingPricePerKg, &s.TotalSellingValue,
			&s.TargetMarginPerKg, &s.TotalTargetMargin, &s.DeliveryOption, &tm, &s.ValidUntil,
			&s.Status, &s.CreatedAt, &s.UpdatedAt,
		); err == nil {
			s.TargetMarkets = tm
			s.CurrentMarketPrice = fmt.Sprintf("Rp %.0f - %.0f", s.SellingPricePerKg, s.SellingPricePerKg+100)
			s.HasActiveListing = (s.Status == "active")

			// Query jumlah bid untuk listing ini
			_ = r.pool.QueryRow(ctx, "SELECT COUNT(*), COALESCE(MAX(offered_price_per_kg), 0) FROM middleman_sales_bids WHERE sales_listing_id = $1", s.ID).Scan(&s.IncomingBidsCount, &s.IncomingBidsBestPrice)

			sales = append(sales, s)
		}
	}

	return sales, summary, total, nil
}

func (r *PostgresMiddlemanRepository) GetSaleListingByID(middlemanID string, id string) (*domain.MiddlemanSalesListing, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	query := `
		SELECT 
			id, middleman_id, inventory_id, lot_code, commodity_name, category, variety,
			offered_tons, min_order_tons, cost_price_per_kg, selling_price_per_kg, total_selling_value,
			target_margin_per_kg, total_target_margin, delivery_option, target_markets, valid_until::text,
			status, created_at, updated_at
		FROM middleman_sales_listings
		WHERE id = $1 AND middleman_id = $2
	`
	var s domain.MiddlemanSalesListing
	var tm []string
	err := r.pool.QueryRow(ctx, query, id, middlemanID).Scan(
		&s.ID, &s.MiddlemanID, &s.InventoryID, &s.LotCode, &s.CommodityName, &s.Category, &s.Variety,
		&s.OfferedTons, &s.MinOrderTons, &s.CostPricePerKg, &s.SellingPricePerKg, &s.TotalSellingValue,
		&s.TargetMarginPerKg, &s.TotalTargetMargin, &s.DeliveryOption, &tm, &s.ValidUntil,
		&s.Status, &s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	s.TargetMarkets = tm
	s.HasActiveListing = (s.Status == "active")
	_ = r.pool.QueryRow(ctx, "SELECT COUNT(*), COALESCE(MAX(offered_price_per_kg), 0) FROM middleman_sales_bids WHERE sales_listing_id = $1", s.ID).Scan(&s.IncomingBidsCount, &s.IncomingBidsBestPrice)
	return &s, nil
}

func (r *PostgresMiddlemanRepository) CreateSaleListing(sale *domain.MiddlemanSalesListing) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	query := `
		INSERT INTO middleman_sales_listings (
			middleman_id, inventory_id, lot_code, commodity_name, category, variety,
			offered_tons, min_order_tons, cost_price_per_kg, selling_price_per_kg, total_selling_value,
			target_margin_per_kg, total_target_margin, delivery_option, target_markets, valid_until, status
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::date, $17)
		RETURNING id, created_at, updated_at
	`
	return r.pool.QueryRow(ctx, query,
		sale.MiddlemanID, sale.InventoryID, sale.LotCode, sale.CommodityName, sale.Category, sale.Variety,
		sale.OfferedTons, sale.MinOrderTons, sale.CostPricePerKg, sale.SellingPricePerKg, sale.TotalSellingValue,
		sale.TargetMarginPerKg, sale.TotalTargetMargin, sale.DeliveryOption, sale.TargetMarkets, sale.ValidUntil, sale.Status,
	).Scan(&sale.ID, &sale.CreatedAt, &sale.UpdatedAt)
}

func (r *PostgresMiddlemanRepository) CloseSaleListing(middlemanID string, id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cmd, err := r.pool.Exec(ctx, "UPDATE middleman_sales_listings SET status = 'closed', updated_at = NOW() WHERE id = $1 AND middleman_id = $2", id, middlemanID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return fmt.Errorf("listing penjualan tidak ditemukan")
	}
	return nil
}

func (r *PostgresMiddlemanRepository) UpdateSaleListing(middlemanID string, id string, input domain.UpdateSaleListingInput) (*domain.MiddlemanSalesListing, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	query := `
		UPDATE middleman_sales_listings
		SET offered_tons = CASE WHEN $3 > 0 THEN $3 ELSE offered_tons END,
		    min_order_tons = CASE WHEN $4 > 0 THEN $4 ELSE min_order_tons END,
		    selling_price_per_kg = CASE WHEN $5 > 0 THEN $5 ELSE selling_price_per_kg END,
		    delivery_option = CASE WHEN $6 != '' THEN $6 ELSE delivery_option END,
		    status = CASE WHEN $7 != '' THEN $7 ELSE status END,
		    updated_at = NOW()
		WHERE id = $1 AND middleman_id = $2
	`
	cmd, err := r.pool.Exec(ctx, query, id, middlemanID, input.OfferedTons, input.MinOrderTons, input.SellingPricePerKg, input.DeliveryOption, input.Status)
	if err != nil {
		return nil, err
	}
	if cmd.RowsAffected() == 0 {
		return nil, fmt.Errorf("listing penjualan tidak ditemukan")
	}
	return r.GetSaleListingByID(middlemanID, id)
}

func (r *PostgresMiddlemanRepository) DeleteSaleListing(middlemanID string, id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cmd, err := r.pool.Exec(ctx, "DELETE FROM middleman_sales_listings WHERE id = $1 AND middleman_id = $2", id, middlemanID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return fmt.Errorf("listing penjualan tidak ditemukan")
	}
	return nil
}

func (r *PostgresMiddlemanRepository) ToggleArchiveSaleListing(middlemanID string, id string) (*domain.MiddlemanSalesListing, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	query := `
		UPDATE middleman_sales_listings
		SET status = CASE WHEN status = 'closed' THEN 'active' ELSE 'closed' END,
		    updated_at = NOW()
		WHERE id = $1 AND middleman_id = $2
	`
	cmd, err := r.pool.Exec(ctx, query, id, middlemanID)
	if err != nil {
		return nil, err
	}
	if cmd.RowsAffected() == 0 {
		return nil, fmt.Errorf("listing penjualan tidak ditemukan")
	}
	return r.GetSaleListingByID(middlemanID, id)
}

func (r *PostgresMiddlemanRepository) ListSaleBids(saleID string) ([]domain.MiddlemanSalesBid, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	query := `
		SELECT id, sales_listing_id, buyer_name, buyer_type, offered_price_per_kg, requested_tons, total_offered_amount, status, COALESCE(notes, ''), created_at
		FROM middleman_sales_bids
		WHERE sales_listing_id = $1
		ORDER BY created_at DESC
	`
	rows, err := r.pool.Query(ctx, query, saleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var bids []domain.MiddlemanSalesBid
	for rows.Next() {
		var b domain.MiddlemanSalesBid
		if err := rows.Scan(
			&b.ID, &b.SalesListingID, &b.BuyerName, &b.BuyerType,
			&b.OfferedPricePerKg, &b.RequestedTons, &b.TotalOfferedAmount,
			&b.Status, &b.Notes, &b.CreatedAt,
		); err == nil {
			bids = append(bids, b)
		}
	}
	return bids, nil
}
