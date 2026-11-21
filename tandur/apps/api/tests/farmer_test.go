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
	"tandur/api/internal/infrastructure/persistence"
	"tandur/api/internal/infrastructure/storage"
)

func TestFarmerService_VerificationLifecycle(t *testing.T) {
	repo := NewMockUserRepository()
	authService := application.NewAuthService(repo, "test-secret-key-32chars-minimum!", 24*time.Hour)
	farmerService := application.NewFarmerService(repo)

	// 1. Registrasi Petani Baru (Awalnya Belum Terverifikasi)
	farmerUser, err := authService.Register(context.Background(), application.RegisterInput{
		Name:     "Sugeng Riyadi",
		Phone:    "081234567890",
		Password: "password123",
		Role:     "farmer",
	})
	if err != nil {
		t.Fatalf("Failed to register farmer: %v", err)
	}

	if farmerUser.IsVerified || farmerUser.VerificationStatus != domain.VerificationStatusUnverified {
		t.Errorf("New farmer should be unverified, got is_verified=%v status=%s", farmerUser.IsVerified, farmerUser.VerificationStatus)
	}

	// 2. Petani Belum Terverifikasi Tidak Bisa Jual Panen
	_, err = farmerService.CreateHarvestListing(context.Background(), farmerUser.ID, domain.CreateListingInput{
		CommodityID:       "gabah-kering-panen",
		Title:             "Gabah Kering Panen Ciherang",
		EstimatedQuantity: 12000,
		Unit:              "kg",
		PricePerUnit:      7200,
	})
	if err == nil || err != domain.ErrFarmerNotVerified {
		t.Fatalf("Expected ErrFarmerNotVerified, got: %v", err)
	}

	// 3. Cek Status Verifikasi Awal
	statusResp, err := farmerService.GetVerificationStatus(context.Background(), farmerUser.ID)
	if err != nil {
		t.Fatalf("Failed to get verification status: %v", err)
	}
	if statusResp.IsVerified || statusResp.CanSellHarvest {
		t.Errorf("Expected CanSellHarvest=false, got %v", statusResp.CanSellHarvest)
	}

	// 4. Validasi Error saat submit verifikasi:
	// a. Tanpa centang persetujuan
	_, err = farmerService.SubmitVerification(context.Background(), farmerUser.ID, domain.FarmerVerificationInput{
		NIK:                 "3321041405760002",
		Name:                "SUGENG RIYADI",
		KTPPhotoURL:         "https://storage.tandur.com/ktp/sugeng.jpg",
		KTPAddress:          "Demak",
		DeclarationAccepted: false,
	})
	if err != domain.ErrDeclarationRequired {
		t.Errorf("Expected ErrDeclarationRequired, got: %v", err)
	}

	// b. NIK tidak valid (bukan 16 digit)
	_, err = farmerService.SubmitVerification(context.Background(), farmerUser.ID, domain.FarmerVerificationInput{
		NIK:                 "12345",
		Name:                "SUGENG RIYADI",
		KTPPhotoURL:         "https://storage.tandur.com/ktp/sugeng.jpg",
		KTPAddress:          "Demak",
		DeclarationAccepted: true,
	})
	if err != domain.ErrInvalidNIK {
		t.Errorf("Expected ErrInvalidNIK, got: %v", err)
	}

	// c. Foto e-KTP kosong
	_, err = farmerService.SubmitVerification(context.Background(), farmerUser.ID, domain.FarmerVerificationInput{
		NIK:                 "3321041405760002",
		Name:                "SUGENG RIYADI",
		KTPPhotoURL:         "",
		KTPAddress:          "Demak",
		DeclarationAccepted: true,
	})
	if err != domain.ErrKTPPhotoRequired {
		t.Errorf("Expected ErrKTPPhotoRequired, got: %v", err)
	}

	// 5. Submit Dokumen e-KTP Valid Sesuai Mockup UI
	verifyResp, err := farmerService.SubmitVerification(context.Background(), farmerUser.ID, domain.FarmerVerificationInput{
		NIK:                 "3321041405760002",
		Name:                "SUGENG RIYADI",
		BirthPlace:          "Demak",
		BirthDate:           "1978-05-14",
		KTPAddress:          "RT 03 / RW 02, Desa Karangawen, Kecamatan Karangawen, Kabupaten Demak, Jawa Tengah 59566",
		KTPPhotoURL:         "https://storage.tandur.com/ktp/3321041405760002.jpg",
		DeclarationAccepted: true,
	})
	if err != nil {
		t.Fatalf("Submit verification failed: %v", err)
	}
	if !verifyResp.IsVerified || !verifyResp.CanSellHarvest || verifyResp.VerificationStatus != domain.VerificationStatusVerified {
		t.Errorf("Farmer should be verified, got: %+v", verifyResp)
	}

	// 6. Setelah Terverifikasi: Petani Sukses Membuat Listing Jual Panen
	listing, err := farmerService.CreateHarvestListing(context.Background(), farmerUser.ID, domain.CreateListingInput{
		CommodityID:       "gabah-kering-panen",
		Title:             "Gabah Kering Panen Ciherang Siap Jual",
		Description:       "Kadar air 14%, kualitas super",
		EstimatedQuantity: 12000,
		Unit:              "kg",
		PricePerUnit:      7200,
	})
	if err != nil {
		t.Fatalf("Expected successful listing creation, got: %v", err)
	}
	if listing.FarmerID != farmerUser.ID || listing.EstimatedQuantity != 12000 {
		t.Errorf("Unexpected listing data: %+v", listing)
	}
}

func TestHTTP_FarmerVerificationAndListingEndpoints(t *testing.T) {
	repo := NewMockUserRepository()
	cfg := &config.Config{
		AppEnv:    "test",
		JWTSecret: "test-jwt-secret-very-long-string-32-chars",
	}
	authService := application.NewAuthService(repo, cfg.JWTSecret, 24*time.Hour)
	commodityRepo := persistence.NewMemoryCommodityRepository()
	commodityService := application.NewCommodityService(commodityRepo)
	farmerService := application.NewFarmerService(repo)

	handler := adapterHttp.NewHandler(cfg, nil, commodityService, authService, farmerService)

	app := fiber.New()
	adapterHttp.SetupRoutes(app, handler)

	// 1. Register akun petani baru
	regPayload := `{"name":"Pak Sugeng","phone":"081299998888","password":"password123","role":"farmer"}`
	reqReg := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewBufferString(regPayload))
	reqReg.Header.Set("Content-Type", "application/json")
	respReg, err := app.Test(reqReg)
	if err != nil || respReg.StatusCode != http.StatusCreated {
		t.Fatalf("Registration failed: status=%d, err=%v", respReg.StatusCode, err)
	}

	// 2. Login akun petani -> dapatkan JWT Token
	loginPayload := `{"username":"081299998888","password":"password123"}`
	reqLogin := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBufferString(loginPayload))
	reqLogin.Header.Set("Content-Type", "application/json")
	respLogin, err := app.Test(reqLogin)
	if err != nil || respLogin.StatusCode != http.StatusOK {
		t.Fatalf("Login failed: status=%d, err=%v", respLogin.StatusCode, err)
	}

	var loginRes struct {
		Data struct {
			Token string       `json:"token"`
			User  *domain.User `json:"user"`
		} `json:"data"`
	}
	_ = json.NewDecoder(respLogin.Body).Decode(&loginRes)
	token := loginRes.Data.Token
	if token == "" {
		t.Fatalf("Expected token, got empty")
	}

	// 3. User tetap bisa masuk & cek profil /auth/me (namun can_sell_harvest masih false)
	reqMe := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	reqMe.Header.Set("Authorization", "Bearer "+token)
	respMe, err := app.Test(reqMe)
	if err != nil || respMe.StatusCode != http.StatusOK {
		t.Fatalf("Get /auth/me failed: status=%d, err=%v", respMe.StatusCode, err)
	}

	var meRes struct {
		Data domain.User `json:"data"`
	}
	_ = json.NewDecoder(respMe.Body).Decode(&meRes)
	if meRes.Data.CanSellHarvest || meRes.Data.IsVerified {
		t.Errorf("New farmer should not be allowed to sell harvest yet")
	}

	// 4. Petani mencoba Jual Panen sebelum verifikasi -> WAJIB GAGAL (403 Forbidden)
	listingPayload := `{"commodity_id":"gabah-kering-panen","title":"Gabah Kering Panen","estimated_quantity":12000,"unit":"kg","price_per_unit":7200}`
	reqListFail := httptest.NewRequest(http.MethodPost, "/api/v1/farmer/listings", bytes.NewBufferString(listingPayload))
	reqListFail.Header.Set("Content-Type", "application/json")
	reqListFail.Header.Set("Authorization", "Bearer "+token)
	respListFail, err := app.Test(reqListFail)
	if err != nil {
		t.Fatalf("Listing request failed: %v", err)
	}
	if respListFail.StatusCode != http.StatusForbidden {
		body, _ := io.ReadAll(respListFail.Body)
		t.Fatalf("Expected 403 Forbidden for unverified farmer, got %d. Body: %s", respListFail.StatusCode, string(body))
	}

	// 5. Cek Status Verifikasi via GET /api/v1/farmer/verification
	reqVerStatus := httptest.NewRequest(http.MethodGet, "/api/v1/farmer/verification", nil)
	reqVerStatus.Header.Set("Authorization", "Bearer "+token)
	respVerStatus, err := app.Test(reqVerStatus)
	if err != nil || respVerStatus.StatusCode != http.StatusOK {
		t.Fatalf("Get verification status failed: %v", err)
	}

	// 6. Petani submit dokumen e-KTP via POST /api/v1/farmer/verification
	verifyPayload := `{
		"nik": "3321041405760002",
		"name": "SUGENG RIYADI",
		"birth_place": "Demak",
		"birth_date": "1978-05-14",
		"ktp_address": "RT 03 / RW 02, Desa Karangawen, Kecamatan Karangawen, Kabupaten Demak, Jawa Tengah 59566",
		"ktp_photo_url": "https://storage.tandur.com/ktp/3321041405760002.jpg",
		"declaration_accepted": true
	}`
	reqVerify := httptest.NewRequest(http.MethodPost, "/api/v1/farmer/verification", bytes.NewBufferString(verifyPayload))
	reqVerify.Header.Set("Content-Type", "application/json")
	reqVerify.Header.Set("Authorization", "Bearer "+token)
	respVerify, err := app.Test(reqVerify)
	if err != nil || respVerify.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(respVerify.Body)
		t.Fatalf("Submit verification failed: status=%d, body=%s", respVerify.StatusCode, string(body))
	}

	var verifyRes struct {
		Data domain.FarmerVerificationResponse `json:"data"`
	}
	_ = json.NewDecoder(respVerify.Body).Decode(&verifyRes)
	if !verifyRes.Data.IsVerified || !verifyRes.Data.CanSellHarvest {
		t.Errorf("Expected IsVerified=true and CanSellHarvest=true, got %+v", verifyRes.Data)
	}

	// 7. Cek /auth/me setelah verifikasi -> can_sell_harvest menjadi true
	reqMeAfter := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	reqMeAfter.Header.Set("Authorization", "Bearer "+token)
	respMeAfter, _ := app.Test(reqMeAfter)
	var meAfterRes struct {
		Data domain.User `json:"data"`
	}
	_ = json.NewDecoder(respMeAfter.Body).Decode(&meAfterRes)
	if !meAfterRes.Data.CanSellHarvest || !meAfterRes.Data.IsVerified {
		t.Errorf("Expected verified profile on /auth/me, got: %+v", meAfterRes.Data)
	}

	// 8. Petani sekarang SUKSES Jual Panen via POST /api/v1/farmer/listings
	reqListSuccess := httptest.NewRequest(http.MethodPost, "/api/v1/farmer/listings", bytes.NewBufferString(listingPayload))
	reqListSuccess.Header.Set("Content-Type", "application/json")
	reqListSuccess.Header.Set("Authorization", "Bearer "+token)
	respListSuccess, err := app.Test(reqListSuccess)
	if err != nil {
		t.Fatalf("Listing request failed: %v", err)
	}
	if respListSuccess.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(respListSuccess.Body)
		t.Fatalf("Expected 201 Created for verified farmer, got %d. Body: %s", respListSuccess.StatusCode, string(body))
	}
}

func TestGarageStorage_CryptoEncryptionAES256(t *testing.T) {
	cfg := &config.Config{
		S3Endpoint: "http://localhost:3900",
		S3Bucket:   "tandur",
		JWTSecret:  "tandur-super-secret-master-key-32chars!",
	}
	garage := storage.NewGarageStorage(cfg)

	rawPhoto := []byte("SIMULATED_E_KTP_IMAGE_BINARY_DATA_OF_SUGENG_RIYADI_3321041405760002")
	secretKey := "tandur-aes-master-encryption-key-for-ktp"

	// 1. Uji Enkripsi AES-256-GCM
	ciphertext, err := storage.EncryptAES256GCM(rawPhoto, secretKey)
	if err != nil {
		t.Fatalf("Encryption failed: %v", err)
	}

	if bytes.Equal(rawPhoto, ciphertext) {
		t.Fatalf("Ciphertext must not match raw plaintext")
	}

	// 2. Uji Dekripsi Berhasil dengan Kunci yang Tepat
	decrypted, err := storage.DecryptAES256GCM(ciphertext, secretKey)
	if err != nil {
		t.Fatalf("Decryption failed: %v", err)
	}
	if !bytes.Equal(rawPhoto, decrypted) {
		t.Fatalf("Decrypted data does not match original photo bytes")
	}

	// 3. Uji Keamanan: Kunci Salah Harus Gagal
	_, errWrongKey := storage.DecryptAES256GCM(ciphertext, "wrong-unauthorized-key")
	if errWrongKey == nil {
		t.Fatalf("Expected decryption failure with wrong key")
	}

	// 4. Uji Keamanan: Data Dimanipulasi / Dirusak Harus Gagal (GCM Integrity Authentication)
	tampered := make([]byte, len(ciphertext))
	copy(tampered, ciphertext)
	tampered[len(tampered)-1] ^= 0xFF
	_, errTampered := storage.DecryptAES256GCM(tampered, secretKey)
	if errTampered == nil {
		t.Fatalf("Expected integrity authentication error on tampered ciphertext")
	}

	// 5. Uji Simpan Berkas Terenkripsi ke Garage S3 Storage
	key := "ktp/petani-sugeng-test.enc"
	uploadURL, err := garage.UploadEncrypted(context.Background(), key, bytes.NewReader(rawPhoto), "image/jpeg", secretKey)
	if err != nil {
		t.Fatalf("UploadEncrypted to Garage failed: %v", err)
	}
	if uploadURL != "http://localhost:3900/tandur/ktp/petani-sugeng-test.enc" {
		t.Errorf("Unexpected Garage URL: %s", uploadURL)
	}

	// 6. Uji Unduh dan Dekripsi dari Garage S3 Storage
	downloadedDecrypted, err := garage.DownloadDecrypted(context.Background(), key, secretKey)
	if err != nil {
		t.Fatalf("DownloadDecrypted from Garage failed: %v", err)
	}
	if !bytes.Equal(rawPhoto, downloadedDecrypted) {
		t.Fatalf("Downloaded decrypted bytes do not match original e-KTP photo")
	}
}
