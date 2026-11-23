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
	v1.Get("/commodities/realtime-prices", handler.GetRealtimeDashboardPrices)
	v1.Get("/commodities/price-guide", handler.GetPriceGuide)
	v1.Get("/commodities/market-prices", handler.GetMarketPrices)
	v1.Post("/commodities/market-prices", handler.GetMarketPrices)
	v1.Get("/commodities/:id", handler.GetCommodity)

	// Auth Routing
	auth := v1.Group("/auth")
	auth.Post("/register", handler.Register)
	auth.Post("/login", handler.Login)
	auth.Post("/logout", handler.Logout, handler.AuthMiddleware())
	auth.Get("/me", handler.Me, handler.AuthMiddleware())
	auth.Put("/profile", handler.UpdateProfile, handler.AuthMiddleware())
	auth.Patch("/profile", handler.UpdateProfile, handler.AuthMiddleware())
	auth.Post("/profile/photo", handler.UploadProfilePhoto, handler.AuthMiddleware())

	// Farmer Routing
	farmer := v1.Group("/farmer", handler.AuthMiddleware())
	farmer.Get("/verification", handler.GetFarmerVerification)
	farmer.Post("/verification", handler.SubmitFarmerVerification)
	farmer.Post("/listings", handler.CreateFarmerListing)
	farmer.Get("/listings", handler.ListFarmerListings)
	farmer.Get("/listings/:id", handler.GetFarmerListing)
	farmer.Put("/listings/:id", handler.UpdateFarmerListing)
	farmer.Delete("/listings/:id", handler.CancelFarmerListing)
	farmer.Post("/listings/upload-media", handler.UploadFarmerListingMedia)

	// Farmer Orders (Daftar Pesanan & Penjualan - Mockup Gambar 2)
	farmer.Get("/orders", handler.ListFarmerOrders)
	farmer.Get("/orders/:id", handler.GetFarmerOrder)
	farmer.Post("/orders/:id/accept", handler.AcceptFarmerOrder)
	farmer.Post("/orders/:id/negotiate", handler.NegotiateFarmerOrder)
	farmer.Post("/orders/:id/reject", handler.RejectFarmerOrder)
	farmer.Post("/orders/:id/confirm-ready", handler.ConfirmReadyForPickup)

	// Middleman / Tengkulak Routing (Seluruh Halaman Tengkulak)
	middleman := v1.Group("/middleman", handler.AuthMiddleware())

	// 1. Beranda Tengkulak
	middleman.Get("/dashboard", handler.GetMiddlemanDashboard)

	// 2. Cari Petani & Pasokan (Listing Hasil Panen)
	middleman.Get("/listings", handler.ListMiddlemanListings)
	middleman.Get("/listings/:id", handler.GetMiddlemanListing)

	// 3. Transaksi & Surat Pesanan (PO)
	middleman.Get("/orders", handler.GetMiddlemanOrders)
	middleman.Post("/orders", handler.CreateMiddlemanOffer)
	middleman.Get("/orders/export", handler.ExportMiddlemanOrdersReport)
	middleman.Get("/orders/:id", handler.GetMiddlemanOrder)
	middleman.Put("/orders/:id", handler.UpdateMiddlemanOrderPO)
	middleman.Delete("/orders/:id", handler.CancelMiddlemanOrderPO)
	middleman.Put("/orders/:id/logistics", handler.UpdateOrderLogistics)
	middleman.Post("/orders/:id/weighing-and-complete", handler.CompleteWeighingAndSettlement)

	// 4. Penawaran & Kesepakatan Harga
	middleman.Get("/offers", handler.GetMiddlemanOffers)
	middleman.Post("/offers/:id/counter", handler.CounterMiddlemanOffer)

	// 5. Inventaris Stok Gudang
	middleman.Get("/inventory", handler.GetMiddlemanInventory)
	middleman.Post("/inventory", handler.CreateMiddlemanInventory)
	middleman.Get("/inventory/mutations", handler.GetMiddlemanMutations)
	middleman.Get("/inventory/:id", handler.GetMiddlemanInventoryByID)
	middleman.Delete("/inventory/:id", handler.DeleteMiddlemanInventory)

	// 6. Jual Stok Gudang
	middleman.Get("/sales", handler.GetMiddlemanSales)
	middleman.Post("/sales", handler.CreateMiddlemanSaleListing)
	middleman.Get("/sales/:id", handler.GetMiddlemanSaleListingByID)
	middleman.Put("/sales/:id/close", handler.CloseMiddlemanSaleListing)
	middleman.Get("/sales/:id/bids", handler.GetMiddlemanSaleBids)

	// Public Marketplace
	v1.Get("/marketplace/listings", handler.ListMiddlemanListings)
	v1.Get("/marketplace/listings/:id", handler.GetMiddlemanListing)
}
