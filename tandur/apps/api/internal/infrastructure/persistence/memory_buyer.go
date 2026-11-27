package persistence

import (
	"context"
	"math"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"tandur/api/internal/domain"
	"tandur/api/internal/infrastructure/geospatial"
)

type MemoryBuyerRepository struct {
	mu         sync.RWMutex
	categories []domain.ProductCategory
	products   map[string]*domain.BuyerProduct // keyed by product ID
	cartItems  map[string]*domain.CartItem     // keyed by cart item ID
	orders     map[string]*domain.BuyerOrder   // keyed by order ID
}

func NewMemoryBuyerRepository() *MemoryBuyerRepository {
	now := time.Now()
	categories := []domain.ProductCategory{
		{ID: "cat-beras", Slug: "beras", Name: "Beras", Description: "Beras premium, medium, dan gabah lokal", Icon: "grain"},
		{ID: "cat-sayur", Slug: "sayur-segar", Name: "Sayur Segar", Description: "Sayuran hijau dan segar langsung dari kebun", Icon: "leaf"},
		{ID: "cat-buah", Slug: "buah", Name: "Buah", Description: "Buah-buahan segar hasil panen lokal", Icon: "apple"},
		{ID: "cat-bumbu", Slug: "bumbu-rempah", Name: "Bumbu & Rempah", Description: "Cabai, bawang merah, bawang putih, dan rempah dapur", Icon: "flame"},
	}

	seedProducts := []*domain.BuyerProduct{
		// Produk dari Tengkulak / Distributor (tersedia untuk retail_buyer & business_buyer)
		{
			ID:                   "prod-mid-beras-001",
			Source:               domain.ProductSourceMiddleman,
			SourceLabel:          "Tengkulak / Distributor",
			CommodityID:          "comm-beras-premium",
			CommodityName:        "Beras Premium Pandan Wangi",
			CategoryID:           "cat-beras",
			CategoryName:         "Beras",
			Name:                 "Beras Premium Pandan Wangi Cianjur (Karung 25kg)",
			Description:          "Beras pulen wangi kualitas grade A, siap kirim atau ambil di gudang distributor.",
			Price:                14500,
			Unit:                 "kg",
			AvailableStock:       2500,
			MinOrderQuantity:     5,
			IsPreorder:           false,
			EstimatedHarvestDate: "",
			MediaURLs:            []string{"http://localhost:3900/tandur/products/beras-pandan-wangi.jpg"},
			PrimaryImageURL:      "http://localhost:3900/tandur/products/beras-pandan-wangi.jpg",
			SoldCount:            340,
			Seller: domain.ProductSellerInfo{
				ID:        "seller-mid-001",
				Name:      "UD Sumber Pangan Sejahtera",
				Phone:     "081210001001",
				Role:      "middleman",
				RoleLabel: "Tengkulak / Distributor",
				Address:   "Jl. Raya Bandung KM 5, Karangtengah",
				City:      "Kabupaten Cianjur",
				Province:  "Jawa Barat",
				Latitude:  -6.8173,
				Longitude: 107.1394,
			},
			CreatedAt: now.Add(-48 * time.Hour),
		},
		{
			ID:                   "prod-mid-cabai-002",
			Source:               domain.ProductSourceMiddleman,
			SourceLabel:          "Tengkulak / Distributor",
			CommodityID:          "comm-cabai-merah",
			CommodityName:        "Cabai Merah Keriting",
			CategoryID:           "cat-bumbu",
			CategoryName:         "Bumbu & Rempah",
			Name:                 "Cabai Merah Keriting Segar Sortiran",
			Description:          "Cabai merah keriting petikan segar, sudah disortir bersih di gudang pengepul.",
			Price:                38000,
			Unit:                 "kg",
			AvailableStock:       450,
			MinOrderQuantity:     1,
			IsPreorder:           false,
			MediaURLs:            []string{"http://localhost:3900/tandur/products/cabai-merah.jpg"},
			PrimaryImageURL:      "http://localhost:3900/tandur/products/cabai-merah.jpg",
			SoldCount:            512,
			Seller: domain.ProductSellerInfo{
				ID:        "seller-mid-002",
				Name:      "CV Agro Distribusi Nusantara",
				Phone:     "081210001002",
				Role:      "middleman",
				RoleLabel: "Tengkulak / Distributor",
				Address:   "Pasar Induk Cianjur Blok B No. 12",
				City:      "Kabupaten Cianjur",
				Province:  "Jawa Barat",
				Latitude:  -6.8250,
				Longitude: 107.1420,
			},
			CreatedAt: now.Add(-24 * time.Hour),
		},
		{
			ID:                   "prod-mid-tomat-003",
			Source:               domain.ProductSourceMiddleman,
			SourceLabel:          "Tengkulak / Distributor",
			CommodityID:          "comm-tomat",
			CommodityName:        "Tomat Merah Segar",
			CategoryID:           "cat-sayur",
			CategoryName:         "Sayur Segar",
			Name:                 "Tomat Merah Segar Dataran Tinggi",
			Description:          "Tomat merah ranum cocok untuk kebutuhan rumah tangga maupun restoran.",
			Price:                12000,
			Unit:                 "kg",
			AvailableStock:       600,
			MinOrderQuantity:     1,
			IsPreorder:           false,
			MediaURLs:            []string{"http://localhost:3900/tandur/products/tomat-segar.jpg"},
			PrimaryImageURL:      "http://localhost:3900/tandur/products/tomat-segar.jpg",
			SoldCount:            275,
			Seller: domain.ProductSellerInfo{
				ID:        "seller-mid-001",
				Name:      "UD Sumber Pangan Sejahtera",
				Phone:     "081210001001",
				Role:      "middleman",
				RoleLabel: "Tengkulak / Distributor",
				Address:   "Jl. Raya Bandung KM 5, Karangtengah",
				City:      "Kabupaten Cianjur",
				Province:  "Jawa Barat",
				Latitude:  -6.8173,
				Longitude: 107.1394,
			},
			CreatedAt: now.Add(-18 * time.Hour),
		},
		// Produk Langsung dari Petani (HANYA untuk business_buyer!)
		{
			ID:                   "prod-farm-beras-101",
			Source:               domain.ProductSourceFarmer,
			SourceLabel:          "Langsung dari Petani",
			CommodityID:          "comm-beras-premium",
			CommodityName:        "Beras / Gabah Kering Giling Ciherang",
			CategoryID:           "cat-beras",
			CategoryName:         "Beras",
			Name:                 "Panen Langsung Gabah Ciherang Grade A - Lahan Pak Slamet",
			Description:          "Pasokan langsung dari lahan sawah 3 hektar, harga langsung petani tanpa perantara.",
			Price:                11800,
			Unit:                 "kg",
			AvailableStock:       5000,
			MinOrderQuantity:     50,
			IsPreorder:           true,
			EstimatedHarvestDate: now.AddDate(0, 0, 5).Format("2006-01-02"),
			MediaURLs:            []string{"http://localhost:3900/tandur/listings/gabah-ciherang.jpg"},
			PrimaryImageURL:      "http://localhost:3900/tandur/listings/gabah-ciherang.jpg",
			SoldCount:            420,
			Seller: domain.ProductSellerInfo{
				ID:        "seller-farm-101",
				Name:      "Pak Slamet (Gapoktan Makmur)",
				Phone:     "081320002001",
				Role:      "farmer",
				RoleLabel: "Petani",
				Address:   "Desa Sukamaju, Kec. Cianjur",
				City:      "Kabupaten Cianjur",
				Province:  "Jawa Barat",
				Latitude:  -6.8100,
				Longitude: 107.1300,
			},
			CreatedAt: now.Add(-12 * time.Hour),
		},
		{
			ID:                   "prod-farm-jeruk-102",
			Source:               domain.ProductSourceFarmer,
			SourceLabel:          "Langsung dari Petani",
			CommodityID:          "comm-jeruk",
			CommodityName:        "Jeruk Siam Manis",
			CategoryID:           "cat-buah",
			CategoryName:         "Buah",
			Name:                 "Jeruk Siam Petik Kebun Langsung",
			Description:          "Jeruk siam manis segar dipetik langsung sesuai jadwal panen untuk kebutuhan katering/hotel/restoran.",
			Price:                15000,
			Unit:                 "kg",
			AvailableStock:       1200,
			MinOrderQuantity:     20,
			IsPreorder:           true,
			EstimatedHarvestDate: now.AddDate(0, 0, 3).Format("2006-01-02"),
			MediaURLs:            []string{"http://localhost:3900/tandur/listings/jeruk-siam.jpg"},
			PrimaryImageURL:      "http://localhost:3900/tandur/listings/jeruk-siam.jpg",
			SoldCount:            195,
			Seller: domain.ProductSellerInfo{
				ID:        "seller-farm-102",
				Name:      "Ibu Kartini (Kebun Cipanas)",
				Phone:     "081320002002",
				Role:      "farmer",
				RoleLabel: "Petani",
				Address:   "Desa Sindanglaya, Cipanas",
				City:      "Kabupaten Cianjur",
				Province:  "Jawa Barat",
				Latitude:  -6.7320,
				Longitude: 107.0410,
			},
			CreatedAt: now.Add(-6 * time.Hour),
		},
	}

	productsMap := make(map[string]*domain.BuyerProduct, len(seedProducts))
	for _, p := range seedProducts {
		productsMap[p.ID] = p
	}

	return &MemoryBuyerRepository{
		categories: categories,
		products:   productsMap,
		cartItems:  make(map[string]*domain.CartItem),
		orders:     make(map[string]*domain.BuyerOrder),
	}
}

// AddProduct membantu injeksi produk tambahan (berguna untuk testing)
func (r *MemoryBuyerRepository) AddProduct(product *domain.BuyerProduct) {
	r.mu.Lock()
	defer r.mu.Unlock()
	copied := *product
	r.products[copied.ID] = &copied
}

func (r *MemoryBuyerRepository) ListCategories(ctx context.Context) ([]domain.ProductCategory, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	result := make([]domain.ProductCategory, len(r.categories))
	copy(result, r.categories)
	return result, nil
}

func (r *MemoryBuyerRepository) ListProducts(ctx context.Context, filter domain.BuyerProductFilter) (*domain.PaginatedBuyerProducts, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	radiusKm := filter.RadiusKm
	if radiusKm <= 0 || radiusKm > domain.MaxBuyerRadiusKm {
		radiusKm = domain.MaxBuyerRadiusKm
	}

	var matched []domain.BuyerProduct
	searchLower := strings.ToLower(strings.TrimSpace(filter.Search))
	catLower := strings.ToLower(strings.TrimSpace(filter.CategoryID))
	sourceLower := strings.ToLower(strings.TrimSpace(filter.Source))

	for _, p := range r.products {
		if p.AvailableStock <= 0 {
			continue
		}
		// Aturan akses role: retail hanya middleman; business boleh farmer & middleman
		if p.Source == domain.ProductSourceFarmer && !filter.AllowFarmerSource {
			continue
		}
		if sourceLower != "" && sourceLower != "all" && p.Source != sourceLower {
			continue
		}
		if catLower != "" && strings.ToLower(p.CategoryID) != catLower && strings.ToLower(p.CategoryName) != catLower {
			continue
		}
		if filter.IsPreorder != nil && p.IsPreorder != *filter.IsPreorder {
			continue
		}
		if searchLower != "" {
			inName := strings.Contains(strings.ToLower(p.Name), searchLower)
			inCommodity := strings.Contains(strings.ToLower(p.CommodityName), searchLower)
			inDesc := strings.Contains(strings.ToLower(p.Description), searchLower)
			if !inName && !inCommodity && !inDesc {
				continue
			}
		}

		item := *p
		if filter.Latitude != nil && filter.Longitude != nil {
			dist := geospatial.CalculateHaversineDistance(
				geospatial.Coordinates{Latitude: *filter.Latitude, Longitude: *filter.Longitude},
				geospatial.Coordinates{Latitude: p.Seller.Latitude, Longitude: p.Seller.Longitude},
			)
			if dist > radiusKm {
				continue
			}
			item.DistanceKm = math.Round(dist*100) / 100
		}

		matched = append(matched, item)
	}

	sort.Slice(matched, func(i, j int) bool {
		if filter.Latitude != nil && filter.Longitude != nil && matched[i].DistanceKm != matched[j].DistanceKm {
			return matched[i].DistanceKm < matched[j].DistanceKm
		}
		return matched[i].CreatedAt.After(matched[j].CreatedAt)
	})

	page := filter.Page
	if page < 1 {
		page = 1
	}
	limit := filter.Limit
	if limit < 1 {
		limit = 20
	}

	totalItems := int64(len(matched))
	totalPages := int(math.Ceil(float64(totalItems) / float64(limit)))
	if totalPages == 0 {
		totalPages = 1
	}

	start := (page - 1) * limit
	if start >= len(matched) {
		matched = []domain.BuyerProduct{}
	} else {
		end := start + limit
		if end > len(matched) {
			end = len(matched)
		}
		matched = matched[start:end]
	}

	return &domain.PaginatedBuyerProducts{
		Items:      matched,
		TotalItems: totalItems,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	}, nil
}

func (r *MemoryBuyerRepository) ListPopularProducts(ctx context.Context, filter domain.BuyerProductFilter) ([]domain.BuyerProduct, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	radiusKm := filter.RadiusKm
	if radiusKm <= 0 || radiusKm > domain.MaxBuyerRadiusKm {
		radiusKm = domain.MaxBuyerRadiusKm
	}
	cityLower := strings.ToLower(strings.TrimSpace(filter.City))

	var items []domain.BuyerProduct
	for _, p := range r.products {
		if p.AvailableStock <= 0 {
			continue
		}
		if p.Source == domain.ProductSourceFarmer && !filter.AllowFarmerSource {
			continue
		}
		if cityLower != "" && !strings.Contains(strings.ToLower(p.Seller.City), cityLower) {
			continue
		}
		item := *p
		if filter.Latitude != nil && filter.Longitude != nil {
			dist := geospatial.CalculateHaversineDistance(
				geospatial.Coordinates{Latitude: *filter.Latitude, Longitude: *filter.Longitude},
				geospatial.Coordinates{Latitude: p.Seller.Latitude, Longitude: p.Seller.Longitude},
			)
			if dist > radiusKm {
				continue
			}
			item.DistanceKm = math.Round(dist*100) / 100
		}
		items = append(items, item)
	}

	sort.Slice(items, func(i, j int) bool {
		return items[i].SoldCount > items[j].SoldCount
	})

	limit := filter.Limit
	if limit <= 0 {
		limit = 10
	}
	if len(items) > limit {
		items = items[:limit]
	}
	return items, nil
}

func (r *MemoryBuyerRepository) GetProductByID(ctx context.Context, productID string, sourceHint string) (*domain.BuyerProduct, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	p, ok := r.products[productID]
	if !ok {
		return nil, domain.ErrProductNotFound
	}
	if sourceHint != "" && p.Source != sourceHint {
		return nil, domain.ErrProductNotFound
	}
	copied := *p
	return &copied, nil
}

func (r *MemoryBuyerRepository) GetCartItems(ctx context.Context, buyerID string) ([]domain.CartItem, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var items []domain.CartItem
	for _, ci := range r.cartItems {
		if ci.BuyerID != buyerID {
			continue
		}
		item := *ci
		if prod, ok := r.products[ci.ProductID]; ok {
			item.ProductName = prod.Name
			item.CommodityName = prod.CommodityName
			item.CategoryName = prod.CategoryName
			item.Unit = prod.Unit
			item.UnitPrice = prod.Price
			item.AvailableStock = prod.AvailableStock
			item.MediaURL = prod.PrimaryImageURL
			item.IsPreorder = prod.IsPreorder
			item.Seller = prod.Seller
		}
		item.Subtotal = item.UnitPrice * item.Quantity
		items = append(items, item)
	}

	sort.Slice(items, func(i, j int) bool {
		return items[i].CreatedAt.Before(items[j].CreatedAt)
	})
	return items, nil
}

func (r *MemoryBuyerRepository) GetCartItemByID(ctx context.Context, buyerID string, itemID string) (*domain.CartItem, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	ci, ok := r.cartItems[itemID]
	if !ok || ci.BuyerID != buyerID {
		return nil, domain.ErrCartItemNotFound
	}
	item := *ci
	if prod, ok := r.products[ci.ProductID]; ok {
		item.ProductName = prod.Name
		item.UnitPrice = prod.Price
		item.AvailableStock = prod.AvailableStock
		item.Seller = prod.Seller
	}
	item.Subtotal = item.UnitPrice * item.Quantity
	return &item, nil
}

func (r *MemoryBuyerRepository) UpsertCartItem(ctx context.Context, buyerID string, product *domain.BuyerProduct, quantity float64) (*domain.CartItem, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for _, existing := range r.cartItems {
		if existing.BuyerID == buyerID && existing.ProductID == product.ID && existing.ProductSource == product.Source {
			newQty := existing.Quantity + quantity
			if newQty > product.AvailableStock {
				return nil, domain.ErrStockExceeded
			}
			existing.Quantity = newQty
			existing.UnitPrice = product.Price
			existing.AvailableStock = product.AvailableStock
			existing.Subtotal = newQty * product.Price
			existing.UpdatedAt = time.Now()
			copied := *existing
			return &copied, nil
		}
	}

	if quantity > product.AvailableStock {
		return nil, domain.ErrStockExceeded
	}

	now := time.Now()
	newItem := &domain.CartItem{
		ID:             uuid.New().String(),
		BuyerID:        buyerID,
		ProductID:      product.ID,
		ProductSource:  product.Source,
		SellerID:       product.Seller.ID,
		ProductName:    product.Name,
		CommodityName:  product.CommodityName,
		CategoryName:   product.CategoryName,
		Unit:           product.Unit,
		UnitPrice:      product.Price,
		Quantity:       quantity,
		AvailableStock: product.AvailableStock,
		Subtotal:       quantity * product.Price,
		MediaURL:       product.PrimaryImageURL,
		IsPreorder:     product.IsPreorder,
		Seller:         product.Seller,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	r.cartItems[newItem.ID] = newItem
	copied := *newItem
	return &copied, nil
}

func (r *MemoryBuyerRepository) UpdateCartItemQuantity(ctx context.Context, buyerID string, itemID string, quantity float64) (*domain.CartItem, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	existing, ok := r.cartItems[itemID]
	if !ok || existing.BuyerID != buyerID {
		return nil, domain.ErrCartItemNotFound
	}
	if prod, ok := r.products[existing.ProductID]; ok {
		if quantity > prod.AvailableStock {
			return nil, domain.ErrStockExceeded
		}
		existing.UnitPrice = prod.Price
		existing.AvailableStock = prod.AvailableStock
	}
	existing.Quantity = quantity
	existing.Subtotal = quantity * existing.UnitPrice
	existing.UpdatedAt = time.Now()
	copied := *existing
	return &copied, nil
}

func (r *MemoryBuyerRepository) DeleteCartItem(ctx context.Context, buyerID string, itemID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	existing, ok := r.cartItems[itemID]
	if !ok || existing.BuyerID != buyerID {
		return domain.ErrCartItemNotFound
	}
	delete(r.cartItems, itemID)
	return nil
}

func (r *MemoryBuyerRepository) DeleteCartItemsByIDs(ctx context.Context, buyerID string, itemIDs []string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	for _, id := range itemIDs {
		if existing, ok := r.cartItems[id]; ok && existing.BuyerID == buyerID {
			delete(r.cartItems, id)
		}
	}
	return nil
}

func (r *MemoryBuyerRepository) ReserveProductStock(ctx context.Context, productID string, source string, qty float64) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	prod, ok := r.products[productID]
	if !ok {
		return domain.ErrProductNotFound
	}
	if prod.AvailableStock < qty {
		return domain.ErrStockExceeded
	}
	prod.AvailableStock -= qty
	prod.SoldCount += int64(qty)
	return nil
}

func (r *MemoryBuyerRepository) RestoreProductStock(ctx context.Context, productID string, source string, qty float64) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	prod, ok := r.products[productID]
	if !ok {
		return nil
	}
	prod.AvailableStock += qty
	if prod.SoldCount >= int64(qty) {
		prod.SoldCount -= int64(qty)
	}
	return nil
}

func (r *MemoryBuyerRepository) CreateBuyerOrder(ctx context.Context, order *domain.BuyerOrder) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if order.ID == "" {
		order.ID = uuid.New().String()
	}
	now := time.Now()
	if order.CreatedAt.IsZero() {
		order.CreatedAt = now
	}
	order.UpdatedAt = now
	for i := range order.Items {
		if order.Items[i].ID == "" {
			order.Items[i].ID = uuid.New().String()
		}
		order.Items[i].OrderID = order.ID
	}

	copied := *order
	copied.Items = make([]domain.BuyerOrderItem, len(order.Items))
	copy(copied.Items, order.Items)
	r.orders[order.ID] = &copied
	return nil
}

func (r *MemoryBuyerRepository) ListBuyerOrders(ctx context.Context, filter domain.BuyerOrderFilter) (*domain.PaginatedBuyerOrders, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	statusFilter := strings.ToLower(strings.TrimSpace(filter.Status))
	var matched []domain.BuyerOrder
	for _, ord := range r.orders {
		if ord.BuyerID != filter.BuyerID {
			continue
		}
		if statusFilter != "" && statusFilter != "all" && strings.ToLower(ord.Status) != statusFilter {
			continue
		}
		copied := *ord
		copied.Items = make([]domain.BuyerOrderItem, len(ord.Items))
		copy(copied.Items, ord.Items)
		matched = append(matched, copied)
	}

	sort.Slice(matched, func(i, j int) bool {
		return matched[i].CreatedAt.After(matched[j].CreatedAt)
	})

	page := filter.Page
	if page < 1 {
		page = 1
	}
	limit := filter.Limit
	if limit < 1 {
		limit = 20
	}

	totalItems := int64(len(matched))
	totalPages := int(math.Ceil(float64(totalItems) / float64(limit)))
	if totalPages == 0 {
		totalPages = 1
	}

	start := (page - 1) * limit
	if start >= len(matched) {
		matched = []domain.BuyerOrder{}
	} else {
		end := start + limit
		if end > len(matched) {
			end = len(matched)
		}
		matched = matched[start:end]
	}

	return &domain.PaginatedBuyerOrders{
		Items:      matched,
		TotalItems: totalItems,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	}, nil
}

func (r *MemoryBuyerRepository) GetBuyerOrderByID(ctx context.Context, orderID string) (*domain.BuyerOrder, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	ord, ok := r.orders[orderID]
	if !ok {
		return nil, domain.ErrBuyerOrderNotFound
	}
	copied := *ord
	copied.Items = make([]domain.BuyerOrderItem, len(ord.Items))
	copy(copied.Items, ord.Items)
	return &copied, nil
}

func (r *MemoryBuyerRepository) UpdateBuyerOrderStatus(ctx context.Context, order *domain.BuyerOrder) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	existing, ok := r.orders[order.ID]
	if !ok {
		return domain.ErrBuyerOrderNotFound
	}
	existing.Status = order.Status
	existing.StatusLabel = domain.GetBuyerOrderStatusLabel(order.Status)
	existing.ConfirmedReceiptAt = order.ConfirmedReceiptAt
	existing.CancelledAt = order.CancelledAt
	existing.UpdatedAt = time.Now()
	return nil
}
