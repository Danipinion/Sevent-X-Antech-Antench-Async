package http

import (
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"tandur/api/internal/application"
	"tandur/api/internal/domain"
	"tandur/api/internal/infrastructure/config"
	"tandur/api/internal/infrastructure/persistence"
)

type Handler struct {
	cfg              *config.Config
	commodityService *application.CommodityService
	userService      *application.UserService
}

func NewHandler(cfg *config.Config, commodityService *application.CommodityService, userService *application.UserService) *Handler {
	return &Handler{
		cfg:              cfg,
		commodityService: commodityService,
		userService:      userService,
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

func (h *Handler) Register(c fiber.Ctx) error {
	var input domain.RegisterInput
	body := c.Body()
	if err := json.Unmarshal(body, &input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status": "error",
			"error": fiber.Map{
				"code":    "BAD_REQUEST",
				"message": "Format data registrasi tidak valid",
			},
		})
	}

	user, token, err := h.userService.Register(c.Context(), input)
	if err != nil {
		if errors.Is(err, domain.ErrNIKAlreadyExists) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"status": "error",
				"field":  "nik",
				"error": fiber.Map{
					"code":    "DUPLICATE_NIK",
					"message": "NIK sudah terdaftar",
				},
			})
		}
		if errors.Is(err, domain.ErrPhoneAlreadyExists) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"status": "error",
				"field":  "phone",
				"error": fiber.Map{
					"code":    "DUPLICATE_PHONE",
					"message": "Nomor handphone sudah terdaftar",
				},
			})
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status": "error",
			"error": fiber.Map{
				"code":    "VALIDATION_ERROR",
				"message": err.Error(),
			},
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"status": "success",
		"data": fiber.Map{
			"message": "Pendaftaran akun berhasil",
			"token":   token,
			"user":    user,
		},
	})
}

func (h *Handler) Login(c fiber.Ctx) error {
	var input domain.LoginInput
	if err := json.Unmarshal(c.Body(), &input); err != nil {
		if err := c.Bind().Body(&input); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"status": "error",
				"error": fiber.Map{
					"code":    "BAD_REQUEST",
					"message": "Format data login tidak valid",
				},
			})
		}
	}

	user, token, err := h.userService.Login(c.Context(), input.NIK, input.Password)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"status": "error",
			"error": fiber.Map{
				"code":    "INVALID_CREDENTIALS",
				"message": "NIK atau password salah",
			},
		})
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data": fiber.Map{
			"token": token,
			"user":  user,
		},
	})
}

func (h *Handler) GetProfile(c fiber.Ctx) error {
	authHeader := c.Get("Authorization")
	var user *domain.User
	var err error

	if strings.HasPrefix(authHeader, "Bearer ") {
		token := strings.TrimPrefix(authHeader, "Bearer ")
		user, err = h.userService.GetProfileByToken(c.Context(), token)
	}

	if err != nil || user == nil {
		user, err = h.userService.GetProfile(c.Context(), "user-farmer-1")
	}

	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Profil pengguna tidak ditemukan",
		})
	}
	return c.JSON(fiber.Map{
		"status": "success",
		"data":   user,
	})
}

func (h *Handler) UpdateProfile(c fiber.Ctx) error {
	var input struct {
		Name    string `json:"name"`
		Phone   string `json:"phone"`
		Email   string `json:"email"`
		Address string `json:"ktp_address"`
	}
	if err := json.Unmarshal(c.Body(), &input); err != nil {
		_ = c.Bind().Body(&input)
	}

	authHeader := c.Get("Authorization")
	targetID := "user-farmer-1"

	if strings.HasPrefix(authHeader, "Bearer ") {
		token := strings.TrimPrefix(authHeader, "Bearer ")
		if u, err := h.userService.GetProfileByToken(c.Context(), token); err == nil && u != nil {
			targetID = u.ID
		}
	}

	user, err := h.userService.UpdateProfile(c.Context(), targetID, input.Name, input.Phone, input.Email, input.Address)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Gagal memperbarui profil",
		})
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data":   user,
	})
}
