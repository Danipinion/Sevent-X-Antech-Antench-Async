package application

import (
	"context"
	"errors"
	"time"

	"tandur/api/internal/domain"
)

type CommodityService struct {
	repo               domain.CommodityRepository
	marketPriceProvider domain.MarketPriceProvider
}

func NewCommodityService(repo domain.CommodityRepository, marketPriceProvider ...domain.MarketPriceProvider) *CommodityService {
	var provider domain.MarketPriceProvider
	if len(marketPriceProvider) > 0 {
		provider = marketPriceProvider[0]
	}
	return &CommodityService{
		repo:                repo,
		marketPriceProvider: provider,
	}
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

// GetMarketPrices mengambil data harga pasar komoditas dari provider (SP2KP Kemendag)
func (s *CommodityService) GetMarketPrices(ctx context.Context, query domain.MarketPriceQuery) ([]domain.SP2KPCommodityPrice, error) {
	if s.marketPriceProvider == nil {
		return nil, errors.New("market price provider tidak tersedia")
	}

	// 1. Tentukan tanggal acuan jika tidak diisi oleh caller
	explicitTanggal := query.Tanggal != ""
	if !explicitTanggal {
		query.Tanggal = time.Now().Format("2006-01-02")
	}

	// 2. Tentukan tanggal pembanding (default: H-1 dari tanggal)
	if query.TanggalPembanding == "" {
		if t, err := time.Parse("2006-01-02", query.Tanggal); err == nil {
			query.TanggalPembanding = t.AddDate(0, 0, -1).Format("2006-01-02")
		} else {
			query.TanggalPembanding = time.Now().AddDate(0, 0, -1).Format("2006-01-02")
		}
	}

	prices, err := s.marketPriceProvider.GetCommodityPrices(ctx, query)
	if err != nil {
		return nil, err
	}

	// 3. Fallback cerdas: Jika caller tidak menentukan tanggal spesifik dan hasil hari ini masih 0 (belum terupdate oleh Kemendag),
	// otomatis ambil data harga hari kerja kemarin (H-1) yang sudah resmi dipublikasikan
	if !explicitTanggal && len(prices) > 0 && isAllZeroPrices(prices) {
		fallbackDate := time.Now().AddDate(0, 0, -1).Format("2006-01-02")
		fallbackCompare := time.Now().AddDate(0, 0, -2).Format("2006-01-02")
		fallbackQuery := query
		fallbackQuery.Tanggal = fallbackDate
		fallbackQuery.TanggalPembanding = fallbackCompare

		fallbackPrices, errFallback := s.marketPriceProvider.GetCommodityPrices(ctx, fallbackQuery)
		if errFallback == nil && len(fallbackPrices) > 0 && !isAllZeroPrices(fallbackPrices) {
			return fallbackPrices, nil
		}
	}

	return prices, nil
}

func isAllZeroPrices(prices []domain.SP2KPCommodityPrice) bool {
	for _, p := range prices {
		if p.Harga > 0 {
			return false
		}
	}
	return true
}
