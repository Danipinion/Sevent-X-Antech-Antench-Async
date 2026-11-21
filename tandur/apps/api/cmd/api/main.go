package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v3"
	adapterHttp "tandur/api/internal/adapter/http"
	"tandur/api/internal/application"
	"tandur/api/internal/domain"
	"tandur/api/internal/infrastructure/cache"
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

	// 3. Initialize Database Connection Pool (PostgreSQL + PostGIS)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	dbPool, err := persistence.NewPostgresPool(ctx, cfg)
	if err != nil {
		logger.Log.Error("Gagal menghubungkan ke PostgreSQL", "error", err)
	} else {
		defer dbPool.Close()
	}

	// 4. Initialize Repositories (Persistence) & Cache
	var userRepo *persistence.PostgresUserRepository
	if dbPool != nil {
		userRepo = persistence.NewPostgresUserRepository(dbPool)
	}
	commodityRepo := persistence.NewMemoryCommodityRepository()

	redisClient := cache.NewRedisClient(cfg)
	var tokenBlacklist domain.TokenBlacklist
	if err := redisClient.Ping(ctx); err == nil {
		logger.Log.Info("Terhubung ke Redis cache untuk token blacklist")
		tokenBlacklist = redisClient
	} else {
		logger.Log.Warn("Redis tidak terhubung, menggunakan in-memory token blacklist fallback", "error", err)
	}

	// 5. Initialize Application Services (Use Cases)
	jwtDuration := time.Duration(cfg.JWTExpirationHours) * time.Hour
	authService := application.NewAuthService(userRepo, cfg.JWTSecret, jwtDuration, tokenBlacklist)
	commodityService := application.NewCommodityService(commodityRepo)

	// 6. Initialize HTTP Handlers & Adapter
	httpHandler := adapterHttp.NewHandler(cfg, dbPool, commodityService, authService)

	// 7. Setup Fiber Web Application
	app := fiber.New(fiber.Config{
		AppName: "TANDUR API v1.0.0",
	})

	adapterHttp.SetupRoutes(app, httpHandler)

	// 8. Graceful Shutdown Setup
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
