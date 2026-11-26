package domain

import (
	"context"
	"errors"
	"strings"
	"time"
)

type ListingStatus string

const (
	ListingStatusDraft     ListingStatus = "draft"
	ListingStatusPublished ListingStatus = "published"
	ListingStatusReserved  ListingStatus = "reserved"
	ListingStatusCompleted ListingStatus = "completed"
	ListingStatusCancelled ListingStatus = "cancelled"
)

var (
	ErrMinPhotoRequired          = errors.New("minimal 1 foto sampel panen wajib diunggah (video bersifat opsional)")
	ErrMaxMediaExceeded          = errors.New("total berkas foto dan video tidak boleh melebihi 5 berkas")
	ErrMaxVideoExceeded          = errors.New("maksimal hanya 1 video yang dapat diunggah")
	ErrMinOrderQuantity          = errors.New("estimasi bobot penjualan minimal 500 kg")
	ErrListingNotFound           = errors.New("data penjualan panen tidak ditemukan")
	ErrListingNotEditable        = errors.New("data panen tidak dapat diubah karena transaksi sudah berjalan atau telah dibatalkan")
	ErrUnauthorizedListingAccess = errors.New("anda tidak memiliki izin untuk mengelola data penjualan panen ini")
)

type FarmerListing struct {
	ID                     string        `json:"id"`
	FarmerID               string        `json:"farmer_id"`
	FarmerName             string        `json:"farmer_name,omitempty"`
	FarmerGroup            string        `json:"farmer_group,omitempty"`
	FarmerPhone            string        `json:"farmer_phone,omitempty"`
	CommodityID            string        `json:"commodity_id"`
	CommodityName          string        `json:"commodity_name,omitempty"`
	Category               string        `json:"category,omitempty"`
	Title                  string        `json:"title"`
	Description            string        `json:"description,omitempty"`
	EstimatedQuantity      float64       `json:"estimated_quantity"`
	AvailableQuantity      float64       `json:"available_quantity"`
	MinOrderQuantity       float64       `json:"min_order_quantity"`
	Unit                   string        `json:"unit"`
	PricePerUnit           float64       `json:"price_per_unit"`
	EstimatedGrossRevenue  float64       `json:"estimated_gross_revenue"`
	EstimatedHarvestDate   string        `json:"estimated_harvest_date,omitempty"`
	ReadyDate              string        `json:"ready_date,omitempty"`
	PickupAddress          string        `json:"pickup_address,omitempty"`
	MediaURLs              []string      `json:"media_urls"`
	Status                 ListingStatus `json:"status"`
	Latitude               float64       `json:"latitude"`
	Longitude              float64       `json:"longitude"`
	CreatedAt              time.Time     `json:"created_at"`
	UpdatedAt              time.Time     `json:"updated_at"`
	DeletedAt              *time.Time    `json:"deleted_at,omitempty"`
}

type CreateListingInput struct {
	CommodityID          string   `json:"commodity_id" form:"commodity_id"`
	CommodityName        string   `json:"commodity_name,omitempty" form:"commodity_name"`
	Category             string   `json:"category,omitempty" form:"category"`
	Title                string   `json:"title" form:"title"`
	Description          string   `json:"description" form:"description"`
	EstimatedQuantity    float64  `json:"estimated_quantity" form:"estimated_quantity"`
	MinOrderQuantity     float64  `json:"min_order_quantity" form:"min_order_quantity"`
	Unit                 string   `json:"unit" form:"unit"`
	PricePerUnit         float64  `json:"price_per_unit" form:"price_per_unit"`
	EstimatedHarvestDate string   `json:"estimated_harvest_date" form:"estimated_harvest_date"`
	ReadyDate            string   `json:"ready_date" form:"ready_date"`
	PickupAddress        string   `json:"pickup_address" form:"pickup_address"`
	MediaURLs            []string `json:"media_urls" form:"media_urls"`
	Latitude             float64  `json:"latitude" form:"latitude"`
	Longitude            float64  `json:"longitude" form:"longitude"`
}

type UpdateListingInput struct {
	CommodityID          *string   `json:"commodity_id,omitempty" form:"commodity_id"`
	CommodityName        *string   `json:"commodity_name,omitempty" form:"commodity_name"`
	Category             *string   `json:"category,omitempty" form:"category"`
	Title                *string   `json:"title,omitempty" form:"title"`
	Description          *string   `json:"description,omitempty" form:"description"`
	EstimatedQuantity    *float64  `json:"estimated_quantity,omitempty" form:"estimated_quantity"`
	MinOrderQuantity     *float64  `json:"min_order_quantity,omitempty" form:"min_order_quantity"`
	PricePerUnit         *float64  `json:"price_per_unit,omitempty" form:"price_per_unit"`
	EstimatedHarvestDate *string   `json:"estimated_harvest_date,omitempty" form:"estimated_harvest_date"`
	ReadyDate            *string   `json:"ready_date,omitempty" form:"ready_date"`
	PickupAddress        *string   `json:"pickup_address,omitempty" form:"pickup_address"`
	MediaURLs            []string  `json:"media_urls,omitempty" form:"media_urls"`
	Latitude             *float64  `json:"latitude,omitempty" form:"latitude"`
	Longitude            *float64  `json:"longitude,omitempty" form:"longitude"`
}

type ListingFilter struct {
	FarmerID    string
	Status      string
	CommodityID string
	Page        int
	Limit       int
}

type PaginatedListings struct {
	Items      []FarmerListing
	TotalItems int64
	Page       int
	Limit      int
	TotalPages int
}

// ValidateMediaComposition memverifikasi aturan komposisi media:
// - Total item: minimal 1, maksimal 5
// - Minimal 1 foto wajib diunggah
// - Maksimal 1 video (opsional)
func ValidateMediaComposition(mediaURLs []string) error {
	if len(mediaURLs) == 0 {
		return ErrMinPhotoRequired
	}
	if len(mediaURLs) > 5 {
		return ErrMaxMediaExceeded
	}

	photoCount := 0
	videoCount := 0

	for _, rawURL := range mediaURLs {
		cleanURL := strings.ToLower(strings.TrimSpace(rawURL))
		if strings.HasSuffix(cleanURL, ".mp4") || strings.HasSuffix(cleanURL, ".mov") || strings.HasSuffix(cleanURL, ".webm") {
			videoCount++
		} else if strings.HasSuffix(cleanURL, ".jpg") || strings.HasSuffix(cleanURL, ".jpeg") || strings.HasSuffix(cleanURL, ".png") || strings.HasSuffix(cleanURL, ".webp") {
			photoCount++
		} else {
			// default jika format URL S3 mengandung indikasi gambar
			photoCount++
		}
	}

	if photoCount < 1 {
		return ErrMinPhotoRequired
	}
	if videoCount > 1 {
		return ErrMaxVideoExceeded
	}

	return nil
}

type ListingRepository interface {
	Create(ctx context.Context, listing *FarmerListing) error
	GetByID(ctx context.Context, id string) (*FarmerListing, error)
	List(ctx context.Context, filter ListingFilter) (*PaginatedListings, error)
	Update(ctx context.Context, listing *FarmerListing) error
	SoftDelete(ctx context.Context, id string, farmerID string) error
}

type FarmerListingRepository = ListingRepository
