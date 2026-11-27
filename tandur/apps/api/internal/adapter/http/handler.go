package http

import (
	"bytes"
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"tandur/api/internal/application"
	"tandur/api/internal/domain"
	"tandur/api/internal/infrastructure/config"
	"tandur/api/internal/infrastructure/persistence"
	"tandur/api/internal/infrastructure/storage"
)

type Handler struct {
	cfg              *config.Config
	dbPool           *pgxpool.Pool
	commodityService *application.CommodityService
	authService      *application.AuthService
	farmerService    *application.FarmerService
	orderService     *application.OrderService
	middlemanService *application.MiddlemanService
	buyerService     *application.BuyerService
	storage          storage.ObjectStorage
	authHandler      *AuthHandler
	buyerHandler     *BuyerHandler
}

func NewHandler(cfg *config.Config, dbPool *pgxpool.Pool, commodityService *application.CommodityService, authService *application.AuthService, optionalServices ...interface{}) *Handler {
	var fs *application.FarmerService
	var os *application.OrderService
	var ms *application.MiddlemanService
	var bs *application.BuyerService

	for _, opt := range optionalServices {
		switch v := opt.(type) {
		case *application.FarmerService:
			fs = v
		case *application.OrderService:
			os = v
		case *application.MiddlemanService:
			ms = v
		case *application.BuyerService:
			bs = v
		}
	}

	if fs == nil && authService != nil && authService.UserRepo() != nil {
		fs = application.NewFarmerService(authService.UserRepo())
	}

	if bs == nil {
		var userRepo domain.UserRepository
		if authService != nil {
			userRepo = authService.UserRepo()
		}
		var buyerRepo domain.BuyerRepository
		if dbPool != nil {
			buyerRepo = persistence.NewPostgresBuyerRepository(dbPool)
		} else {
			buyerRepo = persistence.NewMemoryBuyerRepository()
		}
		bs = application.NewBuyerService(buyerRepo, userRepo)
	}

	var objStorage storage.ObjectStorage
	if cfg != nil {
		objStorage = storage.NewGarageStorage(cfg)
	}

	return &Handler{
		cfg:              cfg,
		dbPool:           dbPool,
		commodityService: commodityService,
		authService:      authService,
		farmerService:    fs,
		orderService:     os,
		middlemanService: ms,
		buyerService:     bs,
		storage:          objStorage,
		authHandler:      NewAuthHandler(authService, objStorage),
		buyerHandler:     NewBuyerHandler(bs),
	}
}

func (h *Handler) HealthCheck(c fiber.Ctx) error {
	dbStatus, _ := persistence.CheckDBConnection(h.dbPool)

	return RespondSuccess(c, fiber.StatusOK, "Server beroperasi normal", fiber.Map{
		"service":   "tandur-api",
		"version":   "v1.0.0",
		"database":  dbStatus,
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

func (h *Handler) Register(c fiber.Ctx) error {
	return h.authHandler.Register(c)
}

func (h *Handler) Login(c fiber.Ctx) error {
	return h.authHandler.Login(c)
}

func (h *Handler) Me(c fiber.Ctx) error {
	return h.authHandler.Me(c)
}

func (h *Handler) UpdateProfile(c fiber.Ctx) error {
	return h.authHandler.UpdateProfile(c)
}

func (h *Handler) UploadProfilePhoto(c fiber.Ctx) error {
	return h.authHandler.UploadProfilePhoto(c)
}

func (h *Handler) Logout(c fiber.Ctx) error {
	return h.authHandler.Logout(c)
}

func (h *Handler) AuthMiddleware() fiber.Handler {
	return AuthMiddleware(h.authService)
}

func (h *Handler) ListCommodities(c fiber.Ctx) error {
	commodities, err := h.commodityService.ListCommodities(c.Context())
	if err != nil {
		return RespondError(c, fiber.StatusInternalServerError, "COMMODITY_FETCH_FAILED", "Gagal mengambil data komoditas")
	}
	return RespondSuccess(c, fiber.StatusOK, "Daftar komoditas berhasil diambil", commodities)
}

func (h *Handler) GetCommodity(c fiber.Ctx) error {
	id := c.Params("id")
	commodity, err := h.commodityService.GetCommodity(c.Context(), id)
	if err != nil {
		return RespondError(c, fiber.StatusNotFound, "COMMODITY_NOT_FOUND", "Komoditas tidak ditemukan")
	}
	return RespondSuccess(c, fiber.StatusOK, "Detail komoditas berhasil diambil", commodity)
}

func (h *Handler) GetMarketPrices(c fiber.Ctx) error {
	var query domain.MarketPriceQuery
	_ = c.Bind().Query(&query)
	_ = c.Bind().Body(&query)

	if query.Tanggal == "" && c.Query("tanggal") != "" {
		query.Tanggal = c.Query("tanggal")
	}
	if query.TanggalPembanding == "" && c.Query("tanggal_pembanding") != "" {
		query.TanggalPembanding = c.Query("tanggal_pembanding")
	}
	if query.KodeProvinsi == "" && c.Query("kode_provinsi") != "" {
		query.KodeProvinsi = c.Query("kode_provinsi")
	}
	if query.KodeKabKota == "" && c.Query("kode_kab_kota") != "" {
		query.KodeKabKota = c.Query("kode_kab_kota")
	}

	prices, err := h.commodityService.GetMarketPrices(c.Context(), query)
	if err != nil {
		return RespondError(c, fiber.StatusInternalServerError, "MARKET_PRICE_FETCH_FAILED", err.Error())
	}

	return RespondSuccess(c, fiber.StatusOK, "Harga pasar komoditas berhasil diambil", prices)
}

func (h *Handler) GetRealtimeDashboardPrices(c fiber.Ctx) error {
	var query domain.MarketPriceQuery
	_ = c.Bind().Query(&query)

	if query.KodeProvinsi == "" && c.Query("kode_provinsi") != "" {
		query.KodeProvinsi = c.Query("kode_provinsi")
	}
	if query.KodeKabKota == "" && c.Query("kode_kab_kota") != "" {
		query.KodeKabKota = c.Query("kode_kab_kota")
	}

	prices, err := h.commodityService.GetRealtimeDashboardPrices(c.Context(), query)
	if err != nil {
		return RespondError(c, fiber.StatusInternalServerError, "REALTIME_PRICE_FETCH_FAILED", err.Error())
	}

	return RespondSuccess(c, fiber.StatusOK, "Pantauan harga pasar riil komoditas berhasil diambil", prices)
}

func (h *Handler) GetPriceGuide(c fiber.Ctx) error {
	commodityName := c.Query("commodity_name")
	if commodityName == "" {
		commodityName = c.Query("commodity")
	}
	if commodityName == "" {
		return RespondError(c, fiber.StatusBadRequest, "COMMODITY_NAME_REQUIRED", "Nama komoditas wajib diisi")
	}

	guide, err := h.commodityService.GetPriceGuide(c.Context(), commodityName, c.Query("kode_provinsi"), c.Query("kode_kab_kota"))
	if err != nil {
		return RespondError(c, fiber.StatusInternalServerError, "PRICE_GUIDE_FETCH_FAILED", err.Error())
	}

	return RespondSuccess(c, fiber.StatusOK, "Panduan rentang harga komoditas berhasil diambil", guide)
}

func (h *Handler) GetFarmerVerification(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Token autentikasi tidak valid atau sesi telah berakhir")
	}

	if h.farmerService == nil {
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", "Farmer service tidak tersedia")
	}

	res, err := h.farmerService.GetVerificationStatus(c.Context(), userID)
	if err != nil {
		if errors.Is(err, domain.ErrUserNotFound) {
			return RespondError(c, fiber.StatusNotFound, "USER_NOT_FOUND", "Data pengguna tidak ditemukan")
		}
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
	}

	return RespondSuccess(c, fiber.StatusOK, "Status verifikasi kemitraan petani", res)
}

func (h *Handler) SubmitFarmerVerification(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Token autentikasi tidak valid atau sesi telah berakhir")
	}

	if h.farmerService == nil {
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", "Farmer service tidak tersedia")
	}

	var input domain.FarmerVerificationInput
	_ = c.Bind().Body(&input)

	// Fallback jika dikirim lewat multipart form atau query
	if input.NIK == "" && c.FormValue("nik") != "" {
		input.NIK = c.FormValue("nik")
	}
	if input.Name == "" && c.FormValue("name") != "" {
		input.Name = c.FormValue("name")
	}
	if input.BirthPlace == "" && c.FormValue("birth_place") != "" {
		input.BirthPlace = c.FormValue("birth_place")
	}
	if input.BirthDate == "" && c.FormValue("birth_date") != "" {
		input.BirthDate = c.FormValue("birth_date")
	}
	if input.KTPAddress == "" && c.FormValue("ktp_address") != "" {
		input.KTPAddress = c.FormValue("ktp_address")
	}
	if input.KTPPhotoURL == "" && c.FormValue("ktp_photo_url") != "" {
		input.KTPPhotoURL = c.FormValue("ktp_photo_url")
	}
	if !input.DeclarationAccepted {
		decl := c.FormValue("declaration_accepted")
		input.DeclarationAccepted = decl == "true" || decl == "1" || decl == "yes"
	}

	// Cek jika ada file unggahan e-KTP langsung lewat multipart/form-data
	if file, err := c.FormFile("ktp_photo"); err == nil && file != nil {
		src, errOpen := file.Open()
		if errOpen == nil {
			defer src.Close()
			key := fmt.Sprintf("ktp/%s-%d-%s.enc", userID, time.Now().Unix(), filepath.Base(file.Filename))
			if h.storage != nil {
				if uploadedURL, errUpload := h.storage.UploadEncrypted(c.Context(), key, src, file.Header.Get("Content-Type"), h.cfg.JWTSecret); errUpload == nil {
					input.KTPPhotoURL = uploadedURL
				}
			}
			if input.KTPPhotoURL == "" {
				input.KTPPhotoURL = fmt.Sprintf("%s/%s/%s", h.cfg.S3Endpoint, h.cfg.S3Bucket, key)
			}
		}
	}

	res, err := h.farmerService.SubmitVerification(c.Context(), userID, input)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrOnlyFarmerCanVerify):
			return RespondError(c, fiber.StatusForbidden, "ONLY_FARMER_CAN_VERIFY", err.Error())
		case errors.Is(err, domain.ErrDeclarationRequired):
			return RespondError(c, fiber.StatusBadRequest, "DECLARATION_REQUIRED", err.Error())
		case errors.Is(err, domain.ErrInvalidNIK):
			return RespondError(c, fiber.StatusBadRequest, "INVALID_NIK", err.Error())
		case errors.Is(err, domain.ErrKTPPhotoRequired):
			return RespondError(c, fiber.StatusBadRequest, "KTP_PHOTO_REQUIRED", err.Error())
		case errors.Is(err, domain.ErrNameRequired):
			return RespondError(c, fiber.StatusBadRequest, "NAME_REQUIRED", err.Error())
		case errors.Is(err, domain.ErrKTPAddressRequired):
			return RespondError(c, fiber.StatusBadRequest, "KTP_ADDRESS_REQUIRED", err.Error())
		case errors.Is(err, domain.ErrNIKAlreadyExists):
			return RespondError(c, fiber.StatusConflict, "NIK_ALREADY_EXISTS", err.Error())
		default:
			return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
		}
	}

	return RespondSuccess(c, fiber.StatusOK, "Dokumen e-KTP berhasil diverifikasi", res)
}

func (h *Handler) CreateFarmerListing(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Token autentikasi tidak valid atau sesi telah berakhir")
	}

	if h.farmerService == nil {
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", "Farmer service tidak tersedia")
	}

	var input domain.CreateListingInput
	if err := c.Bind().Body(&input); err != nil {
		return RespondError(c, fiber.StatusBadRequest, "INVALID_INPUT", "Format payload tidak valid")
	}

	// Pastikan media_urls yang berupa data base64 diunggah ke Garage storage dan diganti dengan link URL
	input.MediaURLs = h.sanitizeAndPersistMediaURLs(c.Context(), userID, input.MediaURLs)

	listing, err := h.farmerService.CreateHarvestListing(c.Context(), userID, input)
	if err != nil {
		if errors.Is(err, domain.ErrFarmerNotVerified) {
			return RespondError(c, fiber.StatusForbidden, "FARMER_NOT_VERIFIED", err.Error())
		}
		if errors.Is(err, domain.ErrMinPhotoRequired) || errors.Is(err, domain.ErrMaxMediaExceeded) ||
			errors.Is(err, domain.ErrMaxVideoExceeded) || errors.Is(err, domain.ErrMinOrderQuantity) ||
			errors.Is(err, domain.ErrInvalidInput) {
			return RespondError(c, fiber.StatusBadRequest, "INVALID_INPUT", err.Error())
		}
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
	}

	return RespondSuccess(c, fiber.StatusCreated, "Hasil panen berhasil didaftarkan untuk dijual", listing)
}

func (h *Handler) ListFarmerListings(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Token autentikasi tidak valid atau sesi telah berakhir")
	}

	if h.farmerService == nil {
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", "Farmer service tidak tersedia")
	}

	page := 1
	if p := c.Query("page"); p != "" {
		if val, err := strconv.Atoi(p); err == nil && val > 0 {
			page = val
		}
	}

	limit := 10
	if l := c.Query("limit"); l != "" {
		if val, err := strconv.Atoi(l); err == nil && val > 0 {
			limit = val
		}
	}

	status := c.Query("status", "all")
	commodityID := c.Query("commodity_id")

	filter := domain.ListingFilter{
		FarmerID:    userID,
		Status:      status,
		CommodityID: commodityID,
		Page:        page,
		Limit:       limit,
	}

	paginated, err := h.farmerService.ListFarmerListings(c.Context(), filter)
	if err != nil {
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
	}

	paginationMeta := &PaginationMeta{
		Page:       paginated.Page,
		PerPage:    paginated.Limit,
		TotalItems: paginated.TotalItems,
		TotalPages: paginated.TotalPages,
		HasNext:    paginated.Page < paginated.TotalPages,
		HasPrev:    paginated.Page > 1,
	}

	return RespondSuccessWithPagination(c, fiber.StatusOK, "Daftar hasil panen petani", paginated.Items, paginationMeta)
}

func (h *Handler) GetFarmerListing(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Token autentikasi tidak valid atau sesi telah berakhir")
	}

	id := c.Params("id")
	if id == "" {
		return RespondError(c, fiber.StatusBadRequest, "INVALID_ID", "ID panen tidak boleh kosong")
	}

	listing, err := h.farmerService.GetFarmerListingByID(c.Context(), id, userID)
	if err != nil {
		if errors.Is(err, domain.ErrListingNotFound) {
			return RespondError(c, fiber.StatusNotFound, "NOT_FOUND", "Data penjualan panen tidak ditemukan")
		}
		if errors.Is(err, domain.ErrUnauthorizedListingAccess) {
			return RespondError(c, fiber.StatusForbidden, "FORBIDDEN", err.Error())
		}
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
	}

	return RespondSuccess(c, fiber.StatusOK, "Detail hasil panen berhasil diambil", listing)
}

func (h *Handler) UpdateFarmerListing(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Token autentikasi tidak valid atau sesi telah berakhir")
	}

	id := c.Params("id")
	if id == "" {
		return RespondError(c, fiber.StatusBadRequest, "INVALID_ID", "ID panen tidak boleh kosong")
	}

	var input domain.UpdateListingInput
	if err := c.Bind().Body(&input); err != nil {
		return RespondError(c, fiber.StatusBadRequest, "INVALID_INPUT", "Format payload tidak valid")
	}

	listing, err := h.farmerService.UpdateHarvestListing(c.Context(), userID, id, input)
	if err != nil {
		if errors.Is(err, domain.ErrListingNotFound) {
			return RespondError(c, fiber.StatusNotFound, "NOT_FOUND", "Data penjualan panen tidak ditemukan")
		}
		if errors.Is(err, domain.ErrListingNotEditable) {
			return RespondError(c, fiber.StatusConflict, "LISTING_LOCKED", err.Error())
		}
		if errors.Is(err, domain.ErrMinPhotoRequired) || errors.Is(err, domain.ErrMaxMediaExceeded) ||
			errors.Is(err, domain.ErrMaxVideoExceeded) || errors.Is(err, domain.ErrMinOrderQuantity) {
			return RespondError(c, fiber.StatusBadRequest, "INVALID_INPUT", err.Error())
		}
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
	}

	return RespondSuccess(c, fiber.StatusOK, "Data penjualan panen berhasil diperbarui", listing)
}

func (h *Handler) CancelFarmerListing(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Token autentikasi tidak valid atau sesi telah berakhir")
	}

	id := c.Params("id")
	if id == "" {
		return RespondError(c, fiber.StatusBadRequest, "INVALID_ID", "ID panen tidak boleh kosong")
	}

	err := h.farmerService.CancelHarvestListing(c.Context(), userID, id)
	if err != nil {
		if errors.Is(err, domain.ErrListingNotFound) {
			return RespondError(c, fiber.StatusNotFound, "NOT_FOUND", "Data penjualan panen tidak ditemukan")
		}
		if errors.Is(err, domain.ErrListingNotEditable) {
			return RespondError(c, fiber.StatusConflict, "LISTING_LOCKED", err.Error())
		}
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
	}

	return RespondSuccess(c, fiber.StatusOK, "Penjualan panen berhasil dibatalkan", nil)
}

func (h *Handler) UploadFarmerListingMedia(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Token autentikasi tidak valid atau sesi telah berakhir")
	}

	file, err := c.FormFile("media")
	if err != nil {
		file, err = c.FormFile("file")
	}
	if err != nil {
		return RespondError(c, fiber.StatusBadRequest, "INVALID_FILE", "Berkas foto atau video wajib disertakan dalam form-data (field 'media' atau 'file')")
	}

	f, err := file.Open()
	if err != nil {
		return RespondError(c, fiber.StatusBadRequest, "INVALID_FILE", "Gagal membuka berkas yang diunggah")
	}
	defer f.Close()

	buf, err := io.ReadAll(f)
	if err != nil {
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", "Gagal membaca isi berkas")
	}

	// Validasi berkas secara mendalam & ketat
	validated, err := storage.ValidateStrictMedia(file.Filename, buf)
	if err != nil {
		return RespondError(c, fiber.StatusBadRequest, "INVALID_MEDIA", err.Error())
	}

	// Buat nama objek acak yang aman di S3 Garage
	key := fmt.Sprintf("listings/%s/%s%s", userID, uuid.New().String(), validated.Extension)

	if h.storage != nil {
		_, err := h.storage.Upload(c.Context(), key, bytes.NewReader(buf), validated.MimeType)
		if err != nil {
			return RespondError(c, fiber.StatusInternalServerError, "STORAGE_ERROR", "Gagal mengunggah berkas ke Garage S3: "+err.Error())
		}
	}
	publicURL := fmt.Sprintf("/tandur/%s", key)

	return RespondSuccess(c, fiber.StatusCreated, "Berkas media panen berhasil diunggah dan diverifikasi", fiber.Map{
		"url":        publicURL,
		"key":        key,
		"media_type": validated.MediaType,
		"mime_type":  validated.MimeType,
		"size_bytes": validated.SizeBytes,
	})
}

// ServeStorage melayani pengunduhan atau penampilan berkas yang tersimpan di Garage storage
func (h *Handler) ServeStorage(c fiber.Ctx) error {
	bucket := c.Params("bucket", "tandur")
	key := c.Params("*")
	if key == "" {
		key = c.Params("+")
	}
	if key == "" {
		return RespondError(c, fiber.StatusBadRequest, "INVALID_KEY", "Key berkas storage tidak valid")
	}

	cleanKey := filepath.Clean(key)
	storageDir := "uploads/garage"

	// Cek berkas langsung berdasarkan path relatif key
	filePath := filepath.Join(storageDir, cleanKey)
	data, err := os.ReadFile(filePath)
	if err != nil {
		// Coba path alternatif jika key menyertakan nama bucket
		altPath := filepath.Join(storageDir, bucket, cleanKey)
		data, err = os.ReadFile(altPath)
	}
	if err != nil {
		return RespondError(c, fiber.StatusNotFound, "NOT_FOUND", "Berkas tidak ditemukan di storage Garage")
	}

	c.Set("Access-Control-Allow-Origin", "*")
	c.Set("Cache-Control", "public, max-age=86400")
	c.Set("Content-Type", http.DetectContentType(data))
	return c.Send(data)
}

// sanitizeAndPersistMediaURLs mendeteksi string base64 pada daftar media, mengunggahnya ke Garage storage,
// dan mengembalikan daftar URL tautan bersih agar database tidak pernah menyimpan data mentah gambar.
func (h *Handler) sanitizeAndPersistMediaURLs(ctx context.Context, userID string, mediaURLs []string) []string {
	cleanURLs := make([]string, 0, len(mediaURLs))
	for _, raw := range mediaURLs {
		trimmed := strings.TrimSpace(raw)
		if trimmed == "" {
			continue
		}
		if strings.HasPrefix(trimmed, "data:") && strings.Contains(trimmed, ";base64,") {
			parts := strings.SplitN(trimmed, ";base64,", 2)
			if len(parts) == 2 {
				header := parts[0]
				b64Data := parts[1]
				decoded, err := base64.StdEncoding.DecodeString(b64Data)
				if err == nil && len(decoded) > 0 {
					ext := ".jpg"
					mimeType := "image/jpeg"
					if strings.Contains(header, "png") {
						ext = ".png"
						mimeType = "image/png"
					} else if strings.Contains(header, "webp") {
						ext = ".webp"
						mimeType = "image/webp"
					}
					key := fmt.Sprintf("listings/%s/%s%s", userID, uuid.New().String(), ext)
					if h.storage != nil {
						if _, errUpload := h.storage.Upload(ctx, key, bytes.NewReader(decoded), mimeType); errUpload == nil {
							cleanURLs = append(cleanURLs, fmt.Sprintf("/tandur/%s", key))
							continue
						}
					}
					cleanURLs = append(cleanURLs, fmt.Sprintf("/tandur/%s", key))
					continue
				}
			}
		}
		cleanURLs = append(cleanURLs, trimmed)
	}
	return cleanURLs
}

// --- TENGKULAK: CARI PETANI & BUAT PENAWARAN ---

// ListMiddlemanListings menangani pencarian listing panen petani untuk katalog "TENGKULAK - CARI PETANI"
func (h *Handler) ListMiddlemanListings(c fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	status := c.Query("status", "published")
	commodityID := c.Query("commodity_id")

	filter := domain.ListingFilter{
		Status:      status,
		CommodityID: commodityID,
		Page:        page,
		Limit:       limit,
	}

	result, err := h.orderService.ListMarketplaceListings(c.Context(), filter)
	if err != nil {
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", "Gagal mengambil daftar panen petani: "+err.Error())
	}

	pagination := &PaginationMeta{
		Page:       result.Page,
		PerPage:    result.Limit,
		TotalItems: result.TotalItems,
		TotalPages: result.TotalPages,
		HasNext:    result.Page < result.TotalPages,
		HasPrev:    result.Page > 1,
	}

	return RespondSuccessWithPagination(c, fiber.StatusOK, "Daftar panen petani berhasil diambil", result.Items, pagination)
}

// GetMiddlemanListing mengambil pratinjau detail panen petani untuk tengkulak
func (h *Handler) GetMiddlemanListing(c fiber.Ctx) error {
	id := c.Params("id")
	listing, err := h.orderService.GetMarketplaceListingByID(c.Context(), id)
	if err != nil {
		if errors.Is(err, domain.ErrListingNotFound) {
			return RespondError(c, fiber.StatusNotFound, "LISTING_NOT_FOUND", err.Error())
		}
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
	}
	return RespondSuccess(c, fiber.StatusOK, "Detail panen petani berhasil diambil", listing)
}

// CreateMiddlemanOffer menangani pengajuan penawaran pembelian panen oleh Tengkulak (TENGKULAK - PENAWARAN)
func (h *Handler) CreateMiddlemanOffer(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Sesi tidak valid")
	}

	var input domain.CreateOrderOfferInput
	if err := c.Bind().Body(&input); err != nil {
		return RespondError(c, fiber.StatusBadRequest, "INVALID_INPUT", "Format payload tidak valid: "+err.Error())
	}

	order, err := h.orderService.CreateOffer(c.Context(), userID, input)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrOnlyMiddlemanCanCreateOffer):
			return RespondError(c, fiber.StatusForbidden, "FORBIDDEN_ROLE", err.Error())
		case errors.Is(err, domain.ErrListingNotFound):
			return RespondError(c, fiber.StatusNotFound, "LISTING_NOT_FOUND", err.Error())
		case errors.Is(err, domain.ErrMinOrderQuantity), errors.Is(err, domain.ErrQuantityExceedsAvailable), errors.Is(err, domain.ErrInvalidInput):
			return RespondError(c, fiber.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		default:
			return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
		}
	}

	return RespondSuccess(c, fiber.StatusCreated, "Penawaran pembelian panen berhasil diajukan ke petani", order)
}

// ListMiddlemanOrders menangani daftar transaksi pembelian tengkulak (TENGKULAK - TRANSAKSI)
func (h *Handler) ListMiddlemanOrders(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Sesi tidak valid")
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	tab := c.Query("tab", "all")
	search := c.Query("search")

	filter := domain.OrderFilter{
		Tab:    tab,
		Search: search,
		Page:   page,
		Limit:  limit,
	}

	result, err := h.orderService.ListMiddlemanOrders(c.Context(), userID, filter)
	if err != nil {
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", "Gagal mengambil daftar transaksi tengkulak: "+err.Error())
	}

	pagination := &PaginationMeta{
		Page:       result.Page,
		PerPage:    result.Limit,
		TotalItems: result.TotalItems,
		TotalPages: result.TotalPages,
		HasNext:    result.Page < result.TotalPages,
		HasPrev:    result.Page > 1,
	}

	return RespondSuccessWithPaginationAndSummary(c, fiber.StatusOK, "Daftar transaksi tengkulak berhasil diambil", result.Items, pagination, result.Summary)
}

// GetMiddlemanOrder mengambil detail satu transaksi tengkulak
func (h *Handler) GetMiddlemanOrder(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Sesi tidak valid")
	}

	id := c.Params("id")
	order, err := h.orderService.GetOrderByID(c.Context(), userID, id)
	if err != nil {
		if errors.Is(err, domain.ErrOrderNotFound) {
			return RespondError(c, fiber.StatusNotFound, "ORDER_NOT_FOUND", err.Error())
		}
		if errors.Is(err, domain.ErrUnauthorizedOrderAccess) {
			return RespondError(c, fiber.StatusForbidden, "FORBIDDEN_ACCESS", err.Error())
		}
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
	}

	return RespondSuccess(c, fiber.StatusOK, "Detail transaksi tengkulak berhasil diambil", order)
}

// UpdateOrderLogistics memperbarui data armada truk / pengemudi oleh tengkulak
func (h *Handler) UpdateOrderLogistics(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Sesi tidak valid")
	}

	id := c.Params("id")
	var input domain.UpdateLogisticsInput
	if err := c.Bind().Body(&input); err != nil {
		return RespondError(c, fiber.StatusBadRequest, "INVALID_INPUT", err.Error())
	}

	order, err := h.orderService.UpdateLogistics(c.Context(), userID, id, input)
	if err != nil {
		if errors.Is(err, domain.ErrOrderNotFound) {
			return RespondError(c, fiber.StatusNotFound, "ORDER_NOT_FOUND", err.Error())
		}
		if errors.Is(err, domain.ErrUnauthorizedOrderAccess) {
			return RespondError(c, fiber.StatusForbidden, "FORBIDDEN_ACCESS", err.Error())
		}
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
	}

	return RespondSuccess(c, fiber.StatusOK, "Data logistik armada berhasil diperbarui", order)
}

// CompleteWeighingAndSettlement menyelesaikan transaksi panen berdasarkan hasil timbang digital
func (h *Handler) CompleteWeighingAndSettlement(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Sesi tidak valid")
	}

	id := c.Params("id")
	var input domain.CompleteWeighingInput
	if err := c.Bind().Body(&input); err != nil {
		return RespondError(c, fiber.StatusBadRequest, "INVALID_INPUT", err.Error())
	}

	order, err := h.orderService.CompleteWeighingAndSettlement(c.Context(), userID, id, input)
	if err != nil {
		if errors.Is(err, domain.ErrOrderNotFound) {
			return RespondError(c, fiber.StatusNotFound, "ORDER_NOT_FOUND", err.Error())
		}
		if errors.Is(err, domain.ErrUnauthorizedOrderAccess) {
			return RespondError(c, fiber.StatusForbidden, "FORBIDDEN_ACCESS", err.Error())
		}
		if errors.Is(err, domain.ErrInvalidInput) {
			return RespondError(c, fiber.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		}
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
	}

	return RespondSuccess(c, fiber.StatusOK, "Transaksi panen selesai dan lunas", order)
}

// --- PETANI: PENGELOLAAN PESANAN (MOCKUP GAMBAR 2) ---

// ListFarmerOrders mengambil daftar pesanan masuk untuk dashboard "PETANI - PESANAN"
func (h *Handler) ListFarmerOrders(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Sesi tidak valid")
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	tab := c.Query("tab", "all")
	search := c.Query("search")
	month, _ := strconv.Atoi(c.Query("month", "0"))
	year, _ := strconv.Atoi(c.Query("year", "0"))

	filter := domain.OrderFilter{
		Tab:    tab,
		Search: search,
		Month:  month,
		Year:   year,
		Page:   page,
		Limit:  limit,
	}

	result, err := h.orderService.ListFarmerOrders(c.Context(), userID, filter)
	if err != nil {
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", "Gagal mengambil daftar pesanan petani: "+err.Error())
	}

	pagination := &PaginationMeta{
		Page:       result.Page,
		PerPage:    result.Limit,
		TotalItems: result.TotalItems,
		TotalPages: result.TotalPages,
		HasNext:    result.Page < result.TotalPages,
		HasPrev:    result.Page > 1,
	}

	return RespondSuccessWithPaginationAndSummary(c, fiber.StatusOK, "Daftar pesanan petani berhasil diambil", result.Items, pagination, result.Summary)
}

// GetFarmerOrder mengambil detail satu pesanan petani
func (h *Handler) GetFarmerOrder(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Sesi tidak valid")
	}

	id := c.Params("id")
	order, err := h.orderService.GetOrderByID(c.Context(), userID, id)
	if err != nil {
		if errors.Is(err, domain.ErrOrderNotFound) {
			return RespondError(c, fiber.StatusNotFound, "ORDER_NOT_FOUND", err.Error())
		}
		if errors.Is(err, domain.ErrUnauthorizedOrderAccess) {
			return RespondError(c, fiber.StatusForbidden, "FORBIDDEN_ACCESS", err.Error())
		}
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
	}

	return RespondSuccess(c, fiber.StatusOK, "Detail pesanan petani berhasil diambil", order)
}

// AcceptFarmerOrder memproses aksi terima penawaran & jadwalkan oleh petani
func (h *Handler) AcceptFarmerOrder(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Sesi tidak valid")
	}

	id := c.Params("id")
	order, err := h.orderService.AcceptOrder(c.Context(), userID, id)
	if err != nil {
		if errors.Is(err, domain.ErrOrderNotFound) {
			return RespondError(c, fiber.StatusNotFound, "ORDER_NOT_FOUND", err.Error())
		}
		if errors.Is(err, domain.ErrUnauthorizedOrderAccess) {
			return RespondError(c, fiber.StatusForbidden, "FORBIDDEN_ACCESS", err.Error())
		}
		if errors.Is(err, domain.ErrInvalidOrderAction) {
			return RespondError(c, fiber.StatusBadRequest, "INVALID_ACTION", err.Error())
		}
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
	}

	return RespondSuccess(c, fiber.StatusOK, "Penawaran pembeli berhasil diterima dan jadwal penjemputan dikonfirmasi", order)
}

// NegotiateFarmerOrder memproses penawaran balik/negosiasi oleh petani
func (h *Handler) NegotiateFarmerOrder(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Sesi tidak valid")
	}

	id := c.Params("id")
	var input domain.NegotiateOrderInput
	if err := c.Bind().Body(&input); err != nil {
		return RespondError(c, fiber.StatusBadRequest, "INVALID_INPUT", "Format data negosiasi tidak valid: "+err.Error())
	}

	order, err := h.orderService.NegotiateOrder(c.Context(), userID, id, input)
	if err != nil {
		if errors.Is(err, domain.ErrOrderNotFound) {
			return RespondError(c, fiber.StatusNotFound, "ORDER_NOT_FOUND", err.Error())
		}
		if errors.Is(err, domain.ErrUnauthorizedOrderAccess) {
			return RespondError(c, fiber.StatusForbidden, "FORBIDDEN_ACCESS", err.Error())
		}
		if errors.Is(err, domain.ErrCounterPriceRequired) || errors.Is(err, domain.ErrInvalidOrderAction) {
			return RespondError(c, fiber.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		}
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
	}

	return RespondSuccess(c, fiber.StatusOK, "Penawaran negosiasi berhasil dikirim ke pembeli", order)
}

// RejectFarmerOrder memproses penolakan tawaran oleh petani
func (h *Handler) RejectFarmerOrder(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Sesi tidak valid")
	}

	id := c.Params("id")
	var body struct {
		Reason string `json:"reason" form:"reason"`
	}
	_ = c.Bind().Body(&body)

	order, err := h.orderService.RejectOrder(c.Context(), userID, id, body.Reason)
	if err != nil {
		if errors.Is(err, domain.ErrOrderNotFound) {
			return RespondError(c, fiber.StatusNotFound, "ORDER_NOT_FOUND", err.Error())
		}
		if errors.Is(err, domain.ErrUnauthorizedOrderAccess) {
			return RespondError(c, fiber.StatusForbidden, "FORBIDDEN_ACCESS", err.Error())
		}
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
	}

	return RespondSuccess(c, fiber.StatusOK, "Penawaran berhasil ditolak", order)
}

// ConfirmReadyForPickup memproses tombol [Siap Muat] / [Bagikan Titik Jemput]
func (h *Handler) ConfirmReadyForPickup(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Sesi tidak valid")
	}

	id := c.Params("id")
	order, err := h.orderService.ConfirmReadyForPickup(c.Context(), userID, id)
	if err != nil {
		if errors.Is(err, domain.ErrOrderNotFound) {
			return RespondError(c, fiber.StatusNotFound, "ORDER_NOT_FOUND", err.Error())
		}
		if errors.Is(err, domain.ErrUnauthorizedOrderAccess) {
			return RespondError(c, fiber.StatusForbidden, "FORBIDDEN_ACCESS", err.Error())
		}
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
	}

	return RespondSuccess(c, fiber.StatusOK, "Status siap muat dan titik jemput berhasil dikonfirmasi ke armada", order)
}

// CompleteFarmerOrder menyelesaikan pesanan oleh petani setelah serah terima hasil panen
func (h *Handler) CompleteFarmerOrder(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Sesi tidak valid")
	}

	id := c.Params("id")
	order, err := h.orderService.CompleteFarmerOrder(c.Context(), userID, id)
	if err != nil {
		if errors.Is(err, domain.ErrOrderNotFound) {
			return RespondError(c, fiber.StatusNotFound, "ORDER_NOT_FOUND", err.Error())
		}
		if errors.Is(err, domain.ErrUnauthorizedOrderAccess) {
			return RespondError(c, fiber.StatusForbidden, "FORBIDDEN_ACCESS", err.Error())
		}
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
	}

	return RespondSuccess(c, fiber.StatusOK, "Pesanan berhasil diselesaikan", order)
}

// ==========================================
// TENGKULAK / MITRA PENGUMPUL B2B HANDLERS
// ==========================================

// GetMiddlemanDashboard mengembalikan data metrik, jadwal armada muat, dan harga acuan untuk Beranda Tengkulak
func (h *Handler) GetMiddlemanDashboard(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Sesi tidak valid")
	}

	dashboard, err := h.middlemanService.GetDashboard(userID)
	if err != nil {
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
	}

	return RespondSuccess(c, fiber.StatusOK, "Data dashboard beranda tengkulak berhasil dimuat", dashboard)
}

// GetMiddlemanOrders mengambil daftar Transaksi & Surat Pesanan (PO) dengan tab filter dan summary card
func (h *Handler) GetMiddlemanOrders(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Sesi tidak valid")
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	filter := domain.MiddlemanOrderFilter{
		Tab:    c.Query("tab", "all"),
		Search: c.Query("search", ""),
		Period: c.Query("period", ""),
		Page:   page,
		Limit:  limit,
	}

	orders, summary, total, err := h.middlemanService.ListOrders(userID, filter)
	if err != nil {
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
	}

	pagination := NewPaginationMeta(page, limit, int64(total))
	return RespondSuccessWithPaginationAndSummary(c, fiber.StatusOK, "Daftar transaksi dan surat pesanan berhasil diambil", orders, pagination, summary)
}

// UpdateMiddlemanOrderPO memproses modal Edit Transaksi & Surat Pesanan (PO)
func (h *Handler) UpdateMiddlemanOrderPO(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Sesi tidak valid")
	}

	id := c.Params("id")
	var input domain.UpdateOrderPOInput
	if err := c.Bind().Body(&input); err != nil {
		return RespondError(c, fiber.StatusBadRequest, "BAD_REQUEST", "Format input tidak valid")
	}

	order, err := h.middlemanService.UpdateOrderPO(userID, id, input)
	if err != nil {
		return RespondError(c, fiber.StatusBadRequest, "UPDATE_FAILED", err.Error())
	}

	return RespondSuccess(c, fiber.StatusOK, "Transaksi & Surat Pesanan (PO) berhasil diperbarui", order)
}

// CancelMiddlemanOrderPO membatalkan atau menghapus pesanan PO
func (h *Handler) CancelMiddlemanOrderPO(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Sesi tidak valid")
	}

	id := c.Params("id")
	if err := h.middlemanService.CancelOrderPO(userID, id); err != nil {
		return RespondError(c, fiber.StatusBadRequest, "CANCEL_FAILED", err.Error())
	}

	return RespondSuccess(c, fiber.StatusOK, "Surat Pesanan (PO) berhasil dibatalkan", nil)
}

// ExportMiddlemanOrdersReport mengekspor laporan transaksi PO ke CSV
func (h *Handler) ExportMiddlemanOrdersReport(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Sesi tidak valid")
	}

	filter := domain.MiddlemanOrderFilter{
		Tab:    c.Query("tab", "all"),
		Search: c.Query("search", ""),
		Period: c.Query("period", ""),
	}

	data, filename, err := h.middlemanService.ExportOrdersReport(userID, filter)
	if err != nil {
		return RespondError(c, fiber.StatusInternalServerError, "EXPORT_FAILED", err.Error())
	}

	c.Set("Content-Type", "text/csv")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	return c.Send(data)
}

// GetMiddlemanOffers mengambil daftar Penawaran & Kesepakatan Harga
func (h *Handler) GetMiddlemanOffers(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Sesi tidak valid")
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	filter := domain.MiddlemanOfferFilter{
		Tab:       c.Query("tab", "all"),
		Commodity: c.Query("commodity", ""),
		Region:    c.Query("region", ""),
		Page:      page,
		Limit:     limit,
	}

	offers, total, err := h.middlemanService.ListOffers(userID, filter)
	if err != nil {
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
	}

	pagination := NewPaginationMeta(page, limit, int64(total))
	return RespondSuccessWithPagination(c, fiber.StatusOK, "Daftar penawaran harga tebas berhasil diambil", offers, pagination)
}

// CounterMiddlemanOffer memproses tombol [Tawar Susulan]
func (h *Handler) CounterMiddlemanOffer(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Sesi tidak valid")
	}

	id := c.Params("id")
	var input domain.CounterOfferInput
	if err := c.Bind().Body(&input); err != nil {
		return RespondError(c, fiber.StatusBadRequest, "BAD_REQUEST", "Format input tidak valid")
	}

	offer, err := h.middlemanService.CounterOffer(userID, id, input)
	if err != nil {
		return RespondError(c, fiber.StatusBadRequest, "COUNTER_OFFER_FAILED", err.Error())
	}

	return RespondSuccess(c, fiber.StatusOK, "Tawaran susulan berhasil diajukan ke petani", offer)
}

// GetMiddlemanInventory menampilkan tabel Inventaris Stok Gudang & 4 ringkasan metrik
func (h *Handler) GetMiddlemanInventory(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Sesi tidak valid")
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	category := c.Query("category", "all")
	qualityStatus := c.Query("status", "all")
	search := c.Query("search", "")

	inventories, summary, total, err := h.middlemanService.ListInventory(userID, category, qualityStatus, search, page, limit)
	if err != nil {
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
	}

	pagination := NewPaginationMeta(page, limit, int64(total))
	return RespondSuccessWithPaginationAndSummary(c, fiber.StatusOK, "Daftar stok inventaris gudang berhasil diambil", inventories, pagination, summary)
}

// GetMiddlemanInventoryByID menampilkan modal Detail Komoditas Stok
func (h *Handler) GetMiddlemanInventoryByID(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Sesi tidak valid")
	}

	id := c.Params("id")
	inv, err := h.middlemanService.GetInventoryByID(userID, id)
	if err != nil {
		return RespondError(c, fiber.StatusNotFound, "NOT_FOUND", "Stok inventaris tidak ditemukan")
	}

	return RespondSuccess(c, fiber.StatusOK, "Detail komoditas stok berhasil diambil", inv)
}

// CreateMiddlemanInventory memproses modal Tambah Stok Masuk Gudang
func (h *Handler) CreateMiddlemanInventory(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Sesi tidak valid")
	}

	var input domain.CreateInventoryInput
	if err := c.Bind().Body(&input); err != nil {
		return RespondError(c, fiber.StatusBadRequest, "BAD_REQUEST", "Format input tidak valid")
	}

	inv, err := h.middlemanService.CreateInventory(userID, input)
	if err != nil {
		return RespondError(c, fiber.StatusBadRequest, "CREATE_FAILED", err.Error())
	}

	return RespondSuccess(c, fiber.StatusCreated, "Stok baru berhasil ditambahkan ke inventaris gudang", inv)
}

// DeleteMiddlemanInventory menghapus lot stok dari inventaris
func (h *Handler) DeleteMiddlemanInventory(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Sesi tidak valid")
	}

	id := c.Params("id")
	if err := h.middlemanService.DeleteInventory(userID, id); err != nil {
		return RespondError(c, fiber.StatusBadRequest, "DELETE_FAILED", err.Error())
	}

	return RespondSuccess(c, fiber.StatusOK, "Stok inventaris berhasil dihapus", nil)
}

// GetMiddlemanMutations mengambil log Riwayat Keluar-Masuk Terakhir
func (h *Handler) GetMiddlemanMutations(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Sesi tidak valid")
	}

	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	mutations, err := h.middlemanService.ListMutations(userID, limit)
	if err != nil {
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
	}

	return RespondSuccess(c, fiber.StatusOK, "Riwayat mutasi keluar-masuk gudang berhasil diambil", mutations)
}

// GetMiddlemanSales menampilkan Halaman Jual Stok Gudang
func (h *Handler) GetMiddlemanSales(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Sesi tidak valid")
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	tab := c.Query("tab", "all")

	sales, summary, total, err := h.middlemanService.ListSales(userID, tab, page, limit)
	if err != nil {
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
	}

	pagination := NewPaginationMeta(page, limit, int64(total))
	return RespondSuccessWithPaginationAndSummary(c, fiber.StatusOK, "Daftar komoditas siap jual dan listing berhasil diambil", sales, pagination, summary)
}

// CreateMiddlemanSaleListing memproses modal Buka Penawaran Jual Baru
func (h *Handler) CreateMiddlemanSaleListing(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Sesi tidak valid")
	}

	var input domain.CreateSaleListingInput
	if err := c.Bind().Body(&input); err != nil {
		return RespondError(c, fiber.StatusBadRequest, "BAD_REQUEST", "Format input tidak valid")
	}

	sale, err := h.middlemanService.CreateSaleListing(userID, input)
	if err != nil {
		return RespondError(c, fiber.StatusBadRequest, "CREATE_SALE_FAILED", err.Error())
	}

	return RespondSuccess(c, fiber.StatusCreated, "Penawaran jual komoditas ke pasar/rice mill berhasil dipublikasikan", sale)
}

// GetMiddlemanSaleListingByID mengambil detail listing penjualan
func (h *Handler) GetMiddlemanSaleListingByID(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Sesi tidak valid")
	}

	id := c.Params("id")
	sale, err := h.middlemanService.GetSaleListingByID(userID, id)
	if err != nil {
		return RespondError(c, fiber.StatusNotFound, "NOT_FOUND", "Listing penjualan tidak ditemukan")
	}

	return RespondSuccess(c, fiber.StatusOK, "Detail listing penjualan berhasil diambil", sale)
}

// CloseMiddlemanSaleListing menutup / mengarsipkan listing penjualan
func (h *Handler) CloseMiddlemanSaleListing(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Sesi tidak valid")
	}

	id := c.Params("id")
	if err := h.middlemanService.CloseSaleListing(userID, id); err != nil {
		return RespondError(c, fiber.StatusBadRequest, "CLOSE_FAILED", err.Error())
	}

	return RespondSuccess(c, fiber.StatusOK, "Listing penjualan berhasil ditutup", nil)
}

// UpdateMiddlemanSaleListing memperbarui data listing penjualan
func (h *Handler) UpdateMiddlemanSaleListing(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Sesi tidak valid")
	}

	id := c.Params("id")
	var input domain.UpdateSaleListingInput
	if err := c.Bind().Body(&input); err != nil {
		return RespondError(c, fiber.StatusBadRequest, "BAD_REQUEST", "Format input tidak valid")
	}

	sale, err := h.middlemanService.UpdateSaleListing(userID, id, input)
	if err != nil {
		return RespondError(c, fiber.StatusBadRequest, "UPDATE_FAILED", err.Error())
	}

	return RespondSuccess(c, fiber.StatusOK, "Listing penjualan berhasil diperbarui", sale)
}

// DeleteMiddlemanSaleListing menghapus listing penjualan
func (h *Handler) DeleteMiddlemanSaleListing(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Sesi tidak valid")
	}

	id := c.Params("id")
	if err := h.middlemanService.DeleteSaleListing(userID, id); err != nil {
		return RespondError(c, fiber.StatusBadRequest, "DELETE_FAILED", err.Error())
	}

	return RespondSuccess(c, fiber.StatusOK, "Listing penjualan berhasil dihapus", nil)
}

// ToggleArchiveMiddlemanSaleListing mengarsipkan atau mengaktifkan kembali listing
func (h *Handler) ToggleArchiveMiddlemanSaleListing(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Sesi tidak valid")
	}

	id := c.Params("id")
	sale, err := h.middlemanService.ToggleArchiveSaleListing(userID, id)
	if err != nil {
		return RespondError(c, fiber.StatusBadRequest, "ARCHIVE_FAILED", err.Error())
	}

	return RespondSuccess(c, fiber.StatusOK, "Status listing berhasil diubah", sale)
}

// GetMiddlemanSaleBids mengambil penawaran pembeli grosir/rice mill yang masuk
func (h *Handler) GetMiddlemanSaleBids(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Sesi tidak valid")
	}

	id := c.Params("id")
	bids, err := h.middlemanService.ListSaleBids(userID, id)
	if err != nil {
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
	}

	return RespondSuccess(c, fiber.StatusOK, "Daftar penawaran pembeli masuk berhasil diambil", bids)
}

// -----------------------------------------------------------------------------
// Buyer Module Delegation & Optional Auth Middleware
// -----------------------------------------------------------------------------

func (h *Handler) OptionalAuthMiddleware() fiber.Handler {
	return OptionalAuthMiddleware(h.authService)
}

func (h *Handler) ListCategories(c fiber.Ctx) error {
	return h.buyerHandler.ListCategories(c)
}

func (h *Handler) ListProducts(c fiber.Ctx) error {
	return h.buyerHandler.ListProducts(c)
}

func (h *Handler) ListPopularProducts(c fiber.Ctx) error {
	return h.buyerHandler.ListPopularProducts(c)
}

func (h *Handler) GetProductDetail(c fiber.Ctx) error {
	return h.buyerHandler.GetProductDetail(c)
}

func (h *Handler) GetCart(c fiber.Ctx) error {
	return h.buyerHandler.GetCart(c)
}

func (h *Handler) AddCartItem(c fiber.Ctx) error {
	return h.buyerHandler.AddCartItem(c)
}

func (h *Handler) UpdateCartItem(c fiber.Ctx) error {
	return h.buyerHandler.UpdateCartItem(c)
}

func (h *Handler) DeleteCartItem(c fiber.Ctx) error {
	return h.buyerHandler.DeleteCartItem(c)
}

func (h *Handler) GetPrimaryAddress(c fiber.Ctx) error {
	return h.buyerHandler.GetPrimaryAddress(c)
}

func (h *Handler) CheckoutSummary(c fiber.Ctx) error {
	return h.buyerHandler.CheckoutSummary(c)
}

func (h *Handler) CreateBuyerOrder(c fiber.Ctx) error {
	return h.buyerHandler.CreateBuyerOrder(c)
}

func (h *Handler) ListBuyerOrders(c fiber.Ctx) error {
	return h.buyerHandler.ListBuyerOrders(c)
}

func (h *Handler) GetBuyerOrderDetail(c fiber.Ctx) error {
	return h.buyerHandler.GetBuyerOrderDetail(c)
}

func (h *Handler) CancelBuyerOrder(c fiber.Ctx) error {
	return h.buyerHandler.CancelBuyerOrder(c)
}

func (h *Handler) ConfirmBuyerOrderReceipt(c fiber.Ctx) error {
	return h.buyerHandler.ConfirmBuyerOrderReceipt(c)
}


