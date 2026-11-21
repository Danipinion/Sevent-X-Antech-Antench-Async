package application

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strings"
	"sync"
	"time"

	"tandur/api/internal/domain"
)

// MarketPriceCacheTTL durasi penyimpanan cache harga pasar komoditas eksternal SP2KP (6 jam)
const MarketPriceCacheTTL = 6 * time.Hour

// RealtimeMarketPriceCacheTTL durasi pembaruan realtime harga pasar platform Tandur (10 menit)
const RealtimeMarketPriceCacheTTL = 10 * time.Minute

// DefaultMaxMarginPercentage batas margin toleransi harga jual wajar petani (±15%)
const DefaultMaxMarginPercentage = 15.0

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

type memoryRealtimePriceCache struct {
	mu    sync.RWMutex
	items map[string]memoryRealtimeCacheItem
}

type memoryRealtimeCacheItem struct {
	prices    []domain.DashboardCommodityPrice
	expiresAt time.Time
}

func newMemoryRealtimePriceCache() *memoryRealtimePriceCache {
	return &memoryRealtimePriceCache{
		items: make(map[string]memoryRealtimeCacheItem),
	}
}

func (m *memoryRealtimePriceCache) GetRealtimePrices(ctx context.Context, key string) ([]domain.DashboardCommodityPrice, bool) {
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

func (m *memoryRealtimePriceCache) SetRealtimePrices(ctx context.Context, key string, prices []domain.DashboardCommodityPrice, ttl time.Duration) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.items[key] = memoryRealtimeCacheItem{
		prices:    prices,
		expiresAt: time.Now().Add(ttl),
	}
	return nil
}

type FarmerSaleRecord struct {
	CommodityName string
	Price         float64
	Quantity      float64
	CreatedAt     time.Time
}

type CommodityService struct {
	repo                domain.CommodityRepository
	marketPriceProvider domain.MarketPriceProvider
	marketPriceCache    domain.MarketPriceCache
	realtimeCache       domain.RealtimeMarketPriceCache
	salesMu             sync.RWMutex
	farmerSales         []FarmerSaleRecord
}

func NewCommodityService(repo domain.CommodityRepository, optional ...interface{}) *CommodityService {
	s := &CommodityService{
		repo:        repo,
		farmerSales: make([]FarmerSaleRecord, 0),
	}
	for _, opt := range optional {
		switch v := opt.(type) {
		case domain.MarketPriceProvider:
			s.marketPriceProvider = v
		case domain.MarketPriceCache:
			s.marketPriceCache = v
		case domain.RealtimeMarketPriceCache:
			s.realtimeCache = v
		}
	}
	if s.marketPriceCache == nil {
		s.marketPriceCache = newMemoryMarketPriceCache()
	}
	if s.realtimeCache == nil {
		s.realtimeCache = newMemoryRealtimePriceCache()
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

// RecordFarmerSale mencatat transaksi penjualan petani untuk memperbarui harga rata-rata riil pasar Tandur
func (s *CommodityService) RecordFarmerSale(commodityName string, price, quantity float64, recordedAt ...time.Time) {
	t := time.Now()
	if len(recordedAt) > 0 && !recordedAt[0].IsZero() {
		t = recordedAt[0]
	}

	s.salesMu.Lock()
	defer s.salesMu.Unlock()

	s.farmerSales = append(s.farmerSales, FarmerSaleRecord{
		CommodityName: commodityName,
		Price:         price,
		Quantity:      quantity,
		CreatedAt:     t,
	})
}

func (s *CommodityService) calculateInternalAverage(commodityName string, from, to time.Time) (float64, int) {
	s.salesMu.RLock()
	defer s.salesMu.RUnlock()

	var totalWeightedPrice float64
	var totalQuantity float64
	count := 0

	for _, sale := range s.farmerSales {
		if strings.EqualFold(sale.CommodityName, commodityName) || strings.Contains(strings.ToLower(sale.CommodityName), strings.ToLower(commodityName)) {
			if (sale.CreatedAt.After(from) || sale.CreatedAt.Equal(from)) && sale.CreatedAt.Before(to) {
				totalWeightedPrice += sale.Price * sale.Quantity
				totalQuantity += sale.Quantity
				count++
			}
		}
	}

	if count == 0 || totalQuantity == 0 {
		return 0, 0
	}
	return totalWeightedPrice / totalQuantity, count
}

// GetRealtimeDashboardPrices menghasilkan data pantauan harga pasar komoditas untuk widget dashboard petani
// - Diupdate setiap 10 menit sekali (Cache TTL 10 Menit)
// - Delta dan tren dihitung berdasarkan selisih harga hari ini vs penutupan hari kemarin
func (s *CommodityService) GetRealtimeDashboardPrices(ctx context.Context, query domain.MarketPriceQuery) ([]domain.DashboardCommodityPrice, error) {
	cacheKey := fmt.Sprintf("tandur:realtime_dashboard:%s:%s", query.KodeProvinsi, query.KodeKabKota)
	if s.realtimeCache != nil {
		if cached, ok := s.realtimeCache.GetRealtimePrices(ctx, cacheKey); ok && len(cached) > 0 {
			return cached, nil
		}
	}

	type defaultCommodityMeta struct {
		id       string
		name     string
		category string
		unit     string
		baseAvg  float64
		baseYest float64
	}

	defaults := []defaultCommodityMeta{
		{id: "gabah-kering-panen", name: "Gabah Kering Panen", category: "PADI / BERAS", unit: "kg", baseAvg: 7200, baseYest: 7050},
		{id: "gabah-kering-giling", name: "Gabah Kering Giling", category: "PADI / BERAS", unit: "kg", baseAvg: 8100, baseYest: 8100},
		{id: "jagung-pipil-kering", name: "Jagung Pipil Kering", category: "PALAWIJA", unit: "kg", baseAvg: 5600, baseYest: 5400},
		{id: "kedelai-lokal-bersih", name: "Kedelai Lokal Bersih", category: "PALAWIJA", unit: "kg", baseAvg: 11200, baseYest: 11200},
	}

	// 1. Ambil data harga acuan SP2KP Kemendag (jika tersedia)
	var sp2kpPrices []domain.SP2KPCommodityPrice
	if s.marketPriceProvider != nil {
		sp2kpPrices, _ = s.GetMarketPrices(ctx, query)
	}

	sp2kpMap := make(map[string]domain.SP2KPCommodityPrice)
	for _, p := range sp2kpPrices {
		sp2kpMap[strings.ToLower(strings.TrimSpace(p.VariantNama))] = p
	}

	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	yesterdayStart := todayStart.AddDate(0, 0, -1)

	var results []domain.DashboardCommodityPrice

	for _, item := range defaults {
		// Cek apakah ada transaksi penjualan riil di platform Tandur
		todayAvg, todayCount := s.calculateInternalAverage(item.name, todayStart, now)
		yestAvg, yestCount := s.calculateInternalAverage(item.name, yesterdayStart, todayStart)

		var avgPrice float64
		var yestPrice float64
		source := "tandur_real_market"

		if todayCount > 0 {
			avgPrice = todayAvg
		}
		if yestCount > 0 {
			yestPrice = yestAvg
		}

		// Fallback ke data SP2KP jika belum ada transaksi internal Tandur hari ini
		if avgPrice == 0 {
			matched := false
			for name, sp := range sp2kpMap {
				if strings.Contains(name, strings.ToLower(item.name)) || strings.Contains(strings.ToLower(item.name), name) {
					if sp.Harga > 0 {
						avgPrice = sp.Harga
						yestPrice = sp.HargaPembanding
						source = "sp2kp_kemendag"
						matched = true
						break
					}
				}
			}
			if !matched {
				avgPrice = item.baseAvg
				if yestPrice == 0 {
					yestPrice = item.baseYest
				}
				source = "tandur_real_market"
			}
		}

		if yestPrice == 0 {
			yestPrice = avgPrice
		}

		delta := avgPrice - yestPrice
		var pct float64
		if yestPrice > 0 {
			pct = math.Round(((avgPrice-yestPrice)/yestPrice)*10000) / 100
		}

		trend, trendLabel := formatTrendLabel(delta)

		results = append(results, domain.DashboardCommodityPrice{
			CommodityID:      item.id,
			CommodityName:    item.name,
			Category:         item.category,
			Unit:             item.unit,
			AveragePrice:     math.Round(avgPrice),
			YesterdayPrice:   math.Round(yestPrice),
			DeltaPrice:       math.Round(delta),
			PercentageChange: pct,
			Trend:            trend,
			TrendLabel:       trendLabel,
			LastUpdatedAt:    now.Format(time.RFC3339),
			Source:           source,
		})
	}

	// Simpan ke cache 10 menit
	if s.realtimeCache != nil && len(results) > 0 {
		_ = s.realtimeCache.SetRealtimePrices(ctx, cacheKey, results, RealtimeMarketPriceCacheTTL)
	}

	return results, nil
}

func formatTrendLabel(delta float64) (domain.PriceTrend, string) {
	if delta > 0 {
		return domain.TrendUp, fmt.Sprintf("+Rp %d", int(delta))
	} else if delta < 0 {
		return domain.TrendDown, fmt.Sprintf("-Rp %d", int(math.Abs(delta)))
	}
	return domain.TrendStable, "- Stabil"
}

// ValidatePriceMargin memvalidasi apakah harga jual yang diajukan petani berada di rentang wajar harga pasar
func (s *CommodityService) ValidatePriceMargin(proposedPrice, benchmarkPrice float64, maxMarginPercent ...float64) error {
	pct := DefaultMaxMarginPercentage
	if len(maxMarginPercent) > 0 && maxMarginPercent[0] > 0 {
		pct = maxMarginPercent[0]
	}

	if benchmarkPrice <= 0 {
		return nil
	}

	minPrice := math.Round(benchmarkPrice * (1.0 - pct/100.0))
	maxPrice := math.Round(benchmarkPrice * (1.0 + pct/100.0))

	if proposedPrice < minPrice {
		return fmt.Errorf("harga jual Rp %.0f terlalu rendah di bawah batas minimum wajar Rp %.0f (toleransi ±%.0f%%)", proposedPrice, minPrice, pct)
	}
	if proposedPrice > maxPrice {
		return fmt.Errorf("harga jual Rp %.0f terlalu tinggi melampaui batas maksimum wajar Rp %.0f (toleransi ±%.0f%%)", proposedPrice, maxPrice, pct)
	}

	return nil
}

// GetPriceGuide mengembalikan panduan batas rentang harga wajar untuk petani
func (s *CommodityService) GetPriceGuide(ctx context.Context, commodityName string, kodeProvinsi, kodeKabKota string) (*domain.PriceGuide, error) {
	query := domain.MarketPriceQuery{
		KodeProvinsi: kodeProvinsi,
		KodeKabKota:  kodeKabKota,
	}
	prices, err := s.GetRealtimeDashboardPrices(ctx, query)
	if err != nil {
		return nil, err
	}

	var benchmark float64 = 7200
	unit := "kg"
	source := "tandur_real_market"

	for _, p := range prices {
		if strings.EqualFold(p.CommodityName, commodityName) || strings.Contains(strings.ToLower(p.CommodityName), strings.ToLower(commodityName)) {
			benchmark = p.AveragePrice
			unit = p.Unit
			source = p.Source
			break
		}
	}

	minPrice := math.Round(benchmark * (1.0 - DefaultMaxMarginPercentage/100.0))
	maxPrice := math.Round(benchmark * (1.0 + DefaultMaxMarginPercentage/100.0))

	return &domain.PriceGuide{
		CommodityName:    commodityName,
		BenchmarkPrice:   benchmark,
		AllowedMinPrice:  minPrice,
		AllowedMaxPrice:  maxPrice,
		MarginPercentage: DefaultMaxMarginPercentage,
		Unit:             unit,
		Source:           source,
		Message:          fmt.Sprintf("Harga jual disarankan antara Rp %.0f s/d Rp %.0f per %s (toleransi ±%.0f%% dari harga rata-rata pasar Rp %.0f)", minPrice, maxPrice, unit, DefaultMaxMarginPercentage, benchmark),
	}, nil
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
