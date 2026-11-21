package application

import (
	"context"
	"regexp"
	"strings"
	"sync"
	"time"

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

// CreateHarvestListing membuat listing penjualan panen baru dengan guard wajib verifikasi petani
func (s *FarmerService) CreateHarvestListing(ctx context.Context, userID string, input domain.CreateListingInput) (*domain.FarmerListing, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Guard: Petani wajib terverifikasi untuk dapat menjual hasil panen
	if !user.CheckCanSellHarvest() {
		return nil, domain.ErrFarmerNotVerified
	}

	if input.CommodityID == "" || input.Title == "" || input.EstimatedQuantity <= 0 || input.Unit == "" {
		return nil, domain.ErrInvalidInput
	}

	listing := &domain.FarmerListing{
		ID:                   "list-" + time.Now().Format("20060102150405"),
		FarmerID:             user.ID,
		CommodityID:          input.CommodityID,
		Title:                input.Title,
		Description:          input.Description,
		EstimatedQuantity:    input.EstimatedQuantity,
		AvailableQuantity:    input.EstimatedQuantity,
		Unit:                 input.Unit,
		PricePerUnit:         input.PricePerUnit,
		EstimatedHarvestDate: input.EstimatedHarvestDate,
		Status:               domain.ListingStatusPublished,
		Latitude:             input.Latitude,
		Longitude:            input.Longitude,
		CreatedAt:            time.Now(),
		UpdatedAt:            time.Now(),
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

// ListFarmerListings mengambil daftar listing hasil panen milik petani
func (s *FarmerService) ListFarmerListings(ctx context.Context, userID string) ([]domain.FarmerListing, error) {
	if s.listingRepo != nil {
		return s.listingRepo.GetByFarmerID(ctx, userID)
	}

	s.listingsMu.RLock()
	defer s.listingsMu.RUnlock()
	list, ok := s.memListings[userID]
	if !ok {
		return []domain.FarmerListing{}, nil
	}
	return list, nil
}
