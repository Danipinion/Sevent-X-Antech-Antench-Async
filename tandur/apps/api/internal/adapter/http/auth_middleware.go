package http

import (
	"strings"

	"tandur/api/internal/application"

	"github.com/gofiber/fiber/v3"
)

// AuthMiddleware memvalidasi Bearer JWT Token pada header Authorization
func AuthMiddleware(authService *application.AuthService) fiber.Handler {
	return func(c fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return RespondError(c, fiber.StatusUnauthorized, "UNAUTHORIZED", "Token otorisasi diperlukan")
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			return RespondError(c, fiber.StatusUnauthorized, "INVALID_AUTH_HEADER", "Format token tidak valid. Gunakan format 'Bearer <token>'")
		}

		tokenString := strings.TrimSpace(parts[1])
		if tokenString == "" {
			return RespondError(c, fiber.StatusUnauthorized, "TOKEN_REQUIRED", "Token otorisasi tidak boleh kosong")
		}

		claims, err := authService.ValidateToken(tokenString)
		if err != nil {
			return RespondError(c, fiber.StatusUnauthorized, "TOKEN_INVALID", "Token tidak valid atau telah kedaluwarsa")
		}

		c.Locals("user_id", claims.UserID)
		c.Locals("token", tokenString)
		c.Locals("claims", claims)
		return c.Next()
	}
}

// OptionalAuthMiddleware mengekstrak klaim JWT jika header Authorization tersedia tanpa memblokir akses publik
func OptionalAuthMiddleware(authService *application.AuthService) fiber.Handler {
	return func(c fiber.Ctx) error {
		if authService == nil {
			return c.Next()
		}
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Next()
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			return c.Next()
		}

		tokenString := strings.TrimSpace(parts[1])
		if tokenString == "" {
			return c.Next()
		}

		if claims, err := authService.ValidateToken(tokenString); err == nil && claims != nil {
			c.Locals("user_id", claims.UserID)
			c.Locals("token", tokenString)
			c.Locals("claims", claims)
		}
		return c.Next()
	}
}
