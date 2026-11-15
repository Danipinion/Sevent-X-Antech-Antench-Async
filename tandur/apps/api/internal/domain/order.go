package domain

import (
	"context"
	"time"
)

type OrderStatus string

const (
	OrderStatusPending    OrderStatus = "PENDING"
	OrderStatusAccepted   OrderStatus = "ACCEPTED"
	OrderStatusInTransit  OrderStatus = "IN_TRANSIT"
	OrderStatusCompleted  OrderStatus = "COMPLETED"
	OrderStatusCancelled  OrderStatus = "CANCELLED"
)

type Order struct {
	ID          string      `json:"id"`
	BuyerID     string      `json:"buyer_id"`
	SellerID    string      `json:"seller_id"`
	CommodityID string      `json:"commodity_id"`
	Quantity    float64     `json:"quantity"`
	TotalPrice  float64     `json:"total_price"`
	Status      OrderStatus `json:"status"`
	CreatedAt   time.Time   `json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
}

type OrderRepository interface {
	GetAll(ctx context.Context) ([]Order, error)
	GetByID(ctx context.Context, id string) (*Order, error)
	Create(ctx context.Context, order *Order) error
	UpdateStatus(ctx context.Context, id string, status OrderStatus) error
}
