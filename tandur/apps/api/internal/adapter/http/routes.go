package http

import (
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/logger"
	"github.com/gofiber/fiber/v3/middleware/recover"
)

func SetupRoutes(app *fiber.App, handler *Handler) {
	// Middleware
	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: []string{"http://localhost:5173", "http://localhost", "*"},
		AllowHeaders: []string{"Origin, Content-Type, Accept, Authorization"},
		AllowMethods: []string{"GET, POST, PUT, DELETE, OPTIONS"},
	}))

	// Root Healthcheck
	app.Get("/health", handler.HealthCheck)

	// API v1 Routing
	v1 := app.Group("/api/v1")
	v1.Get("/health", handler.HealthCheck)
	v1.Get("/commodities", handler.ListCommodities)
	v1.Get("/commodities/:id", handler.GetCommodity)

	// Auth Routing
	auth := v1.Group("/auth")
	auth.Post("/register", handler.Register)
	auth.Post("/login", handler.Login)

	// User Profile Routing
	users := v1.Group("/users")
	users.Get("/profile", handler.GetProfile)
	users.Put("/profile", handler.UpdateProfile)
}
