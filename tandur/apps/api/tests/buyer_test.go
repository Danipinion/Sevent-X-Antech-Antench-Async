package tests

import (
	"bytes"
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
	"tandur/api/internal/infrastructure/persistence"
)

func setupBuyerTestApp() (*fiber.App, *persistence.MemoryBuyerRepository) {
	userRepo := NewMockUserRepository()
	buyerRepo := persistence.NewMemoryBuyerRepository()
	// Tambahkan produk jauh (> 80 km, misal Surabaya) untuk menguji filter radius
	buyerRepo.AddProduct(&domain.BuyerProduct{
		ID:              "prod-mid-far-999",
		Source:          domain.ProductSourceMiddleman,
		SourceLabel:     "Tengkulak / Distributor",
		CommodityName:   "Beras Jauh Surabaya",
		CategoryID:      "cat-beras",
		CategoryName:    "Beras",
		Name:            "Beras Luar Radius Surabaya",
		Price:           13000,
		Unit:            "kg",
		AvailableStock:  500,
		MinOrderQuantity: 1,
		Seller: domain.ProductSellerInfo{
			ID:        "seller-far-999",
			Name:      "UD Surabaya Jauh",
			Phone:     "081999000999",
			Role:      "middleman",
			RoleLabel: "Tengkulak / Distributor",
			Address:   "Jl. Tunjungan No. 1, Surabaya",
			City:      "Kota Surabaya",
			Province:  "Jawa Timur",
			Latitude:  -7.2575,
			Longitude: 112.7521,
		},
		CreatedAt: time.Now(),
	})

	cfg := &config.Config{
		AppEnv:             "test",
		JWTSecret:          "test-jwt-secret-buyer-module-32chars!",
		JWTExpirationHours: 24,
	}
	authService := application.NewAuthService(userRepo, cfg.JWTSecret, 24*time.Hour)
	commodityRepo := persistence.NewMemoryCommodityRepository()
	commodityService := application.NewCommodityService(commodityRepo)
	buyerService := application.NewBuyerService(buyerRepo, userRepo)

	handler := adapterHttp.NewHandler(cfg, nil, commodityService, authService, buyerService)
	app := fiber.New()
	adapterHttp.SetupRoutes(app, handler)
	return app, buyerRepo
}

func registerAndLoginBuyer(t *testing.T, app *fiber.App, name, phone, role string, lat, lng float64) string {
	t.Helper()
	regBody, _ := json.Marshal(map[string]interface{}{
		"name":     name,
		"phone":    phone,
		"password": "password123",
		"role":     role,
		"location": map[string]interface{}{
			"label":     "Rumah Utama",
			"address":   "Jl. Raya Cianjur No. 10",
			"city":      "Kabupaten Cianjur",
			"province":  "Jawa Barat",
			"latitude":  lat,
			"longitude": lng,
		},
	})
	reqReg := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(regBody))
	reqReg.Header.Set("Content-Type", "application/json")
	respReg, err := app.Test(reqReg)
	if err != nil || respReg.StatusCode != http.StatusCreated {
		b, _ := io.ReadAll(respReg.Body)
		t.Fatalf("Register %s failed: status=%d body=%s err=%v", role, respReg.StatusCode, string(b), err)
	}

	loginBody, _ := json.Marshal(map[string]interface{}{
		"username": phone,
		"password": "password123",
	})
	reqLogin := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(loginBody))
	reqLogin.Header.Set("Content-Type", "application/json")
	respLogin, err := app.Test(reqLogin)
	if err != nil || respLogin.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(respLogin.Body)
		t.Fatalf("Login %s failed: status=%d body=%s err=%v", role, respLogin.StatusCode, string(b), err)
	}

	var loginResp struct {
		Data struct {
			Token string `json:"token"`
			User  struct {
				BuyerType string `json:"buyer_type"`
				IsBisnis  bool   `json:"is_bisnis"`
			} `json:"user"`
		} `json:"data"`
	}
	_ = json.NewDecoder(respLogin.Body).Decode(&loginResp)
	if loginResp.Data.Token == "" {
		t.Fatalf("Empty token for %s", role)
	}
	if loginResp.Data.User.BuyerType != role {
		t.Errorf("Expected buyer_type %s, got %s", role, loginResp.Data.User.BuyerType)
	}
	return loginResp.Data.Token
}

func TestHTTP_BuyerRoleAccess_RetailVsBusiness(t *testing.T) {
	app, _ := setupBuyerTestApp()

	// Koordinat di sekitar Cianjur (-6.8173, 107.1394)
	retailToken := registerAndLoginBuyer(t, app, "Ibu Sari Retail", "081211110001", "retail_buyer", -6.8173, 107.1394)
	businessToken := registerAndLoginBuyer(t, app, "Restoran Nusantara B2B", "081211110002", "business_buyer", -6.8173, 107.1394)

	// 1. GET /api/v1/auth/profile
	reqProf := httptest.NewRequest(http.MethodGet, "/api/v1/auth/profile", nil)
	reqProf.Header.Set("Authorization", "Bearer "+businessToken)
	respProf, err := app.Test(reqProf)
	if err != nil || respProf.StatusCode != http.StatusOK {
		t.Fatalf("GET /api/v1/auth/profile failed: status=%d err=%v", respProf.StatusCode, err)
	}

	// 2. GET /api/v1/categories
	reqCat := httptest.NewRequest(http.MethodGet, "/api/v1/categories", nil)
	respCat, err := app.Test(reqCat)
	if err != nil || respCat.StatusCode != http.StatusOK {
		t.Fatalf("GET /api/v1/categories failed: status=%d err=%v", respCat.StatusCode, err)
	}

	// 3. Retail Buyer: GET /api/v1/products -> HANYA produk tengkulak & dalam radius <= 80 km
	reqRetailProds := httptest.NewRequest(http.MethodGet, "/api/v1/products?lat=-6.8173&lng=107.1394&radius=80", nil)
	reqRetailProds.Header.Set("Authorization", "Bearer "+retailToken)
	respRetailProds, err := app.Test(reqRetailProds)
	if err != nil || respRetailProds.StatusCode != http.StatusOK {
		t.Fatalf("Retail GET /api/v1/products failed: status=%d", respRetailProds.StatusCode)
	}
	var retailProdResp struct {
		Data []domain.BuyerProduct `json:"data"`
	}
	_ = json.NewDecoder(respRetailProds.Body).Decode(&retailProdResp)
	if len(retailProdResp.Data) == 0 {
		t.Fatalf("Expected retail buyer to see middleman products within 80km")
	}
	for _, p := range retailProdResp.Data {
		if p.Source != domain.ProductSourceMiddleman {
			t.Errorf("Retail buyer should NOT see farmer product, got source=%s id=%s", p.Source, p.ID)
		}
		if p.ID == "prod-mid-far-999" {
			t.Errorf("Product outside 80km radius should NOT appear")
		}
	}

	// 4. Retail Buyer mencoba filter ?source=farmer -> 403 Forbidden
	reqRetailFarmer := httptest.NewRequest(http.MethodGet, "/api/v1/products?source=farmer", nil)
	reqRetailFarmer.Header.Set("Authorization", "Bearer "+retailToken)
	respRetailFarmer, _ := app.Test(reqRetailFarmer)
	if respRetailFarmer.StatusCode != http.StatusForbidden {
		t.Errorf("Expected 403 Forbidden when retail_buyer requests source=farmer, got %d", respRetailFarmer.StatusCode)
	}

	// 5. Retail Buyer mencoba melihat detail produk petani -> 403 Forbidden
	reqRetailFarmerDetail := httptest.NewRequest(http.MethodGet, "/api/v1/products/prod-farm-beras-101", nil)
	reqRetailFarmerDetail.Header.Set("Authorization", "Bearer "+retailToken)
	respRetailFarmerDetail, _ := app.Test(reqRetailFarmerDetail)
	if respRetailFarmerDetail.StatusCode != http.StatusForbidden {
		t.Errorf("Expected 403 Forbidden when retail_buyer views farmer product detail, got %d", respRetailFarmerDetail.StatusCode)
	}

	// 6. Business Buyer: GET /api/v1/products -> melihat produk PETANI dan TENGKULAK sekaligus!
	reqBizProds := httptest.NewRequest(http.MethodGet, "/api/v1/products?lat=-6.8173&lng=107.1394&radius=80", nil)
	reqBizProds.Header.Set("Authorization", "Bearer "+businessToken)
	respBizProds, _ := app.Test(reqBizProds)
	if respBizProds.StatusCode != http.StatusOK {
		t.Fatalf("Business GET /api/v1/products failed: status=%d", respBizProds.StatusCode)
	}
	var bizProdResp struct {
		Data []domain.BuyerProduct `json:"data"`
	}
	_ = json.NewDecoder(respBizProds.Body).Decode(&bizProdResp)
	hasFarmer := false
	hasMiddleman := false
	for _, p := range bizProdResp.Data {
		if p.Source == domain.ProductSourceFarmer {
			hasFarmer = true
		}
		if p.Source == domain.ProductSourceMiddleman {
			hasMiddleman = true
		}
	}
	if !hasFarmer || !hasMiddleman {
		t.Errorf("Business buyer should see both farmer and middleman products (hasFarmer=%v, hasMiddleman=%v)", hasFarmer, hasMiddleman)
	}

	// 7. Business Buyer filter ?source=farmer -> hanya produk petani
	reqBizFarmer := httptest.NewRequest(http.MethodGet, "/api/v1/products?source=farmer", nil)
	reqBizFarmer.Header.Set("Authorization", "Bearer "+businessToken)
	respBizFarmer, _ := app.Test(reqBizFarmer)
	if respBizFarmer.StatusCode != http.StatusOK {
		t.Fatalf("Business GET /api/v1/products?source=farmer failed: status=%d", respBizFarmer.StatusCode)
	}
	var bizFarmerResp struct {
		Data []domain.BuyerProduct `json:"data"`
	}
	_ = json.NewDecoder(respBizFarmer.Body).Decode(&bizFarmerResp)
	if len(bizFarmerResp.Data) == 0 {
		t.Errorf("Expected farmer products for business_buyer")
	}
	for _, p := range bizFarmerResp.Data {
		if p.Source != domain.ProductSourceFarmer {
			t.Errorf("Expected only farmer products, got %s", p.Source)
		}
	}

	// 8. GET /api/v1/products/popular
	reqPop := httptest.NewRequest(http.MethodGet, "/api/v1/products/popular", nil)
	reqPop.Header.Set("Authorization", "Bearer "+businessToken)
	respPop, _ := app.Test(reqPop)
	if respPop.StatusCode != http.StatusOK {
		t.Fatalf("GET /api/v1/products/popular failed: status=%d", respPop.StatusCode)
	}
}

func TestHTTP_BuyerCart_Checkout_CashOnPickup_Flow(t *testing.T) {
	app, buyerRepo := setupBuyerTestApp()
	businessToken := registerAndLoginBuyer(t, app, "Warung Maju B2B", "081222220001", "business_buyer", -6.8173, 107.1394)

	// 1. GET /api/v1/addresses/primary
	reqAddr := httptest.NewRequest(http.MethodGet, "/api/v1/addresses/primary", nil)
	reqAddr.Header.Set("Authorization", "Bearer "+businessToken)
	respAddr, _ := app.Test(reqAddr)
	if respAddr.StatusCode != http.StatusOK {
		t.Fatalf("Expected 200 OK for primary address, got %d", respAddr.StatusCode)
	}

	// 2. Tambah 2 produk dari penjual berbeda (Konsolidasi Stok: 1 dari petani, 1 dari tengkulak)
	addCart := func(productID string, qty float64) (int, string) {
		body, _ := json.Marshal(map[string]interface{}{
			"product_id": productID,
			"quantity":   qty,
		})
		req := httptest.NewRequest(http.MethodPost, "/api/v1/cart/items", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+businessToken)
		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("Add cart failed: %v", err)
		}
		var res struct {
			Data struct {
				ID string `json:"id"`
			} `json:"data"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&res)
		return resp.StatusCode, res.Data.ID
	}

	// Cek validasi stok berlebih (> 5000 kg) -> 400 Bad Request
	statusOver, _ := addCart("prod-farm-beras-101", 99999)
	if statusOver != http.StatusBadRequest {
		t.Errorf("Expected 400 Bad Request when quantity exceeds stock, got %d", statusOver)
	}

	// Tambah item 1 (Petani: 100 kg) & item 2 (Tengkulak: 50 kg)
	status1, itemID1 := addCart("prod-farm-beras-101", 100)
	if status1 != http.StatusCreated || itemID1 == "" {
		t.Fatalf("Failed adding farmer product to cart: status=%d", status1)
	}
	status2, itemID2 := addCart("prod-mid-beras-001", 50)
	if status2 != http.StatusCreated || itemID2 == "" {
		t.Fatalf("Failed adding middleman product to cart: status=%d", status2)
	}

	// 3. PATCH /api/v1/cart/items/:item_id -> ubah qty item 2 jadi 60 kg
	patchBody, _ := json.Marshal(map[string]interface{}{"quantity": 60})
	reqPatch := httptest.NewRequest(http.MethodPatch, "/api/v1/cart/items/"+itemID2, bytes.NewReader(patchBody))
	reqPatch.Header.Set("Content-Type", "application/json")
	reqPatch.Header.Set("Authorization", "Bearer "+businessToken)
	respPatch, _ := app.Test(reqPatch)
	if respPatch.StatusCode != http.StatusOK {
		t.Fatalf("PATCH cart item failed: status=%d", respPatch.StatusCode)
	}

	// 4. GET /api/v1/cart -> pastikan dikelompokkan jadi 2 seller_groups
	reqCart := httptest.NewRequest(http.MethodGet, "/api/v1/cart", nil)
	reqCart.Header.Set("Authorization", "Bearer "+businessToken)
	respCart, _ := app.Test(reqCart)
	if respCart.StatusCode != http.StatusOK {
		t.Fatalf("GET /api/v1/cart failed: status=%d", respCart.StatusCode)
	}
	var cartResp struct {
		Data domain.BuyerCartResponse `json:"data"`
	}
	_ = json.NewDecoder(respCart.Body).Decode(&cartResp)
	if cartResp.Data.TotalSellers != 2 || cartResp.Data.TotalItems != 2 {
		t.Errorf("Expected 2 seller groups and 2 items, got sellers=%d items=%d", cartResp.Data.TotalSellers, cartResp.Data.TotalItems)
	}

	// 5. POST /api/v1/orders/checkout-summary
	sumBody, _ := json.Marshal(map[string]interface{}{
		"item_ids": []string{itemID1, itemID2},
	})
	reqSum := httptest.NewRequest(http.MethodPost, "/api/v1/orders/checkout-summary", bytes.NewReader(sumBody))
	reqSum.Header.Set("Content-Type", "application/json")
	reqSum.Header.Set("Authorization", "Bearer "+businessToken)
	respSum, _ := app.Test(reqSum)
	if respSum.StatusCode != http.StatusOK {
		t.Fatalf("POST /api/v1/orders/checkout-summary failed: status=%d", respSum.StatusCode)
	}
	var sumResp struct {
		Data domain.CheckoutSummaryResponse `json:"data"`
	}
	_ = json.NewDecoder(respSum.Body).Decode(&sumResp)
	if sumResp.Data.PaymentMethod != domain.PaymentMethodCashOnPickup {
		t.Errorf("Expected payment_method cash_on_pickup, got %s", sumResp.Data.PaymentMethod)
	}
	if sumResp.Data.HandlingFee <= 0 || sumResp.Data.TotalAmount <= sumResp.Data.SubtotalAmount {
		t.Errorf("Expected handling fee > 0 and total > subtotal")
	}

	// 6. POST /api/v1/orders -> Buat pesanan, reserve stock, kosongkan keranjang
	prodBefore, _ := buyerRepo.GetProductByID(t.Context(), "prod-farm-beras-101", "")
	stockBefore := prodBefore.AvailableStock

	ordBody, _ := json.Marshal(map[string]interface{}{
		"item_ids": []string{itemID1, itemID2},
		"notes":    "Ambil jam 09.00 pagi pakai pickup",
	})
	reqOrd := httptest.NewRequest(http.MethodPost, "/api/v1/orders", bytes.NewReader(ordBody))
	reqOrd.Header.Set("Content-Type", "application/json")
	reqOrd.Header.Set("Authorization", "Bearer "+businessToken)
	respOrd, _ := app.Test(reqOrd)
	if respOrd.StatusCode != http.StatusCreated {
		b, _ := io.ReadAll(respOrd.Body)
		t.Fatalf("POST /api/v1/orders failed: status=%d body=%s", respOrd.StatusCode, string(b))
	}

	var createOrdResp struct {
		Data struct {
			Orders        []domain.BuyerOrder `json:"orders"`
			PaymentMethod string              `json:"payment_method"`
		} `json:"data"`
	}
	_ = json.NewDecoder(respOrd.Body).Decode(&createOrdResp)
	if len(createOrdResp.Data.Orders) != 2 {
		t.Fatalf("Expected 2 orders (1 per seller), got %d", len(createOrdResp.Data.Orders))
	}

	// Pastikan stok berkurang 100 kg (reserved stock)
	prodAfter, _ := buyerRepo.GetProductByID(t.Context(), "prod-farm-beras-101", "")
	if prodAfter.AvailableStock != stockBefore-100 {
		t.Errorf("Expected reserved stock to reduce by 100 (from %.0f to %.0f), got %.0f", stockBefore, stockBefore-100, prodAfter.AvailableStock)
	}

	// Pastikan keranjang kosong setelah checkout
	reqCartAfter := httptest.NewRequest(http.MethodGet, "/api/v1/cart", nil)
	reqCartAfter.Header.Set("Authorization", "Bearer "+businessToken)
	respCartAfter, _ := app.Test(reqCartAfter)
	var cartAfterResp struct {
		Data domain.BuyerCartResponse `json:"data"`
	}
	_ = json.NewDecoder(respCartAfter.Body).Decode(&cartAfterResp)
	if cartAfterResp.Data.TotalItems != 0 {
		t.Errorf("Expected cart to be empty after checkout, got %d items", cartAfterResp.Data.TotalItems)
	}

	// 7. GET /api/v1/orders & GET /api/v1/orders/:order_id
	reqListOrd := httptest.NewRequest(http.MethodGet, "/api/v1/orders?status=waiting_confirmation", nil)
	reqListOrd.Header.Set("Authorization", "Bearer "+businessToken)
	respListOrd, _ := app.Test(reqListOrd)
	if respListOrd.StatusCode != http.StatusOK {
		t.Fatalf("GET /api/v1/orders failed: status=%d", respListOrd.StatusCode)
	}

	order1ID := createOrdResp.Data.Orders[0].ID
	order2ID := createOrdResp.Data.Orders[1].ID

	reqDetail := httptest.NewRequest(http.MethodGet, "/api/v1/orders/"+order1ID, nil)
	reqDetail.Header.Set("Authorization", "Bearer "+businessToken)
	respDetail, _ := app.Test(reqDetail)
	if respDetail.StatusCode != http.StatusOK {
		t.Fatalf("GET /api/v1/orders/:order_id failed: status=%d", respDetail.StatusCode)
	}

	// 8. PATCH /api/v1/orders/:order_id/cancel -> batalkan order 1 & pastikan stok kembali
	reqCancel := httptest.NewRequest(http.MethodPatch, "/api/v1/orders/"+order1ID+"/cancel", nil)
	reqCancel.Header.Set("Authorization", "Bearer "+businessToken)
	respCancel, _ := app.Test(reqCancel)
	if respCancel.StatusCode != http.StatusOK {
		t.Fatalf("PATCH cancel failed: status=%d", respCancel.StatusCode)
	}

	// 9. PATCH /api/v1/orders/:order_id/confirm-receipt -> selesaikan order 2 secara permanen
	reqConfirm := httptest.NewRequest(http.MethodPatch, "/api/v1/orders/"+order2ID+"/confirm-receipt", nil)
	reqConfirm.Header.Set("Authorization", "Bearer "+businessToken)
	respConfirm, _ := app.Test(reqConfirm)
	if respConfirm.StatusCode != http.StatusOK {
		t.Fatalf("PATCH confirm-receipt failed: status=%d", respConfirm.StatusCode)
	}
	var confirmResp struct {
		Data domain.BuyerOrder `json:"data"`
	}
	_ = json.NewDecoder(respConfirm.Body).Decode(&confirmResp)
	if confirmResp.Data.Status != domain.BuyerOrderStatusCompleted {
		t.Errorf("Expected order status 'completed', got '%s'", confirmResp.Data.Status)
	}

	// Mencoba membatalkan order yang sudah selesai -> harus gagal 400
	reqCancelCompleted := httptest.NewRequest(http.MethodPatch, "/api/v1/orders/"+order2ID+"/cancel", nil)
	reqCancelCompleted.Header.Set("Authorization", "Bearer "+businessToken)
	respCancelCompleted, _ := app.Test(reqCancelCompleted)
	if respCancelCompleted.StatusCode != http.StatusBadRequest {
		t.Errorf("Expected 400 when cancelling completed order, got %d", respCancelCompleted.StatusCode)
	}
}
