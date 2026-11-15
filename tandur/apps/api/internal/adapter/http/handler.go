package http

import (
	"time"

	"github.com/gofiber/fiber/v3"
	"tandur/api/internal/application"
	"tandur/api/internal/infrastructure/config"
	"tandur/api/internal/infrastructure/persistence"
)

type Handler struct {
	cfg              *config.Config
	commodityService *application.CommodityService
}

func NewHandler(cfg *config.Config, commodityService *application.CommodityService) *Handler {
	return &Handler{
		cfg:              cfg,
		commodityService: commodityService,
	}
}

func (h *Handler) HealthCheck(c fiber.Ctx) error {
	dbStatus, _ := persistence.CheckDBConnection(h.cfg)

	return c.JSON(fiber.Map{
		"status":    "ok",
		"service":   "tandur-api",
		"version":   "v1.0.0",
		"database":  dbStatus,
		"timestamp": time.Now().Format(time.RFC3339),
	})
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
