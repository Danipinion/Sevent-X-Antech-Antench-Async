package domain

import (
	"context"
	"errors"
	"fmt"
	"time"
)

type OrderStatus string

const (
	OrderStatusWaitingConfirmation OrderStatus = "waiting_confirmation"
	OrderStatusInNegotiation       OrderStatus = "in_negotiation"
	OrderStatusScheduledPickup     OrderStatus = "scheduled_pickup"
	OrderStatusCompleted           OrderStatus = "completed"
	OrderStatusCancelled           OrderStatus = "cancelled"
)

var (
	ErrOrderNotFound               = errors.New("data pesanan tidak ditemukan")
	ErrListingNotAvailable         = errors.New("listing panen tidak tersedia atau kuantitas habis")
	ErrQuantityExceedsAvailable    = errors.New("kuantitas tawaran melebihi stok panen yang tersedia")
	ErrOrderNotWaitingApproval     = errors.New("pesanan tidak dalam status menunggu persetujuan")
	ErrUnauthorizedOrderAccess     = errors.New("anda tidak memiliki izin untuk mengakses atau mengelola pesanan ini")
	ErrInvalidOrderAction          = errors.New("aksi tidak valid untuk status pesanan saat ini")
	ErrOnlyMiddlemanCanCreateOffer = errors.New("hanya akun tengkulak atau pembeli bisnis yang dapat mengajukan penawaran")
	ErrCounterPriceRequired        = errors.New("harga tandingan wajib diisi untuk mengajukan negosiasi")
)

type FarmerPurchaseOrder struct {
	ID                     string      `json:"id"`
	OrderCode              string      `json:"order_code"`
	ListingID              string      `json:"listing_id"`
	FarmerID               string      `json:"farmer_id"`
	MiddlemanID            string      `json:"middleman_id"`
	Status                 OrderStatus `json:"status"`
	StatusLabel            string      `json:"status_label"`
	
	// Informasi Komoditas & Listing Panen
	CommodityID            string      `json:"commodity_id"`
	CommodityName          string      `json:"commodity_name"`
	Category               string      `json:"category"`
	ListingTitle           string      `json:"listing_title"`
	Description            string      `json:"description,omitempty"`
	Unit                   string      `json:"unit"`
	MediaURLs              []string    `json:"media_urls"`

	// Informasi Pembeli / Tengkulak
	BuyerName              string      `json:"buyer_name"`
	BuyerPhone             string      `json:"buyer_phone,omitempty"`
	BuyerType              string      `json:"buyer_type"`
	BuyerCity              string      `json:"buyer_city,omitempty"`
	BuyerRating            float64     `json:"buyer_rating"`

	// Harga & Margin
	OfferedQuantity        float64     `json:"offered_quantity"`
	OfferedPrice           float64     `json:"offered_price"`
	TotalOfferedPrice      float64     `json:"total_offered_price"`
	AgreedPrice            float64     `json:"agreed_price"`
	TotalPrice             float64     `json:"total_price"`
	BenchmarkPrice         float64     `json:"benchmark_price"`
	MarginAmount           float64     `json:"margin_amount"`
	MarginPercentage       float64     `json:"margin_percentage"`
	MarginNote             string      `json:"margin_note"`
	Notes                  string      `json:"notes,omitempty"`

	// Negosiasi
	CounterPrice           *float64    `json:"counter_price,omitempty"`
	CounterQuantity        *float64    `json:"counter_quantity,omitempty"`
	CounterNotes           string      `json:"counter_notes,omitempty"`

	// Logistik & Penjemputan Armada
	PickupDate             string      `json:"pickup_date,omitempty"`
	PickupTimeSlot         string      `json:"pickup_time_slot,omitempty"`
	VehicleType            string      `json:"vehicle_type,omitempty"`
	VehiclePlate           string      `json:"vehicle_plate,omitempty"`
	DriverName             string      `json:"driver_name,omitempty"`
	DriverPhone            string      `json:"driver_phone,omitempty"`
	PickupAddress          string      `json:"pickup_address,omitempty"`
	IsReadyForPickup       bool        `json:"is_ready_for_pickup"`

	// Timbang Digital & Pelunasan
	ActualWeight           *float64    `json:"actual_weight,omitempty"`
	FinalPricePerUnit      *float64    `json:"final_price_per_unit,omitempty"`
	FinalTotalAmount       *float64    `json:"final_total_amount,omitempty"`
	WeighingCertificateURL string      `json:"weighing_certificate_url,omitempty"`
	InvoiceURL             string      `json:"invoice_url,omitempty"`

	// Timestamps
	AgreementDate          *time.Time  `json:"agreement_date,omitempty"`
	CreatedAt              time.Time   `json:"created_at"`
	UpdatedAt              time.Time   `json:"updated_at"`
}

type FarmerOrderSummary struct {
	TotalSalesThisMonth      float64 `json:"total_sales_this_month"`
	PartnerRating            float64 `json:"partner_rating"`
	AllCount                 int64   `json:"all_count"`
	WaitingConfirmationCount int64   `json:"waiting_confirmation_count"`
	ScheduledPickupCount     int64   `json:"scheduled_pickup_count"`
	CompletedPaidCount       int64   `json:"completed_paid_count"`
	CancelledCount           int64   `json:"cancelled_count"`
}

type OrderFilter struct {
	FarmerID    string
	MiddlemanID string
	Tab         string // all, waiting_confirmation, scheduled_pickup, completed_paid, cancelled
	Search      string
	Month       int
	Year        int
	Page        int
	Limit       int
}

type PaginatedOrders struct {
	Items      []FarmerPurchaseOrder `json:"items"`
	Summary    FarmerOrderSummary    `json:"summary"`
	TotalItems int64                 `json:"total_items"`
	Page       int                   `json:"page"`
	Limit      int                   `json:"limit"`
	TotalPages int                   `json:"total_pages"`
}

type CreateOrderOfferInput struct {
	ListingID       string  `json:"listing_id" form:"listing_id"`
	OfferedQuantity float64 `json:"offered_quantity" form:"offered_quantity"`
	OfferedPrice    float64 `json:"offered_price" form:"offered_price"`
	Notes           string  `json:"notes" form:"notes"`
	PickupDate      string  `json:"pickup_date" form:"pickup_date"`
	PickupTimeSlot  string  `json:"pickup_time_slot" form:"pickup_time_slot"`
	VehicleType     string  `json:"vehicle_type" form:"vehicle_type"`
	VehiclePlate    string  `json:"vehicle_plate" form:"vehicle_plate"`
	DriverName      string  `json:"driver_name" form:"driver_name"`
	DriverPhone     string  `json:"driver_phone" form:"driver_phone"`
}

type NegotiateOrderInput struct {
	CounterPrice    float64  `json:"counter_price" form:"counter_price"`
	CounterQuantity *float64 `json:"counter_quantity,omitempty" form:"counter_quantity"`
	CounterNotes    string   `json:"counter_notes" form:"counter_notes"`
}

type UpdateLogisticsInput struct {
	PickupDate     string `json:"pickup_date" form:"pickup_date"`
	PickupTimeSlot string `json:"pickup_time_slot" form:"pickup_time_slot"`
	VehicleType    string `json:"vehicle_type" form:"vehicle_type"`
	VehiclePlate   string `json:"vehicle_plate" form:"vehicle_plate"`
	DriverName     string `json:"driver_name" form:"driver_name"`
	DriverPhone    string `json:"driver_phone" form:"driver_phone"`
}

type CompleteWeighingInput struct {
	ActualWeight           float64 `json:"actual_weight" form:"actual_weight"`
	FinalPricePerUnit      float64 `json:"final_price_per_unit" form:"final_price_per_unit"`
	WeighingCertificateURL string  `json:"weighing_certificate_url" form:"weighing_certificate_url"`
	InvoiceURL             string  `json:"invoice_url" form:"invoice_url"`
}

type OrderRepository interface {
	Create(ctx context.Context, order *FarmerPurchaseOrder) error
	GetByID(ctx context.Context, id string) (*FarmerPurchaseOrder, error)
	GetByOrderCode(ctx context.Context, code string) (*FarmerPurchaseOrder, error)
	List(ctx context.Context, filter OrderFilter) (*PaginatedOrders, error)
	Update(ctx context.Context, order *FarmerPurchaseOrder) error
}

func GetStatusLabel(s OrderStatus) string {
	switch s {
	case OrderStatusWaitingConfirmation:
		return "Menunggu Persetujuan Anda"
	case OrderStatusInNegotiation:
		return "Dalam Negosiasi"
	case OrderStatusScheduledPickup:
		return "Armada Menuju Lokasi"
	case OrderStatusCompleted:
		return "Transaksi Selesai & Lunas"
	case OrderStatusCancelled:
		return "Dibatalkan"
	default:
		return string(s)
	}
}

func FormatMarginNote(offered, benchmark float64) string {
	if benchmark <= 0 {
		return ""
	}
	diff := offered - benchmark
	if diff > 0 {
		return "Harga Ditawarkan Rp " + formatInt(diff) + "/kg Di Atas Rata-rata Pasar"
	} else if diff < 0 {
		return "Harga Ditawarkan Rp " + formatInt(-diff) + "/kg Di Bawah Rata-rata Pasar"
	}
	return "Harga Ditawarkan Sesuai Acuan Pasar"
}

func formatInt(val float64) string {
	return fmt.Sprintf("%.0f", val)
}
