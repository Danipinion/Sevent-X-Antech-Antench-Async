package domain

import (
	"context"
	"time"
)

type Inventory struct {
	ID           string       `json:"id"`
	CommodityID  string       `json:"commodity_id"`
	OwnerID      string       `json:"owner_id"`
	Quantity     float64      `json:"quantity"`
	Unit         string       `json:"unit"`
	QualityGrade QualityGrade `json:"quality_grade"`
	LocationName string       `json:"location_name"`
	Latitude     float64      `json:"latitude"`
	Longitude    float64      `json:"longitude"`
	HarvestDate  time.Time    `json:"harvest_date"`
	CreatedAt    time.Time    `json:"created_at"`
	UpdatedAt    time.Time    `json:"updated_at"`
}

type InventoryRepository interface {
	GetAll(ctx context.Context) ([]Inventory, error)
	GetByCommodityID(ctx context.Context, commodityID string) ([]Inventory, error)
	Create(ctx context.Context, item *Inventory) error
	UpdateStock(ctx context.Context, id string, quantity float64) error
}
