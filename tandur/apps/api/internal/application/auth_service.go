package application

import (
	"context"
	"errors"
	"strings"
	"time"
	"unicode"

	"github.com/golang-jwt/jwt/v5"
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

type LoginInput struct {
	Username string `json:"username" form:"username"`
	Phone    string `json:"phone,omitempty" form:"phone"`
	NIK      string `json:"nik,omitempty" form:"nik"`
	Password string `json:"password" form:"password"`
}

type LoginResult struct {
	Token     string       `json:"token"`
	TokenType string       `json:"token_type"`
	ExpiresAt string       `json:"expires_at"`
	User      *domain.User `json:"user"`
}

type JWTClaims struct {
	UserID   string          `json:"user_id"`
	Name     string          `json:"name"`
	Phone    string          `json:"phone"`
	NIK      *string         `json:"nik,omitempty"`
	Role     domain.UserRole `json:"role"`
	IsBisnis bool            `json:"is_bisnis"`
	jwt.RegisteredClaims
}

type AuthService struct {
	userRepo    domain.UserRepository
	jwtSecret   string
	jwtDuration time.Duration
}

func NewAuthService(userRepo domain.UserRepository, jwtSecret string, jwtDuration time.Duration) *AuthService {
	if jwtSecret == "" {
		jwtSecret = "tandur-secret-key-development-32chars-min!"
	}
	if jwtDuration <= 0 {
		jwtDuration = 72 * time.Hour
	}

	return &AuthService{
		userRepo:    userRepo,
		jwtSecret:   jwtSecret,
		jwtDuration: jwtDuration,
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

// Login memvalidasi kredensial pengguna (Nomor Handphone atau NIK + Password) dan menerbitkan token JWT
func (s *AuthService) Login(ctx context.Context, input LoginInput) (*LoginResult, error) {
	if s.userRepo == nil {
		return nil, errors.New("user repository tidak tersedia")
	}

	// 1. Identifikasi Username (dapat berupa Nomor HP atau NIK)
	identifier := strings.TrimSpace(input.Username)
	if identifier == "" {
		if strings.TrimSpace(input.Phone) != "" {
			identifier = strings.TrimSpace(input.Phone)
		} else if strings.TrimSpace(input.NIK) != "" {
			identifier = strings.TrimSpace(input.NIK)
		}
	}
	if identifier == "" {
		return nil, domain.ErrUsernameRequired
	}

	// 2. Validasi Password
	if strings.TrimSpace(input.Password) == "" {
		return nil, domain.ErrPasswordRequired
	}

	cleanID := strings.ReplaceAll(identifier, " ", "")
	cleanID = strings.ReplaceAll(cleanID, "-", "")

	var user *domain.User
	var err error

	// 3. Jika identifier adalah 16 digit angka, coba cari berdasarkan NIK
	if len(cleanID) == 16 && isDigitsOnly(cleanID) {
		user, err = s.userRepo.GetByNIK(ctx, cleanID)
	}

	// 4. Jika belum ditemukan (atau bukan 16 digit), coba cari berdasarkan nomor Handphone (dinormalisasi)
	if user == nil {
		normalizedPhone := normalizePhone(identifier)
		user, err = s.userRepo.GetByPhone(ctx, normalizedPhone)
	}

	// 5. Jika akun tidak ditemukan
	if err != nil || user == nil {
		return nil, domain.ErrInvalidCredentials
	}

	// 6. Validasi status aktif akun
	if !user.IsActive {
		return nil, domain.ErrAccountInactive
	}

	// 7. Verifikasi password dengan bcrypt
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		return nil, domain.ErrInvalidCredentials
	}

	// 8. Terbitkan JWT Token
	now := time.Now()
	expiresAt := now.Add(s.jwtDuration)
	claims := JWTClaims{
		UserID:   user.ID,
		Name:     user.Name,
		Phone:    user.Phone,
		NIK:      user.NIK,
		Role:     user.Role,
		IsBisnis: user.IsBisnis,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.ID,
			Issuer:    "tandur-api",
			Audience:  jwt.ClaimStrings{"tandur"},
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
		},
	}

	tokenObj := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, err := tokenObj.SignedString([]byte(s.jwtSecret))
	if err != nil {
		return nil, err
	}

	return &LoginResult{
		Token:     tokenStr,
		TokenType: "Bearer",
		ExpiresAt: expiresAt.UTC().Format(time.RFC3339),
		User:      user,
	}, nil
}

// ValidateToken memvalidasi keaslian token JWT dan mengembalikan claims
func (s *AuthService) ValidateToken(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, domain.ErrUnauthorized
		}
		return []byte(s.jwtSecret), nil
	})
	if err != nil {
		return nil, domain.ErrUnauthorized
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	}
	return nil, domain.ErrUnauthorized
}

// GetProfile mengambil profil pengguna berdasarkan User ID
func (s *AuthService) GetProfile(ctx context.Context, userID string) (*domain.User, error) {
	if s.userRepo == nil {
		return nil, errors.New("user repository tidak tersedia")
	}
	return s.userRepo.GetByID(ctx, userID)
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
