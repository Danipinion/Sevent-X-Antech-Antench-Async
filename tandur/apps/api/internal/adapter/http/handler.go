package http

import (
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgxpool"
	"tandur/api/internal/application"
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
