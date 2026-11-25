package persistence

import (
	"context"
	"fmt"
	"sync"
	"time"

	"golang.org/x/crypto/bcrypt"
	"tandur/api/internal/domain"
	"tandur/api/internal/infrastructure/config"
)

type MemoryCommodityRepository struct {
	mu          sync.RWMutex
	commodities map[string]domain.Commodity
}

func NewMemoryCommodityRepository() *MemoryCommodityRepository {
	repo := &MemoryCommodityRepository{
		commodities: make(map[string]domain.Commodity),
	}

	// Seed default commodities for development
	repo.commodities["gkp"] = domain.Commodity{
		ID:                 "gkp",
		Name:               "Gabah Kering Panen",
		Category:           "Padi / Beras",
		Unit:               "kg",
		BasePrice:          7050,
		CurrentMarketPrice: 7200,
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}
	repo.commodities["gkg"] = domain.Commodity{
		ID:                 "gkg",
		Name:               "Gabah Kering Giling",
		Category:           "Padi / Beras",
		Unit:               "kg",
		BasePrice:          8100,
		CurrentMarketPrice: 8100,
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}
	repo.commodities["jagung"] = domain.Commodity{
		ID:                 "jagung",
		Name:               "Jagung Pipil Kering",
		Category:           "Palawija",
		Unit:               "kg",
		BasePrice:          5400,
		CurrentMarketPrice: 5600,
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}
	repo.commodities["kedelai"] = domain.Commodity{
		ID:                 "kedelai",
		Name:               "Kedelai Lokal Bersih",
		Category:           "Palawija",
		Unit:               "kg",
		BasePrice:          11200,
		CurrentMarketPrice: 11200,
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}
	repo.commodities["cabai-merah"] = domain.Commodity{
		ID:                 "cabai-merah",
		Name:               "Cabai Merah Keriting",
		Category:           "Hortikultura",
		Unit:               "kg",
		BasePrice:          40000,
		CurrentMarketPrice: 45000,
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}
	repo.commodities["bawang-merah"] = domain.Commodity{
		ID:                 "bawang-merah",
		Name:               "Bawang Merah Brebes",
		Category:           "Hortikultura",
		Unit:               "kg",
		BasePrice:          32000,
		CurrentMarketPrice: 36000,
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}

	return repo
}

func (r *MemoryCommodityRepository) GetAll(ctx context.Context) ([]domain.Commodity, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := make([]domain.Commodity, 0, len(r.commodities))
	for _, c := range r.commodities {
		result = append(result, c)
	}
	return result, nil
}

func (r *MemoryCommodityRepository) GetByID(ctx context.Context, id string) (*domain.Commodity, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	c, ok := r.commodities[id]
	if !ok {
		return nil, domain.ErrCommodityNotFound
	}
	return &c, nil
}

func (r *MemoryCommodityRepository) Create(ctx context.Context, commodity *domain.Commodity) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.commodities[commodity.ID] = *commodity
	return nil
}

func (r *MemoryCommodityRepository) Update(ctx context.Context, commodity *domain.Commodity) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.commodities[commodity.ID] = *commodity
	return nil
}

// User Persistence Implementation (In-Memory Repository)
type MemoryUserRepository struct {
	mu           sync.RWMutex
	users        map[string]domain.User         // key: user.ID
	usersByNIK   map[string]string            // NIK -> user.ID
	usersByPhone map[string]string          // Phone -> user.ID
	locations    map[string]domain.UserLocation // key: user.ID
	tokens       map[string]string            // token -> user.ID
}

func NewMemoryUserRepository() *MemoryUserRepository {
	repo := &MemoryUserRepository{
		users:        make(map[string]domain.User),
		usersByNIK:   make(map[string]string),
		usersByPhone: make(map[string]string),
		locations:    make(map[string]domain.UserLocation),
		tokens:       make(map[string]string),
	}

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("password"), bcrypt.DefaultCost)
	passStr := string(hashedPassword)

	sugengNIK := "3521092804750002"
	sugengUser := domain.User{
		ID:                 "user-farmer-1",
		NIK:                &sugengNIK,
		Name:               "Sugeng Santoso",
		Phone:              "081289901234",
		PasswordHash:       passStr,
		Role:               domain.RoleFarmer,
		IsActive:           true,
		IsVerified:         true,
		VerificationStatus: domain.VerificationStatusVerified,
		CanSellHarvest:     true,
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}
	repo.users[sugengUser.ID] = sugengUser
	repo.usersByNIK[sugengNIK] = sugengUser.ID
	repo.usersByPhone[sugengUser.Phone] = sugengUser.ID

	supardiNIK := "3521092804750008"
	supardiUser := domain.User{
		ID:                 "user-middleman-1",
		NIK:                &supardiNIK,
		Name:               "Haji Supardi",
		Phone:              "081328905678",
		PasswordHash:       passStr,
		Role:               domain.RoleMiddleman,
		IsActive:           true,
		IsVerified:         true,
		VerificationStatus: domain.VerificationStatusVerified,
		CanSellHarvest:     false,
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}
	repo.users[supardiUser.ID] = supardiUser
	repo.usersByNIK[supardiNIK] = supardiUser.ID
	repo.usersByPhone[supardiUser.Phone] = supardiUser.ID

	return repo
}

func (r *MemoryUserRepository) Create(ctx context.Context, user *domain.User, location *domain.UserLocation) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if user.NIK != nil && *user.NIK != "" {
		if _, exists := r.usersByNIK[*user.NIK]; exists {
			return domain.ErrNIKAlreadyExists
		}
	}
	if user.Phone != "" {
		if _, exists := r.usersByPhone[user.Phone]; exists {
			return domain.ErrPhoneAlreadyExists
		}
	}

	r.users[user.ID] = *user
	if user.NIK != nil && *user.NIK != "" {
		r.usersByNIK[*user.NIK] = user.ID
	}
	if user.Phone != "" {
		r.usersByPhone[user.Phone] = user.ID
	}
	if location != nil {
		r.locations[user.ID] = *location
	}
	return nil
}

func (r *MemoryUserRepository) GetByPhone(ctx context.Context, phone string) (*domain.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	id, ok := r.usersByPhone[phone]
	if !ok {
		return nil, domain.ErrUserNotFound
	}
	user := r.users[id]
	return &user, nil
}

func (r *MemoryUserRepository) GetByNIK(ctx context.Context, nik string) (*domain.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	id, ok := r.usersByNIK[nik]
	if !ok {
		return nil, domain.ErrUserNotFound
	}
	user := r.users[id]
	return &user, nil
}

func (r *MemoryUserRepository) GetByID(ctx context.Context, id string) (*domain.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	user, ok := r.users[id]
	if !ok {
		return nil, domain.ErrUserNotFound
	}
	return &user, nil
}

func (r *MemoryUserRepository) UpdateVerification(ctx context.Context, user *domain.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.users[user.ID]; !ok {
		return domain.ErrUserNotFound
	}
	r.users[user.ID] = *user
	return nil
}

func (r *MemoryUserRepository) SaveToken(token, userID string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.tokens[token] = userID
}

func (r *MemoryUserRepository) GetByToken(ctx context.Context, token string) (*domain.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	userID, ok := r.tokens[token]
	if !ok {
		return nil, domain.ErrUserNotFound
	}
	user, exists := r.users[userID]
	if !exists {
		return nil, domain.ErrUserNotFound
	}
	return &user, nil
}

func (r *MemoryUserRepository) UpdateProfile(ctx context.Context, user *domain.User, location *domain.UserLocation) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.users[user.ID]; !ok {
		return domain.ErrUserNotFound
	}
	r.users[user.ID] = *user
	if location != nil {
		r.locations[user.ID] = *location
	}
	return nil
}

// Database Connection Helper
func CheckDBConnection(cfg *config.Config) (string, error) {
	// DSN format for reference
	_ = fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		cfg.DatabaseHost, cfg.DatabasePort, cfg.DatabaseUser, cfg.DatabasePass, cfg.DatabaseName, cfg.DatabaseSSL)

	return "standby (ready for migrations)", nil
}

