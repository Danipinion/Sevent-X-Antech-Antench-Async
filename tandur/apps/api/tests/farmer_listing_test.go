package tests

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
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
	"tandur/api/internal/infrastructure/storage"
)

// Helper: Dummy valid file bytes
func makeDummyJPEG() []byte {
	buf := make([]byte, 200)
	buf[0] = 0xFF
	buf[1] = 0xD8
	buf[2] = 0xFF
	buf[3] = 0xE0
	return buf
}

func makeDummyPNG() []byte {
	buf := make([]byte, 200)
	copy(buf[:8], []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A})
	return buf
}

func makeDummyWebP() []byte {
	buf := make([]byte, 200)
	copy(buf[0:4], []byte("RIFF"))
	copy(buf[8:12], []byte("WEBP"))
	return buf
}

func makeDummyMP4() []byte {
	buf := make([]byte, 200)
	copy(buf[4:8], []byte("ftyp"))
	copy(buf[8:12], []byte("mp42"))
	return buf
}

func makeDummyWebM() []byte {
	buf := make([]byte, 200)
	copy(buf[:4], []byte{0x1A, 0x45, 0xDF, 0xA3})
	return buf
}

func TestMediaValidator_StrictInspection(t *testing.T) {
	// 1. Valid JPEG
	res, err := storage.ValidateStrictMedia("sample.jpg", makeDummyJPEG())
	if err != nil || res.MediaType != "photo" || res.MimeType != "image/jpeg" {
		t.Fatalf("Expected valid JPEG, got err: %v, res: %+v", err, res)
	}

	// 2. Valid PNG
	res, err = storage.ValidateStrictMedia("sample.png", makeDummyPNG())
	if err != nil || res.MediaType != "photo" || res.MimeType != "image/png" {
		t.Fatalf("Expected valid PNG, got err: %v, res: %+v", err, res)
	}

	// 3. Valid WebP
	res, err = storage.ValidateStrictMedia("sample.webp", makeDummyWebP())
	if err != nil || res.MediaType != "photo" || res.MimeType != "image/webp" {
		t.Fatalf("Expected valid WebP, got err: %v, res: %+v", err, res)
	}

	// 4. Valid MP4
	res, err = storage.ValidateStrictMedia("sample.mp4", makeDummyMP4())
	if err != nil || res.MediaType != "video" || res.MimeType != "video/mp4" {
		t.Fatalf("Expected valid MP4, got err: %v, res: %+v", err, res)
	}

	// 5. Valid WebM
	res, err = storage.ValidateStrictMedia("sample.webm", makeDummyWebM())
	if err != nil || res.MediaType != "video" || res.MimeType != "video/webm" {
		t.Fatalf("Expected valid WebM, got err: %v, res: %+v", err, res)
	}

	// 6. Error: File too small (<100 byte)
	_, err = storage.ValidateStrictMedia("tiny.jpg", []byte{0xFF, 0xD8, 0xFF})
	if err != storage.ErrFileTooSmall {
		t.Errorf("Expected ErrFileTooSmall, got: %v", err)
	}

	// 7. Error: Double extension attack (e.g. exploit.php.jpg)
	_, err = storage.ValidateStrictMedia("exploit.php.jpg", makeDummyJPEG())
	if err != storage.ErrSuspiciousFilename {
		t.Errorf("Expected ErrSuspiciousFilename for double extension, got: %v", err)
	}

	// 8. Error: Polyglot script attack (JPEG containing <?php inside)
	maliciousJPEG := makeDummyJPEG()
	copy(maliciousJPEG[50:60], []byte("<?php die();"))
	_, err = storage.ValidateStrictMedia("photo.jpg", maliciousJPEG)
	if err != storage.ErrMaliciousContent {
		t.Errorf("Expected ErrMaliciousContent for PHP payload, got: %v", err)
	}

	// 9. Error: Executable disguised as image (starts with MZ)
	exeData := make([]byte, 200)
	copy(exeData[:2], []byte("MZ"))
	_, err = storage.ValidateStrictMedia("fake.jpg", exeData)
	if err != storage.ErrMaliciousContent {
		t.Errorf("Expected ErrMaliciousContent for Windows PE, got: %v", err)
	}

	// 10. Error: Mismatch extension and magic bytes (text file named .jpg)
	textData := bytes.Repeat([]byte("A"), 200)
	_, err = storage.ValidateStrictMedia("text.jpg", textData)
	if err == nil {
		t.Errorf("Expected magic bytes error, got nil")
	}

	// 11. Error: Photo exceeding 5 MB
	largePhoto := bytes.Repeat([]byte{0xFF, 0xD8, 0xFF, 0xE0}, 1500000) // ~6MB
	_, err = storage.ValidateStrictMedia("large.jpg", largePhoto)
	if err != storage.ErrPhotoTooLarge {
		t.Errorf("Expected ErrPhotoTooLarge, got: %v", err)
	}
}

func TestMediaComposition_Rules(t *testing.T) {
	// a. Kosong (0 item) -> Wajib minimal 1 foto
	err := domain.ValidateMediaComposition([]string{})
	if err != domain.ErrMinPhotoRequired {
		t.Errorf("Expected ErrMinPhotoRequired for empty list, got: %v", err)
	}

	// b. Hanya 1 video tanpa foto -> DITOLAK
	err = domain.ValidateMediaComposition([]string{"https://s3.tandur.com/video1.mp4"})
	if err != domain.ErrMinPhotoRequired {
		t.Errorf("Expected ErrMinPhotoRequired for 1 video only, got: %v", err)
	}

	// c. Lebih dari 1 video (misal 2 video + 1 foto) -> DITOLAK (maksimal 1 video)
	err = domain.ValidateMediaComposition([]string{
		"https://s3.tandur.com/foto1.jpg",
		"https://s3.tandur.com/video1.mp4",
		"https://s3.tandur.com/video2.mp4",
	})
	if err != domain.ErrMaxVideoExceeded {
		t.Errorf("Expected ErrMaxVideoExceeded for 2 videos, got: %v", err)
	}

	// d. Lebih dari 5 item total -> DITOLAK
	err = domain.ValidateMediaComposition([]string{
		"https://s3.tandur.com/foto1.jpg",
		"https://s3.tandur.com/foto2.jpg",
		"https://s3.tandur.com/foto3.jpg",
		"https://s3.tandur.com/foto4.jpg",
		"https://s3.tandur.com/foto5.jpg",
		"https://s3.tandur.com/foto6.jpg",
	})
	if err != domain.ErrMaxMediaExceeded {
		t.Errorf("Expected ErrMaxMediaExceeded for 6 photos, got: %v", err)
	}

	// e. 1 Foto saja -> DITERIMA
	if err := domain.ValidateMediaComposition([]string{"https://s3.tandur.com/foto1.jpg"}); err != nil {
		t.Errorf("Expected valid for 1 photo, got: %v", err)
	}

	// f. 5 Foto saja -> DITERIMA
	if err := domain.ValidateMediaComposition([]string{
		"https://s3.tandur.com/f1.jpg", "https://s3.tandur.com/f2.jpg", "https://s3.tandur.com/f3.jpg",
		"https://s3.tandur.com/f4.jpg", "https://s3.tandur.com/f5.jpg",
	}); err != nil {
		t.Errorf("Expected valid for 5 photos, got: %v", err)
	}

	// g. 4 Foto + 1 Video (Total 5 items) -> DITERIMA
	if err := domain.ValidateMediaComposition([]string{
		"https://s3.tandur.com/f1.jpg", "https://s3.tandur.com/f2.jpg", "https://s3.tandur.com/f3.jpg",
		"https://s3.tandur.com/f4.jpg", "https://s3.tandur.com/v1.mp4",
	}); err != nil {
		t.Errorf("Expected valid for 4 photos + 1 video, got: %v", err)
	}
}

func TestFarmerListing_CRUD_And_Pagination(t *testing.T) {
	userRepo := NewMockUserRepository()
	listingRepo := persistence.NewMemoryListingRepository()
	authService := application.NewAuthService(userRepo, "test-secret-key-32chars-minimum!", 24*time.Hour)
	farmerService := application.NewFarmerService(userRepo, listingRepo)

	ctx := context.Background()

	// 1. Registrasi & Verifikasi Petani
	farmer, err := authService.Register(ctx, application.RegisterInput{
		Name:     "Pak Sugeng Petani",
		Phone:    "081234567890",
		Password: "password123",
		Role:     "farmer",
	})
	if err != nil {
		t.Fatalf("Failed to register farmer: %v", err)
	}

	// Submit verifikasi
	_, err = farmerService.SubmitVerification(ctx, farmer.ID, domain.FarmerVerificationInput{
		NIK:                 "3321041405760002",
		Name:                "SUGENG RIYADI",
		KTPPhotoURL:         "https://s3.tandur.com/ktp/sugeng.jpg",
		KTPAddress:          "Demak, Jawa Tengah",
		DeclarationAccepted: true,
	})
	if err != nil {
		t.Fatalf("Failed to verify farmer: %v", err)
	}

	// 2. Buat Listing 1: Gabah GKP (8.500 kg @ Rp 7.300 -> Revenue: Rp 62.050.000)
	l1, err := farmerService.CreateHarvestListing(ctx, farmer.ID, domain.CreateListingInput{
		CommodityID:       "gabah-gkp",
		Title:             "Gabah GKP Siap Panen Kualitas Prima",
		Description:       "Varietas Inpari 32 (Standar Bulir Sedang)",
		EstimatedQuantity: 8500,
		MinOrderQuantity:  500,
		Unit:              "kg",
		PricePerUnit:      7300,
		ReadyDate:         "2025-02-07",
		PickupAddress:     "Sukamaju, Ngawi",
		MediaURLs: []string{
			"https://s3.tandur.com/sample1.jpg",
			"https://s3.tandur.com/video1.mp4",
		},
		Latitude:  -7.4045,
		Longitude: 111.4452,
	})
	if err != nil {
		t.Fatalf("Failed to create listing 1: %v", err)
	}

	expectedRev1 := 8500.0 * 7300.0 // 62.050.000
	if l1.EstimatedGrossRevenue != expectedRev1 {
		t.Errorf("Expected gross revenue %f, got %f", expectedRev1, l1.EstimatedGrossRevenue)
	}

	// 3. Buat Listing 2: Jagung Pipil (5.000 kg @ Rp 5.600 -> Revenue: Rp 28.000.000)
	_, err = farmerService.CreateHarvestListing(ctx, farmer.ID, domain.CreateListingInput{
		CommodityID:       "jagung-pipil",
		Title:             "Jagung Pipil Kering Super",
		Description:       "KA 14-15%",
		EstimatedQuantity: 5000,
		Unit:              "kg",
		PricePerUnit:      5600,
		MediaURLs:         []string{"https://s3.tandur.com/jagung.jpg"},
	})
	if err != nil {
		t.Fatalf("Failed to create listing 2: %v", err)
	}

	// 4. Buat Listing 3: Kedelai Lokal (3.200 kg @ Rp 11.200 -> Revenue: Rp 35.840.000)
	l3, err := farmerService.CreateHarvestListing(ctx, farmer.ID, domain.CreateListingInput{
		CommodityID:       "kedelai-lokal",
		Title:             "Kedelai Lokal Bersih",
		Description:       "Grade A Bersih",
		EstimatedQuantity: 3200,
		Unit:              "kg",
		PricePerUnit:      11200,
		MediaURLs:         []string{"https://s3.tandur.com/kedelai.jpg"},
	})
	if err != nil {
		t.Fatalf("Failed to create listing 3: %v", err)
	}

	// 5. Test Validasi Error: Bobot kurang dari 500 kg
	_, err = farmerService.CreateHarvestListing(ctx, farmer.ID, domain.CreateListingInput{
		CommodityID:       "cabai-rawit",
		Title:             "Cabai Rawit",
		EstimatedQuantity: 200, // < 500
		Unit:              "kg",
		PricePerUnit:      35000,
		MediaURLs:         []string{"https://s3.tandur.com/cabai.jpg"},
	})
	if err != domain.ErrMinOrderQuantity {
		t.Errorf("Expected ErrMinOrderQuantity, got: %v", err)
	}

	// 6. Test Pagination: Page 1, Limit 2 (Total 3 items)
	p1, err := farmerService.ListFarmerListings(ctx, domain.ListingFilter{
		FarmerID: farmer.ID,
		Page:     1,
		Limit:    2,
	})
	if err != nil {
		t.Fatalf("Failed to list page 1: %v", err)
	}
	if len(p1.Items) != 2 || p1.TotalItems != 3 || p1.TotalPages != 2 {
		t.Errorf("Pagination page 1 mismatch: got items=%d, total=%d, pages=%d", len(p1.Items), p1.TotalItems, p1.TotalPages)
	}

	// Page 2, Limit 2 (Harus berisi 1 item sisa)
	p2, err := farmerService.ListFarmerListings(ctx, domain.ListingFilter{
		FarmerID: farmer.ID,
		Page:     2,
		Limit:    2,
	})
	if err != nil {
		t.Fatalf("Failed to list page 2: %v", err)
	}
	if len(p2.Items) != 1 {
		t.Errorf("Pagination page 2 mismatch: got items=%d", len(p2.Items))
	}

	// 7. Test Detail Listing (GetByID)
	detail, err := farmerService.GetFarmerListingByID(ctx, l1.ID, farmer.ID)
	if err != nil || detail.ID != l1.ID {
		t.Fatalf("Failed to get detail: %v", err)
	}

	// 8. Test Update Listing: Ubah harga menjadi Rp 7.500
	newPrice := 7500.0
	updated, err := farmerService.UpdateHarvestListing(ctx, farmer.ID, l1.ID, domain.UpdateListingInput{
		PricePerUnit: &newPrice,
	})
	if err != nil {
		t.Fatalf("Failed to update listing: %v", err)
	}
	expectedNewRev := 8500.0 * 7500.0
	if updated.PricePerUnit != 7500 || updated.EstimatedGrossRevenue != expectedNewRev {
		t.Errorf("Update revenue mismatch: expected %f, got %f", expectedNewRev, updated.EstimatedGrossRevenue)
	}

	// 9. Test Soft Delete / Cancel Listing
	err = farmerService.CancelHarvestListing(ctx, farmer.ID, l3.ID)
	if err != nil {
		t.Fatalf("Failed to cancel listing: %v", err)
	}

	// Cek bahwa listing yang dibatalkan tidak lagi muncul di list aktif
	afterCancel, err := farmerService.ListFarmerListings(ctx, domain.ListingFilter{
		FarmerID: farmer.ID,
		Page:     1,
		Limit:    10,
	})
	if err != nil {
		t.Fatalf("Failed to list after cancel: %v", err)
	}
	if afterCancel.TotalItems != 2 {
		t.Errorf("Expected 2 active listings after soft delete, got %d", afterCancel.TotalItems)
	}
}

func TestHTTP_FarmerListing_Endpoints(t *testing.T) {
	userRepo := NewMockUserRepository()
	listingRepo := persistence.NewMemoryListingRepository()
	cfg := &config.Config{
		JWTSecret:          "test-secret-key-32chars-minimum!",
		JWTExpirationHours: 24,
	}
	authService := application.NewAuthService(userRepo, cfg.JWTSecret, 24*time.Hour)
	commodityRepo := persistence.NewMemoryCommodityRepository()
	commodityService := application.NewCommodityService(commodityRepo, nil, nil, nil)
	farmerService := application.NewFarmerService(userRepo, listingRepo)

	handler := adapterHttp.NewHandler(cfg, nil, commodityService, authService, farmerService)

	app := fiber.New()
	adapterHttp.SetupRoutes(app, handler)

	// Registrasi & Verifikasi Petani
	regPayload := `{"name":"Sugeng","phone":"081234567890","password":"password123","role":"farmer"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewBufferString(regPayload))
	req.Header.Set("Content-Type", "application/json")
	resp, _ := app.Test(req)
	var regData struct {
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&regData)

	// Login untuk dapatkan Token
	loginPayload := `{"username":"081234567890","password":"password123"}`
	req = httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBufferString(loginPayload))
	req.Header.Set("Content-Type", "application/json")
	resp, _ = app.Test(req)
	var loginData struct {
		Data struct {
			Token string `json:"token"`
		} `json:"data"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&loginData)
	token := loginData.Data.Token

	// Verifikasi Petani
	verPayload := `{"nik":"3321041405760002","name":"SUGENG RIYADI","ktp_photo_url":"https://s3.tandur.com/ktp.jpg","ktp_address":"Demak","declaration_accepted":true}`
	req = httptest.NewRequest(http.MethodPost, "/api/v1/farmer/verification", bytes.NewBufferString(verPayload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Failed to verify: code %d", resp.StatusCode)
	}

	// 1. Upload Media Sampel Panen (Multipart Form)
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, _ := writer.CreateFormFile("media", "sampel_gabah.jpg")
	_, _ = part.Write(makeDummyJPEG())
	_ = writer.Close()

	req = httptest.NewRequest(http.MethodPost, "/api/v1/farmer/listings/upload-media", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := app.Test(req)
	if err != nil || resp.StatusCode != http.StatusCreated {
		t.Fatalf("Expected 201 Created for media upload, got code %d", resp.StatusCode)
	}
	var uploadResp struct {
		Data struct {
			URL       string `json:"url"`
			MediaType string `json:"media_type"`
		} `json:"data"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&uploadResp)
	uploadedURL := uploadResp.Data.URL
	if uploadedURL == "" || uploadResp.Data.MediaType != "photo" {
		t.Fatalf("Invalid upload response: %+v", uploadResp)
	}

	// 2. Publikasi Penjualan Panen (POST /farmer/listings)
	createPayload := fmt.Sprintf(`{
		"commodity_id": "gabah-kering-panen",
		"commodity_name": "Gabah GKP",
		"title": "Gabah GKP Super Siap Panen Kualitas Prima",
		"description": "Varietas Inpari 32",
		"estimated_quantity": 8500,
		"price_per_unit": 7300,
		"ready_date": "2025-02-07",
		"pickup_address": "Sukamaju, Ngawi",
		"media_urls": ["%s"]
	}`, uploadedURL)

	req = httptest.NewRequest(http.MethodPost, "/api/v1/farmer/listings", bytes.NewBufferString(createPayload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusCreated {
		bodyBytes, _ := io.ReadAll(resp.Body)
		t.Fatalf("Expected 201 Created, got %d: %s", resp.StatusCode, string(bodyBytes))
	}
	var createResp struct {
		Data struct {
			ID                    string  `json:"id"`
			CommodityID           string  `json:"commodity_id"`
			CommodityName         string  `json:"commodity_name"`
			Category              string  `json:"category"`
			Title                 string  `json:"title"`
			EstimatedGrossRevenue float64 `json:"estimated_gross_revenue"`
		} `json:"data"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&createResp)
	listingID := createResp.Data.ID
	if createResp.Data.EstimatedGrossRevenue != 62050000 {
		t.Errorf("Expected gross revenue 62.050.000, got %f", createResp.Data.EstimatedGrossRevenue)
	}
	if createResp.Data.CommodityName != "Gabah GKP" {
		t.Errorf("Expected CommodityName Gabah GKP, got %s", createResp.Data.CommodityName)
	}
	if createResp.Data.Category != "Gabah GKP" {
		t.Errorf("Expected Category Gabah GKP, got %s", createResp.Data.Category)
	}
	if createResp.Data.Title != "Gabah GKP Super Siap Panen Kualitas Prima" {
		t.Errorf("Expected Title to be custom farmer title, got %s", createResp.Data.Title)
	}

	// 3. GET /farmer/listings dengan Pagination
	req = httptest.NewRequest(http.MethodGet, "/api/v1/farmer/listings?page=1&limit=10", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Expected 200 OK for list, got %d", resp.StatusCode)
	}
	var listResp struct {
		Data []domain.FarmerListing `json:"data"`
		Meta struct {
			Pagination *adapterHttp.PaginationMeta `json:"pagination"`
		} `json:"meta"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&listResp)
	if len(listResp.Data) != 1 || listResp.Meta.Pagination == nil || listResp.Meta.Pagination.TotalItems != 1 {
		t.Fatalf("List pagination mismatch: %+v", listResp)
	}

	// 4. GET /farmer/listings/:id
	req = httptest.NewRequest(http.MethodGet, "/api/v1/farmer/listings/"+listingID, nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Expected 200 OK for detail, got %d", resp.StatusCode)
	}

	// 5. PUT /farmer/listings/:id
	updatePayload := `{"title":"Gabah GKP Super Siap Panen (Update)","price_per_unit":7400}`
	req = httptest.NewRequest(http.MethodPut, "/api/v1/farmer/listings/"+listingID, bytes.NewBufferString(updatePayload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Expected 200 OK for update, got %d", resp.StatusCode)
	}

	// 6. DELETE /farmer/listings/:id
	req = httptest.NewRequest(http.MethodDelete, "/api/v1/farmer/listings/"+listingID, nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Expected 200 OK for delete, got %d", resp.StatusCode)
	}
}
