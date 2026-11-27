package domain

import "time"

// MiddlemanDashboard menampung metrik dan jadwal muat/timbang untuk beranda tengkulak
type MiddlemanDashboard struct {
	Greeting          string                    `json:"greeting"`
	RoleLabel         string                    `json:"role_label"`
	WorkArea          string                    `json:"work_area"`
	TotalTransactions DashboardMetricCard       `json:"total_transactions"`
	UsedCapacity      DashboardCapacityCard     `json:"used_capacity"`
	ScheduledTruck    DashboardTruckCard        `json:"scheduled_truck"`
	PartnerFarmers    DashboardPartnersCard     `json:"partner_farmers"`
	ScheduledPickups  []MiddlemanScheduledPickup `json:"scheduled_pickups"`
	BenchmarkPrices   []MiddlemanBenchmarkPrice  `json:"benchmark_prices"`
}

type DashboardMetricCard struct {
	Value              string `json:"value"`
	Description        string `json:"description"`
	ReadyToWeighCount  int    `json:"ready_to_weigh_count"`
	OnTheWayCount      int    `json:"on_the_way_count"`
}

type DashboardCapacityCard struct {
	TotalTons     float64 `json:"total_tons"`
	WarehouseTons float64 `json:"warehouse_tons"`
	OtwTons       float64 `json:"otw_tons"`
	Description   string  `json:"description"`
}

type DashboardTruckCard struct {
	NextSchedule    string `json:"next_schedule"`
	CommodityDetail string `json:"commodity_detail"`
}

type DashboardPartnersCard struct {
	TotalCount  int    `json:"total_count"`
	Description string `json:"description"`
}

type MiddlemanScheduledPickup struct {
	ID             string  `json:"id"`
	OrderCode      string  `json:"order_code"`
	Vehicle        string  `json:"vehicle"`
	DriverName     string  `json:"driver_name"`
	DriverPhone    string  `json:"driver_phone"`
	CommodityName  string  `json:"commodity_name"`
	QuantityTons   float64 `json:"quantity_tons"`
	WeightType     string  `json:"weight_type"`
	Status         string  `json:"status"`
	StatusLabel    string  `json:"status_label"`
	ScheduledTime  string  `json:"scheduled_time"`
	ScheduledDate  string  `json:"scheduled_date"`
	PickupAddress  string  `json:"pickup_address"`
	ActionRequired bool    `json:"action_required"`
}

type MiddlemanBenchmarkPrice struct {
	CommodityName string  `json:"commodity_name"`
	PricePerKg    float64 `json:"price_per_kg"`
	ChangeAmount  float64 `json:"change_amount"`
	Trend         string  `json:"trend"` // "up", "down", "stable"
	ReferenceNote string  `json:"reference_note"`
}

// MiddlemanOrdersSummary untuk summary card halaman Transaksi PO
type MiddlemanOrdersSummary struct {
	TotalActiveContractsAmount float64 `json:"total_active_contracts_amount"`
	TotalVolumeInDeliveryTons  float64 `json:"total_volume_in_delivery_tons"`
	NearestWeighingSchedule    string  `json:"nearest_weighing_schedule"`
}

// MiddlemanOrderFilter filter pencarian dan tab halaman transaksi PO
type MiddlemanOrderFilter struct {
	Tab       string `json:"tab"` // "all", "waiting_confirmation", "delivery_order", "weighing", "completed", "cancelled"
	Search    string `json:"search"`
	Period    string `json:"period"`
	StartDate string `json:"start_date"`
	EndDate   string `json:"end_date"`
	Page      int    `json:"page"`
	Limit     int    `json:"limit"`
}

// MiddlemanOfferFilter filter halaman penawaran
type MiddlemanOfferFilter struct {
	Tab       string `json:"tab"` // "all", "active", "waiting_response", "agreed", "cancelled"
	Commodity string `json:"commodity"`
	Region    string `json:"region"`
	Page      int    `json:"page"`
	Limit     int    `json:"limit"`
}

// MiddlemanOfferItem item kartu penawaran dan kesepakatan harga tebas
type MiddlemanOfferItem struct {
	ID                 string    `json:"id"`
	OfferCode          string    `json:"offer_code"`
	FarmerName         string    `json:"farmer_name"`
	Location           string    `json:"location"`
	CommodityName      string    `json:"commodity_name"`
	QuantityKg         float64   `json:"quantity_kg"`
	QuantityTons       float64   `json:"quantity_tons"`
	OfferedPrice       float64   `json:"offered_price"`
	FarmerAskingPrice  float64   `json:"farmer_asking_price"`
	TotalAmount        float64   `json:"total_amount"`
	PickupDate         string    `json:"pickup_date"`
	LogisticsNote      string    `json:"logistics_note"`
	Status             string    `json:"status"`
	StatusLabel        string    `json:"status_label"`
	CanCounter         bool      `json:"can_counter"`
	CreatedAt          time.Time `json:"created_at"`
}

// MiddlemanInventory entitas stok gudang
type MiddlemanInventory struct {
	ID                    string    `json:"id"`
	MiddlemanID           string    `json:"middleman_id"`
	LotCode               string    `json:"lot_code"`
	CommodityID           string    `json:"commodity_id"`
	CommodityName         string    `json:"commodity_name"`
	Category              string    `json:"category"`
	Variety               string    `json:"variety"`
	WarehouseName         string    `json:"warehouse_name"`
	WarehouseCapacityTons float64   `json:"warehouse_capacity_tons"`
	TotalWeightKg         float64   `json:"total_weight_kg"`
	TotalWeightTons       float64   `json:"total_weight_tons"`
	AverageBuyPrice       float64   `json:"average_buy_price"`
	CurrentMarketPrice    float64   `json:"current_market_price"`
	MarginPerUnit         float64   `json:"margin_per_unit"`
	MoistureContent       float64   `json:"moisture_content"`
	ImpurityContent       float64   `json:"impurity_content"`
	SourceGapoktan        string    `json:"source_gapoktan"`
	Status                string    `json:"status"` // "aman", "menipis", "perlu_tindakan", "habis"
	Notes                 string    `json:"notes"`
	CreatedAt             time.Time `json:"created_at"`
	UpdatedAt             time.Time `json:"updated_at"`
}

// MiddlemanInventorySummary ringkasan metrik inventaris gudang
type MiddlemanInventorySummary struct {
	TotalStockTons        float64 `json:"total_stock_tons"`
	WarehouseCapacityTons float64 `json:"warehouse_capacity_tons"`
	CapacityPercentage    float64 `json:"capacity_percentage"`
	EstimatedStockValue   float64 `json:"estimated_stock_value"`
	AvailableCapacityTons float64 `json:"available_capacity_tons"`
	StockWarningsCount    int     `json:"stock_warnings_count"`
	StockWarningNotes     string  `json:"stock_warning_notes"`
}

// MiddlemanInventoryMutation riwayat keluar masuk gudang
type MiddlemanInventoryMutation struct {
	ID            string    `json:"id"`
	MiddlemanID   string    `json:"middleman_id"`
	InventoryID   string    `json:"inventory_id,omitempty"`
	LotCode       string    `json:"lot_code"`
	MutationType  string    `json:"mutation_type"` // "in", "out"
	CommodityName string    `json:"commodity_name"`
	QuantityTons  float64   `json:"quantity_tons"`
	PartnerName   string    `json:"partner_name"`
	Notes         string    `json:"notes"`
	CreatedAt     time.Time `json:"created_at"`
}

// CreateInventoryInput input modal tambah stok masuk gudang
type CreateInventoryInput struct {
	LotCode           string  `json:"lot_code"`
	BatchCode         string  `json:"batch_code"`
	CommodityID       string  `json:"commodity_id"`
	CommodityName     string  `json:"commodity_name"`
	Category          string  `json:"category"`
	Variety           string  `json:"variety"`
	SourceGapoktan    string  `json:"source_gapoktan"`
	WarehouseName     string  `json:"warehouse_name"`
	WeightTons        float64 `json:"weight_tons"`
	WeightKg          float64 `json:"weight_kg"`
	BuyPricePerKg     float64 `json:"buy_price_per_kg"`
	AvgBuyPrice       float64 `json:"avg_buy_price"`
	MarketPricePerKg  float64 `json:"market_price_per_kg"`
	MarketRefPrice    float64 `json:"market_ref_price"`
	MoistureContent   float64 `json:"moisture_content"`
	ImpurityContent   float64 `json:"impurity_content"`
	EntryDate         string  `json:"entry_date"`
	Notes             string  `json:"notes"`
}

// MiddlemanSalesSummary ringkasan halaman jual stok gudang
type MiddlemanSalesSummary struct {
	ReadyToSellTons        float64 `json:"ready_to_sell_tons"`
	ActiveListingsCount    int     `json:"active_listings_count"`
	IncomingBidsCount      int     `json:"incoming_bids_count"`
	IncomingBidsTotalValue float64 `json:"incoming_bids_total_value"`
	AverageSellMargin      string  `json:"average_sell_margin"`
}

// MiddlemanSalesListing entitas listing lelang penjualan stok ke Rice Mill/pembeli
type MiddlemanSalesListing struct {
	ID                     string    `json:"id"`
	MiddlemanID            string    `json:"middleman_id"`
	InventoryID            string    `json:"inventory_id"`
	LotCode                string    `json:"lot_code"`
	CommodityName          string    `json:"commodity_name"`
	Category               string    `json:"category"`
	Variety                string    `json:"variety"`
	OfferedTons            float64   `json:"offered_tons"`
	MinOrderTons           float64   `json:"min_order_tons"`
	CostPricePerKg         float64   `json:"cost_price_per_kg"`
	CurrentMarketPrice     string    `json:"current_market_price"`
	SellingPricePerKg      float64   `json:"selling_price_per_kg"`
	TotalSellingValue      float64   `json:"total_selling_value"`
	TargetMarginPerKg      float64   `json:"target_margin_per_kg"`
	TotalTargetMargin      float64   `json:"total_target_margin"`
	DeliveryOption         string    `json:"delivery_option"`
	TargetMarkets          []string  `json:"target_markets"`
	ValidUntil             string    `json:"valid_until"`
	Status                 string    `json:"status"`
	IncomingBidsCount      int       `json:"incoming_bids_count"`
	IncomingBidsBestPrice  float64   `json:"incoming_bids_best_price"`
	HasActiveListing       bool      `json:"has_active_listing"`
	CreatedAt              time.Time `json:"created_at"`
	UpdatedAt              time.Time `json:"updated_at"`
}

// CreateSaleListingInput input modal buka penawaran jual baru
type CreateSaleListingInput struct {
	InventoryID       string   `json:"inventory_id"`
	OfferedTons       float64  `json:"offered_tons"`
	MinOrderTons      float64  `json:"min_order_tons"`
	SellingPricePerKg float64  `json:"selling_price_per_kg"`
	DeliveryOption    string   `json:"delivery_option"`
	TargetMarkets     []string `json:"target_markets"`
	ValidityDays      int      `json:"validity_days"`
}

// UpdateSaleListingInput input modal edit penawaran jual
type UpdateSaleListingInput struct {
	OfferedTons       float64  `json:"offered_tons"`
	MinOrderTons      float64  `json:"min_order_tons"`
	SellingPricePerKg float64  `json:"selling_price_per_kg"`
	DeliveryOption    string   `json:"delivery_option"`
	TargetMarkets     []string `json:"target_markets"`
	ValidityDays      int      `json:"validity_days"`
	Status            string   `json:"status"` // "active" or "closed"
}

// MiddlemanSalesBid penawaran masuk dari pembeli grosir
type MiddlemanSalesBid struct {
	ID                 string    `json:"id"`
	SalesListingID     string    `json:"sales_listing_id"`
	BuyerName          string    `json:"buyer_name"`
	BuyerType          string    `json:"buyer_type"`
	OfferedPricePerKg  float64   `json:"offered_price_per_kg"`
	RequestedTons      float64   `json:"requested_tons"`
	TotalOfferedAmount float64   `json:"total_offered_amount"`
	Status             string    `json:"status"`
	Notes              string    `json:"notes"`
	CreatedAt          time.Time `json:"created_at"`
}

// UpdateOrderPOInput input modal edit transaksi & surat pesanan (PO)
type UpdateOrderPOInput struct {
	ContractDate    string  `json:"contract_date"`
	OfferedQuantity float64 `json:"offered_quantity"`
	OfferedPrice    float64 `json:"offered_price"`
	PickupDate      string  `json:"pickup_date"`
	PickupTimeSlot  string  `json:"pickup_time_slot"`
	VehicleType     string  `json:"vehicle_type"`
	Notes           string  `json:"notes"`
}

// CounterOfferInput input tombol [Tawar Susulan]
type CounterOfferInput struct {
	CounterPrice float64 `json:"counter_price"`
	CounterNotes string  `json:"counter_notes"`
}

// MiddlemanRepository antarmuka abstraksi data untuk seluruh fitur tengkulak
type MiddlemanRepository interface {
	GetDashboard(middlemanID string) (*MiddlemanDashboard, error)
	ListOrdersWithSummary(middlemanID string, filter MiddlemanOrderFilter) ([]FarmerPurchaseOrder, MiddlemanOrdersSummary, int, error)
	UpdateOrderPO(middlemanID string, orderID string, input UpdateOrderPOInput) (*FarmerPurchaseOrder, error)
	CancelOrderPO(middlemanID string, orderID string) error
	ListOffers(middlemanID string, filter MiddlemanOfferFilter) ([]MiddlemanOfferItem, int, error)
	CounterOffer(middlemanID string, orderID string, input CounterOfferInput) (*MiddlemanOfferItem, error)
	ListInventoryWithSummary(middlemanID string, category string, qualityStatus string, search string, page int, limit int) ([]MiddlemanInventory, MiddlemanInventorySummary, int, error)
	GetInventoryByID(middlemanID string, id string) (*MiddlemanInventory, error)
	CreateInventory(inv *MiddlemanInventory) error
	DeleteInventory(middlemanID string, id string) error
	ListMutations(middlemanID string, limit int) ([]MiddlemanInventoryMutation, error)
	CreateMutation(mutation *MiddlemanInventoryMutation) error
	ListSalesWithSummary(middlemanID string, tab string, page int, limit int) ([]MiddlemanSalesListing, MiddlemanSalesSummary, int, error)
	GetSaleListingByID(middlemanID string, id string) (*MiddlemanSalesListing, error)
	CreateSaleListing(sale *MiddlemanSalesListing) error
	UpdateSaleListing(middlemanID string, id string, input UpdateSaleListingInput) (*MiddlemanSalesListing, error)
	DeleteSaleListing(middlemanID string, id string) error
	ToggleArchiveSaleListing(middlemanID string, id string) (*MiddlemanSalesListing, error)
	CloseSaleListing(middlemanID string, id string) error
	ListSaleBids(saleID string) ([]MiddlemanSalesBid, error)
}

