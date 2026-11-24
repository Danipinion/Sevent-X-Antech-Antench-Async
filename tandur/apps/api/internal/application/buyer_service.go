package application

import (
	"context"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"tandur/api/internal/domain"
	"tandur/api/internal/infrastructure/geospatial"
)

type BuyerService struct {
	buyerRepo domain.BuyerRepository
	userRepo  domain.UserRepository
}

func NewBuyerService(buyerRepo domain.BuyerRepository, userRepo domain.UserRepository) *BuyerService {
	return &BuyerService{
		buyerRepo: buyerRepo,
		userRepo:  userRepo,
	}
}

// CanAccessFarmerSource memeriksa apakah pengguna diizinkan melihat/membeli pasokan langsung dari petani
func CanAccessFarmerSource(claims *JWTClaims) bool {
	if claims == nil {
		return false
	}
	if claims.BuyerType == domain.BuyerTypeBusiness {
		return true
	}
	if claims.Role == domain.RoleBuyer && claims.IsBisnis {
		return true
	}
	if claims.Role == domain.RoleMiddleman {
		return true
	}
	return false
}

// -----------------------------------------------------------------------------
// 1. Katalog & Beranda Pembeli
// -----------------------------------------------------------------------------

func (s *BuyerService) ListCategories(ctx context.Context) ([]domain.ProductCategory, error) {
	return s.buyerRepo.ListCategories(ctx)
}

func (s *BuyerService) ListProducts(ctx context.Context, claims *JWTClaims, filter domain.BuyerProductFilter) (*domain.PaginatedBuyerProducts, error) {
	allowFarmer := CanAccessFarmerSource(claims)

	sourceLower := strings.ToLower(strings.TrimSpace(filter.Source))
	if sourceLower == domain.ProductSourceFarmer && !allowFarmer {
		return nil, domain.ErrFarmerSourceForbidden
	}

	if filter.RadiusKm <= 0 || filter.RadiusKm > domain.MaxBuyerRadiusKm {
		filter.RadiusKm = domain.MaxBuyerRadiusKm
	}
	filter.AllowFarmerSource = allowFarmer

	// Jika koordinat query kosong dan user login memiliki alamat utama, gunakan sebagai pusat radius
	if (filter.Latitude == nil || filter.Longitude == nil) && claims != nil && s.userRepo != nil {
		if user, err := s.userRepo.GetByID(ctx, claims.UserID); err == nil && user != nil && user.Location != nil {
			if user.Location.Latitude != 0 || user.Location.Longitude != 0 {
				lat := user.Location.Latitude
				lng := user.Location.Longitude
				filter.Latitude = &lat
				filter.Longitude = &lng
			}
		}
	}

	return s.buyerRepo.ListProducts(ctx, filter)
}

func (s *BuyerService) ListPopularProducts(ctx context.Context, claims *JWTClaims, filter domain.BuyerProductFilter) ([]domain.BuyerProduct, error) {
	filter.AllowFarmerSource = CanAccessFarmerSource(claims)
	if filter.RadiusKm <= 0 || filter.RadiusKm > domain.MaxBuyerRadiusKm {
		filter.RadiusKm = domain.MaxBuyerRadiusKm
	}

	if claims != nil && s.userRepo != nil {
		if user, err := s.userRepo.GetByID(ctx, claims.UserID); err == nil && user != nil && user.Location != nil {
			if filter.City == "" && user.Location.City != "" {
				filter.City = user.Location.City
			}
			if (filter.Latitude == nil || filter.Longitude == nil) && (user.Location.Latitude != 0 || user.Location.Longitude != 0) {
				lat := user.Location.Latitude
				lng := user.Location.Longitude
				filter.Latitude = &lat
				filter.Longitude = &lng
			}
		}
	}

	return s.buyerRepo.ListPopularProducts(ctx, filter)
}

func (s *BuyerService) GetProductDetail(ctx context.Context, claims *JWTClaims, productID string, sourceHint string, lat *float64, lng *float64) (*domain.BuyerProduct, error) {
	product, err := s.buyerRepo.GetProductByID(ctx, productID, strings.ToLower(strings.TrimSpace(sourceHint)))
	if err != nil {
		return nil, err
	}

	if product.Source == domain.ProductSourceFarmer && !CanAccessFarmerSource(claims) {
		return nil, domain.ErrFarmerSourceForbidden
	}

	if lat != nil && lng != nil && (product.Seller.Latitude != 0 || product.Seller.Longitude != 0) {
		dist := geospatial.CalculateHaversineDistance(
			geospatial.Coordinates{Latitude: *lat, Longitude: *lng},
			geospatial.Coordinates{Latitude: product.Seller.Latitude, Longitude: product.Seller.Longitude},
		)
		product.DistanceKm = math.Round(dist*100) / 100
	}

	return product, nil
}

// -----------------------------------------------------------------------------
// 2. Keranjang Belanja & Konsolidasi Stok
// -----------------------------------------------------------------------------

func (s *BuyerService) GetCart(ctx context.Context, buyerID string) (*domain.BuyerCartResponse, error) {
	items, err := s.buyerRepo.GetCartItems(ctx, buyerID)
	if err != nil {
		return nil, err
	}

	var buyerLoc *domain.UserLocation
	if s.userRepo != nil {
		if u, err := s.userRepo.GetByID(ctx, buyerID); err == nil && u != nil {
			buyerLoc = u.Location
		}
	}

	groups, totalQty, grandSubtotal := groupCartItemsBySeller(items, buyerLoc)

	return &domain.BuyerCartResponse{
		SellerGroups:  groups,
		TotalSellers:  len(groups),
		TotalItems:    len(items),
		TotalQuantity: totalQty,
		GrandSubtotal: grandSubtotal,
	}, nil
}

func (s *BuyerService) AddToCart(ctx context.Context, claims *JWTClaims, input domain.AddCartItemInput) (*domain.CartItem, error) {
	if strings.TrimSpace(input.ProductID) == "" {
		return nil, domain.ErrProductNotFound
	}
	if input.Quantity <= 0 {
		return nil, domain.ErrInvalidQuantity
	}

	product, err := s.buyerRepo.GetProductByID(ctx, strings.TrimSpace(input.ProductID), strings.ToLower(strings.TrimSpace(input.Source)))
	if err != nil {
		return nil, err
	}

	if product.Source == domain.ProductSourceFarmer && !CanAccessFarmerSource(claims) {
		return nil, domain.ErrFarmerSourceForbidden
	}

	if input.Quantity > product.AvailableStock {
		return nil, domain.ErrStockExceeded
	}

	return s.buyerRepo.UpsertCartItem(ctx, claims.UserID, product, input.Quantity)
}

func (s *BuyerService) UpdateCartItem(ctx context.Context, buyerID string, itemID string, input domain.UpdateCartItemInput) (*domain.CartItem, error) {
	if input.Quantity <= 0 {
		return nil, domain.ErrInvalidQuantity
	}
	return s.buyerRepo.UpdateCartItemQuantity(ctx, buyerID, itemID, input.Quantity)
}

func (s *BuyerService) DeleteCartItem(ctx context.Context, buyerID string, itemID string) error {
	return s.buyerRepo.DeleteCartItem(ctx, buyerID, itemID)
}

// -----------------------------------------------------------------------------
// 3. Alamat Utama, Checkout Summary & Pesanan Cash on Pickup
// -----------------------------------------------------------------------------

func (s *BuyerService) GetPrimaryAddress(ctx context.Context, buyerID string) (*domain.UserLocation, error) {
	if s.userRepo == nil {
		return nil, domain.ErrPrimaryAddressRequired
	}
	user, err := s.userRepo.GetByID(ctx, buyerID)
	if err != nil {
		return nil, err
	}
	if user.Location == nil {
		return nil, domain.ErrPrimaryAddressRequired
	}
	return user.Location, nil
}

func (s *BuyerService) CalculateCheckoutSummary(ctx context.Context, buyerID string, input domain.CheckoutSummaryInput) (*domain.CheckoutSummaryResponse, error) {
	selectedItems, err := s.resolveSelectedCartItems(ctx, buyerID, input.ItemIDs)
	if err != nil {
		return nil, err
	}

	for _, item := range selectedItems {
		if item.Quantity > item.AvailableStock {
			return nil, domain.ErrStockExceeded
		}
	}

	var buyerLoc *domain.UserLocation
	if s.userRepo != nil {
		if u, err := s.userRepo.GetByID(ctx, buyerID); err == nil && u != nil {
			buyerLoc = u.Location
		}
	}

	groups, _, subtotal := groupCartItemsBySeller(selectedItems, buyerLoc)
	allWithinRadius := true
	for _, g := range groups {
		if !g.WithinRange {
			allWithinRadius = false
			break
		}
	}

	handlingFee := calculateHandlingFee(subtotal)
	totalAmount := subtotal + handlingFee

	return &domain.CheckoutSummaryResponse{
		PaymentMethod:   domain.PaymentMethodCashOnPickup,
		PaymentLabel:    "Tunai di Tempat (Cash on Pickup)",
		BuyerAddress:    buyerLoc,
		SellerGroups:    groups,
		TotalItems:      len(selectedItems),
		SubtotalAmount:  subtotal,
		HandlingFee:     handlingFee,
		TotalAmount:     totalAmount,
		MaxRadiusKm:     domain.MaxBuyerRadiusKm,
		AllWithinRadius: allWithinRadius,
	}, nil
}

func (s *BuyerService) CreateOrders(ctx context.Context, buyerID string, input domain.CreateBuyerOrderInput) ([]domain.BuyerOrder, error) {
	selectedItems, err := s.resolveSelectedCartItems(ctx, buyerID, input.ItemIDs)
	if err != nil {
		return nil, err
	}

	var buyerLoc *domain.UserLocation
	if s.userRepo != nil {
		if u, err := s.userRepo.GetByID(ctx, buyerID); err == nil && u != nil {
			buyerLoc = u.Location
		}
	}

	groups, _, _ := groupCartItemsBySeller(selectedItems, buyerLoc)

	// Validasi radius maksimal 80 km dan ketersediaan stok sebelum mengunci stok
	for _, g := range groups {
		if !g.WithinRange {
			return nil, domain.ErrExceedsMaxRadius
		}
		for _, item := range g.Items {
			if item.Quantity > item.AvailableStock {
				return nil, domain.ErrStockExceeded
			}
		}
	}

	// Kunci stok (reserved stock) untuk seluruh item; rollback bila ada yang gagal
	type reservedRecord struct {
		productID string
		source    string
		qty       float64
	}
	var reserved []reservedRecord
	rollbackReserved := func() {
		for _, rec := range reserved {
			_ = s.buyerRepo.RestoreProductStock(ctx, rec.productID, rec.source, rec.qty)
		}
	}

	for _, item := range selectedItems {
		if err := s.buyerRepo.ReserveProductStock(ctx, item.ProductID, item.ProductSource, item.Quantity); err != nil {
			rollbackReserved()
			return nil, err
		}
		reserved = append(reserved, reservedRecord{
			productID: item.ProductID,
			source:    item.ProductSource,
			qty:       item.Quantity,
		})
	}

	var createdOrders []domain.BuyerOrder
	pickupLocID := strings.TrimSpace(input.DeliveryAddressID)
	if pickupLocID == "" && buyerLoc != nil {
		pickupLocID = buyerLoc.ID
	}

	for _, g := range groups {
		handlingFee := calculateHandlingFee(g.Subtotal)
		totalAmount := g.Subtotal + handlingFee

		orderItems := make([]domain.BuyerOrderItem, 0, len(g.Items))
		for _, ci := range g.Items {
			orderItems = append(orderItems, domain.BuyerOrderItem{
				ID:            uuid.New().String(),
				ProductID:     ci.ProductID,
				ProductSource: ci.ProductSource,
				ProductName:   ci.ProductName,
				SellerID:      ci.SellerID,
				Quantity:      ci.Quantity,
				Unit:          ci.Unit,
				UnitPrice:     ci.UnitPrice,
				Subtotal:      ci.Subtotal,
				MediaURL:      ci.MediaURL,
			})
		}

		orderNumber := fmt.Sprintf("COP-%s-%s", time.Now().Format("20060102"), strings.ToUpper(uuid.New().String()[:6]))
		order := &domain.BuyerOrder{
			ID:               uuid.New().String(),
			OrderNumber:      orderNumber,
			BuyerID:          buyerID,
			SellerID:         g.Seller.ID,
			SellerName:       g.Seller.Name,
			SellerPhone:      g.Seller.Phone,
			SellerRole:       g.Seller.Role,
			Status:           domain.BuyerOrderStatusWaitingConfirmation,
			StatusLabel:      domain.GetBuyerOrderStatusLabel(domain.BuyerOrderStatusWaitingConfirmation),
			PaymentMethod:    domain.PaymentMethodCashOnPickup,
			PaymentLabel:     "Tunai di Tempat (Cash on Pickup)",
			SubtotalAmount:   g.Subtotal,
			HandlingFee:      handlingFee,
			TotalAmount:      totalAmount,
			CashToPrepare:    totalAmount,
			PickupLocationID: pickupLocID,
			PickupAddress:    g.Seller.Address,
			PickupLatitude:   g.Seller.Latitude,
			PickupLongitude:  g.Seller.Longitude,
			Notes:            strings.TrimSpace(input.Notes),
			Items:            orderItems,
		}

		if err := s.buyerRepo.CreateBuyerOrder(ctx, order); err != nil {
			rollbackReserved()
			return nil, err
		}
		createdOrders = append(createdOrders, *order)
	}

	// Kosongkan item yang telah di-checkout dari keranjang belanja
	checkedOutIDs := make([]string, 0, len(selectedItems))
	for _, it := range selectedItems {
		checkedOutIDs = append(checkedOutIDs, it.ID)
	}
	_ = s.buyerRepo.DeleteCartItemsByIDs(ctx, buyerID, checkedOutIDs)

	return createdOrders, nil
}

func (s *BuyerService) ListBuyerOrders(ctx context.Context, buyerID string, status string, page int, limit int) (*domain.PaginatedBuyerOrders, error) {
	return s.buyerRepo.ListBuyerOrders(ctx, domain.BuyerOrderFilter{
		BuyerID: buyerID,
		Status:  status,
		Page:    page,
		Limit:   limit,
	})
}

func (s *BuyerService) GetBuyerOrderDetail(ctx context.Context, buyerID string, orderID string) (*domain.BuyerOrder, error) {
	order, err := s.buyerRepo.GetBuyerOrderByID(ctx, orderID)
	if err != nil {
		return nil, err
	}
	if order.BuyerID != buyerID {
		return nil, domain.ErrForbiddenBuyerOrderAccess
	}
	return order, nil
}

func (s *BuyerService) CancelBuyerOrder(ctx context.Context, buyerID string, orderID string) (*domain.BuyerOrder, error) {
	order, err := s.buyerRepo.GetBuyerOrderByID(ctx, orderID)
	if err != nil {
		return nil, err
	}
	if order.BuyerID != buyerID {
		return nil, domain.ErrForbiddenBuyerOrderAccess
	}

	// Hanya boleh dibatalkan selama penjual belum menyetujui transaksi
	if order.Status != domain.BuyerOrderStatusWaitingConfirmation && order.Status != "pending" {
		return nil, domain.ErrBuyerOrderCannotBeCancel
	}

	now := time.Now()
	order.Status = domain.BuyerOrderStatusCancelled
	order.StatusLabel = domain.GetBuyerOrderStatusLabel(order.Status)
	order.CancelledAt = &now

	if err := s.buyerRepo.UpdateBuyerOrderStatus(ctx, order); err != nil {
		return nil, err
	}

	// Kembalikan stok yang sebelumnya dikunci (reserved stock)
	for _, item := range order.Items {
		_ = s.buyerRepo.RestoreProductStock(ctx, item.ProductID, item.ProductSource, item.Quantity)
	}

	return order, nil
}

func (s *BuyerService) ConfirmOrderReceipt(ctx context.Context, buyerID string, orderID string) (*domain.BuyerOrder, error) {
	order, err := s.buyerRepo.GetBuyerOrderByID(ctx, orderID)
	if err != nil {
		return nil, err
	}
	if order.BuyerID != buyerID {
		return nil, domain.ErrForbiddenBuyerOrderAccess
	}

	if order.Status == domain.BuyerOrderStatusCompleted || order.Status == domain.BuyerOrderStatusCancelled {
		return nil, domain.ErrBuyerOrderCannotBeConfirm
	}

	now := time.Now()
	order.Status = domain.BuyerOrderStatusCompleted
	order.StatusLabel = domain.GetBuyerOrderStatusLabel(order.Status)
	order.ConfirmedReceiptAt = &now

	if err := s.buyerRepo.UpdateBuyerOrderStatus(ctx, order); err != nil {
		return nil, err
	}
	return order, nil
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

func (s *BuyerService) resolveSelectedCartItems(ctx context.Context, buyerID string, itemIDs []string) ([]domain.CartItem, error) {
	allItems, err := s.buyerRepo.GetCartItems(ctx, buyerID)
	if err != nil {
		return nil, err
	}
	if len(allItems) == 0 {
		return nil, domain.ErrCartEmpty
	}

	if len(itemIDs) == 0 {
		return allItems, nil
	}

	idSet := make(map[string]bool, len(itemIDs))
	for _, id := range itemIDs {
		idSet[strings.TrimSpace(id)] = true
	}

	var selected []domain.CartItem
	for _, it := range allItems {
		if idSet[it.ID] {
			selected = append(selected, it)
		}
	}
	if len(selected) == 0 {
		return nil, domain.ErrCartEmpty
	}
	return selected, nil
}

func groupCartItemsBySeller(items []domain.CartItem, buyerLoc *domain.UserLocation) ([]domain.CartSellerGroup, float64, float64) {
	groupMap := make(map[string]*domain.CartSellerGroup)
	var keys []string
	var totalQty, grandSubtotal float64

	for _, it := range items {
		key := it.SellerID + ":" + it.ProductSource
		grp, exists := groupMap[key]
		if !exists {
			withinRange := true
			distKm := 0.0
			if buyerLoc != nil && (buyerLoc.Latitude != 0 || buyerLoc.Longitude != 0) && (it.Seller.Latitude != 0 || it.Seller.Longitude != 0) {
				d := geospatial.CalculateHaversineDistance(
					geospatial.Coordinates{Latitude: buyerLoc.Latitude, Longitude: buyerLoc.Longitude},
					geospatial.Coordinates{Latitude: it.Seller.Latitude, Longitude: it.Seller.Longitude},
				)
				distKm = math.Round(d*100) / 100
				withinRange = distKm <= domain.MaxBuyerRadiusKm
			}
			grp = &domain.CartSellerGroup{
				Seller:      it.Seller,
				Source:      it.ProductSource,
				Items:       []domain.CartItem{},
				DistanceKm:  distKm,
				WithinRange: withinRange,
			}
			groupMap[key] = grp
			keys = append(keys, key)
		}
		grp.Items = append(grp.Items, it)
		grp.Subtotal += it.Subtotal
		grp.TotalQty += it.Quantity
		totalQty += it.Quantity
		grandSubtotal += it.Subtotal
	}

	sort.Strings(keys)
	result := make([]domain.CartSellerGroup, 0, len(keys))
	for _, k := range keys {
		result = append(result, *groupMap[k])
	}
	return result, totalQty, grandSubtotal
}

func calculateHandlingFee(subtotal float64) float64 {
	if subtotal <= 0 {
		return 0
	}
	fee := math.Round(subtotal * domain.DefaultHandlingFeeRate)
	if fee < domain.MinHandlingFee {
		return domain.MinHandlingFee
	}
	return fee
}
