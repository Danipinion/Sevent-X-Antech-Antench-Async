package application

import (
	"context"
	"strings"
	"unicode"

	"golang.org/x/crypto/bcrypt"
	"tandur/api/internal/domain"
)

type RegisterLocationInput struct {
	Label     string  `json:"label"`
	Address   string  `json:"address"`
	Village   string  `json:"village"`
	District  string  `json:"district"`
	City      string  `json:"city"`
	Province  string  `json:"province"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

type RegisterInput struct {
	NIK       *string                `json:"nik" form:"nik"`
	Name      string                 `json:"name" form:"name"`
	Phone     string                 `json:"phone" form:"phone"`
	Password  string                 `json:"password" form:"password"`
	Role      string                 `json:"role" form:"role"`
	IsBisnis  bool                   `json:"is_bisnis" form:"is_bisnis"`
	Location  *RegisterLocationInput `json:"location,omitempty"`

	// Flat location fields for form/parameter input
	Label     string   `json:"label,omitempty" form:"label"`
	Address   string   `json:"address,omitempty" form:"address"`
	Village   string   `json:"village,omitempty" form:"village"`
	District  string   `json:"district,omitempty" form:"district"`
	City      string   `json:"city,omitempty" form:"city"`
	Province  string   `json:"province,omitempty" form:"province"`
	Latitude  *float64 `json:"latitude,omitempty" form:"latitude"`
	Longitude *float64 `json:"longitude,omitempty" form:"longitude"`
}

type AuthService struct {
	userRepo domain.UserRepository
}

func NewAuthService(userRepo domain.UserRepository) *AuthService {
	return &AuthService{
		userRepo: userRepo,
	}
}

func (s *AuthService) Register(ctx context.Context, input RegisterInput) (*domain.User, error) {
	// 1. Validasi Nama
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return nil, domain.ErrNameRequired
	}
	if len(name) > 150 {
		name = name[:150]
	}

	// 2. Validasi & Normalisasi Nomor Handphone (10-13 digit)
	phone := normalizePhone(input.Phone)
	if len(phone) < 10 || len(phone) > 13 || !isDigitsOnly(phone) {
		return nil, domain.ErrInvalidPhone
	}

	// 3. Validasi NIK (jika diisi, harus 16 digit angka)
	var nik *string
	if input.NIK != nil {
		cleanNIK := strings.TrimSpace(*input.NIK)
		if cleanNIK != "" {
			if len(cleanNIK) != 16 || !isDigitsOnly(cleanNIK) {
				return nil, domain.ErrInvalidNIK
			}
			nik = &cleanNIK
		}
	}

	// 4. Validasi Role (farmer, middleman, buyer)
	role := domain.UserRole(strings.ToLower(strings.TrimSpace(input.Role)))
	if !role.IsValid() {
		return nil, domain.ErrInvalidRole
	}

	// 5. Validasi Password
	if len(input.Password) < 6 {
		return nil, domain.ErrPasswordTooShort
	}

	// 6. Hash Password dengan Bcrypt
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	// 7. Siapkan Entity User
	user := &domain.User{
		NIK:          nik,
		Name:         name,
		Phone:        phone,
		PasswordHash: string(passwordHash),
		Role:         role,
		IsBisnis:     input.IsBisnis,
		IsActive:     true,
	}

	// 8. Validasi & Siapkan Lokasi jika disertakan
	var location *domain.UserLocation
	if input.Location != nil && strings.TrimSpace(input.Location.Address) != "" {
		locInput := input.Location
		if locInput.Latitude < -90 || locInput.Latitude > 90 || locInput.Longitude < -180 || locInput.Longitude > 180 {
			return nil, domain.ErrInvalidCoordinate
		}

		label := strings.TrimSpace(locInput.Label)
		if label == "" {
			label = "Utama"
		}

		location = &domain.UserLocation{
			Label:     label,
			Address:   strings.TrimSpace(locInput.Address),
			Village:   strings.TrimSpace(locInput.Village),
			District:  strings.TrimSpace(locInput.District),
			City:      strings.TrimSpace(locInput.City),
			Province:  strings.TrimSpace(locInput.Province),
			Latitude:  locInput.Latitude,
			Longitude: locInput.Longitude,
			IsPrimary: true,
		}
	} else if strings.TrimSpace(input.Address) != "" {
		lat := 0.0
		lng := 0.0
		if input.Latitude != nil {
			lat = *input.Latitude
		}
		if input.Longitude != nil {
			lng = *input.Longitude
		}
		if lat < -90 || lat > 90 || lng < -180 || lng > 180 {
			return nil, domain.ErrInvalidCoordinate
		}

		label := strings.TrimSpace(input.Label)
		if label == "" {
			label = "Utama"
		}

		location = &domain.UserLocation{
			Label:     label,
			Address:   strings.TrimSpace(input.Address),
			Village:   strings.TrimSpace(input.Village),
			District:  strings.TrimSpace(input.District),
			City:      strings.TrimSpace(input.City),
			Province:  strings.TrimSpace(input.Province),
			Latitude:  lat,
			Longitude: lng,
			IsPrimary: true,
		}
	}

	// 9. Simpan ke database
	if err := s.userRepo.Create(ctx, user, location); err != nil {
		return nil, err
	}

	return user, nil
}

func normalizePhone(raw string) string {
	cleaned := strings.TrimSpace(raw)
	cleaned = strings.ReplaceAll(cleaned, " ", "")
	cleaned = strings.ReplaceAll(cleaned, "-", "")

	if strings.HasPrefix(cleaned, "+62") {
		cleaned = "0" + strings.TrimPrefix(cleaned, "+62")
	} else if strings.HasPrefix(cleaned, "62") {
		cleaned = "0" + strings.TrimPrefix(cleaned, "62")
	}
	return cleaned
}

func isDigitsOnly(s string) bool {
	if s == "" {
		return false
	}
	for _, c := range s {
		if !unicode.IsDigit(c) {
			return false
		}
	}
	return true
}
