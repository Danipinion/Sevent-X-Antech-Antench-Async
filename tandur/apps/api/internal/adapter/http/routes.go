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
	app.Use(TraceMiddleware())
	app.Use(cors.New(cors.Config{
		AllowOrigins: []string{"http://localhost:5173", "http://localhost", "*"},
		AllowHeaders: []string{"Origin, Content-Type, Accept, Authorization, X-Request-ID, X-Correlation-ID, X-Trace-ID"},
		AllowMethods: []string{"GET, POST, PUT, DELETE, OPTIONS"},
	}))

	// Root Healthcheck
	app.Get("/health", handler.HealthCheck)

	// Interactive API Documentation (Swagger UI & Scalar)
	docsHandler := NewDocsHandler()
	app.Get("/swagger", docsHandler.SwaggerUI)
	app.Get("/docs", docsHandler.SwaggerUI)
	app.Get("/scalar", docsHandler.ScalarUI)
	app.Get("/docs/openapi.json", docsHandler.OpenAPISpecJSON)
	app.Get("/docs/openapi.yaml", docsHandler.OpenAPISpecYAML)
	app.Get("/openapi.json", docsHandler.OpenAPISpecJSON)
	app.Get("/openapi.yaml", docsHandler.OpenAPISpecYAML)

	// API v1 Routing
	v1 := app.Group("/api/v1")
	v1.Get("/health", handler.HealthCheck)
	v1.Get("/swagger", docsHandler.SwaggerUI)
	v1.Get("/docs", docsHandler.SwaggerUI)
	v1.Get("/commodities", handler.ListCommodities)
	v1.Get("/commodities/:id", handler.GetCommodity)

	// Auth Routing
	auth := v1.Group("/auth")
	auth.Post("/register", handler.Register)
	auth.Post("/login", handler.Login)
	auth.Get("/me", handler.Me, handler.AuthMiddleware())
}
