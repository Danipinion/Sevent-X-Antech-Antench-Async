package domain

import (
	"context"
	"time"
)

type UserRole string

const (
	RoleFarmer    UserRole = "farmer"
	RoleMiddleman UserRole = "middleman"
	RoleBuyer     UserRole = "buyer"
)

func (r UserRole) IsValid() bool {
	switch r {
	case RoleFarmer, RoleMiddleman, RoleBuyer:
		return true
	default:
		return false
	}
}

type User struct {
	ID           string        `json:"id"`
	NIK          *string       `json:"nik,omitempty"`
	Name         string        `json:"name"`
	Phone        string        `json:"phone"`
	PasswordHash string        `json:"-"`
	Role         UserRole      `json:"role"`
	IsBisnis     bool          `json:"is_bisnis"`
	IsActive     bool          `json:"is_active"`
	CreatedAt    time.Time     `json:"created_at"`
	UpdatedAt    time.Time     `json:"updated_at"`
	Location     *UserLocation `json:"location,omitempty"`
}

type UserLocation struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Label     string    `json:"label,omitempty"`
	Address   string    `json:"address"`
	Village   string    `json:"village,omitempty"`
	District  string    `json:"district,omitempty"`
	City      string    `json:"city,omitempty"`
	Province  string    `json:"province,omitempty"`
	Latitude  float64   `json:"latitude"`
	Longitude float64   `json:"longitude"`
	IsPrimary bool      `json:"is_primary"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type UserRepository interface {
	Create(ctx context.Context, user *User, location *UserLocation) error
	GetByPhone(ctx context.Context, phone string) (*User, error)
	GetByNIK(ctx context.Context, nik string) (*User, error)
	GetByID(ctx context.Context, id string) (*User, error)
}
