package tests

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v3"
	adapterHttp "tandur/api/internal/adapter/http"
	"tandur/api/internal/application"
	"tandur/api/internal/domain"
	"tandur/api/internal/infrastructure/config"
	"tandur/api/internal/infrastructure/external"
	"tandur/api/internal/infrastructure/persistence"
)

func TestCommodityService(t *testing.T) {
	repo := persistence.NewMemoryCommodityRepository()
	service := application.NewCommodityService(repo)

	commodities, err := service.ListCommodities(context.Background())
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if len(commodities) == 0 {
		t.Errorf("expected seeded commodities, got 0")
	}
}

func TestPaginationAndTraceResponses(t *testing.T) {
	app := fiber.New()
	app.Use(adapterHttp.TraceMiddleware())

	app.Get("/test-pagination", func(c fiber.Ctx) error {
		pMeta := adapterHttp.NewPaginationMeta(1, 20, 478)
		items := []string{"item1", "item2"}
		return adapterHttp.RespondSuccessWithPagination(c, fiber.StatusOK, "Data paginasi berhasil", items, pMeta)
	})

	req := httptest.NewRequest(http.MethodGet, "/test-pagination", nil)
	req.Header.Set("X-Request-ID", "custom-req-123")
	req.Header.Set("X-Correlation-ID", "custom-corr-456")
	req.Header.Set("X-Trace-ID", "customtraceid0001")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("Test request failed: %v", err)
	}

	var res struct {
		Status  string   `json:"status"`
		Message string   `json:"message"`
		Data    []string `json:"data"`
		Meta    struct {
			Trace struct {
				RequestID     string `json:"request_id"`
				CorrelationID string `json:"correlation_id"`
				TraceID       string `json:"trace_id"`
				SpanID        string `json:"span_id"`
				Timestamp     string `json:"timestamp"`
				APIVersion    string `json:"api_version"`
				ServiceNode   string `json:"service_node"`
			} `json:"trace"`
			Pagination struct {
				Page       int   `json:"page"`
				PerPage    int   `json:"per_page"`
				TotalItems int64 `json:"total_items"`
				TotalPages int   `json:"total_pages"`
				HasNext    bool  `json:"has_next"`
				HasPrev    bool  `json:"has_prev"`
			} `json:"pagination"`
		} `json:"meta"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}
	if res.Status != "success" {
		t.Errorf("Expected status success, got %s", res.Status)
	}
	if res.Meta.Trace.RequestID != "req_custom-req-123" {
		t.Errorf("Expected req_custom-req-123, got %s", res.Meta.Trace.RequestID)
	}
	if res.Meta.Trace.CorrelationID != "corr_custom-corr-456" {
		t.Errorf("Expected corr_custom-corr-456, got %s", res.Meta.Trace.CorrelationID)
	}
	if res.Meta.Trace.TraceID != "customtraceid0001" {
		t.Errorf("Expected customtraceid0001, got %s", res.Meta.Trace.TraceID)
	}
	if res.Meta.Pagination.TotalItems != 478 || res.Meta.Pagination.TotalPages != 24 || !res.Meta.Pagination.HasNext || res.Meta.Pagination.HasPrev {
		t.Errorf("Unexpected pagination values: %+v", res.Meta.Pagination)
	}
}

func TestMarketPriceClient_SP2KP_Integration(t *testing.T) {
	// 1. Mock SP2KP Server
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Errorf("Expected method POST, got %s", r.Method)
		}
		_ = r.ParseForm()
		if r.FormValue("tanggal") != "2026-11-20" {
			t.Errorf("Expected tanggal 2026-11-20, got %s", r.FormValue("tanggal"))
		}
		if r.FormValue("tanggal_pembanding") != "2026-11-19" {
			t.Errorf("Expected tanggal_pembanding 2026-11-19, got %s", r.FormValue("tanggal_pembanding"))
		}
		if r.FormValue("kode_provinsi") != "35" {
			t.Errorf("Expected kode_provinsi 35, got %s", r.FormValue("kode_provinsi"))
		}
		if r.FormValue("kode_kab_kota") != "3519" {
			t.Errorf("Expected kode_kab_kota 3519, got %s", r.FormValue("kode_kab_kota"))
		}

		mockResp := map[string]interface{}{
			"status":  "success",
			"message": "Success retrieving record",
			"data": []map[string]interface{}{
				{
					"variant_id":         2,
					"variant_nama":       "Cabai Merah Keriting",
					"satuan_display":     "kg",
					"tanggal":            "2026-11-20",
					"harga":              48667,
					"tanggal_pembanding": "2026-11-19",
					"harga_pembanding":   48667,
					"delta_harga":        0,
					"persen_perubahan":   0,
					"status_perubahan":   "Tidak Berubah",
					"is_regional":        false,
				},
				{
					"variant_id":         13,
					"variant_nama":       "Bawang Merah",
					"satuan_display":     "kg",
					"tanggal":            "2026-11-20",
					"harga":              26333,
					"tanggal_pembanding": "2026-11-19",
					"harga_pembanding":   26333,
					"delta_harga":        0,
					"persen_perubahan":   0,
					"status_perubahan":   "Tidak Berubah",
					"is_regional":        false,
				},
			},
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(mockResp)
	}))
	defer mockServer.Close()

	// 2. Client call
	client := external.NewMarketPriceClientWithHTTP(mockServer.URL, mockServer.Client())
	prices, err := client.GetCommodityPrices(context.Background(), domain.MarketPriceQuery{
		Tanggal:           "2026-11-20",
		TanggalPembanding: "2026-11-19",
		KodeProvinsi:      "35",
		KodeKabKota:       "3519",
	})
	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	if len(prices) != 2 {
		t.Fatalf("Expected 2 commodities, got %d", len(prices))
	}
	if prices[0].VariantNama != "Cabai Merah Keriting" || prices[0].Harga != 48667 {
		t.Errorf("Unexpected price data: %+v", prices[0])
	}
	if prices[1].VariantNama != "Bawang Merah" || prices[1].Harga != 26333 {
		t.Errorf("Unexpected price data: %+v", prices[1])
	}
}

type mockMarketPriceProvider struct {
	calledDates []string
	results     map[string][]domain.SP2KPCommodityPrice
}

func (m *mockMarketPriceProvider) GetCommodityPrices(ctx context.Context, query domain.MarketPriceQuery) ([]domain.SP2KPCommodityPrice, error) {
	m.calledDates = append(m.calledDates, query.Tanggal)
	if res, ok := m.results[query.Tanggal]; ok {
		return res, nil
	}
	return []domain.SP2KPCommodityPrice{}, nil
}

func TestCommodityService_GetMarketPrices_FallbackOnZero(t *testing.T) {
	today := time.Now().Format("2006-01-02")
	yesterday := time.Now().AddDate(0, 0, -1).Format("2006-01-02")

	mockProvider := &mockMarketPriceProvider{
		results: map[string][]domain.SP2KPCommodityPrice{
			today: {
				{
					VariantID:   2,
					VariantNama: "Cabai Merah Keriting",
					Harga:       0, // Zero price on holiday/morning
				},
			},
			yesterday: {
				{
					VariantID:   2,
					VariantNama: "Cabai Merah Keriting",
					Harga:       45000,
				},
			},
		},
	}

	commodityRepo := persistence.NewMemoryCommodityRepository()
	service := application.NewCommodityService(commodityRepo, mockProvider)

	// Call without explicit tanggal -> should fallback to yesterday when today has harga 0
	prices, err := service.GetMarketPrices(context.Background(), domain.MarketPriceQuery{
		KodeProvinsi: "35",
		KodeKabKota:  "3519",
	})
	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	if len(prices) != 1 {
		t.Fatalf("Expected 1 item, got %d", len(prices))
	}
	if prices[0].Harga != 45000 {
		t.Errorf("Expected fallback to yesterday's price 45000, got %f", prices[0].Harga)
	}
}

func TestHTTP_MarketPricesEndpoints(t *testing.T) {
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mockResp := map[string]interface{}{
			"status":  "success",
			"message": "Success retrieving record",
			"data": []map[string]interface{}{
				{
					"variant_id":         2,
					"variant_nama":       "Cabai Merah Keriting",
					"satuan_display":     "kg",
					"tanggal":            "2026-11-20",
					"harga":              48667,
					"tanggal_pembanding": "2026-11-19",
					"harga_pembanding":   48667,
					"delta_harga":        0,
					"persen_perubahan":   0,
					"status_perubahan":   "Tidak Berubah",
					"is_regional":        false,
				},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(mockResp)
	}))
	defer mockServer.Close()

	client := external.NewMarketPriceClientWithHTTP(mockServer.URL, mockServer.Client())
	repo := persistence.NewMemoryCommodityRepository()
	service := application.NewCommodityService(repo, client)

	cfg := &config.Config{
		AppEnv:    "test",
		JWTSecret: "test-jwt-secret-very-long-string-32-chars",
	}
	authService := application.NewAuthService(nil, cfg.JWTSecret, 24*time.Hour)
	handler := adapterHttp.NewHandler(cfg, nil, service, authService)

	app := fiber.New()
	adapterHttp.SetupRoutes(app, handler)

	// 1. Test GET /api/v1/commodities/market-prices with query params
	reqGET := httptest.NewRequest(http.MethodGet, "/api/v1/commodities/market-prices?tanggal=2026-11-20&tanggal_pembanding=2026-11-19&kode_provinsi=35&kode_kab_kota=3519", nil)
	respGET, err := app.Test(reqGET)
	if err != nil {
		t.Fatalf("GET market prices failed: %v", err)
	}
	if respGET.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(respGET.Body)
		t.Fatalf("Expected status 200, got %d. Body: %s", respGET.StatusCode, string(body))
	}

	var resGET struct {
		Status  string                       `json:"status"`
		Message string                       `json:"message"`
		Data    []domain.SP2KPCommodityPrice `json:"data"`
		Meta    struct {
			Trace struct {
				RequestID string `json:"request_id"`
			} `json:"trace"`
		} `json:"meta"`
	}
	if err := json.NewDecoder(respGET.Body).Decode(&resGET); err != nil {
		t.Fatalf("Failed to decode GET response: %v", err)
	}
	if resGET.Status != "success" {
		t.Errorf("Expected status success, got %s", resGET.Status)
	}
	if len(resGET.Data) != 1 || resGET.Data[0].VariantNama != "Cabai Merah Keriting" {
		t.Errorf("Unexpected commodities data: %+v", resGET.Data)
	}
	if resGET.Meta.Trace.RequestID == "" {
		t.Errorf("Expected non-empty trace request_id")
	}

	// 2. Test POST /api/v1/commodities/market-prices with JSON body
	payload := map[string]string{
		"tanggal":            "2026-11-20",
		"tanggal_pembanding": "2026-11-19",
		"kode_provinsi":      "35",
		"kode_kab_kota":      "3519",
	}
	jsonBody, _ := json.Marshal(payload)
	reqPOST := httptest.NewRequest(http.MethodPost, "/api/v1/commodities/market-prices", bytes.NewReader(jsonBody))
	reqPOST.Header.Set("Content-Type", "application/json")

	respPOST, err := app.Test(reqPOST)
	if err != nil {
		t.Fatalf("POST market prices failed: %v", err)
	}
	if respPOST.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(respPOST.Body)
		t.Fatalf("Expected status 200, got %d. Body: %s", respPOST.StatusCode, string(body))
	}

	var resPOST struct {
		Status string                       `json:"status"`
		Data   []domain.SP2KPCommodityPrice `json:"data"`
	}
	_ = json.NewDecoder(respPOST.Body).Decode(&resPOST)
	if resPOST.Status != "success" || len(resPOST.Data) != 1 {
		t.Errorf("Unexpected POST response: %+v", resPOST)
	}
}

type countingMarketPriceProvider struct {
	callCount int
	data      []domain.SP2KPCommodityPrice
}

func (c *countingMarketPriceProvider) GetCommodityPrices(ctx context.Context, query domain.MarketPriceQuery) ([]domain.SP2KPCommodityPrice, error) {
	c.callCount++
	return c.data, nil
}

func TestCommodityService_GetMarketPrices_6HoursCache(t *testing.T) {
	provider := &countingMarketPriceProvider{
		data: []domain.SP2KPCommodityPrice{
			{
				VariantID:   2,
				VariantNama: "Cabai Merah Keriting",
				Harga:       48667,
			},
		},
	}

	repo := persistence.NewMemoryCommodityRepository()
	service := application.NewCommodityService(repo, provider)

	query := domain.MarketPriceQuery{
		Tanggal:           "2026-11-20",
		TanggalPembanding: "2026-11-19",
		KodeProvinsi:      "35",
		KodeKabKota:       "3519",
	}

	// 1. Panggilan pertama: Cache Miss -> Harus memanggil provider (callCount = 1)
	prices1, err := service.GetMarketPrices(context.Background(), query)
	if err != nil {
		t.Fatalf("First call failed: %v", err)
	}
	if len(prices1) != 1 || prices1[0].Harga != 48667 {
		t.Errorf("Unexpected first call prices: %+v", prices1)
	}
	if provider.callCount != 1 {
		t.Errorf("Expected callCount to be 1 after first call, got %d", provider.callCount)
	}

	// 2. Panggilan kedua dengan query yang sama: Cache Hit -> Mengambil dari cache, provider TIDAK boleh dipanggil lagi (callCount tetap 1)
	prices2, err := service.GetMarketPrices(context.Background(), query)
	if err != nil {
		t.Fatalf("Second call failed: %v", err)
	}
	if len(prices2) != 1 || prices2[0].Harga != 48667 {
		t.Errorf("Unexpected second call prices: %+v", prices2)
	}
	if provider.callCount != 1 {
		t.Errorf("Expected callCount to still be 1 (cache hit), but got %d", provider.callCount)
	}
}

func TestCommodityService_GetRealtimeDashboardPrices(t *testing.T) {
	repo := persistence.NewMemoryCommodityRepository()

	// 1. Uji dengan Provider SP2KP Kemendag (seluruh komoditas SP2KP ditampilkan)
	mockProvider := &mockMarketPriceProvider{
		results: map[string][]domain.SP2KPCommodityPrice{
			time.Now().Format("2006-01-02"): {
				{VariantID: 52, VariantNama: "Beras Medium", SatuanDisplay: "kg", Harga: 13167, HargaPembanding: 13167, PersenPerubahan: 0},
				{VariantID: 51, VariantNama: "Beras Premium", SatuanDisplay: "kg", Harga: 14900, HargaPembanding: 14900, PersenPerubahan: 0},
				{VariantID: 2, VariantNama: "Cabai Merah Keriting", SatuanDisplay: "kg", Harga: 48667, HargaPembanding: 48000, PersenPerubahan: 1.39},
				{VariantID: 3, VariantNama: "Bawang Merah", SatuanDisplay: "kg", Harga: 26333, HargaPembanding: 26500, PersenPerubahan: -0.63},
			},
		},
	}
	serviceWithSP2KP := application.NewCommodityService(repo, mockProvider)
	sp2kpPrices, err := serviceWithSP2KP.GetRealtimeDashboardPrices(context.Background(), domain.MarketPriceQuery{
		KodeProvinsi: "35",
		KodeKabKota:  "3519",
	})
	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}
	if len(sp2kpPrices) != 4 {
		t.Fatalf("Expected all 4 commodities from SP2KP, got %d", len(sp2kpPrices))
	}
	if sp2kpPrices[0].CommodityName != "Beras Medium" || sp2kpPrices[0].Trend != domain.TrendStable {
		t.Errorf("Unexpected first commodity: %+v", sp2kpPrices[0])
	}
	if sp2kpPrices[2].CommodityName != "Cabai Merah Keriting" || sp2kpPrices[2].Trend != domain.TrendUp || sp2kpPrices[2].TrendLabel != "+Rp 667" {
		t.Errorf("Unexpected third commodity: %+v", sp2kpPrices[2])
	}

	// 2. Fallback mode (tanpa provider SP2KP eksternal)
	serviceFallback := application.NewCommodityService(repo)
	prices, err := serviceFallback.GetRealtimeDashboardPrices(context.Background(), domain.MarketPriceQuery{
		KodeProvinsi: "35",
		KodeKabKota:  "3519",
	})
	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}
	if len(prices) != 4 {
		t.Fatalf("Expected 4 fallback dashboard commodities, got %d", len(prices))
	}

	// Cek komoditas Gabah Kering Panen
	gkp := prices[0]
	if gkp.CommodityName != "Gabah Kering Panen" {
		t.Errorf("Expected Gabah Kering Panen, got %s", gkp.CommodityName)
	}
	if gkp.AveragePrice != 7200 || gkp.YesterdayPrice != 7050 {
		t.Errorf("Expected 7200 and 7050, got %f and %f", gkp.AveragePrice, gkp.YesterdayPrice)
	}
	if gkp.Trend != domain.TrendUp || gkp.TrendLabel != "+Rp 150" {
		t.Errorf("Expected TrendUp and '+Rp 150', got %s and %s", gkp.Trend, gkp.TrendLabel)
	}

	// Cek komoditas Gabah Kering Giling (Stabil)
	gkg := prices[1]
	if gkg.CommodityName != "Gabah Kering Giling" {
		t.Errorf("Expected Gabah Kering Giling, got %s", gkg.CommodityName)
	}
	if gkg.Trend != domain.TrendStable || gkg.TrendLabel != "- Stabil" {
		t.Errorf("Expected TrendStable and '- Stabil', got %s and %s", gkg.Trend, gkg.TrendLabel)
	}

	// 3. Simulasi pencatatan penjualan petani hari ini -> harga rata-rata riil Tandur terupdate
	// Catat penjualan Gabah Kering Giling hari ini dengan harga 8.500 (naik dari 8.100)
	serviceFallback.RecordFarmerSale("Gabah Kering Giling", 8500, 1000)

	// Pastikan cache 10 menit mengembalikan cached atau saat diquery ulang di siklus baru menghitung transaksi internal
	// Clear cache untuk mensimulasikan siklus 10 menit berikutnya
	serviceWithoutCache := application.NewCommodityService(repo)
	serviceWithoutCache.RecordFarmerSale("Gabah Kering Giling", 8500, 1000)
	now := time.Now()
	yesterday := now.AddDate(0, 0, -1)
	serviceWithoutCache.RecordFarmerSale("Gabah Kering Giling", 8100, 1000, yesterday)

	newPrices, err := serviceWithoutCache.GetRealtimeDashboardPrices(context.Background(), domain.MarketPriceQuery{})
	if err != nil {
		t.Fatalf("Failed to get realtime prices after sale: %v", err)
	}
	newGKG := newPrices[1]
	if newGKG.AveragePrice != 8500 {
		t.Errorf("Expected updated average price 8500, got %f", newGKG.AveragePrice)
	}
	if newGKG.Trend != domain.TrendUp || newGKG.TrendLabel != "+Rp 400" {
		t.Errorf("Expected TrendUp and '+Rp 400', got %s and %s", newGKG.Trend, newGKG.TrendLabel)
	}
}

func TestCommodityService_ValidatePriceMargin(t *testing.T) {
	service := application.NewCommodityService(nil)

	benchmark := 7000.0 // toleransi ±15% -> 5.950 s/d 8.050

	// Harga wajar
	if err := service.ValidatePriceMargin(7000, benchmark); err != nil {
		t.Errorf("Expected 7000 to be valid, got: %v", err)
	}
	if err := service.ValidatePriceMargin(7500, benchmark); err != nil {
		t.Errorf("Expected 7500 to be valid, got: %v", err)
	}
	if err := service.ValidatePriceMargin(6500, benchmark); err != nil {
		t.Errorf("Expected 6500 to be valid, got: %v", err)
	}

	// Terlalu murah (< 5.950)
	if err := service.ValidatePriceMargin(5000, benchmark); err == nil {
		t.Errorf("Expected error for 5000 (too low)")
	}

	// Terlalu mahal (> 8.050)
	if err := service.ValidatePriceMargin(9000, benchmark); err == nil {
		t.Errorf("Expected error for 9000 (too high)")
	}
}

func TestHTTP_RealtimeDashboardAndPriceGuideEndpoints(t *testing.T) {
	repo := persistence.NewMemoryCommodityRepository()
	service := application.NewCommodityService(repo)

	cfg := &config.Config{
		AppEnv:    "test",
		JWTSecret: "test-jwt-secret-very-long-string-32-chars",
	}
	authService := application.NewAuthService(nil, cfg.JWTSecret, 24*time.Hour)
	handler := adapterHttp.NewHandler(cfg, nil, service, authService)

	app := fiber.New()
	adapterHttp.SetupRoutes(app, handler)

	// 1. GET /api/v1/commodities/realtime-prices
	reqRealtime := httptest.NewRequest(http.MethodGet, "/api/v1/commodities/realtime-prices?kode_provinsi=35&kode_kab_kota=3519", nil)
	respRealtime, err := app.Test(reqRealtime)
	if err != nil {
		t.Fatalf("Realtime prices request failed: %v", err)
	}
	if respRealtime.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(respRealtime.Body)
		t.Fatalf("Expected status 200, got %d. Body: %s", respRealtime.StatusCode, string(body))
	}

	var resRealtime struct {
		Status  string                           `json:"status"`
		Message string                           `json:"message"`
		Data    []domain.DashboardCommodityPrice `json:"data"`
		Meta    struct {
			Trace struct {
				RequestID string `json:"request_id"`
			} `json:"trace"`
		} `json:"meta"`
	}
	if err := json.NewDecoder(respRealtime.Body).Decode(&resRealtime); err != nil {
		t.Fatalf("Failed to decode realtime response: %v", err)
	}
	if resRealtime.Status != "success" || len(resRealtime.Data) != 4 {
		t.Errorf("Expected 4 commodities, got %d", len(resRealtime.Data))
	}
	if resRealtime.Meta.Trace.RequestID == "" {
		t.Errorf("Expected non-empty trace request_id")
	}

	// 2. GET /api/v1/commodities/price-guide
	reqGuide := httptest.NewRequest(http.MethodGet, "/api/v1/commodities/price-guide?commodity_name=Gabah%20Kering%20Panen", nil)
	respGuide, err := app.Test(reqGuide)
	if err != nil {
		t.Fatalf("Price guide request failed: %v", err)
	}
	if respGuide.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(respGuide.Body)
		t.Fatalf("Expected status 200, got %d. Body: %s", respGuide.StatusCode, string(body))
	}

	var resGuide struct {
		Status string            `json:"status"`
		Data   domain.PriceGuide `json:"data"`
	}
	if err := json.NewDecoder(respGuide.Body).Decode(&resGuide); err != nil {
		t.Fatalf("Failed to decode guide response: %v", err)
	}
	if resGuide.Status != "success" || resGuide.Data.AllowedMinPrice >= resGuide.Data.AllowedMaxPrice {
		t.Errorf("Unexpected price guide response: %+v", resGuide)
	}
}
