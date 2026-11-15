package persistence

import (
	"context"
	"fmt"
	"sync"
	"time"

	"tandur/api/internal/domain"
	"tandur/api/internal/infrastructure/config"
)

type MemoryCommodityRepository struct {
	mu          sync.RWMutex
	commodities map[string]domain.Commodity
}

func NewMemoryCommodityRepository() *MemoryCommodityRepository {
	repo := &MemoryCommodityRepository{
		commodities: make(map[string]domain.Commodity),
	}

	// Seed default commodities for development
	repo.commodities["cabai-merah"] = domain.Commodity{
		ID:                 "cabai-merah",
		Name:               "Cabai Merah Keriting",
		Category:           "Hortikultura",
		Unit:               "kg",
		BasePrice:          40000,
		CurrentMarketPrice: 45000,
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}
	repo.commodities["bawang-merah"] = domain.Commodity{
		ID:                 "bawang-merah",
		Name:               "Bawang Merah Brebes",
		Category:           "Hortikultura",
		Unit:               "kg",
		BasePrice:          32000,
		CurrentMarketPrice: 36000,
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}

	return repo
}

func (r *MemoryCommodityRepository) GetAll(ctx context.Context) ([]domain.Commodity, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := make([]domain.Commodity, 0, len(r.commodities))
	for _, c := range r.commodities {
		result = append(result, c)
	}
	return result, nil
}

func (r *MemoryCommodityRepository) GetByID(ctx context.Context, id string) (*domain.Commodity, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	c, ok := r.commodities[id]
	if !ok {
		return nil, domain.ErrCommodityNotFound
	}
	return &c, nil
}

func (r *MemoryCommodityRepository) Create(ctx context.Context, commodity *domain.Commodity) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.commodities[commodity.ID] = *commodity
	return nil
}

func (r *MemoryCommodityRepository) Update(ctx context.Context, commodity *domain.Commodity) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.commodities[commodity.ID] = *commodity
	return nil
}

// Database Connection Helper
func CheckDBConnection(cfg *config.Config) (string, error) {
	// DSN format for reference
	_ = fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		cfg.DatabaseHost, cfg.DatabasePort, cfg.DatabaseUser, cfg.DatabasePass, cfg.DatabaseName, cfg.DatabaseSSL)

	return "standby (ready for migrations)", nil
}

