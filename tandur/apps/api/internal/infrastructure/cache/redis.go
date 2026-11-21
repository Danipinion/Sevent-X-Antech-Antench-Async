package cache

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
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

func (r *RedisClient) Client() *redis.Client {
	return r.client
}

func (r *RedisClient) Blacklist(ctx context.Context, token string, expiresAt time.Time) error {
	ttl := time.Until(expiresAt)
	if ttl <= 0 {
		return nil
	}
	hash := sha256.Sum256([]byte(token))
	key := "blacklist:jwt:" + hex.EncodeToString(hash[:])
	return r.client.Set(ctx, key, "revoked", ttl).Err()
}

func (r *RedisClient) IsBlacklisted(ctx context.Context, token string) (bool, error) {
	hash := sha256.Sum256([]byte(token))
	key := "blacklist:jwt:" + hex.EncodeToString(hash[:])
	n, err := r.client.Exists(ctx, key).Result()
	if err != nil {
		return false, err
	}
	return n > 0, nil
}
