package http

import (
	"strings"

	"github.com/gofiber/fiber/v3"
	"tandur/api/internal/application"
)

// AuthMiddleware memvalidasi Bearer JWT Token pada header Authorization
func AuthMiddleware(authService *application.AuthService) fiber.Handler {
	return func(c fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"status":  "error",
				"message": "Token otorisasi diperlukan (Bearer <token>)",
			})
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"status":  "error",
				"message": "Format token tidak valid. Gunakan format 'Bearer <token>'",
			})
		}

		tokenString := strings.TrimSpace(parts[1])
		if tokenString == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"status":  "error",
				"message": "Token otorisasi tidak boleh kosong",
			})
		}

		claims, err := authService.ValidateToken(tokenString)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"status":  "error",
				"message": "Token tidak valid atau telah kedaluwarsa",
			})
		}

		c.Locals("user_id", claims.UserID)
		c.Locals("claims", claims)
		return c.Next()
	}
}
