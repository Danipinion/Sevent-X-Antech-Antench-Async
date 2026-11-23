package tests

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v3"
	adapterHttp "tandur/api/internal/adapter/http"
	"tandur/api/internal/application"
	"tandur/api/internal/domain"
	"tandur/api/internal/infrastructure/config"
	"tandur/api/internal/infrastructure/persistence"
)

func TestOrderLifecycle_MiddlemanAndFarmer_Unit(t *testing.T) {
	ctx := context.Background()
	userRepo := NewMockUserRepository()
	listingRepo := persistence.NewMemoryListingRepository()
	orderRepo := persistence.NewMemoryOrderRepository()
	commodityRepo := persistence.NewMemoryCommodityRepository()

	authService := application.NewAuthService(userRepo, "test-jwt-secret-very-long-string-32-chars", 24*time.Hour)
	commodityService := application.NewCommodityService(commodityRepo)
	farmerService := application.NewFarmerService(userRepo, listingRepo)
	orderService := application.NewOrderService(orderRepo, listingRepo, userRepo, commodityService)

	// 1. Registrasi Petani & Verifikasi
	farmer, err := authService.Register(ctx, application.RegisterInput{
		Name:     "Pak Sugeng",
		Phone:    "081111111111",
		Password: "password123",
		Role:     "farmer",
	})
	if err != nil {
		t.Fatalf("Failed to register farmer: %v", err)
	}
	_, _ = farmerService.SubmitVerification(ctx, farmer.ID, domain.FarmerVerificationInput{
		NIK:                 "3321041405760002",
		Name:                "Pak Sugeng",
		KTPPhotoURL:         "https://s3.tandur.com/ktp.jpg",
		KTPAddress:          "Demak",
		DeclarationAccepted: true,
	})

	// 2. Petani membuat Listing Panen: Jagung Pipil (8.500 kg @ Rp 5.600)
	listing, err := farmerService.CreateHarvestListing(ctx, farmer.ID, domain.CreateListingInput{
		CommodityID:          "jagung-pipil-kering",
		CommodityName:        "Jagung Pipil Kering Hibrida",
		Category:             "Jagung Pipil Kering Hibrida",
		Title:                "Jagung Pipil Kering Standar Pakan Ternak",
		Description:          "Kadar air maks 14%",
		EstimatedQuantity:    8500,
		MinOrderQuantity:     500,
		Unit:                 "kg",
		PricePerUnit:         5600,
		EstimatedHarvestDate: "2025-02-12",
		PickupAddress:        "Sukamaju, Demak",
		MediaURLs:            []string{"https://s3.tandur.com/jagung.jpg"},
	})
	if err != nil {
		t.Fatalf("Failed to create listing: %v", err)
	}

	// 3. Registrasi Tengkulak (Middleman)
	middleman, err := authService.Register(ctx, application.RegisterInput{
		Name:     "PT Sentosa Pakan Ternak Jatim",
		Phone:    "082222222222",
		Password: "password123",
		Role:     "middleman",
		IsBisnis: true,
	})
	if err != nil {
		t.Fatalf("Failed to register middleman: %v", err)
	}

	// 4. Tengkulak Browse Listings ("TENGKULAK - CARI PETANI")
	listings, err := orderService.ListMarketplaceListings(ctx, domain.ListingFilter{
		CommodityID: "jagung-pipil-kering",
		Page:        1,
		Limit:       10,
	})
	if err != nil || len(listings.Items) != 1 {
		t.Fatalf("Failed to list marketplace listings: %v, items: %d", err, len(listings.Items))
	}
	if listings.Items[0].ID != listing.ID {
		t.Errorf("Expected listing ID %s, got %s", listing.ID, listings.Items[0].ID)
	}

	// 5. Tengkulak Buat Penawaran: Ajukan 5.000 kg @ Rp 5.750 ("TENGKULAK - PENAWARAN")
	offer, err := orderService.CreateOffer(ctx, middleman.ID, domain.CreateOrderOfferInput{
		ListingID:       listing.ID,
		OfferedQuantity: 5000,
		OfferedPrice:    5750,
		Notes:           "Pengambilan siap dilakukan dengan armada sendiri",
		PickupDate:      "2025-02-13",
		PickupTimeSlot:  "09.00 - 11.00 WIB",
		VehicleType:     "Truk Isuzu Elf",
		VehiclePlate:    "AD 8291 QA",
		DriverName:      "Pak Suparno",
		DriverPhone:     "081234567899",
	})
	if err != nil {
		t.Fatalf("Failed to create offer: %v", err)
	}

	if offer.Status != domain.OrderStatusWaitingConfirmation {
		t.Errorf("Expected status waiting_confirmation, got %s", offer.Status)
	}
	if offer.StatusLabel != "Menunggu Persetujuan Anda" {
		t.Errorf("Expected status label 'Menunggu Persetujuan Anda', got %s", offer.StatusLabel)
	}
	expectedTotal := 5000.0 * 5750.0 // Rp 28.750.000
	if offer.TotalOfferedPrice != expectedTotal {
		t.Errorf("Expected total %f, got %f", expectedTotal, offer.TotalOfferedPrice)
	}
	if !strings.HasPrefix(offer.OrderCode, "#TND-ORD-") {
		t.Errorf("Expected order code starting with #TND-ORD-, got %s", offer.OrderCode)
	}

	// 6. Petani Cek Daftar Pesanan Masuk ("PETANI - PESANAN")
	farmerOrders, err := orderService.ListFarmerOrders(ctx, farmer.ID, domain.OrderFilter{
		Tab:   "waiting_confirmation",
		Page:  1,
		Limit: 10,
	})
	if err != nil {
		t.Fatalf("Failed to list farmer orders: %v", err)
	}
	if len(farmerOrders.Items) != 1 {
		t.Fatalf("Expected 1 order in waiting_confirmation, got %d", len(farmerOrders.Items))
	}
	if farmerOrders.Summary.WaitingConfirmationCount != 1 {
		t.Errorf("Expected WaitingConfirmationCount=1, got %d", farmerOrders.Summary.WaitingConfirmationCount)
	}

	// 7. Petani Melakukan Negosiasi (Tombol [Negosiasi])
	negOffer, err := orderService.NegotiateOrder(ctx, farmer.ID, offer.ID, domain.NegotiateOrderInput{
		CounterPrice: 5800,
		CounterNotes: "Bisa naik sedikit ke Rp 5.800 per kg",
	})
	if err != nil {
		t.Fatalf("Failed to negotiate: %v", err)
	}
	if negOffer.Status != domain.OrderStatusInNegotiation || *negOffer.CounterPrice != 5800 {
		t.Errorf("Negotiation state invalid: %+v", negOffer)
	}

	// 8. Petani Menerima Penawaran (Tombol [Terima Penawaran & Jadwalkan])
	acceptedOrder, err := orderService.AcceptOrder(ctx, farmer.ID, offer.ID)
	if err != nil {
		t.Fatalf("Failed to accept order: %v", err)
	}
	if acceptedOrder.Status != domain.OrderStatusScheduledPickup {
		t.Errorf("Expected status scheduled_pickup, got %s", acceptedOrder.Status)
	}
	if acceptedOrder.StatusLabel != "Armada Menuju Lokasi" {
		t.Errorf("Expected label 'Armada Menuju Lokasi', got %s", acceptedOrder.StatusLabel)
	}

	// Stok listing panen harus teralokasi: 8.500 - 5.000 = 3.500 kg
	updatedListing, _ := farmerService.GetFarmerListingByID(ctx, listing.ID, farmer.ID)
	if updatedListing.AvailableQuantity != 3500 {
		t.Errorf("Expected available quantity 3500, got %f", updatedListing.AvailableQuantity)
	}

	// 9. Petani Konfirmasi Siap Muat / Bagikan Titik Jemput
	confirmedOrder, err := orderService.ConfirmReadyForPickup(ctx, farmer.ID, offer.ID)
	if err != nil {
		t.Fatalf("Failed to confirm ready for pickup: %v", err)
	}
	if !confirmedOrder.IsReadyForPickup {
		t.Errorf("Expected IsReadyForPickup=true")
	}

	// 10. Tengkulak Selesaikan Penimbangan Digital & Pelunasan (Card 3 Selesai & Lunas)
	completedOrder, err := orderService.CompleteWeighingAndSettlement(ctx, middleman.ID, offer.ID, domain.CompleteWeighingInput{
		ActualWeight:           5020, // Real digital scale result
		FinalPricePerUnit:      5750,
		WeighingCertificateURL: "https://s3.tandur.com/cert/timbang_0894.pdf",
		InvoiceURL:             "https://s3.tandur.com/inv/inv_0894.pdf",
	})
	if err != nil {
		t.Fatalf("Failed to complete weighing: %v", err)
	}
	if completedOrder.Status != domain.OrderStatusCompleted {
		t.Errorf("Expected status completed, got %s", completedOrder.Status)
	}
	expectedFinalTotal := 5020.0 * 5750.0
	if *completedOrder.FinalTotalAmount != expectedFinalTotal {
		t.Errorf("Expected final total %f, got %f", expectedFinalTotal, *completedOrder.FinalTotalAmount)
	}
}

func TestOrderHTTP_Endpoints_EndToEnd(t *testing.T) {
	userRepo := NewMockUserRepository()
	listingRepo := persistence.NewMemoryListingRepository()
	orderRepo := persistence.NewMemoryOrderRepository()
	commodityRepo := persistence.NewMemoryCommodityRepository()

	cfg := &config.Config{
		AppEnv:    "test",
		JWTSecret: "test-jwt-secret-very-long-string-32-chars",
	}

	authService := application.NewAuthService(userRepo, cfg.JWTSecret, 24*time.Hour)
	commodityService := application.NewCommodityService(commodityRepo)
	farmerService := application.NewFarmerService(userRepo, listingRepo)
	orderService := application.NewOrderService(orderRepo, listingRepo, userRepo, commodityService)

	handler := adapterHttp.NewHandler(cfg, nil, commodityService, authService, farmerService, orderService)

	app := fiber.New()
	adapterHttp.SetupRoutes(app, handler)

	// 1. Registrasi Petani & Login
	regPayload := `{"name":"Pak Sugeng","phone":"081234567890","password":"password123","role":"farmer"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewBufferString(regPayload))
	req.Header.Set("Content-Type", "application/json")
	resp, _ := app.Test(req)
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("Farmer register failed: %d", resp.StatusCode)
	}

	loginPayload := `{"username":"081234567890","password":"password123"}`
	req = httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBufferString(loginPayload))
	req.Header.Set("Content-Type", "application/json")
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Farmer login failed: %d", resp.StatusCode)
	}
	var farmerAuth struct {
		Data struct {
			User  *domain.User `json:"user"`
			Token string       `json:"token"`
		} `json:"data"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&farmerAuth)
	farmerToken := farmerAuth.Data.Token
	farmerID := farmerAuth.Data.User.ID
	_ = farmerID

	// Verifikasi Petani
	verPayload := `{"nik":"3321041405760002","name":"SUGENG RIYADI","birth_place":"Demak","birth_date":"1978-05-14","ktp_address":"Demak","ktp_photo_url":"https://s3.tandur.com/ktp.jpg","declaration_accepted":true}`
	req = httptest.NewRequest(http.MethodPost, "/api/v1/farmer/verification", bytes.NewBufferString(verPayload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+farmerToken)
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("Farmer verification failed: %d body=%s", resp.StatusCode, string(body))
	}

	// 2. Petani Buat Listing Panen (POST /farmer/listings)
	createListingPayload := `{
		"commodity_id": "gabah-kering-panen",
		"commodity_name": "Gabah Kering Panen",
		"title": "Gabah GKP Super Siap Panen Kualitas Prima",
		"description": "Varietas Inpari 32 bulir sedang",
		"estimated_quantity": 8500,
		"price_per_unit": 7300,
		"ready_date": "2025-02-14",
		"pickup_address": "Sukamaju, Demak",
		"media_urls": ["https://s3.tandur.com/gabah.jpg"]
	}`
	req = httptest.NewRequest(http.MethodPost, "/api/v1/farmer/listings", bytes.NewBufferString(createListingPayload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+farmerToken)
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("Failed to create listing: %d body=%s", resp.StatusCode, string(body))
	}
	var listingRes struct {
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&listingRes)
	listingID := listingRes.Data.ID

	// 3. Registrasi Tengkulak & Login
	regMidPayload := `{"name":"PT Sentosa Pakan Ternak Jatim","phone":"089999999999","password":"password123","role":"middleman","is_bisnis":true}`
	req = httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewBufferString(regMidPayload))
	req.Header.Set("Content-Type", "application/json")
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("Middleman register failed: %d", resp.StatusCode)
	}

	loginMidPayload := `{"username":"089999999999","password":"password123"}`
	req = httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBufferString(loginMidPayload))
	req.Header.Set("Content-Type", "application/json")
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Middleman login failed: %d", resp.StatusCode)
	}
	var midAuth struct {
		Data struct {
			User  *domain.User `json:"user"`
			Token string       `json:"token"`
		} `json:"data"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&midAuth)
	midToken := midAuth.Data.Token

	// 4. Tengkulak Cari Petani (GET /middleman/listings)
	req = httptest.NewRequest(http.MethodGet, "/api/v1/middleman/listings?page=1&limit=10", nil)
	req.Header.Set("Authorization", "Bearer "+midToken)
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Middleman search failed: %d", resp.StatusCode)
	}

	// 5. Tengkulak Buat Penawaran (POST /middleman/orders)
	offerPayload := fmt.Sprintf(`{
		"listing_id": "%s",
		"offered_quantity": 5000,
		"offered_price": 7350,
		"notes": "Siap jemput truk elf",
		"pickup_date": "2025-02-15",
		"pickup_time_slot": "09.00 - 11.00 WIB",
		"vehicle_type": "Truk Isuzu Elf",
		"vehicle_plate": "AD 8291 QA",
		"driver_name": "Pak Suparno"
	}`, listingID)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/middleman/orders", bytes.NewBufferString(offerPayload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+midToken)
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("Failed to create offer: %d body=%s", resp.StatusCode, string(body))
	}
	var orderRes struct {
		Data domain.FarmerPurchaseOrder `json:"data"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&orderRes)
	orderID := orderRes.Data.ID
	if orderRes.Data.Status != domain.OrderStatusWaitingConfirmation {
		t.Errorf("Expected waiting_confirmation, got %s", orderRes.Data.Status)
	}

	// 6. Petani Buka Halaman Pesanan (GET /farmer/orders)
	req = httptest.NewRequest(http.MethodGet, "/api/v1/farmer/orders?tab=all", nil)
	req.Header.Set("Authorization", "Bearer "+farmerToken)
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Failed to get farmer orders: %d", resp.StatusCode)
	}
	var ordersListRes struct {
		Data []domain.FarmerPurchaseOrder `json:"data"`
		Meta struct {
			Summary domain.FarmerOrderSummary `json:"summary"`
		} `json:"meta"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&ordersListRes)
	if len(ordersListRes.Data) != 1 {
		t.Fatalf("Expected 1 order for farmer, got %d", len(ordersListRes.Data))
	}
	if ordersListRes.Meta.Summary.WaitingConfirmationCount != 1 {
		t.Errorf("Expected waiting confirmation count=1, got %d", ordersListRes.Meta.Summary.WaitingConfirmationCount)
	}

	// 7. Petani Terima Penawaran (POST /farmer/orders/:id/accept)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/farmer/orders/"+orderID+"/accept", nil)
	req.Header.Set("Authorization", "Bearer "+farmerToken)
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Failed to accept order: %d", resp.StatusCode)
	}

	// 8. Petani Konfirmasi Siap Muat (POST /farmer/orders/:id/confirm-ready)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/farmer/orders/"+orderID+"/confirm-ready", nil)
	req.Header.Set("Authorization", "Bearer "+farmerToken)
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Failed to confirm ready: %d", resp.StatusCode)
	}

	// 9. Tengkulak Selesaikan Transaksi & Timbang (POST /middleman/orders/:id/weighing-and-complete)
	weighPayload := `{"actual_weight":5000,"final_price_per_unit":7350,"weighing_certificate_url":"https://s3.tandur.com/weigh.pdf","invoice_url":"https://s3.tandur.com/inv.pdf"}`
	req = httptest.NewRequest(http.MethodPost, "/api/v1/middleman/orders/"+orderID+"/weighing-and-complete", bytes.NewBufferString(weighPayload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+midToken)
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Failed to complete weighing: %d", resp.StatusCode)
	}

	_ = farmerID
}
