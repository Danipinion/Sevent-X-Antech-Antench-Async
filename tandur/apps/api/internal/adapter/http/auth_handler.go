package http

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"strconv"
	"strings"

	"tandur/api/internal/application"
	"tandur/api/internal/domain"
	"tandur/api/internal/infrastructure/storage"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

type AuthHandler struct {
	authService *application.AuthService
	storage     storage.ObjectStorage
}

func NewAuthHandler(authService *application.AuthService, objStorage ...storage.ObjectStorage) *AuthHandler {
	var st storage.ObjectStorage
	if len(objStorage) > 0 && objStorage[0] != nil {
		st = objStorage[0]
	}
	return &AuthHandler{
		authService: authService,
		storage:     st,
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

// UpdateProfile memperbarui data profil pengguna dan/atau foto profil tanpa mengubah data sensitif
func (h *AuthHandler) UpdateProfile(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Pengguna tidak terautentikasi")
	}

	var input application.UpdateProfileInput

	// 1. Coba bind body JSON / form-data
	_ = c.Bind().Body(&input)

	// 2. Fallback query / form values jika menggunakan form-data / url-encoded
	if input.Name == nil && c.FormValue("name") != "" {
		v := c.FormValue("name")
		input.Name = &v
	}
	if input.Phone == nil && c.FormValue("phone") != "" {
		v := c.FormValue("phone")
		input.Phone = &v
	}
	if input.AvatarURL == nil && c.FormValue("avatar_url") != "" {
		v := c.FormValue("avatar_url")
		input.AvatarURL = &v
	}
	if input.IsBisnis == nil && c.FormValue("is_bisnis") != "" {
		b := c.FormValue("is_bisnis") == "true" || c.FormValue("is_bisnis") == "1"
		input.IsBisnis = &b
	}

	// Flat location form values
	if input.Label == nil && c.FormValue("label") != "" {
		v := c.FormValue("label")
		input.Label = &v
	}
	if input.Address == nil && c.FormValue("address") != "" {
		v := c.FormValue("address")
		input.Address = &v
	}
	if input.Village == nil && c.FormValue("village") != "" {
		v := c.FormValue("village")
		input.Village = &v
	}
	if input.District == nil && c.FormValue("district") != "" {
		v := c.FormValue("district")
		input.District = &v
	}
	if input.City == nil && c.FormValue("city") != "" {
		v := c.FormValue("city")
		input.City = &v
	}
	if input.Province == nil && c.FormValue("province") != "" {
		v := c.FormValue("province")
		input.Province = &v
	}
	if input.Latitude == nil && c.FormValue("latitude") != "" {
		if lat, err := strconv.ParseFloat(c.FormValue("latitude"), 64); err == nil {
			input.Latitude = &lat
		}
	}
	if input.Longitude == nil && c.FormValue("longitude") != "" {
		if lng, err := strconv.ParseFloat(c.FormValue("longitude"), 64); err == nil {
			input.Longitude = &lng
		}
	}

	// Explicit sensitive fields check
	if input.NIK == nil && (c.FormValue("nik") != "" || c.Query("nik") != "") {
		v := c.FormValue("nik")
		if v == "" {
			v = c.Query("nik")
		}
		input.NIK = &v
	}
	if input.Role == nil && (c.FormValue("role") != "" || c.Query("role") != "") {
		v := c.FormValue("role")
		if v == "" {
			v = c.Query("role")
		}
		input.Role = &v
	}
	if input.Password == nil && (c.FormValue("password") != "" || c.Query("password") != "") {
		v := c.FormValue("password")
		if v == "" {
			v = c.Query("password")
		}
		input.Password = &v
	}

	// 3. Cek jika ada berkas foto profil yang diunggah via multipart ("avatar", "photo", atau "profile_photo")
	file, err := c.FormFile("avatar")
	if err != nil {
		file, err = c.FormFile("photo")
	}
	if err != nil {
		file, err = c.FormFile("profile_photo")
	}
	if err == nil && file != nil {
		f, errOpen := file.Open()
		if errOpen != nil {
			return RespondError(c, fiber.StatusBadRequest, "INVALID_FILE", "Gagal membuka berkas foto profil")
		}
		defer f.Close()

		buf, errRead := io.ReadAll(f)
		if errRead != nil {
			return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", "Gagal membaca isi berkas foto profil")
		}

		validated, errVal := storage.ValidateStrictMedia(file.Filename, buf)
		if errVal != nil {
			return RespondError(c, fiber.StatusBadRequest, "INVALID_MEDIA", errVal.Error())
		}
		if validated.MediaType != "photo" {
			return RespondError(c, fiber.StatusBadRequest, "INVALID_MEDIA_TYPE", "Foto profil harus berupa gambar (JPG, PNG, atau WEBP)")
		}

		key := fmt.Sprintf("avatars/%s/%s%s", userID, uuid.New().String(), validated.Extension)
		var publicURL string
		if h.storage != nil {
			url, errUp := h.storage.Upload(c.Context(), key, bytes.NewReader(buf), validated.MimeType)
			if errUp != nil {
				return RespondError(c, fiber.StatusInternalServerError, "STORAGE_ERROR", "Gagal mengunggah foto profil: "+errUp.Error())
			}
			publicURL = url
		} else {
			publicURL = fmt.Sprintf("http://localhost:3900/tandur/%s", key)
		}
		input.AvatarURL = &publicURL
	}

	updatedUser, err := h.authService.UpdateProfile(c.Context(), userID, input)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrSensitiveFieldCannotBeModified):
			return RespondError(c, fiber.StatusBadRequest, "SENSITIVE_FIELD_IMMUTABLE", err.Error())
		case errors.Is(err, domain.ErrNameRequired):
			return RespondError(c, fiber.StatusBadRequest, "NAME_REQUIRED", err.Error())
		case errors.Is(err, domain.ErrInvalidPhone):
			return RespondError(c, fiber.StatusBadRequest, "INVALID_PHONE", err.Error())
		case errors.Is(err, domain.ErrPhoneAlreadyExists):
			return RespondError(c, fiber.StatusConflict, "PHONE_EXISTS", err.Error())
		case errors.Is(err, domain.ErrInvalidCoordinate):
			return RespondError(c, fiber.StatusBadRequest, "INVALID_COORDINATE", err.Error())
		case errors.Is(err, domain.ErrAccountInactive):
			return RespondError(c, fiber.StatusForbidden, "ACCOUNT_INACTIVE", err.Error())
		case errors.Is(err, domain.ErrUserNotFound):
			return RespondError(c, fiber.StatusNotFound, "USER_NOT_FOUND", err.Error())
		default:
			return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", "Terjadi kesalahan internal pada server: "+err.Error())
		}
	}

	return RespondSuccess(c, fiber.StatusOK, "Profil pengguna berhasil diperbarui", updatedUser)
}

// UploadProfilePhoto mengunggah dan memperbarui foto profil pengguna secara instan
func (h *AuthHandler) UploadProfilePhoto(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Pengguna tidak terautentikasi")
	}

	file, err := c.FormFile("avatar")
	if err != nil {
		file, err = c.FormFile("photo")
	}
	if err != nil {
		file, err = c.FormFile("file")
	}
	if err != nil {
		file, err = c.FormFile("profile_photo")
	}
	if err != nil {
		return RespondError(c, fiber.StatusBadRequest, "INVALID_FILE", "Berkas foto profil wajib disertakan (field 'avatar', 'photo', atau 'file')")
	}

	f, err := file.Open()
	if err != nil {
		return RespondError(c, fiber.StatusBadRequest, "INVALID_FILE", "Gagal membuka berkas foto profil")
	}
	defer f.Close()

	buf, err := io.ReadAll(f)
	if err != nil {
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", "Gagal membaca isi berkas foto")
	}

	validated, err := storage.ValidateStrictMedia(file.Filename, buf)
	if err != nil {
		return RespondError(c, fiber.StatusBadRequest, "INVALID_MEDIA", err.Error())
	}
	if validated.MediaType != "photo" {
		return RespondError(c, fiber.StatusBadRequest, "INVALID_MEDIA_TYPE", "Berkas foto profil harus berupa gambar (JPG, PNG, atau WEBP)")
	}

	key := fmt.Sprintf("avatars/%s/%s%s", userID, uuid.New().String(), validated.Extension)
	var publicURL string
	if h.storage != nil {
		url, errUp := h.storage.Upload(c.Context(), key, bytes.NewReader(buf), validated.MimeType)
		if errUp != nil {
			return RespondError(c, fiber.StatusInternalServerError, "STORAGE_ERROR", "Gagal mengunggah foto profil: "+errUp.Error())
		}
		publicURL = url
	} else {
		publicURL = fmt.Sprintf("http://localhost:3900/tandur/%s", key)
	}

	updatedUser, err := h.authService.UpdateProfile(c.Context(), userID, application.UpdateProfileInput{
		AvatarURL: &publicURL,
	})
	if err != nil {
		return RespondError(c, fiber.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
	}

	return RespondSuccess(c, fiber.StatusOK, "Foto profil berhasil diperbarui", fiber.Map{
		"avatar_url": publicURL,
		"user":       updatedUser,
	})
}
