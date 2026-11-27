package tests

import (
	"bytes"
	"encoding/json"
	"fmt"
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
	"tandur/api/internal/infrastructure/persistence"
)

func setupMiddlemanTestApp() (*fiber.App, string, string, string) {
	cfg := &config.Config{
		JWTSecret:          "test-secret-key-32-bytes-long!",
		JWTExpirationHours: 24,
	}

	userRepo := NewMockUserRepository()
	listingRepo := persistence.NewMemoryListingRepository()
	orderRepo := persistence.NewMemoryOrderRepository()
	middlemanRepo := persistence.NewMemoryMiddlemanRepository(orderRepo)
	commodityRepo := persistence.NewMemoryCommodityRepository()

	authService := application.NewAuthService(userRepo, cfg.JWTSecret, 24*time.Hour)
	commodityService := application.NewCommodityService(commodityRepo)
	farmerService := application.NewFarmerService(userRepo, listingRepo)
	orderService := application.NewOrderService(orderRepo, listingRepo, userRepo, commodityService)
	middlemanService := application.NewMiddlemanService(middlemanRepo, orderRepo, listingRepo, commodityService)

	handler := adapterHttp.NewHandler(cfg, nil, commodityService, authService, farmerService, orderService, middlemanService)

	app := fiber.New()
	adapterHttp.SetupRoutes(app, handler)

	// 1. Registrasi Petani
	farmerReg := `{"name":"Pak Sugeng Santoso","phone":"081111111111","password":"password123","role":"farmer"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewBufferString(farmerReg))
	req.Header.Set("Content-Type", "application/json")
	_, _ = app.Test(req)

	farmerLogin := `{"username":"081111111111","password":"password123"}`
	req = httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBufferString(farmerLogin))
	req.Header.Set("Content-Type", "application/json")
	resp, _ := app.Test(req)
	var fAuth struct {
		Data struct {
			Token string `json:"token"`
		} `json:"data"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&fAuth)
	farmerToken := fAuth.Data.Token

	// Verifikasi Petani
	verPayload := `{"nik":"3321041405760001","name":"SUGENG SANTOSO","birth_place":"Demak","birth_date":"1978-05-14","ktp_address":"Demak","ktp_photo_url":"https://s3.tandur.com/ktp.jpg","declaration_accepted":true}`
	req = httptest.NewRequest(http.MethodPost, "/api/v1/farmer/verification", bytes.NewBufferString(verPayload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+farmerToken)
	_, _ = app.Test(req)

	// Petani buat listing panen
	listingPayload := `{
		"commodity_id": "gkp-ciherang",
		"commodity_name": "Gabah Kering Panen (GKP) Ciherang",
		"title": "Gabah GKP Siap Tebas Demak",
		"description": "Varietas Ciherang Kadar Air 13.8%",
		"estimated_quantity": 10000,
		"price_per_unit": 6800,
		"ready_date": "2025-05-15",
		"pickup_address": "Desa Karangawen, Demak",
		"media_urls": ["https://s3.tandur.com/gabah.jpg"]
	}`
	req = httptest.NewRequest(http.MethodPost, "/api/v1/farmer/listings", bytes.NewBufferString(listingPayload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+farmerToken)
	resp, _ = app.Test(req)
	var lRes struct {
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&lRes)
	listingID := lRes.Data.ID

	// 2. Registrasi Tengkulak (Haji Supardi)
	midReg := `{"name":"Haji Supardi","phone":"082222222222","password":"password123","role":"middleman","is_bisnis":true}`
	req = httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewBufferString(midReg))
	req.Header.Set("Content-Type", "application/json")
	_, _ = app.Test(req)

	midLogin := `{"username":"082222222222","password":"password123"}`
	req = httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBufferString(midLogin))
	req.Header.Set("Content-Type", "application/json")
	resp, _ = app.Test(req)
	var mAuth struct {
		Data struct {
			Token string `json:"token"`
		} `json:"data"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&mAuth)
	middlemanToken := mAuth.Data.Token

	return app, middlemanToken, farmerToken, listingID
}

func TestMiddleman_FullPagesAndEndpoints_E2E(t *testing.T) {
	app, midToken, _, listingID := setupMiddlemanTestApp()

	// ==========================================
	// 1. TENGKULAK - BERANDA
	// ==========================================
	t.Run("1. Beranda Tengkulak Dashboard", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/middleman/dashboard", nil)
		req.Header.Set("Authorization", "Bearer "+midToken)
		resp, err := app.Test(req)
		if err != nil || resp.StatusCode != http.StatusOK {
			t.Fatalf("Get dashboard failed: %d", resp.StatusCode)
		}
		var res struct {
			Data domain.MiddlemanDashboard `json:"data"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&res)
		if res.Data.TotalTransactions.Value == "" {
			t.Errorf("Expected dashboard TotalTransactions value, got empty")
		}
		if len(res.Data.ScheduledPickups) == 0 {
			t.Errorf("Expected scheduled pickups in dashboard, got 0")
		}
		if len(res.Data.BenchmarkPrices) == 0 {
			t.Errorf("Expected benchmark prices in dashboard, got 0")
		}
	})

	// ==========================================
	// 2. TENGKULAK - CARI PETANI & BUAT PO
	// ==========================================
	var orderID string
	t.Run("2. Cari Petani & Buat Penawaran PO", func(t *testing.T) {
		// Cari Petani
		req := httptest.NewRequest(http.MethodGet, "/api/v1/middleman/listings?page=1&limit=10", nil)
		req.Header.Set("Authorization", "Bearer "+midToken)
		resp, _ := app.Test(req)
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("Cari petani failed: %d", resp.StatusCode)
		}

		// Ajukan Order Borongan PO
		offerPayload := fmt.Sprintf(`{
			"listing_id": "%s",
			"offered_quantity": 5000,
			"offered_price": 6800,
			"notes": "Siap angkut dengan truk engkel 4 roda",
			"pickup_date": "2025-05-15",
			"pickup_time_slot": "08:30 WIB",
			"vehicle_type": "Truk Engkel 4 Roda",
			"vehicle_plate": "H 1421 QA",
			"driver_name": "Pak Slamet"
		}`, listingID)
		req = httptest.NewRequest(http.MethodPost, "/api/v1/middleman/orders", bytes.NewBufferString(offerPayload))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+midToken)
		resp, _ = app.Test(req)
		if resp.StatusCode != http.StatusCreated {
			body, _ := io.ReadAll(resp.Body)
			t.Fatalf("Buat penawaran PO failed: %d body=%s", resp.StatusCode, string(body))
		}
		var oRes struct {
			Data domain.FarmerPurchaseOrder `json:"data"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&oRes)
		orderID = oRes.Data.ID
	})

	// ==========================================
	// 3. TENGKULAK - TRANSAKSI & PESANAN (PO)
	// ==========================================
	t.Run("3. Transaksi PO List, Edit Modal, Export CSV, and Detail", func(t *testing.T) {
		// List Orders dengan Tabs & Summary
		req := httptest.NewRequest(http.MethodGet, "/api/v1/middleman/orders?tab=all&page=1&limit=10", nil)
		req.Header.Set("Authorization", "Bearer "+midToken)
		resp, _ := app.Test(req)
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("List orders failed: %d", resp.StatusCode)
		}
		var listRes struct {
			Data []domain.FarmerPurchaseOrder `json:"data"`
			Meta struct {
				Summary domain.MiddlemanOrdersSummary `json:"summary"`
			} `json:"meta"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&listRes)
		if len(listRes.Data) == 0 {
			t.Errorf("Expected orders in list, got 0")
		}

		// Edit PO Modal
		updatePO := `{
			"contract_date": "2025-05-12",
			"offered_quantity": 5500,
			"offered_price": 6850,
			"pickup_date": "2025-05-16",
			"pickup_time_slot": "09:00 WIB",
			"vehicle_type": "Truk Isuzu Elf (#01)",
			"notes": "Pastikan karung 50 kg siap dan timbangan digital dikalibrasi"
		}`
		req = httptest.NewRequest(http.MethodPut, fmt.Sprintf("/api/v1/middleman/orders/%s", orderID), bytes.NewBufferString(updatePO))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+midToken)
		resp, _ = app.Test(req)
		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			t.Fatalf("Update PO failed: %d body=%s", resp.StatusCode, string(body))
		}

		// Export CSV Laporan Transaksi
		req = httptest.NewRequest(http.MethodGet, "/api/v1/middleman/orders/export", nil)
		req.Header.Set("Authorization", "Bearer "+midToken)
		resp, _ = app.Test(req)
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("Export CSV failed: %d", resp.StatusCode)
		}
		csvBody, _ := io.ReadAll(resp.Body)
		if !bytes.Contains(csvBody, []byte("No PO")) {
			t.Errorf("Exported CSV missing header")
		}
	})

	// ==========================================
	// 4. TENGKULAK - PENAWARAN & KESEPAKATAN
	// ==========================================
	t.Run("4. Penawaran & Kesepakatan Harga with Tawar Susulan", func(t *testing.T) {
		// Get Offers List
		req := httptest.NewRequest(http.MethodGet, "/api/v1/middleman/offers?tab=all", nil)
		req.Header.Set("Authorization", "Bearer "+midToken)
		resp, _ := app.Test(req)
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("Get offers failed: %d", resp.StatusCode)
		}

		// Tawar Susulan
		counterPayload := `{"counter_price": 6900, "counter_notes": "Tawar susulan harga mutu super"}`
		req = httptest.NewRequest(http.MethodPost, fmt.Sprintf("/api/v1/middleman/offers/%s/counter", orderID), bytes.NewBufferString(counterPayload))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+midToken)
		resp, _ = app.Test(req)
		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			t.Fatalf("Counter offer failed: %d body=%s", resp.StatusCode, string(body))
		}
	})

	// ==========================================
	// 5. TENGKULAK - INVENTARIS STOK GUDANG
	// ==========================================
	var inventoryID string
	t.Run("5. Inventaris Stok Gudang CRUD, Mutasi, dan Detail", func(t *testing.T) {
		// Tambah Stok Masuk Gudang (Modal)
		addInvPayload := `{
			"commodity_id": "gkp-ciherang",
			"commodity_name": "Gabah Kering Panen (GKP)",
			"category": "gabah",
			"variety": "Ciherang Super",
			"source_gapoktan": "Gapoktan Sumber Makmur - Demak",
			"warehouse_name": "Gudang Karangawen",
			"weight_tons": 18.5,
			"weight_kg": 18500,
			"buy_price_per_kg": 6800,
			"market_price_per_kg": 7250,
			"moisture_content": 13.8,
			"impurity_content": 1.5,
			"notes": "Penerimaan hasil tebas mandiri sawah Karangawen"
		}`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/middleman/inventory", bytes.NewBufferString(addInvPayload))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+midToken)
		resp, _ := app.Test(req)
		if resp.StatusCode != http.StatusCreated {
			body, _ := io.ReadAll(resp.Body)
			t.Fatalf("Add inventory failed: %d body=%s", resp.StatusCode, string(body))
		}
		var invRes struct {
			Data domain.MiddlemanInventory `json:"data"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&invRes)
		inventoryID = invRes.Data.ID

		// Get Inventory List dengan Summary
		req = httptest.NewRequest(http.MethodGet, "/api/v1/middleman/inventory?category=all", nil)
		req.Header.Set("Authorization", "Bearer "+midToken)
		resp, _ = app.Test(req)
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("Get inventory list failed: %d", resp.StatusCode)
		}
		var invListRes struct {
			Data []domain.MiddlemanInventory `json:"data"`
			Meta struct {
				Summary domain.MiddlemanInventorySummary `json:"summary"`
			} `json:"meta"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&invListRes)
		if len(invListRes.Data) == 0 {
			t.Errorf("Expected inventory items, got 0")
		}
		if invListRes.Meta.Summary.TotalStockTons <= 0 {
			t.Errorf("Expected total stock tons > 0")
		}

		// Detail Komoditas Stok (Modal)
		req = httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v1/middleman/inventory/%s", inventoryID), nil)
		req.Header.Set("Authorization", "Bearer "+midToken)
		resp, _ = app.Test(req)
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("Get inventory detail failed: %d", resp.StatusCode)
		}

		// Riwayat Mutasi Arus Logistik Masuk-Keluar Gudang
		req = httptest.NewRequest(http.MethodGet, "/api/v1/middleman/inventory/mutations", nil)
		req.Header.Set("Authorization", "Bearer "+midToken)
		resp, _ = app.Test(req)
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("Get inventory mutations failed: %d", resp.StatusCode)
		}
		var mutRes struct {
			Data []domain.MiddlemanInventoryMutation `json:"data"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&mutRes)
		if len(mutRes.Data) == 0 {
			t.Errorf("Expected at least 1 mutation after adding inventory")
		}
	})

	// ==========================================
	// 6. TENGKULAK - JUAL STOK GUDANG
	// ==========================================
	t.Run("6. Jual Stok Gudang: Buka Penawaran Jual Baru & Bids", func(t *testing.T) {
		// Buka Penawaran Jual Baru (Modal)
		createSalePayload := fmt.Sprintf(`{
			"inventory_id": "%s",
			"offered_tons": 10.0,
			"min_order_tons": 2.0,
			"selling_price_per_kg": 7250,
			"delivery_option": "warehouse_pickup",
			"target_markets": ["rice_mill", "wholesaler"],
			"validity_days": 3
		}`, inventoryID)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/middleman/sales", bytes.NewBufferString(createSalePayload))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+midToken)
		resp, _ := app.Test(req)
		if resp.StatusCode != http.StatusCreated {
			body, _ := io.ReadAll(resp.Body)
			t.Fatalf("Create sale listing failed: %d body=%s", resp.StatusCode, string(body))
		}
		var saleRes struct {
			Data domain.MiddlemanSalesListing `json:"data"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&saleRes)
		saleID := saleRes.Data.ID

		// Get Sales List
		req = httptest.NewRequest(http.MethodGet, "/api/v1/middleman/sales?tab=all", nil)
		req.Header.Set("Authorization", "Bearer "+midToken)
		resp, _ = app.Test(req)
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("Get sales list failed: %d", resp.StatusCode)
		}

		// Get Sale Detail
		req = httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v1/middleman/sales/%s", saleID), nil)
		req.Header.Set("Authorization", "Bearer "+midToken)
		resp, _ = app.Test(req)
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("Get sale detail failed: %d", resp.StatusCode)
		}

		// Close Sale Listing
		req = httptest.NewRequest(http.MethodPut, fmt.Sprintf("/api/v1/middleman/sales/%s/close", saleID), nil)
		req.Header.Set("Authorization", "Bearer "+midToken)
		resp, _ = app.Test(req)
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("Close sale listing failed: %d", resp.StatusCode)
		}
	})
}
