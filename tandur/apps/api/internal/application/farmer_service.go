package application

import (
	"context"
	"math"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"tandur/api/internal/domain"
)

var nikRegex = regexp.MustCompile(`^[0-9]{16}$`)

type FarmerService struct {
	userRepo    domain.UserRepository
	listingRepo domain.ListingRepository
	listingsMu  sync.RWMutex
	memListings map[string][]domain.FarmerListing
}

func NewFarmerService(userRepo domain.UserRepository, listingRepo ...domain.ListingRepository) *FarmerService {
	var lr domain.ListingRepository
	if len(listingRepo) > 0 {
		lr = listingRepo[0]
	}
	return &FarmerService{
		userRepo:    userRepo,
		listingRepo: lr,
		memListings: make(map[string][]domain.FarmerListing),
	}
}

// GetVerificationStatus mengambil status verifikasi kemitraan petani saat ini
func (s *FarmerService) GetVerificationStatus(ctx context.Context, userID string) (*domain.FarmerVerificationResponse, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	canSell := user.CheckCanSellHarvest()

	nik := ""
	if user.NIK != nil {
		nik = *user.NIK
	}

	ktpPhoto := ""
	if user.KTPPhotoURL != nil {
		ktpPhoto = *user.KTPPhotoURL
	}

	birthPlace := ""
	if user.BirthPlace != nil {
		birthPlace = *user.BirthPlace
	}

	birthDate := ""
	if user.BirthDate != nil {
		birthDate = *user.BirthDate
	}

	ktpAddress := ""
	if user.KTPAddress != nil {
		ktpAddress = *user.KTPAddress
	}

	rejectionReason := ""
	if user.RejectionReason != nil {
		rejectionReason = *user.RejectionReason
	}

	message := "Status kemitraan: Belum Terverifikasi"
	switch user.VerificationStatus {
	case domain.VerificationStatusVerified:
		message = "Status kemitraan: Terverifikasi. Kuota penjualan panen aktif."
	case domain.VerificationStatusPending:
		message = "Status kemitraan: Dokumen sedang dalam peninjauan."
	case domain.VerificationStatusRejected:
		message = "Status kemitraan: Verifikasi ditolak. Silakan periksa kembali berkas e-KTP."
	}

	return &domain.FarmerVerificationResponse{
		UserID:             user.ID,
		NIK:                nik,
		Name:               user.Name,
		VerificationStatus: user.VerificationStatus,
		IsVerified:         user.IsVerified,
		CanSellHarvest:     canSell,
		KTPPhotoURL:        ktpPhoto,
		BirthPlace:         birthPlace,
		BirthDate:          birthDate,
		KTPAddress:         ktpAddress,
		VerifiedAt:         user.VerifiedAt,
		RejectionReason:    rejectionReason,
		Message:            message,
	}, nil
}

// SubmitVerification memproses pengunggahan dokumen e-KTP dan data OCR untuk verifikasi kemitraan petani
func (s *FarmerService) SubmitVerification(ctx context.Context, userID string, input domain.FarmerVerificationInput) (*domain.FarmerVerificationResponse, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// 1. Verifikasi hanya untuk akun petani
	if user.Role != domain.RoleFarmer {
		return nil, domain.ErrOnlyFarmerCanVerify
	}

	// 2. Persetujuan deklarasi data & e-KTP wajib dicentang
	if !input.DeclarationAccepted {
		return nil, domain.ErrDeclarationRequired
	}

	// 3. Validasi NIK (16 digit angka)
	cleanNIK := strings.TrimSpace(input.NIK)
	if !nikRegex.MatchString(cleanNIK) {
		return nil, domain.ErrInvalidNIK
	}

	// 4. Validasi nama sesuai KTP
	cleanName := strings.TrimSpace(input.Name)
	if cleanName == "" {
		return nil, domain.ErrNameRequired
	}

	// 5. Validasi foto KTP
	cleanPhotoURL := strings.TrimSpace(input.KTPPhotoURL)
	if cleanPhotoURL == "" {
		return nil, domain.ErrKTPPhotoRequired
	}

	// 6. Validasi alamat KTP
	cleanAddress := strings.TrimSpace(input.KTPAddress)
	if cleanAddress == "" {
		return nil, domain.ErrKTPAddressRequired
	}

	// 7. Cek apakah NIK sudah digunakan oleh akun lain
	existingUser, err := s.userRepo.GetByNIK(ctx, cleanNIK)
	if err == nil && existingUser != nil && existingUser.ID != user.ID {
		return nil, domain.ErrNIKAlreadyExists
	}

	// 8. Update profil dan status verifikasi petani
	now := time.Now()
	cleanBirthPlace := strings.TrimSpace(input.BirthPlace)
	cleanBirthDate := strings.TrimSpace(input.BirthDate)

	user.NIK = &cleanNIK
	user.Name = cleanName
	user.KTPPhotoURL = &cleanPhotoURL
	if cleanBirthPlace != "" {
		user.BirthPlace = &cleanBirthPlace
	}
	if cleanBirthDate != "" {
		user.BirthDate = &cleanBirthDate
	}
	user.KTPAddress = &cleanAddress
	user.IsVerified = true
	user.VerificationStatus = domain.VerificationStatusVerified
	user.VerifiedAt = &now
	user.RejectionReason = nil
	user.CanSellHarvest = true

	if err := s.userRepo.UpdateVerification(ctx, user); err != nil {
		return nil, err
	}

	return &domain.FarmerVerificationResponse{
		UserID:             user.ID,
		NIK:                cleanNIK,
		Name:               user.Name,
		VerificationStatus: domain.VerificationStatusVerified,
		IsVerified:         true,
		CanSellHarvest:     true,
		KTPPhotoURL:        cleanPhotoURL,
		BirthPlace:         cleanBirthPlace,
		BirthDate:          cleanBirthDate,
		KTPAddress:         cleanAddress,
		VerifiedAt:         user.VerifiedAt,
		Message:            "Dokumen e-KTP berhasil diverifikasi. Kemitraan resmi aktif dan Anda dapat mulai menjual hasil panen.",
	}, nil
}

// CreateHarvestListing membuat listing penjualan panen baru dengan guard wajib verifikasi petani & validasi media ketat
func (s *FarmerService) CreateHarvestListing(ctx context.Context, userID string, input domain.CreateListingInput) (*domain.FarmerListing, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// 1. Guard: Petani wajib terverifikasi untuk dapat menjual hasil panen
	if !user.CheckCanSellHarvest() {
		return nil, domain.ErrFarmerNotVerified
	}

	// 2. Validasi kelengkapan data dasar
	cleanCommodityID := strings.TrimSpace(input.CommodityID)
	cleanTitle := strings.TrimSpace(input.Title)
	if cleanCommodityID == "" || cleanTitle == "" || input.PricePerUnit <= 0 {
		return nil, domain.ErrInvalidInput
	}

	// 3. Validasi minimum bobot panen (minimal 500 kg sesuai standar armada truk)
	if input.EstimatedQuantity < 500 {
		return nil, domain.ErrMinOrderQuantity
	}

	minOrder := input.MinOrderQuantity
	if minOrder <= 0 {
		minOrder = 500
	}

	unit := strings.TrimSpace(input.Unit)
	if unit == "" {
		unit = "kg"
	}

	// 4. Validasi aturan komposisi berkas foto & video:
	// - Minimal 1 foto wajib diunggah
	// - Maksimal 1 video (opsional)
	// - Total media tidak melebihi 5 items
	if err := domain.ValidateMediaComposition(input.MediaURLs); err != nil {
		return nil, err
	}

	// 5. Tentukan nama komoditas dan kategori (kategori sama dengan nama komoditas sesuai acuan market price)
	commodityName := strings.TrimSpace(input.CommodityName)
	if commodityName == "" {
		commodityName = cleanCommodityID
	}
	category := strings.TrimSpace(input.Category)
	if category == "" {
		category = commodityName
	}

	// 6. Hitung estimasi pendapatan kotor (Bobot * Harga/kg)
	grossRevenue := input.EstimatedQuantity * input.PricePerUnit

	readyDate := strings.TrimSpace(input.ReadyDate)
	if readyDate == "" {
		readyDate = strings.TrimSpace(input.EstimatedHarvestDate)
	}

	listing := &domain.FarmerListing{
		ID:                    uuid.New().String(),
		FarmerID:              user.ID,
		CommodityID:           cleanCommodityID,
		CommodityName:         commodityName,
		Category:              category,
		Title:                 cleanTitle,
		Description:           strings.TrimSpace(input.Description),
		EstimatedQuantity:     input.EstimatedQuantity,
		AvailableQuantity:     input.EstimatedQuantity,
		MinOrderQuantity:      minOrder,
		Unit:                  unit,
		PricePerUnit:          input.PricePerUnit,
		EstimatedGrossRevenue: grossRevenue,
		EstimatedHarvestDate:  readyDate,
		ReadyDate:             readyDate,
		PickupAddress:         strings.TrimSpace(input.PickupAddress),
		MediaURLs:             input.MediaURLs,
		Status:                domain.ListingStatusPublished,
		Latitude:              input.Latitude,
		Longitude:             input.Longitude,
		CreatedAt:             time.Now(),
		UpdatedAt:             time.Now(),
	}

	if s.listingRepo != nil {
		if err := s.listingRepo.Create(ctx, listing); err != nil {
			return nil, err
		}
	} else {
		s.listingsMu.Lock()
		s.memListings[userID] = append(s.memListings[userID], *listing)
		s.listingsMu.Unlock()
	}

	return listing, nil
}

// ListFarmerListings mengambil daftar listing hasil panen milik petani dengan filter & pagination
func (s *FarmerService) ListFarmerListings(ctx context.Context, filter domain.ListingFilter) (*domain.PaginatedListings, error) {
	if s.listingRepo != nil {
		return s.listingRepo.List(ctx, filter)
	}

	s.listingsMu.RLock()
	defer s.listingsMu.RUnlock()
	rawList := s.memListings[filter.FarmerID]

	filtered := make([]domain.FarmerListing, 0)
	for _, l := range rawList {
		if l.DeletedAt != nil {
			continue
		}
		if filter.Status != "" && filter.Status != "all" && string(l.Status) != filter.Status {
			continue
		}
		if filter.CommodityID != "" && l.CommodityID != filter.CommodityID {
			continue
		}
		filtered = append(filtered, l)
	}

	page := filter.Page
	if page < 1 {
		page = 1
	}
	limit := filter.Limit
	if limit < 1 || limit > 100 {
		limit = 10
	}

	totalItems := int64(len(filtered))
	totalPages := 0
	if totalItems > 0 {
		totalPages = int(math.Ceil(float64(totalItems) / float64(limit)))
	}

	startIndex := (page - 1) * limit
	if startIndex >= len(filtered) {
		return &domain.PaginatedListings{
			Items:      []domain.FarmerListing{},
			TotalItems: totalItems,
			Page:       page,
			Limit:      limit,
			TotalPages: totalPages,
		}, nil
	}
	endIndex := startIndex + limit
	if endIndex > len(filtered) {
		endIndex = len(filtered)
	}

	return &domain.PaginatedListings{
		Items:      filtered[startIndex:endIndex],
		TotalItems: totalItems,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	}, nil
}

// GetFarmerListingByID mengambil detail satu listing panen milik petani
func (s *FarmerService) GetFarmerListingByID(ctx context.Context, id string, userID string) (*domain.FarmerListing, error) {
	if s.listingRepo != nil {
		listing, err := s.listingRepo.GetByID(ctx, id)
		if err != nil {
			return nil, err
		}
		if listing.FarmerID != userID {
			return nil, domain.ErrUnauthorizedListingAccess
		}
		return listing, nil
	}

	s.listingsMu.RLock()
	defer s.listingsMu.RUnlock()
	for _, l := range s.memListings[userID] {
		if l.ID == id && l.DeletedAt == nil {
			item := l
			return &item, nil
		}
	}
	return nil, domain.ErrListingNotFound
}

// UpdateHarvestListing memperbarui data listing penjualan panen
func (s *FarmerService) UpdateHarvestListing(ctx context.Context, userID string, id string, input domain.UpdateListingInput) (*domain.FarmerListing, error) {
	listing, err := s.GetFarmerListingByID(ctx, id, userID)
	if err != nil {
		return nil, err
	}

	// Guard: Hanya boleh diupdate jika status masih draft atau published
	if listing.Status != domain.ListingStatusDraft && listing.Status != domain.ListingStatusPublished {
		return nil, domain.ErrListingNotEditable
	}

	if input.CommodityID != nil && strings.TrimSpace(*input.CommodityID) != "" {
		listing.CommodityID = strings.TrimSpace(*input.CommodityID)
	}
	if input.CommodityName != nil && strings.TrimSpace(*input.CommodityName) != "" {
		listing.CommodityName = strings.TrimSpace(*input.CommodityName)
	}
	if input.Category != nil && strings.TrimSpace(*input.Category) != "" {
		listing.Category = strings.TrimSpace(*input.Category)
	} else if input.CommodityName != nil && strings.TrimSpace(*input.CommodityName) != "" {
		listing.Category = strings.TrimSpace(*input.CommodityName)
	}

	if input.Title != nil && strings.TrimSpace(*input.Title) != "" {
		listing.Title = strings.TrimSpace(*input.Title)
	}
	if input.Description != nil {
		listing.Description = strings.TrimSpace(*input.Description)
	}
	if input.EstimatedQuantity != nil && *input.EstimatedQuantity > 0 {
		if *input.EstimatedQuantity < 500 {
			return nil, domain.ErrMinOrderQuantity
		}
		diff := *input.EstimatedQuantity - listing.EstimatedQuantity
		listing.EstimatedQuantity = *input.EstimatedQuantity
		listing.AvailableQuantity += diff
		if listing.AvailableQuantity < 0 {
			listing.AvailableQuantity = 0
		}
	}
	if input.MinOrderQuantity != nil && *input.MinOrderQuantity > 0 {
		listing.MinOrderQuantity = *input.MinOrderQuantity
	}
	if input.PricePerUnit != nil && *input.PricePerUnit > 0 {
		listing.PricePerUnit = *input.PricePerUnit
	}
	listing.EstimatedGrossRevenue = listing.EstimatedQuantity * listing.PricePerUnit

	if input.ReadyDate != nil && strings.TrimSpace(*input.ReadyDate) != "" {
		listing.ReadyDate = strings.TrimSpace(*input.ReadyDate)
		listing.EstimatedHarvestDate = listing.ReadyDate
	} else if input.EstimatedHarvestDate != nil && strings.TrimSpace(*input.EstimatedHarvestDate) != "" {
		listing.EstimatedHarvestDate = strings.TrimSpace(*input.EstimatedHarvestDate)
		listing.ReadyDate = listing.EstimatedHarvestDate
	}

	if input.PickupAddress != nil {
		listing.PickupAddress = strings.TrimSpace(*input.PickupAddress)
	}
	if len(input.MediaURLs) > 0 {
		if err := domain.ValidateMediaComposition(input.MediaURLs); err != nil {
			return nil, err
		}
		listing.MediaURLs = input.MediaURLs
	}
	if input.Latitude != nil {
		listing.Latitude = *input.Latitude
	}
	if input.Longitude != nil {
		listing.Longitude = *input.Longitude
	}
	listing.UpdatedAt = time.Now()

	if s.listingRepo != nil {
		if err := s.listingRepo.Update(ctx, listing); err != nil {
			return nil, err
		}
	} else {
		s.listingsMu.Lock()
		for i, l := range s.memListings[userID] {
			if l.ID == id {
				s.memListings[userID][i] = *listing
				break
			}
		}
		s.listingsMu.Unlock()
	}

	return listing, nil
}

// CancelHarvestListing membatalkan listing panen petani (Soft Delete)
func (s *FarmerService) CancelHarvestListing(ctx context.Context, userID string, id string) error {
	listing, err := s.GetFarmerListingByID(ctx, id, userID)
	if err != nil {
		return err
	}

	if listing.Status == domain.ListingStatusCompleted {
		return domain.ErrListingNotEditable
	}

	if s.listingRepo != nil {
		return s.listingRepo.SoftDelete(ctx, id, userID)
	}

	s.listingsMu.Lock()
	defer s.listingsMu.Unlock()
	for i, l := range s.memListings[userID] {
		if l.ID == id {
			now := time.Now()
			s.memListings[userID][i].Status = domain.ListingStatusCancelled
			s.memListings[userID][i].DeletedAt = &now
			return nil
		}
	}
	return domain.ErrListingNotFound
}
