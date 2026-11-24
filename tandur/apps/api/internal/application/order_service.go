package application

import (
	"context"
	"crypto/rand"
	"fmt"
	"math"
	"math/big"
	"strings"
	"time"

	"github.com/google/uuid"
	"tandur/api/internal/domain"
)

type OrderService struct {
	orderRepo        domain.OrderRepository
	listingRepo      domain.FarmerListingRepository
	userRepo         domain.UserRepository
	commodityService *CommodityService
}

func NewOrderService(
	orderRepo domain.OrderRepository,
	listingRepo domain.FarmerListingRepository,
	userRepo domain.UserRepository,
	commodityService *CommodityService,
) *OrderService {
	return &OrderService{
		orderRepo:        orderRepo,
		listingRepo:      listingRepo,
		userRepo:         userRepo,
		commodityService: commodityService,
	}
}

// GenerateOrderCode menghasilkan kode transaksi unik dengan format #TND-ORD-YYYY-XXXX (contoh: #TND-ORD-2025-0894)
func GenerateOrderCode() string {
	year := time.Now().Year()
	n, err := rand.Int(rand.Reader, big.NewInt(9000))
	num := 1000
	if err == nil {
		num = int(n.Int64()) + 1000
	}
	return fmt.Sprintf("#TND-ORD-%d-%04d", year, num)
}

// --- FITUR TENGKULAK: CARI PETANI & BUAT PENAWARAN ---

// ListMarketplaceListings mengambil daftar panen petani yang aktif/published untuk katalog "TENGKULAK - CARI PETANI"
func (s *OrderService) ListMarketplaceListings(ctx context.Context, filter domain.ListingFilter) (*domain.PaginatedListings, error) {
	if filter.Status == "" {
		filter.Status = string(domain.ListingStatusPublished)
	}
	if s.listingRepo == nil {
		return &domain.PaginatedListings{
			Items:      []domain.FarmerListing{},
			TotalItems: 0,
			Page:       1,
			Limit:      10,
			TotalPages: 0,
		}, nil
	}
	return s.listingRepo.List(ctx, filter)
}

// GetMarketplaceListingByID mengambil detail listing panen petani untuk pratinjau tengkulak
func (s *OrderService) GetMarketplaceListingByID(ctx context.Context, listingID string) (*domain.FarmerListing, error) {
	if s.listingRepo == nil {
		return nil, domain.ErrListingNotFound
	}
	return s.listingRepo.GetByID(ctx, listingID)
}

// CreateOffer mengajukan penawaran pembelian panen oleh Tengkulak ke Petani (TENGKULAK - PENAWARAN)
func (s *OrderService) CreateOffer(ctx context.Context, middlemanID string, input domain.CreateOrderOfferInput) (*domain.FarmerPurchaseOrder, error) {
	// 1. Validasi User Tengkulak
	user, err := s.userRepo.GetByID(ctx, middlemanID)
	if err != nil {
		return nil, err
	}
	if user.Role != domain.RoleMiddleman && !user.IsBisnis {
		return nil, domain.ErrOnlyMiddlemanCanCreateOffer
	}

	// 2. Validasi Listing Panen
	if s.listingRepo == nil {
		return nil, domain.ErrListingNotFound
	}
	listing, err := s.listingRepo.GetByID(ctx, input.ListingID)
	if err != nil {
		return nil, err
	}
	if listing.Status != domain.ListingStatusPublished && listing.Status != domain.ListingStatusDraft {
		return nil, domain.ErrListingNotAvailable
	}

	// 3. Validasi Kuantitas & Harga
	if input.OfferedQuantity < 500 {
		return nil, domain.ErrMinOrderQuantity
	}
	if input.OfferedQuantity > listing.AvailableQuantity && listing.AvailableQuantity > 0 {
		return nil, domain.ErrQuantityExceedsAvailable
	}
	if input.OfferedPrice <= 0 {
		return nil, domain.ErrInvalidInput
	}

	// 4. Hitung Acuan Harga Pasar (SP2KP) & Margin
	var benchmarkPrice float64 = 0
	if s.commodityService != nil {
		guide, errGuide := s.commodityService.GetPriceGuide(ctx, listing.CommodityName, "", "")
		if errGuide == nil && guide != nil && guide.BenchmarkPrice > 0 {
			benchmarkPrice = guide.BenchmarkPrice
		}
	}
	if benchmarkPrice <= 0 {
		benchmarkPrice = listing.PricePerUnit
	}

	diff := input.OfferedPrice - benchmarkPrice
	marginAmount := diff * input.OfferedQuantity
	var marginPct float64 = 0
	if benchmarkPrice > 0 {
		marginPct = math.Round((diff/benchmarkPrice)*10000) / 100
	}

	totalOffered := input.OfferedQuantity * input.OfferedPrice

	// Logistik awal
	pickupDate := strings.TrimSpace(input.PickupDate)
	if pickupDate == "" {
		pickupDate = listing.ReadyDate
	}
	pickupTimeSlot := strings.TrimSpace(input.PickupTimeSlot)
	if pickupTimeSlot == "" {
		pickupTimeSlot = "09.00 - 11.00 WIB"
	}
	vehicleType := strings.TrimSpace(input.VehicleType)
	if vehicleType == "" {
		vehicleType = "Truk Isuzu Elf"
	}
	vehiclePlate := strings.TrimSpace(input.VehiclePlate)
	if vehiclePlate == "" {
		vehiclePlate = "AD 8291 QA"
	}
	driverName := strings.TrimSpace(input.DriverName)
	if driverName == "" {
		driverName = "Pak Suparno"
	}

	buyerType := "Mitra Tengkulak Terverifikasi"
	if user.IsBisnis {
		buyerType = "Pembeli Kontrak Skala Menengah"
	}

	order := &domain.FarmerPurchaseOrder{
		ID:                uuid.New().String(),
		OrderCode:         GenerateOrderCode(),
		ListingID:         listing.ID,
		FarmerID:          listing.FarmerID,
		MiddlemanID:       user.ID,
		Status:            domain.OrderStatusWaitingConfirmation,
		StatusLabel:       "Menunggu Persetujuan Anda",
		CommodityID:       listing.CommodityID,
		CommodityName:     listing.CommodityName,
		Category:          listing.Category,
		ListingTitle:      listing.Title,
		Description:       listing.Description,
		Unit:              listing.Unit,
		MediaURLs:         listing.MediaURLs,
		BuyerName:         user.Name,
		BuyerPhone:        user.Phone,
		BuyerType:         buyerType,
		BuyerCity:         "Demak, Jawa Tengah",
		BuyerRating:       4.9,
		OfferedQuantity:   input.OfferedQuantity,
		OfferedPrice:      input.OfferedPrice,
		TotalOfferedPrice: totalOffered,
		AgreedPrice:       input.OfferedPrice,
		TotalPrice:        totalOffered,
		BenchmarkPrice:    benchmarkPrice,
		MarginAmount:      marginAmount,
		MarginPercentage:  marginPct,
		MarginNote:        domain.FormatMarginNote(input.OfferedPrice, benchmarkPrice),
		Notes:             strings.TrimSpace(input.Notes),
		PickupDate:        pickupDate,
		PickupTimeSlot:    pickupTimeSlot,
		VehicleType:       vehicleType,
		VehiclePlate:      vehiclePlate,
		DriverName:        driverName,
		DriverPhone:       strings.TrimSpace(input.DriverPhone),
		PickupAddress:     listing.PickupAddress,
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}

	if err := s.orderRepo.Create(ctx, order); err != nil {
		return nil, err
	}

	return order, nil
}

// ListMiddlemanOrders mengambil daftar pesanan/transaksi yang dibuat oleh Tengkulak (TENGKULAK - TRANSAKSI)
func (s *OrderService) ListMiddlemanOrders(ctx context.Context, middlemanID string, filter domain.OrderFilter) (*domain.PaginatedOrders, error) {
	filter.MiddlemanID = middlemanID
	return s.orderRepo.List(ctx, filter)
}

// --- FITUR PETANI: DAFTAR PESANAN & RESPON ---

// ListFarmerOrders mengambil daftar pesanan masuk untuk dashboard "PETANI - PESANAN"
func (s *OrderService) ListFarmerOrders(ctx context.Context, farmerID string, filter domain.OrderFilter) (*domain.PaginatedOrders, error) {
	filter.FarmerID = farmerID
	return s.orderRepo.List(ctx, filter)
}

// GetOrderByID mengambil detail pesanan dengan otorisasi pemilik
func (s *OrderService) GetOrderByID(ctx context.Context, userID string, orderID string) (*domain.FarmerPurchaseOrder, error) {
	order, err := s.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		return nil, err
	}
	if order.FarmerID != userID && order.MiddlemanID != userID {
		return nil, domain.ErrUnauthorizedOrderAccess
	}
	return order, nil
}

// AcceptOrder memproses tombol [Terima Penawaran & Jadwalkan] di sisi Petani
func (s *OrderService) AcceptOrder(ctx context.Context, farmerID string, orderID string) (*domain.FarmerPurchaseOrder, error) {
	order, err := s.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		return nil, err
	}
	if order.FarmerID != farmerID {
		return nil, domain.ErrUnauthorizedOrderAccess
	}

	// Guard: Hanya boleh diterima jika status waiting_confirmation atau in_negotiation
	if order.Status != domain.OrderStatusWaitingConfirmation && order.Status != domain.OrderStatusInNegotiation {
		return nil, domain.ErrInvalidOrderAction
	}

	now := time.Now()
	order.Status = domain.OrderStatusScheduledPickup
	order.StatusLabel = "Armada Menuju Lokasi"
	order.AgreementDate = &now
	order.AgreedPrice = order.OfferedPrice
	order.TotalPrice = order.TotalOfferedPrice

	if err := s.orderRepo.Update(ctx, order); err != nil {
		return nil, err
	}

	// Alokasikan stok panen di listing petani
	if s.listingRepo != nil {
		listing, errListing := s.listingRepo.GetByID(ctx, order.ListingID)
		if errListing == nil && listing != nil {
			listing.AvailableQuantity -= order.OfferedQuantity
			if listing.AvailableQuantity < 0 {
				listing.AvailableQuantity = 0
			}
			_ = s.listingRepo.Update(ctx, listing)
		}
	}

	return order, nil
}

// NegotiateOrder memproses tombol [Negosiasi] di sisi Petani (mengirim harga tandingan / kuantitas)
func (s *OrderService) NegotiateOrder(ctx context.Context, farmerID string, orderID string, input domain.NegotiateOrderInput) (*domain.FarmerPurchaseOrder, error) {
	order, err := s.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		return nil, err
	}
	if order.FarmerID != farmerID {
		return nil, domain.ErrUnauthorizedOrderAccess
	}

	if order.Status != domain.OrderStatusWaitingConfirmation {
		return nil, domain.ErrInvalidOrderAction
	}
	if input.CounterPrice <= 0 {
		return nil, domain.ErrCounterPriceRequired
	}

	order.Status = domain.OrderStatusInNegotiation
	order.StatusLabel = "Dalam Negosiasi"
	order.CounterPrice = &input.CounterPrice
	if input.CounterQuantity != nil && *input.CounterQuantity >= 500 {
		order.CounterQuantity = input.CounterQuantity
	}
	order.CounterNotes = strings.TrimSpace(input.CounterNotes)

	if err := s.orderRepo.Update(ctx, order); err != nil {
		return nil, err
	}

	return order, nil
}

// RejectOrder memproses penolakan penawaran oleh Petani
func (s *OrderService) RejectOrder(ctx context.Context, farmerID string, orderID string, reason string) (*domain.FarmerPurchaseOrder, error) {
	order, err := s.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		return nil, err
	}
	if order.FarmerID != farmerID && order.MiddlemanID != farmerID {
		return nil, domain.ErrUnauthorizedOrderAccess
	}

	order.Status = domain.OrderStatusCancelled
	order.StatusLabel = "Dibatalkan"
	if reason != "" {
		order.Notes = fmt.Sprintf("%s (Alasan: %s)", order.Notes, reason)
	}

	if err := s.orderRepo.Update(ctx, order); err != nil {
		return nil, err
	}

	return order, nil
}

// ConfirmReadyForPickup memproses tombol [Siap Muat] / [Bagikan Titik Jemput] di sisi Petani
func (s *OrderService) ConfirmReadyForPickup(ctx context.Context, farmerID string, orderID string) (*domain.FarmerPurchaseOrder, error) {
	order, err := s.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		return nil, err
	}
	if order.FarmerID != farmerID {
		return nil, domain.ErrUnauthorizedOrderAccess
	}

	order.IsReadyForPickup = true
	if err := s.orderRepo.Update(ctx, order); err != nil {
		return nil, err
	}

	return order, nil
}

// UpdateLogistics memperbarui data armada truk pengangkut oleh Tengkulak
func (s *OrderService) UpdateLogistics(ctx context.Context, middlemanID string, orderID string, input domain.UpdateLogisticsInput) (*domain.FarmerPurchaseOrder, error) {
	order, err := s.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		return nil, err
	}
	if order.MiddlemanID != middlemanID {
		return nil, domain.ErrUnauthorizedOrderAccess
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
	if input.VehiclePlate != "" {
		order.VehiclePlate = input.VehiclePlate
	}
	if input.DriverName != "" {
		order.DriverName = input.DriverName
	}
	if input.DriverPhone != "" {
		order.DriverPhone = input.DriverPhone
	}

	if err := s.orderRepo.Update(ctx, order); err != nil {
		return nil, err
	}

	return order, nil
}

// CompleteWeighingAndSettlement menyelesaikan pesanan berdasarkan timbangan akhir & pelunasan dana (Card 3 di mockup)
func (s *OrderService) CompleteWeighingAndSettlement(ctx context.Context, middlemanID string, orderID string, input domain.CompleteWeighingInput) (*domain.FarmerPurchaseOrder, error) {
	order, err := s.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		return nil, err
	}
	if order.MiddlemanID != middlemanID {
		return nil, domain.ErrUnauthorizedOrderAccess
	}

	if input.ActualWeight <= 0 || input.FinalPricePerUnit <= 0 {
		return nil, domain.ErrInvalidInput
	}

	finalTotal := input.ActualWeight * input.FinalPricePerUnit

	order.Status = domain.OrderStatusCompleted
	order.StatusLabel = "Transaksi Selesai & Lunas"
	order.ActualWeight = &input.ActualWeight
	order.FinalPricePerUnit = &input.FinalPricePerUnit
	order.FinalTotalAmount = &finalTotal
	order.WeighingCertificateURL = input.WeighingCertificateURL
	order.InvoiceURL = input.InvoiceURL

	if err := s.orderRepo.Update(ctx, order); err != nil {
		return nil, err
	}

	return order, nil
}
