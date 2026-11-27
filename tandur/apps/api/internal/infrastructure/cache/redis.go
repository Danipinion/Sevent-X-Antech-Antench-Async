package cache

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"tandur/api/internal/domain"
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

// GetMarketPrices mengambil data harga pasar komoditas dari cache Redis
func (r *RedisClient) GetMarketPrices(ctx context.Context, key string) ([]domain.SP2KPCommodityPrice, bool) {
	val, err := r.client.Get(ctx, key).Result()
	if err != nil || val == "" {
		return nil, false
	}

	var prices []domain.SP2KPCommodityPrice
	if err := json.Unmarshal([]byte(val), &prices); err != nil {
		return nil, false
	}
	return prices, true
}

// SetMarketPrices menyimpan data harga pasar komoditas ke cache Redis dengan durasi TTL tertentu
func (r *RedisClient) SetMarketPrices(ctx context.Context, key string, prices []domain.SP2KPCommodityPrice, ttl time.Duration) error {
	b, err := json.Marshal(prices)
	if err != nil {
		return err
	}
	return r.client.Set(ctx, key, string(b), ttl).Err()
}

// GetRealtimePrices mengambil data pantauan harga pasar realtime (10 menit) dari cache Redis
func (r *RedisClient) GetRealtimePrices(ctx context.Context, key string) ([]domain.DashboardCommodityPrice, bool) {
	val, err := r.client.Get(ctx, key).Result()
	if err != nil || val == "" {
		return nil, false
	}

	var prices []domain.DashboardCommodityPrice
	if err := json.Unmarshal([]byte(val), &prices); err != nil {
		return nil, false
	}
	return prices, true
}

// SetRealtimePrices menyimpan data pantauan harga pasar realtime ke cache Redis dengan TTL 10 menit
func (r *RedisClient) SetRealtimePrices(ctx context.Context, key string, prices []domain.DashboardCommodityPrice, ttl time.Duration) error {
	b, err := json.Marshal(prices)
	if err != nil {
		return err
	}
	return r.client.Set(ctx, key, string(b), ttl).Err()
}
