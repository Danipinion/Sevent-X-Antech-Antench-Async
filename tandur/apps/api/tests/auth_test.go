package tests

import (
	"context"
	"errors"
	"testing"
	"time"

	"tandur/api/internal/application"
	"tandur/api/internal/domain"
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
	service := application.NewAuthService(repo)

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
	service := application.NewAuthService(repo)

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
	service := application.NewAuthService(repo)

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
	service := application.NewAuthService(repo)

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
