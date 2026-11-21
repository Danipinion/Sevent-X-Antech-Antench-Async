package http

import (
	"errors"
	"strconv"
	"strings"

	"tandur/api/internal/application"
	"tandur/api/internal/domain"

	"github.com/gofiber/fiber/v3"
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
		case errors.Is(err, domain.ErrNameRequired):
			return RespondError(c, fiber.StatusBadRequest, "NAME_REQUIRED", err.Error())

		case errors.Is(err, domain.ErrInvalidPhone):
			return RespondError(c, fiber.StatusBadRequest, "INVALID_PHONE_NUMBER", err.Error())

		case errors.Is(err, domain.ErrInvalidNIK):
			return RespondError(c, fiber.StatusBadRequest, "INVALID_NIK", err.Error())

		case errors.Is(err, domain.ErrInvalidRole):
			return RespondError(c, fiber.StatusBadRequest, "INVALID_ROLE", err.Error())

		case errors.Is(err, domain.ErrPasswordTooShort):
			return RespondError(c, fiber.StatusBadRequest, "PASSWORD_TOO_SHORT", err.Error())

		case errors.Is(err, domain.ErrInvalidCoordinate):
			return RespondError(c, fiber.StatusBadRequest, "INVALID_COORDINATE", err.Error())

		case errors.Is(err, domain.ErrPhoneAlreadyExists):
			return RespondError(c, fiber.StatusConflict, "PHONE_ALREADY_EXISTS", err.Error())

		case errors.Is(err, domain.ErrNIKAlreadyExists):
			return RespondError(c, fiber.StatusConflict, "NIK_ALREADY_EXISTS", err.Error())

		default:
			return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", "Terjadi kesalahan internal pada server")
		}
	}

	return RespondSuccess(c, fiber.StatusCreated, "Registrasi akun berhasil", user)
}

// Login menangani autentikasi pengguna menggunakan Nomor HP atau NIK dan password
func (h *AuthHandler) Login(c fiber.Ctx) error {
	var input application.LoginInput
	// 1. Coba bind dari request body (JSON atau Form-URL-Encoded)
	_ = c.Bind().Body(&input)

	// 2. Ambil dari Query Parameters jika diisi lewat form parameter Swagger UI
	if input.Username == "" && c.Query("phone") != "" {
		input.Username = c.Query("phone")
	}
	if input.Username == "" && c.Query("nik") != "" {
		input.Username = c.Query("nik")
	}
	if input.Username == "" && c.Query("username") != "" {
		input.Username = c.Query("username")
	}
	if input.Password == "" {
		input.Password = c.Query("password")
	}

	result, err := h.authService.Login(c.Context(), input)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrUsernameRequired):
			return RespondError(c, fiber.StatusBadRequest, "USERNAME_REQUIRED", err.Error())

		case errors.Is(err, domain.ErrPasswordRequired):
			return RespondError(c, fiber.StatusBadRequest, "PASSWORD_REQUIRED", err.Error())

		case errors.Is(err, domain.ErrInvalidCredentials):
			return RespondError(c, fiber.StatusUnauthorized, "INVALID_CREDENTIALS", err.Error())

		case errors.Is(err, domain.ErrAccountInactive):
			return RespondError(c, fiber.StatusForbidden, "ACCOUNT_INACTIVE", err.Error())

		default:
			return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", "Terjadi kesalahan internal pada server")
		}
	}

	return RespondSuccess(c, fiber.StatusOK, "Login berhasil", result)
}

// Me mengembalikan profil pengguna yang sedang login berdasarkan token JWT
func (h *AuthHandler) Me(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Pengguna tidak terautentikasi")
	}

	user, err := h.authService.GetProfile(c.Context(), userID)
	if err != nil {
		return RespondError(c, fiber.StatusNotFound, "USER_NOT_FOUND", "Pengguna tidak ditemukan")
	}

	return RespondSuccess(c, fiber.StatusOK, "Profil pengguna berhasil diambil", user)
}

// Logout membatalkan sesi token JWT pengguna yang sedang aktif
func (h *AuthHandler) Logout(c fiber.Ctx) error {
	tokenString, ok := c.Locals("token").(string)
	if !ok || tokenString == "" {
		authHeader := c.Get("Authorization")
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
			tokenString = strings.TrimSpace(parts[1])
		}
	}

	if tokenString == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Token otorisasi diperlukan")
	}

	err := h.authService.Logout(c.Context(), tokenString)
	if err != nil {
		if errors.Is(err, domain.ErrUnauthorized) {
			return RespondError(c, fiber.StatusUnauthorized, "TOKEN_INVALID", "Token tidak valid atau sudah dibatalkan")
		}
		return RespondError(c, fiber.StatusInternalServerError, "LOGOUT_FAILED", "Gagal memproses logout")
	}

	return RespondSuccess(c, fiber.StatusOK, "Logout berhasil", nil)
}
