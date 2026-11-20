package http

import (
	"errors"
	"strconv"

	"github.com/gofiber/fiber/v3"
	"tandur/api/internal/application"
	"tandur/api/internal/domain"
)

type AuthHandler struct {
	authService *application.AuthService
}

func NewAuthHandler(authService *application.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

// Register menangani pendaftaran akun pengguna baru
func (h *AuthHandler) Register(c fiber.Ctx) error {
	var input application.RegisterInput
	// 1. Coba bind dari request body (JSON atau Form-URL-Encoded)
	_ = c.Bind().Body(&input)

	// 2. Ambil dari Query Parameters jika diisi lewat form parameter Swagger UI
	if input.Name == "" {
		input.Name = c.Query("name")
	}
	if input.Phone == "" {
		input.Phone = c.Query("phone")
	}
	if input.Password == "" {
		input.Password = c.Query("password")
	}
	if input.Role == "" {
		input.Role = c.Query("role")
	}
	if input.NIK == nil && c.Query("nik") != "" {
		nik := c.Query("nik")
		input.NIK = &nik
	}
	if !input.IsBisnis && (c.Query("is_bisnis") == "true" || c.Query("is_bisnis") == "1") {
		input.IsBisnis = true
	}
	if input.Address == "" && c.Query("address") != "" {
		input.Address = c.Query("address")
	}
	if input.Label == "" && c.Query("label") != "" {
		input.Label = c.Query("label")
	}
	if input.Village == "" && c.Query("village") != "" {
		input.Village = c.Query("village")
	}
	if input.District == "" && c.Query("district") != "" {
		input.District = c.Query("district")
	}
	if input.City == "" && c.Query("city") != "" {
		input.City = c.Query("city")
	}
	if input.Province == "" && c.Query("province") != "" {
		input.Province = c.Query("province")
	}
	if input.Latitude == nil && c.Query("latitude") != "" {
		if lat, err := strconv.ParseFloat(c.Query("latitude"), 64); err == nil {
			input.Latitude = &lat
		}
	}
	if input.Longitude == nil && c.Query("longitude") != "" {
		if lng, err := strconv.ParseFloat(c.Query("longitude"), 64); err == nil {
			input.Longitude = &lng
		}
	}

	user, err := h.authService.Register(c.Context(), input)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrNameRequired),
			errors.Is(err, domain.ErrInvalidPhone),
			errors.Is(err, domain.ErrInvalidNIK),
			errors.Is(err, domain.ErrInvalidRole),
			errors.Is(err, domain.ErrPasswordTooShort),
			errors.Is(err, domain.ErrInvalidCoordinate):
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"status":  "error",
				"message": err.Error(),
			})

		case errors.Is(err, domain.ErrPhoneAlreadyExists),
			errors.Is(err, domain.ErrNIKAlreadyExists):
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"status":  "error",
				"message": err.Error(),
			})

		default:
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"status":  "error",
				"message": "Terjadi kesalahan internal pada server",
				"error":   err.Error(),
			})
		}
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"status":  "success",
		"message": "Registrasi akun berhasil",
		"data":    user,
	})
}

// Login menangani autentikasi pengguna menggunakan Nomor HP atau NIK dan password
func (h *AuthHandler) Login(c fiber.Ctx) error {
	var input application.LoginInput
	// 1. Coba bind dari request body (JSON atau Form-URL-Encoded)
	_ = c.Bind().Body(&input)

	// 2. Ambil dari Query Parameters jika diisi lewat form parameter Swagger UI
	if input.Username == "" {
		input.Username = c.Query("username")
	}
	if input.Username == "" && c.Query("phone") != "" {
		input.Username = c.Query("phone")
	}
	if input.Username == "" && c.Query("nik") != "" {
		input.Username = c.Query("nik")
	}
	if input.Password == "" {
		input.Password = c.Query("password")
	}

	result, err := h.authService.Login(c.Context(), input)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrUsernameRequired),
			errors.Is(err, domain.ErrPasswordRequired):
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"status":  "error",
				"message": err.Error(),
			})

		case errors.Is(err, domain.ErrInvalidCredentials):
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"status":  "error",
				"message": err.Error(),
			})

		case errors.Is(err, domain.ErrAccountInactive):
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"status":  "error",
				"message": err.Error(),
			})

		default:
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"status":  "error",
				"message": "Terjadi kesalahan internal pada server",
				"error":   err.Error(),
			})
		}
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"status":  "success",
		"message": "Login berhasil",
		"data":    result,
	})
}

// Me mengembalikan profil pengguna yang sedang login berdasarkan token JWT
func (h *AuthHandler) Me(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"status":  "error",
			"message": "Pengguna tidak terautentikasi",
		})
	}

	user, err := h.authService.GetProfile(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"status":  "error",
			"message": "Pengguna tidak ditemukan",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"status":  "success",
		"message": "Profil pengguna berhasil diambil",
		"data":    user,
	})
}
