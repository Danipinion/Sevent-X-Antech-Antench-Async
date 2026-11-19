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
	authHandler      *AuthHandler
}

func NewHandler(cfg *config.Config, dbPool *pgxpool.Pool, commodityService *application.CommodityService, authService *application.AuthService) *Handler {
	return &Handler{
		cfg:              cfg,
		dbPool:           dbPool,
		commodityService: commodityService,
		authHandler:      NewAuthHandler(authService),
	}
}

func (h *Handler) HealthCheck(c fiber.Ctx) error {
	dbStatus, _ := persistence.CheckDBConnection(h.dbPool)

	return c.JSON(fiber.Map{
		"status":    "ok",
		"service":   "tandur-api",
		"version":   "v1.0.0",
		"database":  dbStatus,
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

func (h *Handler) Register(c fiber.Ctx) error {
	return h.authHandler.Register(c)
}

func (h *Handler) ListCommodities(c fiber.Ctx) error {
	commodities, err := h.commodityService.ListCommodities(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Gagal mengambil data komoditas",
		})
	}
	return c.JSON(fiber.Map{
		"data": commodities,
	})
}

func (h *Handler) GetCommodity(c fiber.Ctx) error {
	id := c.Params("id")
	commodity, err := h.commodityService.GetCommodity(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Komoditas tidak ditemukan",
		})
	}
	return c.JSON(fiber.Map{
		"data": commodity,
	})
}
