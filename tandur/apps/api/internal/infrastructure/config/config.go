package config

import (
	"net/url"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	AppEnv         string
	AppPort        string
	AppURL         string
	DatabaseURL    string
	DatabaseHost   string
	DatabasePort   string
	DatabaseName   string
	DatabaseUser   string
	DatabasePass   string
	DatabaseSSL    string
	RedisURL       string
	RedisHost      string
	RedisPort      string
	RedisPass      string
	S3Endpoint     string
	S3Bucket       string
	S3AccessKey    string
	S3SecretKey    string
	S3Region       string
	MarketPriceURL string
	JWTSecret      string
	JWTExpirationHours int
}

func Load() *Config {
	_ = godotenv.Load(".env", "../../.env")

	defaultHost := "localhost"
	defaultRedisHost := "localhost"
	if _, err := os.Stat("/.dockerenv"); err == nil {
		defaultHost = "postgres"
		defaultRedisHost = "redis"
	}

	cfg := &Config{
		AppEnv:         getEnv("APP_ENV", "development"),
		AppPort:        getEnv("APP_PORT", "8080"),
		AppURL:         getEnv("APP_URL", "http://localhost:8080"),
		DatabaseURL:    getEnv("DATABASE_URL", ""),
		DatabaseHost:   getEnv("POSTGRES_HOST", getEnv("DATABASE_HOST", defaultHost)),
		DatabasePort:   getEnv("POSTGRES_PORT", getEnv("DATABASE_PORT", "5432")),
		DatabaseName:   getEnv("POSTGRES_DB", getEnv("DATABASE_NAME", "tandur")),
		DatabaseUser:   getEnv("POSTGRES_USER", getEnv("DATABASE_USER", "tandur")),
		DatabasePass:   getEnv("POSTGRES_PASSWORD", getEnv("DATABASE_PASSWORD", "change_me")),
		DatabaseSSL:    getEnv("DATABASE_SSLMODE", "disable"),
		RedisURL:       getEnv("REDIS_URL", ""),
		RedisHost:      getEnv("REDIS_HOST", defaultRedisHost),
		RedisPort:      getEnv("REDIS_PORT", "6379"),
		RedisPass:      getEnv("REDIS_PASSWORD", ""),
		S3Endpoint:     getEnv("S3_ENDPOINT", "http://garage:3900"),
		S3Bucket:       getEnv("S3_BUCKET", "tandur"),
		S3AccessKey:    getEnv("S3_ACCESS_KEY", ""),
		S3SecretKey:    getEnv("S3_SECRET_KEY", ""),
		S3Region:           getEnv("S3_REGION", "garage"),
		MarketPriceURL:     getEnv("MARKET_PRICE_API_BASE_URL", "https://api-sp2kp.kemendag.go.id/report/api/average-price/generate-perbandingan-harga"),
		JWTSecret:          getEnv("JWT_SECRET", "tandur-secret-key-development-32chars-min!"),
		JWTExpirationHours: getEnvInt("JWT_EXPIRATION_HOURS", 72),
	}

	// Parse DATABASE_URL if present
	if cfg.DatabaseURL != "" {
		if parsed, err := url.Parse(cfg.DatabaseURL); err == nil {
			if parsed.Hostname() != "" {
				cfg.DatabaseHost = parsed.Hostname()
			}
			if parsed.Port() != "" {
				cfg.DatabasePort = parsed.Port()
			}
			if parsed.User != nil {
				cfg.DatabaseUser = parsed.User.Username()
				if pass, ok := parsed.User.Password(); ok {
					cfg.DatabasePass = pass
				}
			}
			cfg.DatabaseName = strings.TrimPrefix(parsed.Path, "/")
			if ssl := parsed.Query().Get("sslmode"); ssl != "" {
				cfg.DatabaseSSL = ssl
			}
		}
	}

	// Parse REDIS_URL if present
	if cfg.RedisURL != "" {
		if parsed, err := url.Parse(cfg.RedisURL); err == nil {
			if parsed.Hostname() != "" {
				cfg.RedisHost = parsed.Hostname()
			}
			if parsed.Port() != "" {
				cfg.RedisPort = parsed.Port()
			}
			if parsed.User != nil {
				if pass, ok := parsed.User.Password(); ok {
					cfg.RedisPass = pass
				}
			}
		}
	}

	return cfg
}

func (c *Config) PostgresConnString() string {
	if c.DatabaseURL != "" {
		return c.DatabaseURL
	}
	return "postgres://" + c.DatabaseUser + ":" + c.DatabasePass + "@" + c.DatabaseHost + ":" + c.DatabasePort + "/" + c.DatabaseName + "?sslmode=" + c.DatabaseSSL
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func getEnvInt(key string, defaultVal int) int {
	if val := os.Getenv(key); val != "" {
		if intVal, err := strconv.Atoi(val); err == nil {
			return intVal
		}
	}
	return defaultVal
}
