package persistence

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"tandur/api/internal/infrastructure/config"
	"tandur/api/internal/infrastructure/logger"
)

func NewPostgresPool(ctx context.Context, cfg *config.Config) (*pgxpool.Pool, error) {
	connStr := cfg.PostgresConnString()
	poolConfig, err := pgxpool.ParseConfig(connStr)
	if err != nil {
		return nil, fmt.Errorf("gagal mem-parsing config postgres: %w", err)
	}

	poolConfig.MaxConns = 25
	poolConfig.MinConns = 2
	poolConfig.MaxConnLifetime = 1 * time.Hour
	poolConfig.MaxConnIdleTime = 15 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		return nil, fmt.Errorf("gagal membuat connection pool postgres: %w", err)
	}

	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := pool.Ping(pingCtx); err != nil {
		return nil, fmt.Errorf("gagal ping database postgres: %w", err)
	}

	logger.Log.Info("Berhasil terhubung ke database PostgreSQL",
		"host", cfg.DatabaseHost,
		"port", cfg.DatabasePort,
		"db", cfg.DatabaseName)

	return pool, nil
}
