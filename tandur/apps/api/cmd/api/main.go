package main

import (
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/gofiber/fiber/v3"
	adapterHttp "tandur/api/internal/adapter/http"
	"tandur/api/internal/application"
	"tandur/api/internal/infrastructure/config"
	"tandur/api/internal/infrastructure/logger"
	"tandur/api/internal/infrastructure/persistence"
)

func main() {
	// 1. Load Configurations
	cfg := config.Load()

	// 2. Initialize Structured Logger
	logger.Init(cfg.AppEnv)
	logger.Log.Info("Inisialisasi TANDUR Backend API", "env", cfg.AppEnv, "port", cfg.AppPort)

	// 3. Initialize Repositories (Persistence)
	commodityRepo := persistence.NewMemoryCommodityRepository()
	userRepo := persistence.NewMemoryUserRepository()

	// 4. Initialize Application Services (Use Cases)
	commodityService := application.NewCommodityService(commodityRepo)
	userService := application.NewUserService(userRepo)

	// 5. Initialize HTTP Handlers & Adapter
	httpHandler := adapterHttp.NewHandler(cfg, commodityService, userService)

	// 6. Setup Fiber Web Application
	app := fiber.New(fiber.Config{
		AppName: "TANDUR API v1.0.0",
	})

	adapterHttp.SetupRoutes(app, httpHandler)

	// 7. Graceful Shutdown Setup
	go func() {
		addr := fmt.Sprintf(":%s", cfg.AppPort)
		logger.Log.Info("Server API berjalan", "addr", addr)
		if err := app.Listen(addr); err != nil {
			logger.Log.Error("Server error", "error", err)
		}
	}()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	<-sigChan

	logger.Log.Info("Mematikan server API secara graceful...")
	_ = app.Shutdown()
	logger.Log.Info("Server API berhasil dihentikan.")
}

