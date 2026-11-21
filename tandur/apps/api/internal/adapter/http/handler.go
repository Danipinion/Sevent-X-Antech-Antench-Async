package http

import (
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
	authHandler      *AuthHandler
}

func NewHandler(cfg *config.Config, dbPool *pgxpool.Pool, commodityService *application.CommodityService, authService *application.AuthService) *Handler {
	return &Handler{
		cfg:              cfg,
		dbPool:           dbPool,
		commodityService: commodityService,
		authService:      authService,
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
