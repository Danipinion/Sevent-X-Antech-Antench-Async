package application

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"time"

	"github.com/google/uuid"
	"tandur/api/internal/domain"
)

type MiddlemanService struct {
	middlemanRepo    domain.MiddlemanRepository
	orderRepo        domain.OrderRepository
	listingRepo      domain.FarmerListingRepository
	commodityService *CommodityService
}

func NewMiddlemanService(
	middlemanRepo domain.MiddlemanRepository,
	orderRepo domain.OrderRepository,
	listingRepo domain.FarmerListingRepository,
	commodityService *CommodityService,
) *MiddlemanService {
	return &MiddlemanService{
		middlemanRepo:    middlemanRepo,
		orderRepo:        orderRepo,
		listingRepo:      listingRepo,
		commodityService: commodityService,
	}
}

// 1. Dashboard Beranda Tengkulak
func (s *MiddlemanService) GetDashboard(middlemanID string) (*domain.MiddlemanDashboard, error) {
	if middlemanID == "" {
		return nil, fmt.Errorf("middleman_id wajib diisi")
	}
	return s.middlemanRepo.GetDashboard(middlemanID)
}

// 2. Transaksi & Surat Pesanan (PO)
func (s *MiddlemanService) ListOrders(middlemanID string, filter domain.MiddlemanOrderFilter) ([]domain.FarmerPurchaseOrder, domain.MiddlemanOrdersSummary, int, error) {
	if middlemanID == "" {
		return nil, domain.MiddlemanOrdersSummary{}, 0, fmt.Errorf("middleman_id wajib diisi")
	}
	return s.middlemanRepo.ListOrdersWithSummary(middlemanID, filter)
}

func (s *MiddlemanService) UpdateOrderPO(middlemanID string, orderID string, input domain.UpdateOrderPOInput) (*domain.FarmerPurchaseOrder, error) {
	if middlemanID == "" || orderID == "" {
		return nil, fmt.Errorf("identitas pesanan tidak valid")
	}
	return s.middlemanRepo.UpdateOrderPO(middlemanID, orderID, input)
}

func (s *MiddlemanService) CancelOrderPO(middlemanID string, orderID string) error {
	if middlemanID == "" || orderID == "" {
		return fmt.Errorf("identitas pesanan tidak valid")
	}
	return s.middlemanRepo.CancelOrderPO(middlemanID, orderID)
}

func (s *MiddlemanService) ExportOrdersReport(middlemanID string, filter domain.MiddlemanOrderFilter) ([]byte, string, error) {
	filter.Limit = 1000
	orders, _, _, err := s.middlemanRepo.ListOrdersWithSummary(middlemanID, filter)
	if err != nil {
		return nil, "", err
	}

	buf := new(bytes.Buffer)
	writer := csv.NewWriter(buf)

	// Header CSV
	_ = writer.Write([]string{
		"No PO", "Tanggal Kontrak", "Nama Petani", "Komoditas", "Varietas",
		"Kuantitas (kg)", "Kuantitas (Ton)", "Harga per kg", "Total Nilai Kontrak",
		"Armada", "Plat Nomor", "Status", "Tanggal Penjemputan",
	})

	for _, o := range orders {
		_ = writer.Write([]string{
			o.OrderCode,
			o.CreatedAt.Format("2006-01-02"),
			o.FarmerName,
			o.CommodityName,
			o.CommodityVariety,
			fmt.Sprintf("%.0f", o.OfferedQuantity),
			fmt.Sprintf("%.2f", o.OfferedQuantity/1000.0),
			fmt.Sprintf("%.0f", o.OfferedPrice),
			fmt.Sprintf("%.0f", o.TotalOfferedPrice),
			o.VehicleType,
			o.VehiclePlate,
			o.StatusLabel,
			o.PickupDate,
		})
	}
	writer.Flush()

	filename := fmt.Sprintf("Laporan_Transaksi_PO_%s.csv", time.Now().Format("20060102_150405"))
	return buf.Bytes(), filename, nil
}

// 3. Penawaran & Kesepakatan Harga
func (s *MiddlemanService) ListOffers(middlemanID string, filter domain.MiddlemanOfferFilter) ([]domain.MiddlemanOfferItem, int, error) {
	if middlemanID == "" {
		return nil, 0, fmt.Errorf("middleman_id wajib diisi")
	}
	return s.middlemanRepo.ListOffers(middlemanID, filter)
}

func (s *MiddlemanService) CounterOffer(middlemanID string, orderID string, input domain.CounterOfferInput) (*domain.MiddlemanOfferItem, error) {
	if middlemanID == "" || orderID == "" {
		return nil, fmt.Errorf("parameter tidak valid")
	}
	if input.CounterPrice <= 0 {
		return nil, fmt.Errorf("harga counter tawar susulan harus lebih dari 0")
	}
	return s.middlemanRepo.CounterOffer(middlemanID, orderID, input)
}

// 4. Inventaris Stok Gudang
func (s *MiddlemanService) ListInventory(middlemanID string, category string, qualityStatus string, search string, page int, limit int) ([]domain.MiddlemanInventory, domain.MiddlemanInventorySummary, int, error) {
	if middlemanID == "" {
		return nil, domain.MiddlemanInventorySummary{}, 0, fmt.Errorf("middleman_id wajib diisi")
	}
	return s.middlemanRepo.ListInventoryWithSummary(middlemanID, category, qualityStatus, search, page, limit)
}

func (s *MiddlemanService) GetInventoryByID(middlemanID string, id string) (*domain.MiddlemanInventory, error) {
	if middlemanID == "" || id == "" {
		return nil, fmt.Errorf("parameter tidak valid")
	}
	return s.middlemanRepo.GetInventoryByID(middlemanID, id)
}

func (s *MiddlemanService) CreateInventory(middlemanID string, input domain.CreateInventoryInput) (*domain.MiddlemanInventory, error) {
	if middlemanID == "" {
		return nil, fmt.Errorf("middleman_id wajib diisi")
	}
	if input.CommodityName == "" {
		return nil, fmt.Errorf("nama komoditas wajib diisi")
	}
	if input.WeightKg <= 0 && input.WeightTons <= 0 {
		return nil, fmt.Errorf("berat komoditas harus lebih dari 0")
	}

	weightKg := input.WeightKg
	weightTons := input.WeightTons
	if weightKg <= 0 && weightTons > 0 {
		weightKg = weightTons * 1000.0
	} else if weightTons <= 0 && weightKg > 0 {
		weightTons = weightKg / 1000.0
	}

	if input.Category == "" {
		input.Category = "gabah"
	}
	if input.WarehouseName == "" {
		input.WarehouseName = "Gudang Karangawen - Demak"
	}

	lotCode := fmt.Sprintf("LOT-DEM-%d", time.Now().UnixNano()%100000)
	if input.BatchCode != "" {
		lotCode = input.BatchCode
	} else if input.LotCode != "" {
		lotCode = input.LotCode
	}

	buyPrice := input.BuyPricePerKg
	if buyPrice <= 0 && input.AvgBuyPrice > 0 {
		buyPrice = input.AvgBuyPrice
	}
	marketPrice := input.MarketPricePerKg
	if marketPrice <= 0 && input.MarketRefPrice > 0 {
		marketPrice = input.MarketRefPrice
	}
	if marketPrice <= 0 {
		marketPrice = buyPrice
	}

	status := "aman"
	if weightTons < 2.0 {
		status = "menipis"
	}

	inv := &domain.MiddlemanInventory{
		ID:                    uuid.New().String(),
		MiddlemanID:           middlemanID,
		LotCode:               lotCode,
		CommodityID:           input.CommodityID,
		CommodityName:         input.CommodityName,
		Category:              input.Category,
		Variety:               input.Variety,
		WarehouseName:         input.WarehouseName,
		WarehouseCapacityTons: 50.0,
		TotalWeightKg:         weightKg,
		TotalWeightTons:       weightTons,
		AverageBuyPrice:       buyPrice,
		CurrentMarketPrice:    marketPrice,
		MarginPerUnit:         marketPrice - buyPrice,
		MoistureContent:       input.MoistureContent,
		ImpurityContent:       input.ImpurityContent,
		SourceGapoktan:        input.SourceGapoktan,
		Status:                status,
		Notes:                 input.Notes,
		CreatedAt:             time.Now(),
		UpdatedAt:             time.Now(),
	}

	if err := s.middlemanRepo.CreateInventory(inv); err != nil {
		return nil, err
	}

	// Catat log mutasi masuk gudang
	mutation := &domain.MiddlemanInventoryMutation{
		ID:            uuid.New().String(),
		MiddlemanID:   middlemanID,
		InventoryID:   inv.ID,
		LotCode:       lotCode,
		MutationType:  "in",
		CommodityName: input.CommodityName,
		QuantityTons:  weightTons,
		PartnerName:   input.SourceGapoktan,
		Notes:         fmt.Sprintf("Penerimaan stok masuk gudang: %s", input.Notes),
		CreatedAt:     time.Now(),
	}
	_ = s.middlemanRepo.CreateMutation(mutation)

	return inv, nil
}

func (s *MiddlemanService) DeleteInventory(middlemanID string, id string) error {
	if middlemanID == "" || id == "" {
		return fmt.Errorf("parameter tidak valid")
	}
	return s.middlemanRepo.DeleteInventory(middlemanID, id)
}

func (s *MiddlemanService) ListMutations(middlemanID string, limit int) ([]domain.MiddlemanInventoryMutation, error) {
	if middlemanID == "" {
		return nil, fmt.Errorf("middleman_id wajib diisi")
	}
	return s.middlemanRepo.ListMutations(middlemanID, limit)
}

// 5. Jual Stok Gudang
func (s *MiddlemanService) ListSales(middlemanID string, tab string, page int, limit int) ([]domain.MiddlemanSalesListing, domain.MiddlemanSalesSummary, int, error) {
	if middlemanID == "" {
		return nil, domain.MiddlemanSalesSummary{}, 0, fmt.Errorf("middleman_id wajib diisi")
	}
	return s.middlemanRepo.ListSalesWithSummary(middlemanID, tab, page, limit)
}

func (s *MiddlemanService) CreateSaleListing(middlemanID string, input domain.CreateSaleListingInput) (*domain.MiddlemanSalesListing, error) {
	if middlemanID == "" {
		return nil, fmt.Errorf("middleman_id wajib diisi")
	}
	if input.InventoryID == "" {
		return nil, fmt.Errorf("inventory_id wajib dipilih dari stok yang tersedia")
	}
	if input.OfferedTons <= 0 {
		return nil, fmt.Errorf("tonase yang ditawarkan harus lebih dari 0")
	}
	if input.SellingPricePerKg <= 0 {
		return nil, fmt.Errorf("harga jual per kg harus lebih dari 0")
	}

	inv, err := s.middlemanRepo.GetInventoryByID(middlemanID, input.InventoryID)
	if err != nil {
		return nil, fmt.Errorf("stok inventaris tidak ditemukan: %w", err)
	}

	if input.OfferedTons > inv.TotalWeightTons {
		return nil, fmt.Errorf("tonase yang ditawarkan (%.1f Ton) melebihi stok yang tersedia di gudang (%.1f Ton)", input.OfferedTons, inv.TotalWeightTons)
	}

	minOrder := input.MinOrderTons
	if minOrder <= 0 {
		minOrder = 1.0
	}

	deliveryOption := input.DeliveryOption
	if deliveryOption == "" {
		deliveryOption = "warehouse_pickup"
	}

	targetMarkets := input.TargetMarkets
	if len(targetMarkets) == 0 {
		targetMarkets = []string{"rice_mill", "wholesaler"}
	}

	validityDays := input.ValidityDays
	if validityDays <= 0 {
		validityDays = 3
	}
	validUntil := time.Now().AddDate(0, 0, validityDays).Format("2006-01-02")

	totalSellingValue := input.SellingPricePerKg * input.OfferedTons * 1000.0
	targetMarginPerKg := input.SellingPricePerKg - inv.AverageBuyPrice
	totalTargetMargin := targetMarginPerKg * input.OfferedTons * 1000.0

	sale := &domain.MiddlemanSalesListing{
		ID:                 uuid.New().String(),
		MiddlemanID:        middlemanID,
		InventoryID:        inv.ID,
		LotCode:            inv.LotCode,
		CommodityName:      inv.CommodityName,
		Category:           inv.Category,
		Variety:            inv.Variety,
		OfferedTons:        input.OfferedTons,
		MinOrderTons:       minOrder,
		CostPricePerKg:     inv.AverageBuyPrice,
		CurrentMarketPrice: fmt.Sprintf("Rp %.0f - %.0f", inv.CurrentMarketPrice, inv.CurrentMarketPrice+100),
		SellingPricePerKg:  input.SellingPricePerKg,
		TotalSellingValue:  totalSellingValue,
		TargetMarginPerKg:  targetMarginPerKg,
		TotalTargetMargin:  totalTargetMargin,
		DeliveryOption:     deliveryOption,
		TargetMarkets:      targetMarkets,
		ValidUntil:         validUntil,
		Status:             "active",
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}

	if err := s.middlemanRepo.CreateSaleListing(sale); err != nil {
		return nil, err
	}
	return sale, nil
}

func (s *MiddlemanService) GetSaleListingByID(middlemanID string, id string) (*domain.MiddlemanSalesListing, error) {
	if middlemanID == "" || id == "" {
		return nil, fmt.Errorf("parameter tidak valid")
	}
	return s.middlemanRepo.GetSaleListingByID(middlemanID, id)
}

func (s *MiddlemanService) CloseSaleListing(middlemanID string, id string) error {
	if middlemanID == "" || id == "" {
		return fmt.Errorf("parameter tidak valid")
	}
	return s.middlemanRepo.CloseSaleListing(middlemanID, id)
}

func (s *MiddlemanService) UpdateSaleListing(middlemanID string, id string, input domain.UpdateSaleListingInput) (*domain.MiddlemanSalesListing, error) {
	if middlemanID == "" || id == "" {
		return nil, fmt.Errorf("parameter tidak valid")
	}
	return s.middlemanRepo.UpdateSaleListing(middlemanID, id, input)
}

func (s *MiddlemanService) DeleteSaleListing(middlemanID string, id string) error {
	if middlemanID == "" || id == "" {
		return fmt.Errorf("parameter tidak valid")
	}
	return s.middlemanRepo.DeleteSaleListing(middlemanID, id)
}

func (s *MiddlemanService) ToggleArchiveSaleListing(middlemanID string, id string) (*domain.MiddlemanSalesListing, error) {
	if middlemanID == "" || id == "" {
		return nil, fmt.Errorf("parameter tidak valid")
	}
	return s.middlemanRepo.ToggleArchiveSaleListing(middlemanID, id)
}

func (s *MiddlemanService) ListSaleBids(middlemanID string, saleID string) ([]domain.MiddlemanSalesBid, error) {
	if middlemanID == "" || saleID == "" {
		return nil, fmt.Errorf("parameter tidak valid")
	}
	// Pastikan listing milik middleman
	_, err := s.middlemanRepo.GetSaleListingByID(middlemanID, saleID)
	if err != nil {
		return nil, err
	}
	return s.middlemanRepo.ListSaleBids(saleID)
}
