package domain

import (
	"context"
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

type FarmerListing struct {
	ID                   string        `json:"id"`
	FarmerID             string        `json:"farmer_id"`
	CommodityID          string        `json:"commodity_id"`
	CommodityName        string        `json:"commodity_name,omitempty"`
	Title                string        `json:"title"`
	Description          string        `json:"description,omitempty"`
	EstimatedQuantity    float64       `json:"estimated_quantity"`
	AvailableQuantity    float64       `json:"available_quantity"`
	Unit                 string        `json:"unit"`
	PricePerUnit         float64       `json:"price_per_unit,omitempty"`
	EstimatedHarvestDate string        `json:"estimated_harvest_date,omitempty"`
	Status               ListingStatus `json:"status"`
	Latitude             float64       `json:"latitude"`
	Longitude            float64       `json:"longitude"`
	CreatedAt            time.Time     `json:"created_at"`
	UpdatedAt            time.Time     `json:"updated_at"`
}

type CreateListingInput struct {
	CommodityID          string  `json:"commodity_id" form:"commodity_id"`
	Title                string  `json:"title" form:"title"`
	Description          string  `json:"description" form:"description"`
	EstimatedQuantity    float64 `json:"estimated_quantity" form:"estimated_quantity"`
	Unit                 string  `json:"unit" form:"unit"`
	PricePerUnit         float64 `json:"price_per_unit" form:"price_per_unit"`
	EstimatedHarvestDate string  `json:"estimated_harvest_date" form:"estimated_harvest_date"`
	Latitude             float64 `json:"latitude" form:"latitude"`
	Longitude            float64 `json:"longitude" form:"longitude"`
}

type ListingRepository interface {
	Create(ctx context.Context, listing *FarmerListing) error
	GetByID(ctx context.Context, id string) (*FarmerListing, error)
	GetByFarmerID(ctx context.Context, farmerID string) ([]FarmerListing, error)
}
