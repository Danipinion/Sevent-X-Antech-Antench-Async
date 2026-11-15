package application

import (
	"context"
	"time"

	"tandur/api/internal/domain"
)

type CommodityService struct {
	repo domain.CommodityRepository
}

func NewCommodityService(repo domain.CommodityRepository) *CommodityService {
	return &CommodityService{repo: repo}
}

func (s *CommodityService) ListCommodities(ctx context.Context) ([]domain.Commodity, error) {
	return s.repo.GetAll(ctx)
}

func (s *CommodityService) GetCommodity(ctx context.Context, id string) (*domain.Commodity, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *CommodityService) CreateCommodity(ctx context.Context, name, category, unit string, basePrice float64) (*domain.Commodity, error) {
	if name == "" || category == "" || basePrice <= 0 {
		return nil, domain.ErrInvalidInput
	}

	commodity := &domain.Commodity{
		ID:                 name, // Simplified ID generation for template
		Name:               name,
		Category:           category,
		Unit:               unit,
		BasePrice:          basePrice,
		CurrentMarketPrice: basePrice,
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}

	if err := s.repo.Create(ctx, commodity); err != nil {
		return nil, err
	}

	return commodity, nil
}

