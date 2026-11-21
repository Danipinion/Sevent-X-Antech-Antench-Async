package http

import (
	"errors"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgxpool"
	"tandur/api/internal/application"
	"tandur/api/internal/domain"
	"tandur/api/internal/infrastructure/config"
	"tandur/api/internal/infrastructure/persistence"
)

type Handler struct {
	cfg              *config.Config
	dbPool           *pgxpool.Pool
	commodityService *application.CommodityService
	authService      *application.AuthService
	farmerService    *application.FarmerService
	authHandler      *AuthHandler
}

func NewHandler(cfg *config.Config, dbPool *pgxpool.Pool, commodityService *application.CommodityService, authService *application.AuthService, farmerService ...*application.FarmerService) *Handler {
	var fs *application.FarmerService
	if len(farmerService) > 0 && farmerService[0] != nil {
		fs = farmerService[0]
	} else if authService != nil && authService.UserRepo() != nil {
		fs = application.NewFarmerService(authService.UserRepo())
	}

	return &Handler{
		cfg:              cfg,
		dbPool:           dbPool,
		commodityService: commodityService,
		authService:      authService,
		farmerService:    fs,
		authHandler:      NewAuthHandler(authService),
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

	// Cek jika ada file unggahan e-KTP langsung
	if file, err := c.FormFile("ktp_photo"); err == nil && file != nil && input.KTPPhotoURL == "" {
		input.KTPPhotoURL = "/uploads/ktp/" + file.Filename
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

	listing, err := h.farmerService.CreateHarvestListing(c.Context(), userID, input)
	if err != nil {
		if errors.Is(err, domain.ErrFarmerNotVerified) {
			return RespondError(c, fiber.StatusForbidden, "FARMER_NOT_VERIFIED", err.Error())
		}
		if errors.Is(err, domain.ErrInvalidInput) {
			return RespondError(c, fiber.StatusBadRequest, "INVALID_INPUT", "Semua data panen wajib diisi dengan benar")
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

	listings, err := h.farmerService.ListFarmerListings(c.Context(), userID)
	if err != nil {
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
	}

	return RespondSuccess(c, fiber.StatusOK, "Daftar hasil panen petani", listings)
}
