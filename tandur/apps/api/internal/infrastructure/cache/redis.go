package cache

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"tandur/api/internal/infrastructure/config"
)

type RedisClient struct {
	client *redis.Client
}

func NewRedisClient(cfg *config.Config) *RedisClient {
	rdb := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", cfg.RedisHost, cfg.RedisPort),
		Password: cfg.RedisPass,
		DB:       0,
	})
	return &RedisClient{client: rdb}
}

func (r *RedisClient) Ping(ctx context.Context) error {
	ctxTimeout, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	return r.client.Ping(ctxTimeout).Err()
}

