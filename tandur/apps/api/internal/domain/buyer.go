package domain

import (
	"context"
	"errors"
	"time"
)

const (
	ProductSourceFarmer    = "farmer"
	ProductSourceMiddleman = "middleman"

	PaymentMethodCashOnPickup = "cash_on_pickup"

	BuyerOrderStatusWaitingConfirmation = "waiting_confirmation"
	BuyerOrderStatusReadyForPickup      = "ready_for_pickup"
	BuyerOrderStatusCompleted           = "completed"
	BuyerOrderStatusCancelled           = "cancelled"

	MaxBuyerRadiusKm       = 80.0
	DefaultHandlingFeeRate = 0.02 // 2% biaya penanganan
	MinHandlingFee         = 2000.0
)

var (
	ErrProductNotFound            = errors.New("produk tidak ditemukan")
	ErrFarmerSourceForbidden      = errors.New("hanya akun pembeli bisnis (business_buyer) yang dapat mengakses pasokan langsung dari petani")
	ErrCartItemNotFound           = errors.New("item keranjang tidak ditemukan")
	ErrInvalidQuantity            = errors.New("kuantitas harus lebih dari 0")
	ErrStockExceeded              = errors.New("kuantitas yang diminta melebihi stok tersedia")
	ErrCartEmpty                  = errors.New("keranjang belanja atau item yang dipilih kosong")
	ErrPrimaryAddressRequired     = errors.New("alamat utama pembeli belum diatur; silakan lengkapi profil alamat terlebih dahulu")
	ErrExceedsMaxRadius           = errors.New("lokasi penjual berada di luar batas jangkauan radius maksimal 80 km")
	ErrBuyerOrderNotFound         = errors.New("pesanan pembeli tidak ditemukan")
	ErrBuyerOrderCannotBeCancel   = errors.New("pesanan tidak dapat dibatalkan karena sudah diproses atau disetujui penjual")
	ErrBuyerOrderCannotBeConfirm  = errors.New("pesanan tidak dapat dikonfirmasi penerimaannya pada status saat ini")
	ErrForbiddenBuyerOrderAccess  = errors.New("anda tidak memiliki izin mengakses pesanan ini")
)

// ProductCategory merepresentasikan kategori komoditas untuk filter beranda pembeli
type ProductCategory struct {
	ID          string `json:"id"`
	Slug        string `json:"slug"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	Icon        string `json:"icon,omitempty"`
}

// ProductSellerInfo menyimpan ringkasan penjual (petani atau tengkulak/distributor)
type ProductSellerInfo struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	Phone     string  `json:"phone,omitempty"`
	Role      string  `json:"role"` // "farmer" atau "middleman"
	RoleLabel string  `json:"role_label"`
	Address   string  `json:"address,omitempty"`
	City      string  `json:"city,omitempty"`
	Province  string  `json:"province,omitempty"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

// BuyerProduct merepresentasikan item katalog komoditas yang dilihat pembeli
type BuyerProduct struct {
	ID                   string            `json:"id"`
	Source               string            `json:"source"` // "farmer" atau "middleman"
	SourceLabel          string            `json:"source_label"`
	CommodityID          string            `json:"commodity_id,omitempty"`
	CommodityName        string            `json:"commodity_name"`
	CategoryID           string            `json:"category_id"`
	CategoryName         string            `json:"category_name"`
	Name                 string            `json:"name"`
	Description          string            `json:"description,omitempty"`
	Price                float64           `json:"price"`
	Unit                 string            `json:"unit"`
	AvailableStock       float64           `json:"available_stock"`
	MinOrderQuantity     float64           `json:"min_order_quantity"`
	IsPreorder           bool              `json:"is_preorder"`
	EstimatedHarvestDate string            `json:"estimated_harvest_date,omitempty"`
	MediaURLs            []string          `json:"media_urls"`
	PrimaryImageURL      string            `json:"primary_image_url,omitempty"`
	SoldCount            int64             `json:"sold_count"`
	DistanceKm           float64           `json:"distance_km"`
	Seller               ProductSellerInfo `json:"seller"`
	CreatedAt            time.Time         `json:"created_at"`
}

// BuyerProductFilter parameter pencarian & filter katalog produk pembeli
type BuyerProductFilter struct {
	Latitude          *float64
	Longitude         *float64
	RadiusKm          float64 // default 80, max 80
	CategoryID        string
	Search            string
	IsPreorder        *bool
	Source            string // "", "farmer", "middleman"
	AllowFarmerSource bool   // true hanya untuk business_buyer
	City              string
	Page              int
	Limit             int
}

type PaginatedBuyerProducts struct {
	Items      []BuyerProduct `json:"items"`
	TotalItems int64          `json:"total_items"`
	Page       int            `json:"page"`
	Limit      int            `json:"limit"`
	TotalPages int            `json:"total_pages"`
}

// CartItem merepresentasikan satu baris item di keranjang belanja pembeli
type CartItem struct {
	ID             string            `json:"id"`
	BuyerID        string            `json:"buyer_id"`
	ProductID      string            `json:"product_id"`
	ProductSource  string            `json:"product_source"` // "farmer" atau "middleman"
	SellerID       string            `json:"seller_id"`
	ProductName    string            `json:"product_name"`
	CommodityName  string            `json:"commodity_name,omitempty"`
	CategoryName   string            `json:"category_name,omitempty"`
	Unit           string            `json:"unit"`
	UnitPrice      float64           `json:"unit_price"`
	Quantity       float64           `json:"quantity"`
	AvailableStock float64           `json:"available_stock"`
	Subtotal       float64           `json:"subtotal"`
	MediaURL       string            `json:"media_url,omitempty"`
	IsPreorder     bool              `json:"is_preorder"`
	Seller         ProductSellerInfo `json:"seller"`
	CreatedAt      time.Time         `json:"created_at"`
	UpdatedAt      time.Time         `json:"updated_at"`
}

// CartSellerGroup mengelompokkan item keranjang berdasarkan penjual (mendukung Konsolidasi Stok)
type CartSellerGroup struct {
	Seller      ProductSellerInfo `json:"seller"`
	Source      string            `json:"source"`
	Items       []CartItem        `json:"items"`
	Subtotal    float64           `json:"subtotal"`
	TotalQty    float64           `json:"total_quantity"`
	DistanceKm  float64           `json:"distance_km,omitempty"`
	WithinRange bool              `json:"within_range"`
}

// BuyerCartResponse adalah respons GET /api/v1/cart
type BuyerCartResponse struct {
	SellerGroups  []CartSellerGroup `json:"seller_groups"`
	TotalSellers  int               `json:"total_sellers"`
	TotalItems    int               `json:"total_items"`
	TotalQuantity float64           `json:"total_quantity"`
	GrandSubtotal float64           `json:"grand_subtotal"`
}

// AddCartItemInput payload POST /api/v1/cart/items
type AddCartItemInput struct {
	ProductID string  `json:"product_id" form:"product_id"`
	Quantity  float64 `json:"quantity" form:"quantity"`
	Source    string  `json:"source,omitempty" form:"source"`
}

// UpdateCartItemInput payload PATCH /api/v1/cart/items/:item_id
type UpdateCartItemInput struct {
	Quantity float64 `json:"quantity" form:"quantity"`
}

// CheckoutSummaryInput payload POST /api/v1/orders/checkout-summary
type CheckoutSummaryInput struct {
	ItemIDs []string `json:"item_ids"`
}

// CheckoutSummaryResponse respons kalkulasi sebelum buat pesanan
type CheckoutSummaryResponse struct {
	PaymentMethod    string            `json:"payment_method"`
	PaymentLabel     string            `json:"payment_label"`
	BuyerAddress     *UserLocation     `json:"buyer_address"`
	SellerGroups     []CartSellerGroup `json:"seller_groups"`
	TotalItems       int               `json:"total_items"`
	SubtotalAmount   float64           `json:"subtotal_amount"`
	HandlingFee      float64           `json:"handling_fee"`
	TotalAmount      float64           `json:"total_amount"`
	MaxRadiusKm      float64           `json:"max_radius_km"`
	AllWithinRadius  bool              `json:"all_within_radius"`
}

// CreateBuyerOrderInput payload POST /api/v1/orders
type CreateBuyerOrderInput struct {
	ItemIDs           []string `json:"item_ids"`
	DeliveryAddressID string   `json:"delivery_address_id"`
	Notes             string   `json:"notes"`
}

// BuyerOrderItem item produk di dalam pesanan pembeli
type BuyerOrderItem struct {
	ID            string  `json:"id"`
	OrderID       string  `json:"order_id"`
	ProductID     string  `json:"product_id"`
	ProductSource string  `json:"product_source"`
	ProductName   string  `json:"product_name"`
	SellerID      string  `json:"seller_id"`
	Quantity      float64 `json:"quantity"`
	Unit          string  `json:"unit"`
	UnitPrice     float64 `json:"unit_price"`
	Subtotal      float64 `json:"subtotal"`
	MediaURL      string  `json:"media_url,omitempty"`
}

// BuyerOrder merepresentasikan transaksi pesanan pembeli (Cash on Pickup)
type BuyerOrder struct {
	ID                 string           `json:"id"`
	OrderNumber        string           `json:"order_number"`
	BuyerID            string           `json:"buyer_id"`
	SellerID           string           `json:"seller_id"`
	SellerName         string           `json:"seller_name"`
	SellerPhone        string           `json:"seller_phone"`
	SellerRole         string           `json:"seller_role"`
	Status             string           `json:"status"`
	StatusLabel        string           `json:"status_label"`
	PaymentMethod      string           `json:"payment_method"`
	PaymentLabel       string           `json:"payment_label"`
	SubtotalAmount     float64          `json:"subtotal_amount"`
	HandlingFee        float64          `json:"handling_fee"`
	TotalAmount        float64          `json:"total_amount"`
	CashToPrepare      float64          `json:"cash_to_prepare"`
	PickupLocationID   string           `json:"pickup_location_id,omitempty"`
	PickupAddress      string           `json:"pickup_address"`
	PickupLatitude     float64          `json:"pickup_latitude"`
	PickupLongitude    float64          `json:"pickup_longitude"`
	Notes              string           `json:"notes,omitempty"`
	Items              []BuyerOrderItem `json:"items"`
	ConfirmedReceiptAt *time.Time       `json:"confirmed_receipt_at,omitempty"`
	CancelledAt        *time.Time       `json:"cancelled_at,omitempty"`
	CreatedAt          time.Time        `json:"created_at"`
	UpdatedAt          time.Time        `json:"updated_at"`
}

type BuyerOrderFilter struct {
	BuyerID string
	Status  string
	Page    int
	Limit   int
}

type PaginatedBuyerOrders struct {
	Items      []BuyerOrder `json:"items"`
	TotalItems int64        `json:"total_items"`
	Page       int          `json:"page"`
	Limit      int          `json:"limit"`
	TotalPages int          `json:"total_pages"`
}

func GetBuyerOrderStatusLabel(status string) string {
	switch status {
	case BuyerOrderStatusWaitingConfirmation, "pending":
		return "Menunggu Konfirmasi"
	case "confirmed", "processing":
		return "Diproses Penjual"
	case BuyerOrderStatusReadyForPickup:
		return "Siap Diambil"
	case BuyerOrderStatusCompleted:
		return "Selesai"
	case BuyerOrderStatusCancelled:
		return "Dibatalkan"
	default:
		return status
	}
}

// BuyerRepository antarmuka abstraksi data untuk seluruh modul Pembeli
type BuyerRepository interface {
	// Katalog & Kategori
	ListCategories(ctx context.Context) ([]ProductCategory, error)
	ListProducts(ctx context.Context, filter BuyerProductFilter) (*PaginatedBuyerProducts, error)
	ListPopularProducts(ctx context.Context, filter BuyerProductFilter) ([]BuyerProduct, error)
	GetProductByID(ctx context.Context, productID string, sourceHint string) (*BuyerProduct, error)

	// Keranjang Belanja
	GetCartItems(ctx context.Context, buyerID string) ([]CartItem, error)
	GetCartItemByID(ctx context.Context, buyerID string, itemID string) (*CartItem, error)
	UpsertCartItem(ctx context.Context, buyerID string, product *BuyerProduct, quantity float64) (*CartItem, error)
	UpdateCartItemQuantity(ctx context.Context, buyerID string, itemID string, quantity float64) (*CartItem, error)
	DeleteCartItem(ctx context.Context, buyerID string, itemID string) error
	DeleteCartItemsByIDs(ctx context.Context, buyerID string, itemIDs []string) error

	// Stok (Reserve / Restore saat checkout & batal)
	ReserveProductStock(ctx context.Context, productID string, source string, qty float64) error
	RestoreProductStock(ctx context.Context, productID string, source string, qty float64) error

	// Pesanan Pembeli
	CreateBuyerOrder(ctx context.Context, order *BuyerOrder) error
	ListBuyerOrders(ctx context.Context, filter BuyerOrderFilter) (*PaginatedBuyerOrders, error)
	GetBuyerOrderByID(ctx context.Context, orderID string) (*BuyerOrder, error)
	UpdateBuyerOrderStatus(ctx context.Context, order *BuyerOrder) error
}
