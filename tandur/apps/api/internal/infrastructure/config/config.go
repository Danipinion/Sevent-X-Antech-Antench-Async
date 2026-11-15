package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	AppEnv         string
	AppPort        string
	AppURL         string
	DatabaseHost   string
	DatabasePort   string
	DatabaseName   string
	DatabaseUser   string
	DatabasePass   string
	DatabaseSSL    string
	RedisHost      string
	RedisPort      string
	RedisPass      string
	S3Endpoint     string
	S3Bucket       string
	S3AccessKey    string
	S3SecretKey    string
	S3Region       string
	MarketPriceURL string
}

func Load() *Config {
	_ = godotenv.Load(".env", "../../.env")

	return &Config{
		AppEnv:         getEnv("APP_ENV", "development"),
		AppPort:        getEnv("APP_PORT", "8080"),
		AppURL:         getEnv("APP_URL", "http://localhost:8080"),
		DatabaseHost:   getEnv("DATABASE_HOST", "localhost"),
		DatabasePort:   getEnv("DATABASE_PORT", "5432"),
		DatabaseName:   getEnv("DATABASE_NAME", "tandur"),
		DatabaseUser:   getEnv("DATABASE_USER", "tandur"),
		DatabasePass:   getEnv("DATABASE_PASSWORD", "change_me"),
		DatabaseSSL:    getEnv("DATABASE_SSLMODE", "disable"),
		RedisHost:      getEnv("REDIS_HOST", "localhost"),
		RedisPort:      getEnv("REDIS_PORT", "6379"),
		RedisPass:      getEnv("REDIS_PASSWORD", ""),
		S3Endpoint:     getEnv("S3_ENDPOINT", "http://localhost:3900"),
		S3Bucket:       getEnv("S3_BUCKET", "tandur"),
		S3AccessKey:    getEnv("S3_ACCESS_KEY", "change_me"),
		S3SecretKey:    getEnv("S3_SECRET_KEY", "change_me"),
		S3Region:       getEnv("S3_REGION", "garage"),
		MarketPriceURL: getEnv("MARKET_PRICE_API_BASE_URL", ""),
	}
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

