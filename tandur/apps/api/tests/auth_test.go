package tests

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
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

type MockUserRepository struct {
	users     map[string]*domain.User // keyed by ID
	byPhone   map[string]*domain.User
	byNIK     map[string]*domain.User
	locations map[string]*domain.UserLocation
}

func NewMockUserRepository() *MockUserRepository {
	return &MockUserRepository{
		users:     make(map[string]*domain.User),
		byPhone:   make(map[string]*domain.User),
		byNIK:     make(map[string]*domain.User),
		locations: make(map[string]*domain.UserLocation),
	}
}

func (m *MockUserRepository) Create(ctx context.Context, user *domain.User, location *domain.UserLocation) error {
	if _, exists := m.byPhone[user.Phone]; exists {
		return domain.ErrPhoneAlreadyExists
	}
	if user.NIK != nil {
		if _, exists := m.byNIK[*user.NIK]; exists {
			return domain.ErrNIKAlreadyExists
		}
	}

	user.ID = "mock-uuid-" + user.Phone
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()

	m.users[user.ID] = user
	m.byPhone[user.Phone] = user
	if user.NIK != nil {
		m.byNIK[*user.NIK] = user
	}

	if location != nil {
		location.ID = "mock-loc-" + user.ID
		location.UserID = user.ID
		location.CreatedAt = time.Now()
		location.UpdatedAt = time.Now()
		m.locations[user.ID] = location
		user.Location = location
	}

	return nil
}

func (m *MockUserRepository) GetByPhone(ctx context.Context, phone string) (*domain.User, error) {
	u, ok := m.byPhone[phone]
	if !ok {
		return nil, domain.ErrUserNotFound
	}
	return u, nil
}

func (m *MockUserRepository) GetByNIK(ctx context.Context, nik string) (*domain.User, error) {
	u, ok := m.byNIK[nik]
	if !ok {
		return nil, domain.ErrUserNotFound
	}
	return u, nil
}

func (m *MockUserRepository) GetByID(ctx context.Context, id string) (*domain.User, error) {
	u, ok := m.users[id]
	if !ok {
		return nil, domain.ErrUserNotFound
	}
	return u, nil
}

func TestAuthService_Register_Success(t *testing.T) {
	repo := NewMockUserRepository()
	service := application.NewAuthService(repo, "test-secret-key-1234567890123456", 24*time.Hour)

	nik := "3201010101010099"
	input := application.RegisterInput{
		NIK:      &nik,
		Name:     "Siti Aminah",
		Phone:    "+6281234567890",
		Password: "password123",
		Role:     "farmer",
		IsBisnis: false,
		Location: &application.RegisterLocationInput{
			Label:     "Lahan Jagung",
			Address:   "Jl. Tani Sejahtera No. 1",
			Latitude:  -6.8173,
			Longitude: 107.1394,
		},
	}

	user, err := service.Register(context.Background(), input)
	if err != nil {
		t.Fatalf("Registrasi seharusnya berhasil, tapi error: %v", err)
	}

	if user.ID == "" {
		t.Errorf("User ID tidak boleh kosong")
	}
	if user.Phone != "081234567890" {
		t.Errorf("Nomor HP seharusnya dinormalisasi ke 081234567890, didapat: %s", user.Phone)
	}
	if user.Role != domain.RoleFarmer {
		t.Errorf("Role salah, expected: farmer, got: %s", user.Role)
	}
	if user.Location == nil || user.Location.Latitude != -6.8173 || user.Location.Longitude != 107.1394 {
		t.Errorf("Data lokasi tidak tersimpan dengan benar")
	}
}

func TestAuthService_Register_WithFlatParameters(t *testing.T) {
	repo := NewMockUserRepository()
	service := application.NewAuthService(repo, "test-secret-key-1234567890123456", 24*time.Hour)

	lat := -6.7456
	lng := 107.0872
	input := application.RegisterInput{
		Name:      "Pak Joko Tani",
		Phone:     "081234567890",
		Password:  "rahasia123",
		Role:      "farmer",
		Address:   "Jl. Pertanian Makmur No. 20",
		Latitude:  &lat,
		Longitude: &lng,
	}

	user, err := service.Register(context.Background(), input)
	if err != nil {
		t.Fatalf("Registrasi dengan flat parameters gagal: %v", err)
	}

	if user.Location == nil || user.Location.Address != "Jl. Pertanian Makmur No. 20" {
		t.Errorf("Lokasi flat parameter tidak terisi dengan benar")
	}
	if user.Location.Latitude != -6.7456 || user.Location.Longitude != 107.0872 {
		t.Errorf("Koordinat flat parameter salah")
	}
}

func TestAuthService_Register_ValidationErrors(t *testing.T) {
	repo := NewMockUserRepository()
	service := application.NewAuthService(repo, "test-secret-key-1234567890123456", 24*time.Hour)

	// 1. Nama kosong
	_, err := service.Register(context.Background(), application.RegisterInput{
		Name:     "",
		Phone:    "08123456789",
		Password: "password123",
		Role:     "farmer",
	})
	if !errors.Is(err, domain.ErrNameRequired) {
		t.Errorf("Expected ErrNameRequired, got: %v", err)
	}

	// 2. Nomor HP tidak valid (< 10 digit)
	_, err = service.Register(context.Background(), application.RegisterInput{
		Name:     "Petani",
		Phone:    "08123",
		Password: "password123",
		Role:     "farmer",
	})
	if !errors.Is(err, domain.ErrInvalidPhone) {
		t.Errorf("Expected ErrInvalidPhone, got: %v", err)
	}

	// 3. NIK tidak valid (< 16 digit)
	badNIK := "12345"
	_, err = service.Register(context.Background(), application.RegisterInput{
		NIK:      &badNIK,
		Name:     "Petani",
		Phone:    "081234567890",
		Password: "password123",
		Role:     "farmer",
	})
	if !errors.Is(err, domain.ErrInvalidNIK) {
		t.Errorf("Expected ErrInvalidNIK, got: %v", err)
	}

	// 4. Role tidak valid
	_, err = service.Register(context.Background(), application.RegisterInput{
		Name:     "Petani",
		Phone:    "081234567890",
		Password: "password123",
		Role:     "superadmin",
	})
	if !errors.Is(err, domain.ErrInvalidRole) {
		t.Errorf("Expected ErrInvalidRole, got: %v", err)
	}

	// 5. Password terlalu pendek (< 6 karakter)
	_, err = service.Register(context.Background(), application.RegisterInput{
		Name:     "Petani",
		Phone:    "081234567890",
		Password: "123",
		Role:     "farmer",
	})
	if !errors.Is(err, domain.ErrPasswordTooShort) {
		t.Errorf("Expected ErrPasswordTooShort, got: %v", err)
	}

	// 6. Koordinat tidak valid
	_, err = service.Register(context.Background(), application.RegisterInput{
		Name:     "Petani",
		Phone:    "081234567890",
		Password: "password123",
		Role:     "farmer",
		Location: &application.RegisterLocationInput{
			Address:   "Jl. Raya",
			Latitude:  120.0, // Invalid latitude (> 90)
			Longitude: 100.0,
		},
	})
	if !errors.Is(err, domain.ErrInvalidCoordinate) {
		t.Errorf("Expected ErrInvalidCoordinate, got: %v", err)
	}
}

func TestAuthService_Register_DuplicateConflict(t *testing.T) {
	repo := NewMockUserRepository()
	service := application.NewAuthService(repo, "test-secret-key-1234567890123456", 24*time.Hour)

	nik := "3201010101010001"
	_, err := service.Register(context.Background(), application.RegisterInput{
		NIK:      &nik,
		Name:     "User Pertama",
		Phone:    "081200000001",
		Password: "password123",
		Role:     "farmer",
	})
	if err != nil {
		t.Fatalf("Expected first register to succeed, got: %v", err)
	}

	// Duplicate Phone
	_, err = service.Register(context.Background(), application.RegisterInput{
		Name:     "User Kedua",
		Phone:    "081200000001",
		Password: "password123",
		Role:     "middleman",
	})
	if !errors.Is(err, domain.ErrPhoneAlreadyExists) {
		t.Errorf("Expected ErrPhoneAlreadyExists, got: %v", err)
	}

	// Duplicate NIK
	_, err = service.Register(context.Background(), application.RegisterInput{
		NIK:      &nik,
		Name:     "User Ketiga",
		Phone:    "081200000009",
		Password: "password123",
		Role:     "buyer",
	})
	if !errors.Is(err, domain.ErrNIKAlreadyExists) {
		t.Errorf("Expected ErrNIKAlreadyExists, got: %v", err)
	}
}

func TestAuthService_Login_WithPhone_Success(t *testing.T) {
	repo := NewMockUserRepository()
	service := application.NewAuthService(repo, "secret-test-key-32chars-minimum!", 24*time.Hour)

	// Register user
	nik := "3201010101010055"
	_, err := service.Register(context.Background(), application.RegisterInput{
		NIK:      &nik,
		Name:     "Budi Petani",
		Phone:    "081234567890",
		Password: "passwordRahasia1",
		Role:     "farmer",
	})
	if err != nil {
		t.Fatalf("Register failed: %v", err)
	}

	// Login using Phone
	loginResult, err := service.Login(context.Background(), application.LoginInput{
		Username: "081234567890",
		Password: "passwordRahasia1",
	})
	if err != nil {
		t.Fatalf("Login with phone should succeed, got: %v", err)
	}

	if loginResult.Token == "" {
		t.Errorf("Expected non-empty JWT token")
	}
	if loginResult.TokenType != "Bearer" {
		t.Errorf("Expected token_type 'Bearer', got: %s", loginResult.TokenType)
	}
	if loginResult.User.Phone != "081234567890" {
		t.Errorf("Expected user phone 081234567890, got: %s", loginResult.User.Phone)
	}

	// Validate JWT token
	claims, err := service.ValidateToken(loginResult.Token)
	if err != nil {
		t.Fatalf("ValidateToken failed: %v", err)
	}
	if claims.UserID != loginResult.User.ID {
		t.Errorf("Claims UserID mismatch, expected: %s, got: %s", loginResult.User.ID, claims.UserID)
	}
	if claims.Phone != "081234567890" {
		t.Errorf("Claims Phone mismatch, expected: 081234567890, got: %s", claims.Phone)
	}
	if claims.Role != domain.RoleFarmer {
		t.Errorf("Claims Role mismatch, expected: %s, got: %s", domain.RoleFarmer, claims.Role)
	}
}

func TestAuthService_Login_WithNIK_Success(t *testing.T) {
	repo := NewMockUserRepository()
	service := application.NewAuthService(repo, "secret-test-key-32chars-minimum!", 24*time.Hour)

	// Register user with NIK
	nik := "3201010101010077"
	_, err := service.Register(context.Background(), application.RegisterInput{
		NIK:      &nik,
		Name:     "Agus Tengkulak",
		Phone:    "081298765432",
		Password: "passwordRahasia2",
		Role:     "middleman",
	})
	if err != nil {
		t.Fatalf("Register failed: %v", err)
	}

	// Login using NIK as username
	loginResult, err := service.Login(context.Background(), application.LoginInput{
		Username: "3201010101010077",
		Password: "passwordRahasia2",
	})
	if err != nil {
		t.Fatalf("Login with NIK should succeed, got: %v", err)
	}

	if loginResult.Token == "" {
		t.Errorf("Expected non-empty JWT token")
	}
	if loginResult.User.Name != "Agus Tengkulak" {
		t.Errorf("Expected user Agus Tengkulak, got: %s", loginResult.User.Name)
	}
	if loginResult.User.NIK == nil || *loginResult.User.NIK != "3201010101010077" {
		t.Errorf("Expected user NIK 3201010101010077, got: %v", loginResult.User.NIK)
	}
}

func TestAuthService_Login_NormalizedPhoneVariations(t *testing.T) {
	repo := NewMockUserRepository()
	service := application.NewAuthService(repo, "secret-test-key-32chars-minimum!", 24*time.Hour)

	// Registered with standard 08...
	_, err := service.Register(context.Background(), application.RegisterInput{
		Name:     "Dewi Buyer",
		Phone:    "081311223344",
		Password: "passwordRahasia3",
		Role:     "buyer",
	})
	if err != nil {
		t.Fatalf("Register failed: %v", err)
	}

	testCases := []struct {
		name     string
		username string
	}{
		{"With International Prefix +62", "+6281311223344"},
		{"With Prefix 62", "6281311223344"},
		{"With dashes", "0813-1122-3344"},
		{"With spaces", "0813 1122 3344"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result, err := service.Login(context.Background(), application.LoginInput{
				Username: tc.username,
				Password: "passwordRahasia3",
			})
			if err != nil {
				t.Fatalf("Login with %s failed: %v", tc.username, err)
			}
			if result.Token == "" {
				t.Errorf("Token should not be empty")
			}
		})
	}
}

func TestAuthService_Login_FallbackFields(t *testing.T) {
	repo := NewMockUserRepository()
	service := application.NewAuthService(repo, "secret-test-key-32chars-minimum!", 24*time.Hour)

	nik := "3201010101019999"
	_, err := service.Register(context.Background(), application.RegisterInput{
		NIK:      &nik,
		Name:     "Test User",
		Phone:    "08155556666",
		Password: "passwordRahasia4",
		Role:     "farmer",
	})
	if err != nil {
		t.Fatalf("Register failed: %v", err)
	}

	// 1. Fallback to Phone field when Username is empty
	resPhone, err := service.Login(context.Background(), application.LoginInput{
		Phone:    "08155556666",
		Password: "passwordRahasia4",
	})
	if err != nil {
		t.Fatalf("Login with Phone fallback failed: %v", err)
	}
	if resPhone.User.Phone != "08155556666" {
		t.Errorf("Expected phone 08155556666, got: %s", resPhone.User.Phone)
	}

	// 2. Fallback to NIK field when Username is empty
	resNIK, err := service.Login(context.Background(), application.LoginInput{
		NIK:      "3201010101019999",
		Password: "passwordRahasia4",
	})
	if err != nil {
		t.Fatalf("Login with NIK fallback failed: %v", err)
	}
	if resNIK.User.Name != "Test User" {
		t.Errorf("Expected user Test User, got: %s", resNIK.User.Name)
	}
}

func TestAuthService_Login_Errors(t *testing.T) {
	repo := NewMockUserRepository()
	service := application.NewAuthService(repo, "secret-test-key-32chars-minimum!", 24*time.Hour)

	nik := "3201010101018888"
	registeredUser, err := service.Register(context.Background(), application.RegisterInput{
		NIK:      &nik,
		Name:     "User Aktif",
		Phone:    "08188889999",
		Password: "passwordBenar123",
		Role:     "farmer",
	})
	if err != nil {
		t.Fatalf("Register failed: %v", err)
	}

	// 1. Wrong Password
	_, err = service.Login(context.Background(), application.LoginInput{
		Username: "08188889999",
		Password: "passwordSalah",
	})
	if !errors.Is(err, domain.ErrInvalidCredentials) {
		t.Errorf("Expected ErrInvalidCredentials for wrong password, got: %v", err)
	}

	// 2. Non-existent User
	_, err = service.Login(context.Background(), application.LoginInput{
		Username: "08199990000",
		Password: "passwordBenar123",
	})
	if !errors.Is(err, domain.ErrInvalidCredentials) {
		t.Errorf("Expected ErrInvalidCredentials for unknown user, got: %v", err)
	}

	// 3. Empty Username
	_, err = service.Login(context.Background(), application.LoginInput{
		Username: "",
		Password: "passwordBenar123",
	})
	if !errors.Is(err, domain.ErrUsernameRequired) {
		t.Errorf("Expected ErrUsernameRequired, got: %v", err)
	}

	// 4. Empty Password
	_, err = service.Login(context.Background(), application.LoginInput{
		Username: "08188889999",
		Password: "",
	})
	if !errors.Is(err, domain.ErrPasswordRequired) {
		t.Errorf("Expected ErrPasswordRequired, got: %v", err)
	}

	// 5. Inactive User
	registeredUser.IsActive = false
	_, err = service.Login(context.Background(), application.LoginInput{
		Username: "08188889999",
		Password: "passwordBenar123",
	})
	if !errors.Is(err, domain.ErrAccountInactive) {
		t.Errorf("Expected ErrAccountInactive, got: %v", err)
	}
}

func TestAuthService_ValidateToken_Invalid(t *testing.T) {
	repo := NewMockUserRepository()
	service := application.NewAuthService(repo, "secret-key-1", 1*time.Hour)
	otherService := application.NewAuthService(repo, "secret-key-2", 1*time.Hour)

	_, err := service.Register(context.Background(), application.RegisterInput{
		Name:     "Test User",
		Phone:    "081233344455",
		Password: "password123",
		Role:     "farmer",
	})
	if err != nil {
		t.Fatalf("Register failed: %v", err)
	}

	loginRes, err := service.Login(context.Background(), application.LoginInput{
		Username: "081233344455",
		Password: "password123",
	})
	if err != nil {
		t.Fatalf("Login failed: %v", err)
	}

	// Validate with wrong secret key
	_, err = otherService.ValidateToken(loginRes.Token)
	if !errors.Is(err, domain.ErrUnauthorized) {
		t.Errorf("Expected ErrUnauthorized with different secret key, got: %v", err)
	}

	// Validate garbage token
	_, err = service.ValidateToken("not.a.valid.jwt.token")
	if !errors.Is(err, domain.ErrUnauthorized) {
		t.Errorf("Expected ErrUnauthorized for invalid token format, got: %v", err)
	}
}

func TestHTTP_AuthEndpoints(t *testing.T) {
	repo := NewMockUserRepository()
	cfg := &config.Config{
		AppEnv:             "test",
		JWTSecret:          "test-jwt-secret-very-long-string-32-chars",
		JWTExpirationHours: 24,
	}
	jwtDuration := 24 * time.Hour
	authService := application.NewAuthService(repo, cfg.JWTSecret, jwtDuration)
	commodityRepo := persistence.NewMemoryCommodityRepository()
	commodityService := application.NewCommodityService(commodityRepo)

	handler := adapterHttp.NewHandler(cfg, nil, commodityService, authService)

	app := fiber.New()
	adapterHttp.SetupRoutes(app, handler)

	// 1. Test POST /api/v1/auth/register
	regPayload := map[string]interface{}{
		"nik":      "3201010101017777",
		"name":     "Petani Integrasi",
		"phone":    "081277778888",
		"password": "password123",
		"role":     "farmer",
	}
	regBody, _ := json.Marshal(regPayload)
	reqReg := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(regBody))
	reqReg.Header.Set("Content-Type", "application/json")

	respReg, err := app.Test(reqReg)
	if err != nil {
		t.Fatalf("Register request failed: %v", err)
	}
	if respReg.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(respReg.Body)
		t.Fatalf("Expected status 201 Created, got %d. Body: %s", respReg.StatusCode, string(body))
	}

	var regRespBody struct {
		Status  string `json:"status"`
		Message string `json:"message"`
		Meta    struct {
			Trace struct {
				RequestID     string `json:"request_id"`
				CorrelationID string `json:"correlation_id"`
				TraceID       string `json:"trace_id"`
				SpanID        string `json:"span_id"`
				Timestamp     string `json:"timestamp"`
				APIVersion    string `json:"api_version"`
			} `json:"trace"`
		} `json:"meta"`
	}
	_ = json.NewDecoder(respReg.Body).Decode(&regRespBody)
	if regRespBody.Status != "success" {
		t.Errorf("Expected status 'success', got %s", regRespBody.Status)
	}
	if len(regRespBody.Meta.Trace.RequestID) < 5 || regRespBody.Meta.Trace.RequestID[:4] != "req_" {
		t.Errorf("Expected request_id prefix 'req_', got %s", regRespBody.Meta.Trace.RequestID)
	}
	if len(regRespBody.Meta.Trace.CorrelationID) < 6 || regRespBody.Meta.Trace.CorrelationID[:5] != "corr_" {
		t.Errorf("Expected correlation_id prefix 'corr_', got %s", regRespBody.Meta.Trace.CorrelationID)
	}
	if regRespBody.Meta.Trace.TraceID == "" {
		t.Errorf("Expected non-empty trace_id")
	}

	// 2. Test POST /api/v1/auth/login with Phone
	loginPayload := map[string]string{
		"username": "081277778888",
		"password": "password123",
	}
	loginBody, _ := json.Marshal(loginPayload)
	reqLogin := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(loginBody))
	reqLogin.Header.Set("Content-Type", "application/json")

	respLogin, err := app.Test(reqLogin)
	if err != nil {
		t.Fatalf("Login request failed: %v", err)
	}
	if respLogin.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(respLogin.Body)
		t.Fatalf("Expected status 200 OK, got %d. Body: %s", respLogin.StatusCode, string(body))
	}

	var loginRespBody struct {
		Status  string `json:"status"`
		Message string `json:"message"`
		Data    struct {
			Token     string `json:"token"`
			TokenType string `json:"token_type"`
		} `json:"data"`
		Meta struct {
			Trace struct {
				RequestID string `json:"request_id"`
			} `json:"trace"`
		} `json:"meta"`
	}
	_ = json.NewDecoder(respLogin.Body).Decode(&loginRespBody)

	token := loginRespBody.Data.Token
	if token == "" {
		t.Fatalf("Expected token to be returned from login")
	}
	if len(loginRespBody.Meta.Trace.RequestID) < 5 || loginRespBody.Meta.Trace.RequestID[:4] != "req_" {
		t.Errorf("Expected login meta trace request_id prefix 'req_', got %s", loginRespBody.Meta.Trace.RequestID)
	}

	// 3. Test POST /api/v1/auth/login with NIK
	loginNIKPayload := map[string]string{
		"username": "3201010101017777",
		"password": "password123",
	}
	loginNIKBody, _ := json.Marshal(loginNIKPayload)
	reqLoginNIK := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(loginNIKBody))
	reqLoginNIK.Header.Set("Content-Type", "application/json")

	respLoginNIK, err := app.Test(reqLoginNIK)
	if err != nil {
		t.Fatalf("Login with NIK request failed: %v", err)
	}
	if respLoginNIK.StatusCode != http.StatusOK {
		t.Fatalf("Expected status 200 OK for NIK login, got %d", respLoginNIK.StatusCode)
	}

	// 4. Test GET /api/v1/auth/me with valid Bearer token
	reqMe := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	reqMe.Header.Set("Authorization", "Bearer "+token)

	respMe, err := app.Test(reqMe)
	if err != nil {
		t.Fatalf("Me request failed: %v", err)
	}
	if respMe.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(respMe.Body)
		t.Fatalf("Expected status 200 OK, got %d. Body: %s", respMe.StatusCode, string(body))
	}

	// 5. Test GET /api/v1/auth/me without token -> Unauthorized 401 with standard error format
	reqMeNoAuth := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	respMeNoAuth, err := app.Test(reqMeNoAuth)
	if err != nil {
		t.Fatalf("Me no auth request failed: %v", err)
	}
	if respMeNoAuth.StatusCode != http.StatusUnauthorized {
		t.Fatalf("Expected status 401 Unauthorized, got %d", respMeNoAuth.StatusCode)
	}

	var errRespBody struct {
		Status string `json:"status"`
		Error  struct {
			Code    string `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
		Meta struct {
			Trace struct {
				RequestID string `json:"request_id"`
				TraceID   string `json:"trace_id"`
				Timestamp string `json:"timestamp"`
			} `json:"trace"`
		} `json:"meta"`
	}
	_ = json.NewDecoder(respMeNoAuth.Body).Decode(&errRespBody)

	if errRespBody.Status != "error" {
		t.Errorf("Expected error status 'error', got %s", errRespBody.Status)
	}
	if errRespBody.Error.Code != "UNAUTHORIZED" {
		t.Errorf("Expected error code 'UNAUTHORIZED', got %s", errRespBody.Error.Code)
	}
	if errRespBody.Meta.Trace.RequestID == "" {
		t.Errorf("Expected non-empty error meta trace request_id")
	}

	// 6. Test duplicate registration error (409 Conflict)
	reqDup := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(regBody))
	reqDup.Header.Set("Content-Type", "application/json")
	respDup, err := app.Test(reqDup)
	if err != nil {
		t.Fatalf("Duplicate register request failed: %v", err)
	}
	if respDup.StatusCode != http.StatusConflict {
		t.Fatalf("Expected status 409 Conflict for duplicate phone, got %d", respDup.StatusCode)
	}

	var dupErrBody struct {
		Status string `json:"status"`
		Error  struct {
			Code    string `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}
	_ = json.NewDecoder(respDup.Body).Decode(&dupErrBody)
	if dupErrBody.Error.Code != "PHONE_ALREADY_EXISTS" {
		t.Errorf("Expected error code 'PHONE_ALREADY_EXISTS', got %s", dupErrBody.Error.Code)
	}
}
