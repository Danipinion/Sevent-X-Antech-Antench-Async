package domain

import (
	"context"
	"time"
)

type UserRole string

const (
	RoleFarmer    UserRole = "FARMER"
	RoleMiddleman UserRole = "MIDDLEMAN"
	RoleBuyer     UserRole = "BUYER"
	RoleAdmin     UserRole = "ADMIN"
)

type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Name         string    `json:"name"`
	Role         UserRole  `json:"role"`
	PhoneNumber  string    `json:"phone_number,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type UserRepository interface {
	GetByID(ctx context.Context, id string) (*User, error)
	GetByEmail(ctx context.Context, email string) (*User, error)
	Create(ctx context.Context, user *User) error
}

