package application

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"tandur/api/internal/domain"
)

// MarketPriceCacheTTL durasi penyimpanan cache harga pasar komoditas (6 jam)
const MarketPriceCacheTTL = 6 * time.Hour

type memoryMarketPriceCache struct {
	mu    sync.RWMutex
	items map[string]memoryCacheItem
}

type memoryCacheItem struct {
	prices    []domain.SP2KPCommodityPrice
	expiresAt time.Time
}

func newMemoryMarketPriceCache() *memoryMarketPriceCache {
	return &memoryMarketPriceCache{
		items: make(map[string]memoryCacheItem),
	}
}

func (m *memoryMarketPriceCache) GetMarketPrices(ctx context.Context, key string) ([]domain.SP2KPCommodityPrice, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	item, ok := m.items[key]
	if !ok {
		return nil, false
	}
	if time.Now().After(item.expiresAt) {
		return nil, false
	}
	return item.prices, true
}

func (m *memoryMarketPriceCache) SetMarketPrices(ctx context.Context, key string, prices []domain.SP2KPCommodityPrice, ttl time.Duration) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.items[key] = memoryCacheItem{
		prices:    prices,
		expiresAt: time.Now().Add(ttl),
	}
	return nil
}

type CommodityService struct {
	repo                domain.CommodityRepository
	marketPriceProvider domain.MarketPriceProvider
	marketPriceCache    domain.MarketPriceCache
}

func NewCommodityService(repo domain.CommodityRepository, optional ...interface{}) *CommodityService {
	s := &CommodityService{
		repo: repo,
	}
	for _, opt := range optional {
		switch v := opt.(type) {
		case domain.MarketPriceProvider:
			s.marketPriceProvider = v
		case domain.MarketPriceCache:
			s.marketPriceCache = v
		}
	}
	if s.marketPriceCache == nil {
		s.marketPriceCache = newMemoryMarketPriceCache()
	}
	return s
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
		ID:                 name,
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

// GetMarketPrices mengambil data harga pasar komoditas dari cache Redis (6 jam) atau provider (SP2KP Kemendag)
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

	// 3. Periksa Cache Redis terlebih dahulu (TTL 6 jam)
	cacheKey := fmt.Sprintf("sp2kp:prices:%s:%s:%s:%s", query.Tanggal, query.TanggalPembanding, query.KodeProvinsi, query.KodeKabKota)
	if s.marketPriceCache != nil {
		if cached, ok := s.marketPriceCache.GetMarketPrices(ctx, cacheKey); ok && len(cached) > 0 {
			return cached, nil
		}
	}

	// 4. Cache MISS -> Panggil API eksternal SP2KP Kemendag
	prices, err := s.marketPriceProvider.GetCommodityPrices(ctx, query)
	if err != nil {
		return nil, err
	}

	// 5. Fallback cerdas: Jika caller tidak menentukan tanggal spesifik dan hasil hari ini masih 0 (belum rilis hari ini),
	// otomatis ambil data harga hari kerja kemarin (H-1) yang sudah resmi dipublikasikan
	if !explicitTanggal && len(prices) > 0 && isAllZeroPrices(prices) {
		fallbackDate := time.Now().AddDate(0, 0, -1).Format("2006-01-02")
		fallbackCompare := time.Now().AddDate(0, 0, -2).Format("2006-01-02")
		fallbackKey := fmt.Sprintf("sp2kp:prices:%s:%s:%s:%s", fallbackDate, fallbackCompare, query.KodeProvinsi, query.KodeKabKota)

		if s.marketPriceCache != nil {
			if cachedFallback, ok := s.marketPriceCache.GetMarketPrices(ctx, fallbackKey); ok && len(cachedFallback) > 0 {
				return cachedFallback, nil
			}
		}

		fallbackQuery := query
		fallbackQuery.Tanggal = fallbackDate
		fallbackQuery.TanggalPembanding = fallbackCompare

		fallbackPrices, errFallback := s.marketPriceProvider.GetCommodityPrices(ctx, fallbackQuery)
		if errFallback == nil && len(fallbackPrices) > 0 && !isAllZeroPrices(fallbackPrices) {
			if s.marketPriceCache != nil {
				_ = s.marketPriceCache.SetMarketPrices(ctx, fallbackKey, fallbackPrices, MarketPriceCacheTTL)
			}
			return fallbackPrices, nil
		}
	}

	// 6. Simpan hasil ke cache Redis dengan durasi 6 jam (jika data valid / tidak bernilai 0 semua)
	if s.marketPriceCache != nil && len(prices) > 0 && !isAllZeroPrices(prices) {
		_ = s.marketPriceCache.SetMarketPrices(ctx, cacheKey, prices, MarketPriceCacheTTL)
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
