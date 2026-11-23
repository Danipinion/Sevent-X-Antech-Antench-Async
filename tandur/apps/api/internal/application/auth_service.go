package application

import (
	"context"
	"errors"
	"strings"
	"time"
	"unicode"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"sync"
	"tandur/api/internal/domain"
)

type memoryTokenBlacklist struct {
	mu      sync.RWMutex
	revoked map[string]time.Time
}

func newMemoryTokenBlacklist() *memoryTokenBlacklist {
	return &memoryTokenBlacklist{
		revoked: make(map[string]time.Time),
	}
}

func (m *memoryTokenBlacklist) Blacklist(ctx context.Context, token string, expiresAt time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.revoked[token] = expiresAt
	return nil
}

func (m *memoryTokenBlacklist) IsBlacklisted(ctx context.Context, token string) (bool, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	exp, exists := m.revoked[token]
	if !exists {
		return false, nil
	}
	if time.Now().After(exp) {
		return false, nil
	}
	return true, nil
}

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

type UpdateProfileLocationInput struct {
	Label     string   `json:"label"`
	Address   string   `json:"address"`
	Village   string   `json:"village"`
	District  string   `json:"district"`
	City      string   `json:"city"`
	Province  string   `json:"province"`
	Latitude  *float64 `json:"latitude"`
	Longitude *float64 `json:"longitude"`
}

type UpdateProfileInput struct {
	Name      *string                     `json:"name" form:"name"`
	Phone     *string                     `json:"phone" form:"phone"`
	AvatarURL *string                     `json:"avatar_url" form:"avatar_url"`
	IsBisnis  *bool                       `json:"is_bisnis" form:"is_bisnis"`
	Location  *UpdateProfileLocationInput `json:"location,omitempty"`

	// Flat location fields for form/parameter input
	Label     *string  `json:"label,omitempty" form:"label"`
	Address   *string  `json:"address,omitempty" form:"address"`
	Village   *string  `json:"village,omitempty" form:"village"`
	District  *string  `json:"district,omitempty" form:"district"`
	City      *string  `json:"city,omitempty" form:"city"`
	Province  *string  `json:"province,omitempty" form:"province"`
	Latitude  *float64 `json:"latitude,omitempty" form:"latitude"`
	Longitude *float64 `json:"longitude,omitempty" form:"longitude"`

	// Sensitive fields (to explicitly detect and prevent modifications)
	NIK      *string `json:"nik,omitempty" form:"nik"`
	Role     *string `json:"role,omitempty" form:"role"`
	Password *string `json:"password,omitempty" form:"password"`
}

type LoginResult struct {
	Token     string       `json:"token"`
	TokenType string       `json:"token_type"`
	ExpiresAt string       `json:"expires_at"`
	User      *domain.User `json:"user"`
}

type JWTClaims struct {
	UserID    string          `json:"user_id"`
	Name      string          `json:"name"`
	Phone     string          `json:"phone"`
	NIK       *string         `json:"nik,omitempty"`
	Role      domain.UserRole `json:"role"`
	IsBisnis  bool            `json:"is_bisnis"`
	BuyerType string          `json:"buyer_type,omitempty"`
	jwt.RegisteredClaims
}

type AuthService struct {
	userRepo    domain.UserRepository
	blacklist   domain.TokenBlacklist
	jwtSecret   string
	jwtDuration time.Duration
}

func NewAuthService(userRepo domain.UserRepository, jwtSecret string, jwtDuration time.Duration, blacklist ...domain.TokenBlacklist) *AuthService {
	if jwtSecret == "" {
		jwtSecret = "tandur-secret-key-development-32chars-min!"
	}
	if jwtDuration <= 0 {
		jwtDuration = 72 * time.Hour
	}

	var bl domain.TokenBlacklist
	if len(blacklist) > 0 && blacklist[0] != nil {
		bl = blacklist[0]
	} else {
		bl = newMemoryTokenBlacklist()
	}

	return &AuthService{
		userRepo:    userRepo,
		blacklist:   bl,
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

	// 4. Validasi Role (farmer, middleman, buyer, retail_buyer, business_buyer)
	rawRole := strings.ToLower(strings.TrimSpace(input.Role))
	isBisnis := input.IsBisnis
	var role domain.UserRole
	switch rawRole {
	case domain.BuyerTypeRetail:
		role = domain.RoleBuyer
		isBisnis = false
	case domain.BuyerTypeBusiness:
		role = domain.RoleBuyer
		isBisnis = true
	default:
		role = domain.UserRole(rawRole)
	}
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
		NIK:                nik,
		Name:               name,
		Phone:              phone,
		PasswordHash:       string(passwordHash),
		Role:               role,
		IsBisnis:           isBisnis,
		IsActive:           true,
		IsVerified:         false,
		VerificationStatus: domain.VerificationStatusUnverified,
		CanSellHarvest:     false,
	}
	user.BuyerType = user.ResolveBuyerType()

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
	user.BuyerType = user.ResolveBuyerType()
	now := time.Now()
	expiresAt := now.Add(s.jwtDuration)
	claims := JWTClaims{
		UserID:    user.ID,
		Name:      user.Name,
		Phone:     user.Phone,
		NIK:       user.NIK,
		Role:      user.Role,
		IsBisnis:  user.IsBisnis,
		BuyerType: user.BuyerType,
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

	claims, ok := token.Claims.(*JWTClaims)
	if !ok || !token.Valid {
		return nil, domain.ErrUnauthorized
	}

	if s.blacklist != nil {
		blacklisted, err := s.blacklist.IsBlacklisted(context.Background(), tokenString)
		if err == nil && blacklisted {
			return nil, domain.ErrUnauthorized
		}
	}

	return claims, nil
}

// Logout membatalkan sesi aktif dan memasukkan token JWT ke dalam daftar blacklist
func (s *AuthService) Logout(ctx context.Context, tokenString string) error {
	claims, err := s.ValidateToken(tokenString)
	if err != nil {
		return domain.ErrUnauthorized
	}

	var expiresAt time.Time
	if claims.ExpiresAt != nil {
		expiresAt = claims.ExpiresAt.Time
	} else {
		expiresAt = time.Now().Add(s.jwtDuration)
	}

	if s.blacklist != nil {
		return s.blacklist.Blacklist(ctx, tokenString, expiresAt)
	}

	return nil
}

func (s *AuthService) UserRepo() domain.UserRepository {
	return s.userRepo
}

// GetProfile mengambil profil pengguna berdasarkan User ID
func (s *AuthService) GetProfile(ctx context.Context, userID string) (*domain.User, error) {
	if s.userRepo == nil {
		return nil, errors.New("user repository tidak tersedia")
	}
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	user.CanSellHarvest = user.CheckCanSellHarvest()
	user.BuyerType = user.ResolveBuyerType()
	return user, nil
}

// UpdateProfile memperbarui profil pengguna dengan memastikan data sensitif seperti NIK, role, atau password tidak dapat diubah
func (s *AuthService) UpdateProfile(ctx context.Context, userID string, input UpdateProfileInput) (*domain.User, error) {
	if s.userRepo == nil {
		return nil, errors.New("user repository tidak tersedia")
	}

	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if !user.IsActive {
		return nil, domain.ErrAccountInactive
	}

	// 1. Validasi perlindungan data sensitif
	if input.NIK != nil && strings.TrimSpace(*input.NIK) != "" {
		cleanNIK := strings.TrimSpace(*input.NIK)
		if user.NIK == nil || *user.NIK != cleanNIK {
			return nil, domain.ErrSensitiveFieldCannotBeModified
		}
	}
	if input.Role != nil && strings.TrimSpace(*input.Role) != "" {
		if !strings.EqualFold(strings.TrimSpace(*input.Role), string(user.Role)) {
			return nil, domain.ErrSensitiveFieldCannotBeModified
		}
	}
	if input.Password != nil && strings.TrimSpace(*input.Password) != "" {
		return nil, domain.ErrSensitiveFieldCannotBeModified
	}

	// 2. Pembaruan Nama (jika disediakan)
	if input.Name != nil {
		name := strings.TrimSpace(*input.Name)
		if name == "" {
			return nil, domain.ErrNameRequired
		}
		if len(name) > 150 {
			name = name[:150]
		}
		user.Name = name
	}

	// 3. Pembaruan Nomor Handphone (jika disediakan)
	if input.Phone != nil {
		phone := normalizePhone(*input.Phone)
		if len(phone) < 10 || len(phone) > 13 || !isDigitsOnly(phone) {
			return nil, domain.ErrInvalidPhone
		}
		if phone != user.Phone {
			existing, err := s.userRepo.GetByPhone(ctx, phone)
			if err == nil && existing != nil && existing.ID != user.ID {
				return nil, domain.ErrPhoneAlreadyExists
			}
			user.Phone = phone
		}
	}

	// 4. Pembaruan Foto Profil / Avatar URL (jika disediakan)
	if input.AvatarURL != nil {
		avatar := strings.TrimSpace(*input.AvatarURL)
		if avatar != "" {
			user.AvatarURL = &avatar
		} else {
			user.AvatarURL = nil
		}
	}

	// 5. Pembaruan Status Akun Bisnis (jika disediakan)
	if input.IsBisnis != nil {
		user.IsBisnis = *input.IsBisnis
	}

	// 6. Pembaruan Lokasi (jika disediakan baik via object maupun flat fields)
	var location *domain.UserLocation
	if user.Location != nil {
		locCopy := *user.Location
		location = &locCopy
	} else {
		location = &domain.UserLocation{
			UserID:    user.ID,
			Label:     "Utama",
			IsPrimary: true,
		}
	}

	hasLocationUpdate := false

	if input.Location != nil {
		hasLocationUpdate = true
		if strings.TrimSpace(input.Location.Label) != "" {
			location.Label = strings.TrimSpace(input.Location.Label)
		}
		if strings.TrimSpace(input.Location.Address) != "" {
			location.Address = strings.TrimSpace(input.Location.Address)
		}
		if strings.TrimSpace(input.Location.Village) != "" {
			location.Village = strings.TrimSpace(input.Location.Village)
		}
		if strings.TrimSpace(input.Location.District) != "" {
			location.District = strings.TrimSpace(input.Location.District)
		}
		if strings.TrimSpace(input.Location.City) != "" {
			location.City = strings.TrimSpace(input.Location.City)
		}
		if strings.TrimSpace(input.Location.Province) != "" {
			location.Province = strings.TrimSpace(input.Location.Province)
		}
		if input.Location.Latitude != nil {
			lat := *input.Location.Latitude
			if lat < -90 || lat > 90 {
				return nil, domain.ErrInvalidCoordinate
			}
			location.Latitude = lat
		}
		if input.Location.Longitude != nil {
			lng := *input.Location.Longitude
			if lng < -180 || lng > 180 {
				return nil, domain.ErrInvalidCoordinate
			}
			location.Longitude = lng
		}
	}

	if input.Address != nil {
		hasLocationUpdate = true
		location.Address = strings.TrimSpace(*input.Address)
	}
	if input.Label != nil && strings.TrimSpace(*input.Label) != "" {
		hasLocationUpdate = true
		location.Label = strings.TrimSpace(*input.Label)
	}
	if input.Village != nil {
		hasLocationUpdate = true
		location.Village = strings.TrimSpace(*input.Village)
	}
	if input.District != nil {
		hasLocationUpdate = true
		location.District = strings.TrimSpace(*input.District)
	}
	if input.City != nil {
		hasLocationUpdate = true
		location.City = strings.TrimSpace(*input.City)
	}
	if input.Province != nil {
		hasLocationUpdate = true
		location.Province = strings.TrimSpace(*input.Province)
	}
	if input.Latitude != nil {
		hasLocationUpdate = true
		lat := *input.Latitude
		if lat < -90 || lat > 90 {
			return nil, domain.ErrInvalidCoordinate
		}
		location.Latitude = lat
	}
	if input.Longitude != nil {
		hasLocationUpdate = true
		lng := *input.Longitude
		if lng < -180 || lng > 180 {
			return nil, domain.ErrInvalidCoordinate
		}
		location.Longitude = lng
	}

	var locToSave *domain.UserLocation
	if hasLocationUpdate && strings.TrimSpace(location.Address) != "" {
		locToSave = location
	} else if user.Location != nil {
		locToSave = user.Location
	}

	if err := s.userRepo.UpdateProfile(ctx, user, locToSave); err != nil {
		return nil, err
	}

	user.Location = locToSave
	user.CanSellHarvest = user.CheckCanSellHarvest()
	user.BuyerType = user.ResolveBuyerType()
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
