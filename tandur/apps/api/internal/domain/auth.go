package domain

import (
	"context"
	"time"
)

// TokenBlacklist mendefinisikan kontrak penyimpanan token JWT yang telah dibatalkan (logout/revoked)
type TokenBlacklist interface {
	Blacklist(ctx context.Context, token string, expiresAt time.Time) error
	IsBlacklisted(ctx context.Context, token string) (bool, error)
}
