package storage

import (
	"context"
	"io"

	"tandur/api/internal/infrastructure/config"
)

type ObjectStorage interface {
	Upload(ctx context.Context, key string, data io.Reader, contentType string) (string, error)
	GetURL(key string) string
}

type GarageStorage struct {
	endpoint string
	bucket   string
}

func NewGarageStorage(cfg *config.Config) *GarageStorage {
	return &GarageStorage{
		endpoint: cfg.S3Endpoint,
		bucket:   cfg.S3Bucket,
	}
}

func (s *GarageStorage) Upload(ctx context.Context, key string, data io.Reader, contentType string) (string, error) {
	// S3 Client integration placeholder for Garage object storage
	return s.GetURL(key), nil
}

func (s *GarageStorage) GetURL(key string) string {
	return s.endpoint + "/" + s.bucket + "/" + key
}

