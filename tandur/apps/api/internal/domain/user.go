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

	BuyerTypeRetail   = "retail_buyer"
	BuyerTypeBusiness = "business_buyer"
)

type VerificationStatus string

const (
	VerificationStatusUnverified VerificationStatus = "unverified"
	VerificationStatusPending    VerificationStatus = "pending"
	VerificationStatusVerified   VerificationStatus = "verified"
	VerificationStatusRejected   VerificationStatus = "rejected"
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
	ID                 string             `json:"id"`
	NIK                *string            `json:"nik,omitempty"`
	Name               string             `json:"name"`
	Phone              string             `json:"phone"`
	PasswordHash       string             `json:"-"`
	Role               UserRole           `json:"role"`
	IsBisnis           bool               `json:"is_bisnis"`
	BuyerType          string             `json:"buyer_type,omitempty"`
	AvatarURL          *string            `json:"avatar_url,omitempty"`
	IsActive           bool               `json:"is_active"`
	IsVerified         bool               `json:"is_verified"`
	VerificationStatus VerificationStatus `json:"verification_status"`
	KTPPhotoURL        *string            `json:"ktp_photo_url,omitempty"`
	BirthPlace         *string            `json:"birth_place,omitempty"`
	BirthDate          *string            `json:"birth_date,omitempty"`
	KTPAddress         *string            `json:"ktp_address,omitempty"`
	VerifiedAt         *time.Time         `json:"verified_at,omitempty"`
	RejectionReason    *string            `json:"rejection_reason,omitempty"`
	CanSellHarvest     bool               `json:"can_sell_harvest"`
	CreatedAt          time.Time          `json:"created_at"`
	UpdatedAt          time.Time          `json:"updated_at"`
	Location           *UserLocation      `json:"location,omitempty"`
}

func (u *User) CheckCanSellHarvest() bool {
	if u.Role != RoleFarmer {
		return false
	}
	return u.IsVerified && u.VerificationStatus == VerificationStatusVerified
}

func (u *User) ResolveBuyerType() string {
	if u.Role != RoleBuyer {
		return ""
	}
	if u.IsBisnis {
		return BuyerTypeBusiness
	}
	return BuyerTypeRetail
}

func (u *User) IsBusinessBuyer() bool {
	return u.Role == RoleBuyer && u.IsBisnis
}

type FarmerVerificationInput struct {
	NIK                 string `json:"nik" form:"nik"`
	Name                string `json:"name" form:"name"`
	BirthPlace          string `json:"birth_place" form:"birth_place"`
	BirthDate           string `json:"birth_date" form:"birth_date"`
	KTPAddress          string `json:"ktp_address" form:"ktp_address"`
	KTPPhotoURL         string `json:"ktp_photo_url" form:"ktp_photo_url"`
	DeclarationAccepted bool   `json:"declaration_accepted" form:"declaration_accepted"`
}

type FarmerVerificationResponse struct {
	UserID             string             `json:"user_id"`
	NIK                string             `json:"nik"`
	Name               string             `json:"name"`
	VerificationStatus VerificationStatus `json:"verification_status"`
	IsVerified         bool               `json:"is_verified"`
	CanSellHarvest     bool               `json:"can_sell_harvest"`
	KTPPhotoURL        string             `json:"ktp_photo_url,omitempty"`
	BirthPlace         string             `json:"birth_place,omitempty"`
	BirthDate          string             `json:"birth_date,omitempty"`
	KTPAddress         string             `json:"ktp_address,omitempty"`
	VerifiedAt         *time.Time         `json:"verified_at,omitempty"`
	RejectionReason    string             `json:"rejection_reason,omitempty"`
	Message            string             `json:"message"`
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
	GetByToken(ctx context.Context, token string) (*User, error)
	SaveToken(token, userID string)
	UpdateVerification(ctx context.Context, user *User) error
	UpdateProfile(ctx context.Context, user *User, location *UserLocation) error
}

type RegisterInput struct {
	Name         string   `json:"name"`
	NIK          string   `json:"nik"`
	Phone        string   `json:"phone"`
	Password     string   `json:"password"`
	Role         UserRole `json:"role"`
	Address      string   `json:"address"`
	Village      string   `json:"village"`
	District     string   `json:"district"`
	City         string   `json:"city"`
	Province     string   `json:"province"`
	VillageCode  string   `json:"village_code"`
	DistrictCode string   `json:"district_code"`
	CityCode     string   `json:"city_code"`
	ProvinceCode string   `json:"province_code"`
	Latitude     float64  `json:"latitude"`
	Longitude    float64  `json:"longitude"`
}

type LoginInput struct {
	NIK      string `json:"nik"`
	Password string `json:"password"`
}
