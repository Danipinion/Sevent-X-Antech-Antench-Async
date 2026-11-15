package domain

import (
	"context"
	"time"
)

type QualityGrade string

const (
	GradeA QualityGrade = "GRADE_A"
	GradeB QualityGrade = "GRADE_B"
	GradeC QualityGrade = "GRADE_C"
)

type Commodity struct {
	ID                 string    `json:"id"`
	Name               string    `json:"name"`
	Category           string    `json:"category"`
	Unit               string    `json:"unit"`
	BasePrice          float64   `json:"base_price"`
	CurrentMarketPrice float64   `json:"current_market_price"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

type CommodityRepository interface {
	GetAll(ctx context.Context) ([]Commodity, error)
	GetByID(ctx context.Context, id string) (*Commodity, error)
	Create(ctx context.Context, commodity *Commodity) error
	Update(ctx context.Context, commodity *Commodity) error
}
