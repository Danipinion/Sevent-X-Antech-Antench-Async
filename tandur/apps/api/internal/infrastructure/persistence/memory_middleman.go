package persistence

import (
	"context"
	"fmt"
	"math"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"tandur/api/internal/domain"
)

type MemoryMiddlemanRepository struct {
	mu          sync.RWMutex
	inventories map[string]domain.MiddlemanInventory
	mutations   []domain.MiddlemanInventoryMutation
	sales       map[string]domain.MiddlemanSalesListing
	bids        map[string][]domain.MiddlemanSalesBid
	orderRepo   domain.OrderRepository
}

func NewMemoryMiddlemanRepository(orderRepo domain.OrderRepository) *MemoryMiddlemanRepository {
	return &MemoryMiddlemanRepository{
		inventories: make(map[string]domain.MiddlemanInventory),
		mutations:   make([]domain.MiddlemanInventoryMutation, 0),
		sales:       make(map[string]domain.MiddlemanSalesListing),
		bids:        make(map[string][]domain.MiddlemanSalesBid),
		orderRepo:   orderRepo,
	}
}

func (m *MemoryMiddlemanRepository) GetDashboard(middlemanID string) (*domain.MiddlemanDashboard, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var totalStockTons float64
	for _, inv := range m.inventories {
		if inv.MiddlemanID == middlemanID {
			totalStockTons += inv.TotalWeightTons
		}
	}

	dashboard := &domain.MiddlemanDashboard{
		Greeting:  "Selamat Pagi, Haji Supardi",
		RoleLabel: "Mitra Pengumpul Demak",
		WorkArea:  "Karangawen, Demak",
		TotalTransactions: domain.DashboardMetricCard{
			Value:             "3 Kontrak",
			Description:       "2 Siap Timbang, 1 Menuju Gudang",
			ReadyToWeighCount: 2,
			OnTheWayCount:     1,
		},
		UsedCapacity: domain.DashboardCapacityCard{
			TotalTons:     math.Round((totalStockTons+17.3)*10) / 10,
			WarehouseTons: math.Round(totalStockTons*10) / 10,
			OtwTons:       17.3,
			Description:   fmt.Sprintf("%.1f Ton di Gudang, 17,3 Ton OTW", totalStockTons),
		},
		ScheduledTruck: domain.DashboardTruckCard{
			NextSchedule:    "Besok, 08:30",
			CommodityDetail: "Kedatangan: 7,5 Ton GKP",
		},
		PartnerFarmers: domain.DashboardPartnersCard{
			TotalCount:  14,
			Description: "Wilayah Kab. Demak & Kudus",
		},
		ScheduledPickups: []domain.MiddlemanScheduledPickup{
			{
				ID:             "pickup-1",
				OrderCode:      "#PO-TND-2025-0112",
				Vehicle:        "Truk Isuzu Elf (#01)",
				DriverName:     "Budi (Driver Timbang)",
				DriverPhone:    "081234567890",
				CommodityName:  "Jagung Hibrida",
				QuantityTons:   5.0,
				WeightType:     "Borong",
				Status:         "armada_menuju_lokasi",
				StatusLabel:    "Armada Menuju Lokasi",
				ScheduledTime:  "Besok, 08:30 WIB",
				ScheduledDate:  "2025-05-15",
				PickupAddress:  "Desa Karangawen, Demak",
				ActionRequired: false,
			},
			{
				ID:             "pickup-2",
				OrderCode:      "#PO-TND-2025-0114",
				Vehicle:        "Engkel 4 Roda (#04)",
				DriverName:     "Slamet (Driver)",
				DriverPhone:    "081987654321",
				CommodityName:  "Beras Merah",
				QuantityTons:   2.5,
				WeightType:     "Karung",
				Status:         "konfirmasi_muat",
				StatusLabel:    "Konfirmasi Muat",
				ScheduledTime:  "Lusa, 10:00 WIB",
				ScheduledDate:  "2025-05-16",
				PickupAddress:  "Gudang Mandiri Kudus",
				ActionRequired: true,
			},
		},
		BenchmarkPrices: []domain.MiddlemanBenchmarkPrice{
			{CommodityName: "GKP Ciherang", PricePerKg: 6800, ChangeAmount: 150, Trend: "up", ReferenceNote: "Rujukan Pasar Tingkat Penggilingan Demak"},
			{CommodityName: "GKG Inpari 32", PricePerKg: 7900, ChangeAmount: 0, Trend: "stable", ReferenceNote: "Rujukan Pasar Tingkat Penggilingan Demak"},
			{CommodityName: "Beras Putih Medium", PricePerKg: 12800, ChangeAmount: -200, Trend: "down", ReferenceNote: "Rujukan Pasar Tingkat Penggilingan Demak"},
			{CommodityName: "Jagung Pipil Kering", PricePerKg: 5600, ChangeAmount: 100, Trend: "up", ReferenceNote: "Rujukan Pasar Tingkat Penggilingan Demak"},
		},
	}
	return dashboard, nil
}

func (m *MemoryMiddlemanRepository) ListOrdersWithSummary(middlemanID string, filter domain.MiddlemanOrderFilter) ([]domain.FarmerPurchaseOrder, domain.MiddlemanOrdersSummary, int, error) {
	paginated, err := m.orderRepo.List(context.Background(), domain.OrderFilter{
		MiddlemanID: middlemanID,
		Tab:         filter.Tab,
		Page:        filter.Page,
		Limit:       filter.Limit,
	})
	if err != nil {
		return nil, domain.MiddlemanOrdersSummary{}, 0, err
	}
	summary := domain.MiddlemanOrdersSummary{
		TotalActiveContractsAmount: 151850000,
		TotalVolumeInDeliveryTons:  55.0,
		NearestWeighingSchedule:    "Besok 08:30 (Karangawen)",
	}
	return paginated.Items, summary, int(paginated.TotalItems), nil
}

func (m *MemoryMiddlemanRepository) UpdateOrderPO(middlemanID string, orderID string, input domain.UpdateOrderPOInput) (*domain.FarmerPurchaseOrder, error) {
	order, err := m.orderRepo.GetByID(context.Background(), orderID)
	if err != nil {
		return nil, err
	}
	if order.MiddlemanID != middlemanID {
		return nil, fmt.Errorf("tidak memiliki hak akses terhadap pesanan ini")
	}
	if input.OfferedQuantity > 0 {
		order.OfferedQuantity = input.OfferedQuantity
	}
	if input.OfferedPrice > 0 {
		order.OfferedPrice = input.OfferedPrice
	}
	if input.PickupDate != "" {
		order.PickupDate = input.PickupDate
	}
	if input.PickupTimeSlot != "" {
		order.PickupTimeSlot = input.PickupTimeSlot
	}
	if input.VehicleType != "" {
		order.VehicleType = input.VehicleType
	}
	if input.Notes != "" {
		order.Notes = input.Notes
	}
	order.UpdatedAt = time.Now()
	if err := m.orderRepo.Update(context.Background(), order); err != nil {
		return nil, err
	}
	return order, nil
}

func (m *MemoryMiddlemanRepository) CancelOrderPO(middlemanID string, orderID string) error {
	order, err := m.orderRepo.GetByID(context.Background(), orderID)
	if err != nil {
		return err
	}
	if order.MiddlemanID != middlemanID {
		return fmt.Errorf("tidak memiliki hak akses")
	}
	order.Status = domain.OrderStatusCancelled
	order.StatusLabel = domain.GetStatusLabel(domain.OrderStatusCancelled)
	order.UpdatedAt = time.Now()
	return m.orderRepo.Update(context.Background(), order)
}

func (m *MemoryMiddlemanRepository) ListOffers(middlemanID string, filter domain.MiddlemanOfferFilter) ([]domain.MiddlemanOfferItem, int, error) {
	paginated, err := m.orderRepo.List(context.Background(), domain.OrderFilter{
		MiddlemanID: middlemanID,
		Page:        1,
		Limit:       100,
	})
	if err != nil {
		return nil, 0, err
	}
	var offers []domain.MiddlemanOfferItem
	for _, o := range paginated.Items {
		item := domain.MiddlemanOfferItem{
			ID:                o.ID,
			OfferCode:         o.OrderCode,
			FarmerName:        o.FarmerName,
			Location:          o.PickupAddress,
			CommodityName:     o.CommodityName,
			QuantityKg:        o.OfferedQuantity,
			QuantityTons:      o.OfferedQuantity / 1000.0,
			OfferedPrice:      o.OfferedPrice,
			FarmerAskingPrice: o.OfferedPrice + 50,
			TotalAmount:       o.OfferedPrice * o.OfferedQuantity,
			PickupDate:        o.PickupDate,
			LogisticsNote:     o.VehicleType,
			Status:            string(o.Status),
			StatusLabel:       o.StatusLabel,
			CanCounter:        (o.Status == domain.OrderStatusWaitingConfirmation || o.Status == domain.OrderStatusInNegotiation),
			CreatedAt:         o.CreatedAt,
		}
		offers = append(offers, item)
	}
	return offers, len(offers), nil
}

func (m *MemoryMiddlemanRepository) CounterOffer(middlemanID string, orderID string, input domain.CounterOfferInput) (*domain.MiddlemanOfferItem, error) {
	order, err := m.orderRepo.GetByID(context.Background(), orderID)
	if err != nil {
		return nil, err
	}
	cp := input.CounterPrice
	order.CounterPrice = &cp
	order.CounterNotes = input.CounterNotes
	order.Status = domain.OrderStatusInNegotiation
	order.StatusLabel = domain.GetStatusLabel(domain.OrderStatusInNegotiation)
	order.UpdatedAt = time.Now()
	_ = m.orderRepo.Update(context.Background(), order)

	item := &domain.MiddlemanOfferItem{
		ID:           order.ID,
		OfferCode:    order.OrderCode,
		OfferedPrice: input.CounterPrice,
		Status:       string(order.Status),
		StatusLabel:  order.StatusLabel,
	}
	return item, nil
}

func (m *MemoryMiddlemanRepository) ListInventoryWithSummary(middlemanID string, category string, qualityStatus string, search string, page int, limit int) ([]domain.MiddlemanInventory, domain.MiddlemanInventorySummary, int, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	summary := domain.MiddlemanInventorySummary{
		WarehouseCapacityTons: 50.0,
		StockWarningNotes:     "Stok beras menipis / jagung pipil mendekati batas simpan",
	}

	var matched []domain.MiddlemanInventory
	for _, inv := range m.inventories {
		if inv.MiddlemanID != middlemanID {
			continue
		}
		summary.TotalStockTons += inv.TotalWeightTons
		summary.EstimatedStockValue += (inv.TotalWeightKg * inv.CurrentMarketPrice)
		if inv.Status == "menipis" || inv.Status == "perlu_tindakan" {
			summary.StockWarningsCount++
		}

		if category != "" && category != "all" && inv.Category != category {
			continue
		}
		if qualityStatus != "" && qualityStatus != "all" && inv.Status != qualityStatus {
			continue
		}
		if search != "" && !strings.Contains(strings.ToLower(inv.CommodityName), strings.ToLower(search)) {
			continue
		}
		matched = append(matched, inv)
	}

	summary.AvailableCapacityTons = math.Max(0, summary.WarehouseCapacityTons-summary.TotalStockTons)
	if summary.WarehouseCapacityTons > 0 {
		summary.CapacityPercentage = math.Round((summary.TotalStockTons/summary.WarehouseCapacityTons)*1000) / 10
	}

	return matched, summary, len(matched), nil
}

func (m *MemoryMiddlemanRepository) GetInventoryByID(middlemanID string, id string) (*domain.MiddlemanInventory, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	inv, exists := m.inventories[id]
	if !exists || inv.MiddlemanID != middlemanID {
		return nil, fmt.Errorf("inventaris tidak ditemukan")
	}
	return &inv, nil
}

func (m *MemoryMiddlemanRepository) CreateInventory(inv *domain.MiddlemanInventory) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if inv.ID == "" {
		inv.ID = uuid.New().String()
	}
	if inv.LotCode == "" {
		inv.LotCode = fmt.Sprintf("LOT-DEM-%d", time.Now().UnixNano()%10000)
	}
	inv.CreatedAt = time.Now()
	inv.UpdatedAt = time.Now()
	m.inventories[inv.ID] = *inv
	return nil
}

func (m *MemoryMiddlemanRepository) DeleteInventory(middlemanID string, id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	inv, exists := m.inventories[id]
	if !exists || inv.MiddlemanID != middlemanID {
		return fmt.Errorf("inventaris tidak ditemukan")
	}
	delete(m.inventories, id)
	return nil
}

func (m *MemoryMiddlemanRepository) ListMutations(middlemanID string, limit int) ([]domain.MiddlemanInventoryMutation, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var matched []domain.MiddlemanInventoryMutation
	for _, mut := range m.mutations {
		if mut.MiddlemanID == middlemanID {
			matched = append(matched, mut)
		}
	}
	return matched, nil
}

func (m *MemoryMiddlemanRepository) CreateMutation(mutation *domain.MiddlemanInventoryMutation) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if mutation.ID == "" {
		mutation.ID = uuid.New().String()
	}
	mutation.CreatedAt = time.Now()
	m.mutations = append([]domain.MiddlemanInventoryMutation{*mutation}, m.mutations...)
	return nil
}

func (m *MemoryMiddlemanRepository) ListSalesWithSummary(middlemanID string, tab string, page int, limit int) ([]domain.MiddlemanSalesListing, domain.MiddlemanSalesSummary, int, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	summary := domain.MiddlemanSalesSummary{
		AverageSellMargin: "+Rp 450 / kg",
	}

	var matched []domain.MiddlemanSalesListing
	for _, sale := range m.sales {
		if sale.MiddlemanID != middlemanID {
			continue
		}
		if sale.Status == "active" {
			summary.ReadyToSellTons += sale.OfferedTons
			summary.ActiveListingsCount++
		}
		bids := m.bids[sale.ID]
		summary.IncomingBidsCount += len(bids)
		for _, b := range bids {
			summary.IncomingBidsTotalValue += b.TotalOfferedAmount
		}

		if tab != "" && tab != "all" {
			if tab == "gabah_basah" && sale.Category != "gabah" {
				continue
			}
			if tab == "beras_premium" && sale.Category != "beras" {
				continue
			}
			if tab == "palawija" && sale.Category != "palawija" {
				continue
			}
		}
		matched = append(matched, sale)
	}

	return matched, summary, len(matched), nil
}

func (m *MemoryMiddlemanRepository) GetSaleListingByID(middlemanID string, id string) (*domain.MiddlemanSalesListing, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	sale, exists := m.sales[id]
	if !exists || sale.MiddlemanID != middlemanID {
		return nil, fmt.Errorf("listing penjualan tidak ditemukan")
	}
	return &sale, nil
}

func (m *MemoryMiddlemanRepository) CreateSaleListing(sale *domain.MiddlemanSalesListing) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if sale.ID == "" {
		sale.ID = uuid.New().String()
	}
	sale.CreatedAt = time.Now()
	sale.UpdatedAt = time.Now()
	m.sales[sale.ID] = *sale
	return nil
}

func (m *MemoryMiddlemanRepository) CloseSaleListing(middlemanID string, id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	sale, exists := m.sales[id]
	if !exists || sale.MiddlemanID != middlemanID {
		return fmt.Errorf("listing penjualan tidak ditemukan")
	}
	sale.Status = "closed"
	sale.UpdatedAt = time.Now()
	m.sales[id] = sale
	return nil
}

func (m *MemoryMiddlemanRepository) ListSaleBids(saleID string) ([]domain.MiddlemanSalesBid, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return m.bids[saleID], nil
}
